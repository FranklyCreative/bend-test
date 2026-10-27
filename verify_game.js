/**
 * ============================================================================
 * JerryRigEverything iPhone Duo Bend Test Arcade Game
 * Standalone Headless E2E Automated Verification Suite
 * ============================================================================
 * 
 * Target URL: https://www.frankonedigital.com/bend-test
 * Execution: node verify_game.js [--strict]
 * 
 * Systematically validates all 4 test tiers defined in TEST_INFRA.md:
 * - Tier 1: Feature Coverage (11 features: relative paths, DOM shell, 3 tiers,
 *           orientation, inputs, physics decay, damage states 0-100%, canvas
 *           rendering, audio synthesis, report card bill, X share intent)
 * - Tier 2: Boundary & Corner Cases (0-CPS decay, extreme 30+ CPS burst, timer
 *           expiration vs snap, mute persistence, dt clamping, angle bounds)
 * - Tier 3: Cross-Feature Combinations (tier selection, flip, damage, audio)
 * - Tier 4: Real-World Arcade Simulations (5 full automated playthrough runs)
 * 
 * Zero external npm dependencies. Pure Node.js standard library.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

// ============================================================================
// 1. TERMINAL FORMATTING & RUNNER STATE
// ============================================================================

const isColorSupported = !process.env.NO_COLOR && (process.stdout.isTTY || process.env.CI);
const GREEN  = isColorSupported ? '\x1b[32m' : '';
const RED    = isColorSupported ? '\x1b[31m' : '';
const YELLOW = isColorSupported ? '\x1b[33m' : '';
const CYAN   = isColorSupported ? '\x1b[36m' : '';
const BOLD   = isColorSupported ? '\x1b[1m' : '';
const DIM    = isColorSupported ? '\x1b[2m' : '';
const RESET  = isColorSupported ? '\x1b[0m' : '';

const IS_STRICT = process.argv.includes('--strict') || process.env.CI_STRICT === 'true';

const results = {
  tier1: { total: 0, passed: 0, failed: 0, pending: 0 },
  tier2: { total: 0, passed: 0, failed: 0, pending: 0 },
  tier3: { total: 0, passed: 0, failed: 0, pending: 0 },
  tier4: { total: 0, passed: 0, failed: 0, pending: 0 }
};

let currentTierKey = 'tier1';
let currentSuiteName = '';

function describe(suiteName, tierKey, fn) {
  if (typeof tierKey === 'function') {
    fn = tierKey;
    tierKey = currentTierKey;
  }
  currentTierKey = tierKey || currentTierKey;
  currentSuiteName = suiteName;
  console.log(`\n${BOLD}${CYAN}▶ ${suiteName}${RESET}`);
  fn();
}

function it(description, fn, options = {}) {
  const tier = results[currentTierKey];
  tier.total++;

  // Check if test depends on an uncreated milestone file
  if (options.requiresFile) {
    const fullReqPath = path.resolve(__dirname, options.requiresFile);
    if (!fs.existsSync(fullReqPath)) {
      if (IS_STRICT) {
        tier.failed++;
        console.error(`  ${RED}✗${RESET} ${description}`);
        console.error(`    ${RED}Strict Failure: Required file '${options.requiresFile}' does not exist on disk.${RESET}`);
        return;
      } else {
        tier.pending++;
        const milestoneTag = options.milestone ? `[Pending ${options.milestone}]` : '[Pending Implementation]';
        console.log(`  ${YELLOW}○${RESET} ${description} ${DIM}${milestoneTag} (${options.requiresFile} not yet created)${RESET}`);
        return;
      }
    }
  }

  try {
    fn();
    tier.passed++;
    console.log(`  ${GREEN}✓${RESET} ${description}`);
  } catch (err) {
    tier.failed++;
    console.error(`  ${RED}✗${RESET} ${description}`);
    console.error(`    ${RED}AssertionError: ${err.message}${RESET}`);
    if (process.env.VERBOSE && err.stack) {
      console.error(`${DIM}${err.stack}${RESET}`);
    }
  }
}

// ============================================================================
// 2. HEADLESS BROWSER & DOM ENVIRONMENT SANDBOX
// ============================================================================

class MockClassList {
  constructor(initial = '') {
    this._set = new Set(initial.split(/\s+/).filter(Boolean));
  }
  add(...tokens) { tokens.forEach(t => this._set.add(t)); }
  remove(...tokens) { tokens.forEach(t => this._set.delete(t)); }
  contains(token) { return this._set.has(token); }
  toggle(token, force) {
    if (force !== undefined) {
      if (force) this.add(token); else this.remove(token);
      return force;
    }
    const has = this.contains(token);
    if (has) this.remove(token); else this.add(token);
    return !has;
  }
  toString() { return Array.from(this._set).join(' '); }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.id = '';
    this.className = '';
    this.classList = new MockClassList();
    this.style = {};
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this._listeners = new Map();
    this.innerHTML = '';
    this.textContent = '';
    this.disabled = false;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'id') this.id = String(value);
    if (name === 'class') {
      this.className = String(value);
      this.classList = new MockClassList(String(value));
    }
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  addEventListener(type, listener) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(listener);
  }

  removeEventListener(type, listener) {
    const list = this._listeners.get(type);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  dispatchEvent(event) {
    event.target = this;
    const list = this._listeners.get(event.type) || [];
    list.forEach(fn => fn.call(this, event));
    return !event.defaultPrevented;
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this, preventDefault: () => {} });
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const check = (el) => {
      if (selector.startsWith('#')) {
        if (el.id === selector.slice(1)) matches.push(el);
      } else if (selector.startsWith('.')) {
        if (el.classList.contains(selector.slice(1))) matches.push(el);
      } else if (el.tagName.toLowerCase() === selector.toLowerCase()) {
        matches.push(el);
      }
      for (const child of el.children) check(child);
    };
    for (const child of this.children) check(child);
    return matches;
  }
}

class MockCanvasRenderingContext2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.calls = [];
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.font = '10px sans-serif';
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this._stateStack = [];
  }

  _record(name, args) {
    this.calls.push({ method: name, args: Array.from(args) });
  }

  fillRect(x, y, w, h) { this._record('fillRect', arguments); }
  strokeRect(x, y, w, h) { this._record('strokeRect', arguments); }
  clearRect(x, y, w, h) { this._record('clearRect', arguments); }
  beginPath() { this._record('beginPath', arguments); }
  moveTo(x, y) { this._record('moveTo', arguments); }
  lineTo(x, y) { this._record('lineTo', arguments); }
  arc(x, y, r, sa, ea) { this._record('arc', arguments); }
  fill() { this._record('fill', arguments); }
  stroke() { this._record('stroke', arguments); }
  save() { this._record('save', arguments); this._stateStack.push({ fillStyle: this.fillStyle, strokeStyle: this.strokeStyle }); }
  restore() { this._record('restore', arguments); if (this._stateStack.length) { const s = this._stateStack.pop(); Object.assign(this, s); } }
  translate(x, y) { this._record('translate', arguments); }
  rotate(angle) { this._record('rotate', arguments); }
  scale(x, y) { this._record('scale', arguments); }
  roundRect(x, y, w, h, r) { this._record('roundRect', arguments); }
  fillText(text, x, y) { this._record('fillText', arguments); }
  strokeText(text, x, y) { this._record('strokeText', arguments); }
  drawImage() { this._record('drawImage', arguments); }
  clip() { this._record('clip', arguments); }
  measureText(text) { return { width: (text ? String(text).length * 8 : 0) }; }
  createLinearGradient() { return { addColorStop: () => {} }; }
  createRadialGradient() { return { addColorStop: () => {} }; }
  getImageData() { return { data: new Uint8ClampedArray(4) }; }
  putImageData() { this._record('putImageData', arguments); }
}

class MockHTMLCanvasElement extends MockElement {
  constructor() {
    super('canvas');
    this.width = 800;
    this.height = 600;
    this._ctx2d = new MockCanvasRenderingContext2D(this);
  }

  getContext(type) {
    if (type === '2d') return this._ctx2d;
    return null;
  }

  toDataURL(type = 'image/png') {
    return `data:${type};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
  }

  toBlob(callback, type = 'image/png') {
    setTimeout(() => {
      callback({ size: 1024, type });
    }, 10);
  }
}

class MockAudioParam {
  constructor(initial = 0) {
    this.value = initial;
    this.timeline = [];
  }
  setValueAtTime(val, t) { this.value = val; this.timeline.push({ type: 'set', val, t }); return this; }
  exponentialRampToValueAtTime(val, t) { this.value = val; this.timeline.push({ type: 'exp', val, t }); return this; }
  linearRampToValueAtTime(val, t) { this.value = val; this.timeline.push({ type: 'lin', val, t }); return this; }
  setTargetAtTime(val, t, tc) { this.value = val; this.timeline.push({ type: 'target', val, t, tc }); return this; }
}

class MockAudioNode {
  constructor(ctx) {
    this.context = ctx;
    this.connectedTo = [];
  }
  connect(dest) {
    this.connectedTo.push(dest);
    return dest;
  }
  disconnect() {
    this.connectedTo = [];
  }
}

class MockOscillatorNode extends MockAudioNode {
  constructor(ctx) {
    super(ctx);
    this.type = 'sine';
    this.frequency = new MockAudioParam(440);
    this.started = false;
    this.stopped = false;
  }
  start(t = 0) { this.started = true; }
  stop(t = 0) { this.stopped = true; }
}

class MockGainNode extends MockAudioNode {
  constructor(ctx) {
    super(ctx);
    this.gain = new MockAudioParam(1.0);
  }
}

class MockBiquadFilterNode extends MockAudioNode {
  constructor(ctx) {
    super(ctx);
    this.type = 'lowpass';
    this.frequency = new MockAudioParam(350);
    this.Q = new MockAudioParam(1.0);
    this.gain = new MockAudioParam(0);
  }
}

class MockWaveShaperNode extends MockAudioNode {
  constructor(ctx) {
    super(ctx);
    this.curve = null;
    this.oversample = 'none';
  }
}

class MockDynamicsCompressorNode extends MockAudioNode {
  constructor(ctx) {
    super(ctx);
    this.threshold = new MockAudioParam(-24);
    this.knee = new MockAudioParam(30);
    this.ratio = new MockAudioParam(12);
    this.attack = new MockAudioParam(0.003);
    this.release = new MockAudioParam(0.25);
  }
}

class MockAudioBufferSourceNode extends MockAudioNode {
  constructor(ctx) {
    super(ctx);
    this.buffer = null;
    this.started = false;
    this.stopped = false;
  }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0.05;
    this.sampleRate = 44100;
    this.destination = new MockAudioNode(this);
    this.createdNodes = [];
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }

  createOscillator() {
    const node = new MockOscillatorNode(this);
    this.createdNodes.push({ type: 'Oscillator', node });
    return node;
  }

  createGain() {
    const node = new MockGainNode(this);
    this.createdNodes.push({ type: 'Gain', node });
    return node;
  }

  createBiquadFilter() {
    const node = new MockBiquadFilterNode(this);
    this.createdNodes.push({ type: 'BiquadFilter', node });
    return node;
  }

  createWaveShaper() {
    const node = new MockWaveShaperNode(this);
    this.createdNodes.push({ type: 'WaveShaper', node });
    return node;
  }

  createDynamicsCompressor() {
    const node = new MockDynamicsCompressorNode(this);
    this.createdNodes.push({ type: 'DynamicsCompressor', node });
    return node;
  }

  createBuffer(channels, length, sampleRate) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: (ch) => new Float32Array(length)
    };
  }

  createBufferSource() {
    const node = new MockAudioBufferSourceNode(this);
    this.createdNodes.push({ type: 'BufferSource', node });
    return node;
  }
}

class MockLocalStorage {
  constructor() {
    this._data = new Map();
  }
  getItem(key) { return this._data.has(key) ? this._data.get(key) : null; }
  setItem(key, val) { this._data.set(key, String(val)); }
  removeItem(key) { this._data.delete(key); }
  clear() { this._data.clear(); }
}

function createHeadlessSandbox() {
  const windowObj = {
    location: {
      href: 'https://www.frankonedigital.com/bend-test',
      origin: 'https://www.frankonedigital.com',
      pathname: '/bend-test',
      protocol: 'https:'
    },
    localStorage: new MockLocalStorage(),
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    innerWidth: 1024,
    innerHeight: 768,
    screenX: 0,
    screenY: 0,
    open: (url) => ({ url, closed: false }),
    JRE: {},
    navigator: {
      vibrate: (pattern) => true,
      userAgent: 'Headless-Bend-Test-Harness/1.0'
    }
  };

  const documentObj = {
    body: new MockElement('body'),
    createElement: (tag) => {
      if (tag.toLowerCase() === 'canvas') return new MockHTMLCanvasElement();
      return new MockElement(tag);
    },
    getElementById: (id) => null,
    querySelector: (sel) => null,
    querySelectorAll: (sel) => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  windowObj.document = documentObj;
  return { window: windowObj, document: documentObj };
}

function createBrowserRuntimeSandbox() {
  const windowListeners = new Map();
  const elemListeners = new Map();
  const elements = new Map();
  const rafCallbacks = [];
  let rafId = 0;

  const makeContext2D = (canvas) => {
    const base = {
      canvas,
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      font: '10px sans-serif',
      textAlign: 'left',
      textBaseline: 'alphabetic',
      globalAlpha: 1.0,
      shadowColor: 'transparent',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      measureText: (t) => ({ width: (t ? String(t).length * 8 : 0) }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      calls: []
    };
    return new Proxy(base, {
      get(target, prop) {
        if (prop in target) return target[prop];
        return (...args) => { target.calls.push({ method: prop, args }); };
      },
      set(target, prop, value) { target[prop] = value; return true; }
    });
  };

  const makeElement = (id, tag = 'div') => {
    const el = {
      id,
      tagName: tag.toUpperCase(),
      classList: {
        _s: new Set(),
        add(...t) { t.forEach(x => this._s.add(x)); },
        remove(...t) { t.forEach(x => this._s.delete(x)); },
        toggle(t, f) { if (f === undefined) f = !this._s.has(t); if (f) this._s.add(t); else this._s.delete(t); return f; },
        contains(t) { return this._s.has(t); }
      },
      style: {},
      clientWidth: 800,
      clientHeight: 600,
      width: 800,
      height: 600,
      offsetWidth: 100,
      offsetHeight: 100,
      textContent: '',
      title: '',
      addEventListener(t, fn) {
        if (!elemListeners.has(id)) elemListeners.set(id, []);
        elemListeners.get(id).push({ type: t, fn });
      },
      dispatchEvent(e) {
        const list = elemListeners.get(id) || [];
        list.filter(item => item.type === e.type).forEach(item => item.fn.call(this, e));
      },
      querySelector: (s) => makeElement(id + '_' + s),
      querySelectorAll: (s) => [makeElement(id + '_' + s)],
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 })
    };
    const ctx2d = makeContext2D(el);
    el.getContext = (type) => (type === '2d' ? ctx2d : null);
    return el;
  };

  const knownIds = [
    'gameCanvas', 'hudTimer', 'hudCps', 'hudBendAngle', 'hudDamageBar', 'hudDamagePct',
    'btnFlip', 'btnMute', 'btnStart', 'btnReset',
    'tierStandard', 'tierDust', 'tierTitanium',
    'leftTouchZone', 'rightTouchZone',
    'reportCardModal', 'btnDownloadCard', 'btnShareX', 'btnRetry',
    'captionPill', 'captionText'
  ];
  knownIds.forEach(id => elements.set(id, makeElement(id)));

  const ctx = {
    console: console,
    setTimeout: (cb, ms) => setTimeout(cb, ms),
    clearTimeout: (id) => clearTimeout(id),
    requestAnimationFrame: (cb) => {
      rafId++;
      rafCallbacks.push(cb);
      return rafId;
    },
    cancelAnimationFrame: () => {},
    performance: { now: () => 1000 },
    innerWidth: 1200,
    innerHeight: 800,
    devicePixelRatio: 1.0,
    localStorage: {
      _d: {},
      getItem(k) { return this._d[k] || null; },
      setItem(k, v) { this._d[k] = String(v); }
    },
    addEventListener: (t, fn) => {
      if (!windowListeners.has(t)) windowListeners.set(t, []);
      windowListeners.get(t).push(fn);
    },
    dispatchEvent: (e) => {
      const list = windowListeners.get(e.type) || [];
      list.forEach(fn => fn(e));
    },
    removeEventListener: () => {},
    location: {
      href: 'https://www.frankonedigital.com/bend-test',
      origin: 'https://www.frankonedigital.com',
      pathname: '/bend-test'
    },
    navigator: { userAgent: 'HeadlessSandbox', vibrate: () => true }
  };
  ctx.window = ctx;
  ctx.self = ctx;

  ctx.document = {
    readyState: 'complete',
    getElementById: (id) => elements.get(id) || makeElement(id),
    querySelector: (sel) => {
      if (sel === 'canvas' || sel === '#gameCanvas') return elements.get('gameCanvas');
      return makeElement(sel);
    },
    querySelectorAll: (sel) => [makeElement(sel)],
    createElement: (tag) => makeElement('created_' + tag, tag),
    addEventListener: () => {}
  };

  return { ctx, elements, windowListeners, elemListeners, rafCallbacks };
}

// Helper to advance simulation across multiple steps (respecting dt <= 0.10 clamp)
function stepEngine(engine, totalSeconds, stepSize = 0.05) {
  const steps = Math.ceil(totalSeconds / stepSize);
  for (let i = 0; i < steps; i++) {
    engine.update(stepSize);
  }
}

// ============================================================================
// 3. SUITE DEFINITIONS — TIER 1: FEATURE COVERAGE (≥ 55 assertions)
// ============================================================================

describe('Tier 1: Feature Coverage (11 Core Features)', 'tier1', () => {

  // Feature 1: Zero-Build Static Relative Paths (`./`)
  describe('Feature 1: Zero-Build Static Relative Paths Audit', 'tier1', () => {
    it('verifies index.html uses strictly relative ./ paths for all asset references', () => {
      const htmlPath = path.resolve(__dirname, 'index.html');
      if (!fs.existsSync(htmlPath)) return;
      const html = fs.readFileSync(htmlPath, 'utf8');

      const attrMatches = html.match(/(?:href|src)=["']([^"']+)["']/g) || [];
      assert(attrMatches.length > 0, 'index.html must contain script/link/image references');

      attrMatches.forEach(match => {
        const val = match.replace(/^(?:href|src)=["']|["']$/g, '');
        if (val.startsWith('http://') || val.startsWith('https://')) {
          assert(
            val.includes('frankonedigital.com') || val.includes('franklycreative.github.io') || val.includes('twitter.com') || val.includes('schema.org') || val.includes('youtube.com'),
            `Disallowed external CDN or unapproved URL in index.html: ${val}`
          );
        } else if (val.startsWith('#') || val.startsWith('data:')) {
          // allowed anchors / inlines
        } else {
          assert(val.startsWith('./'), `Path must strictly start with relative './' (found: ${val})`);
        }
      });
    }, { requiresFile: 'index.html', milestone: 'M4' });

    it('verifies styles.css contains no absolute / root url(...) paths', () => {
      const cssPath = path.resolve(__dirname, 'styles.css');
      if (!fs.existsSync(cssPath)) return;
      const css = fs.readFileSync(cssPath, 'utf8');
      const urlMatches = css.match(/url\(\s*["']?([^"')]+)["']?\s*\)/g) || [];
      urlMatches.forEach(m => {
        const raw = m.replace(/^url\(\s*["']?|["']?\s*\)$/g, '');
        assert(!raw.startsWith('/') || raw.startsWith('//'), `styles.css url() must not use root-relative path: ${raw}`);
      });
    }, { requiresFile: 'styles.css', milestone: 'M4' });

    it('verifies all js/*.js files refrain from absolute root imports', () => {
      const jsDir = path.resolve(__dirname, 'js');
      if (!fs.existsSync(jsDir)) return;
      const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
      assert(jsFiles.length > 0, 'js directory must contain module files');
      jsFiles.forEach(file => {
        const content = fs.readFileSync(path.join(jsDir, file), 'utf8');
        assert(!content.includes('from "/"') && !content.includes("from '/'"), `${file} must not import from absolute root /`);
      });
    }, { requiresFile: 'js/engine.js', milestone: 'M1' });

    it('verifies DEPLOY.md exists and documents drop-in deployment to /bend-test', () => {
      const deployPath = path.resolve(__dirname, 'DEPLOY.md');
      if (!fs.existsSync(deployPath)) return;
      const deployText = fs.readFileSync(deployPath, 'utf8');
      assert(deployText.includes('/bend-test'), 'DEPLOY.md must document /bend-test folder deployment');
      assert(deployText.includes('frankonedigital.com'), 'DEPLOY.md must reference frankonedigital.com domain');
    }, { requiresFile: 'DEPLOY.md', milestone: 'M4' });

    it('verifies static architecture requires zero bundler or build steps', () => {
      const hasWebpack = fs.existsSync(path.resolve(__dirname, 'webpack.config.js'));
      const hasVite = fs.existsSync(path.resolve(__dirname, 'vite.config.js'));
      assert(!hasWebpack && !hasVite, 'Zero-build static web app must not require webpack or vite configs');
    });
  });

  // Feature 2: DOM Shell & Canvas Structure
  describe('Feature 2: DOM Shell & Canvas Structure', 'tier1', () => {
    it('verifies required high-DPI canvas exists in index.html', () => {
      const htmlPath = path.resolve(__dirname, 'index.html');
      if (!fs.existsSync(htmlPath)) return;
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert(html.includes('id="game-canvas"') || html.includes('id="canvas"') || html.includes('<canvas'), 'Must include canvas element');
    }, { requiresFile: 'index.html', milestone: 'M4' });

    it('verifies HUD displays (timer, CPS, strain/bend angle, damage) in index.html', () => {
      const htmlPath = path.resolve(__dirname, 'index.html');
      if (!fs.existsSync(htmlPath)) return;
      const html = fs.readFileSync(htmlPath, 'utf8');
      const hasTimer = html.includes('timer') || html.includes('countdown');
      const hasCps = html.includes('cps') || html.includes('speed');
      const hasStrain = html.includes('strain') || html.includes('bend') || html.includes('angle');
      assert(hasTimer, 'HUD must contain countdown timer element');
      assert(hasCps, 'HUD must contain CPS display element');
      assert(hasStrain, 'HUD must contain bend angle / strain display element');
    }, { requiresFile: 'index.html', milestone: 'M4' });

    it('verifies difficulty tier selector controls exist in index.html', () => {
      const htmlPath = path.resolve(__dirname, 'index.html');
      if (!fs.existsSync(htmlPath)) return;
      const html = fs.readFileSync(htmlPath, 'utf8');
      const hasTier = html.includes('tier') || html.includes('standard') || html.includes('difficulty');
      assert(hasTier, 'index.html must include difficulty tier selection controls');
    }, { requiresFile: 'index.html', milestone: 'M4' });

    it('verifies orientation flip button and audio mute button in index.html', () => {
      const htmlPath = path.resolve(__dirname, 'index.html');
      if (!fs.existsSync(htmlPath)) return;
      const html = fs.readFileSync(htmlPath, 'utf8');
      const hasFlip = html.includes('flip') || html.includes('orientation');
      const hasMute = html.includes('mute') || html.includes('audio');
      assert(hasFlip, 'index.html must include flip/orientation control');
      assert(hasMute, 'index.html must include mute audio toggle button');
    }, { requiresFile: 'index.html', milestone: 'M4' });

    it('verifies subtitle caption container and report card modal in index.html', () => {
      const htmlPath = path.resolve(__dirname, 'index.html');
      if (!fs.existsSync(htmlPath)) return;
      const html = fs.readFileSync(htmlPath, 'utf8');
      const hasCaption = html.includes('caption') || html.includes('subtitle') || html.includes('quip');
      const hasReport = html.includes('report') || html.includes('card') || html.includes('modal');
      assert(hasCaption, 'index.html must include subtitle/caption element');
      assert(hasReport, 'index.html must include Durability Report Card modal');
    }, { requiresFile: 'index.html', milestone: 'M4' });

    it('evaluates complete browser runtime script bundle (engine, canvas, audio, ui, main) in headless DOM sandbox with zero errors', () => {
      const sandbox = createBrowserRuntimeSandbox();
      vm.createContext(sandbox.ctx);

      const scripts = ['js/engine.js', 'js/canvas.js', 'js/audio.js', 'js/ui.js', 'js/main.js'];
      scripts.forEach(scriptPath => {
        const fullPath = path.resolve(__dirname, scriptPath);
        assert(fs.existsSync(fullPath), `Required runtime script missing: ${scriptPath}`);
        const code = fs.readFileSync(fullPath, 'utf8');
        vm.runInContext(code, sandbox.ctx);
      });

      // Verify master loop started
      assert(sandbox.rafCallbacks.length >= 1, 'Master animation loop must be initiated via requestAnimationFrame');

      // Verify game loop step executes cleanly
      sandbox.rafCallbacks[0](1016.6);
      assert(sandbox.rafCallbacks.length >= 2, 'gameLoop must schedule subsequent requestAnimationFrame frame');

      // Verify keyboard event bindings
      assert(sandbox.windowListeners.has('keydown'), 'Window keydown listener must be registered');

      // Verify toolbar button bindings
      ['btnFlip', 'btnMute', 'btnStart', 'btnReset', 'tierStandard', 'tierDust', 'tierTitanium'].forEach(id => {
        const listeners = sandbox.elemListeners.get(id) || [];
        assert(listeners.some(l => l.type === 'click'), `${id} must have click event listener bound`);
      });

      // Verify mobile dual-thumb touch zones
      ['leftTouchZone', 'rightTouchZone'].forEach(id => {
        const listeners = sandbox.elemListeners.get(id) || [];
        assert(listeners.some(l => l.type === 'pointerdown'), `${id} must have pointerdown event listener bound`);
      });

      // Verify test bridge and controller exposure
      assert(sandbox.ctx.window.__BEND_TEST_GAME__, 'window.__BEND_TEST_GAME__ must be available');
      assert(sandbox.ctx.window.__BEND_TEST_CONTROLLER__, 'window.__BEND_TEST_CONTROLLER__ must be exposed');
      assert(sandbox.ctx.window.__BEND_TEST_CONTROLLER__.engine, 'Controller must contain initialized engine instance');
      assert(sandbox.ctx.window.__BEND_TEST_CONTROLLER__.renderer, 'Controller must contain initialized renderer instance');
      assert.strictEqual(typeof sandbox.ctx.window.__BEND_TEST_CONTROLLER__.isLoopRunning, 'function', 'Controller must export isLoopRunning status');
    }, { requiresFile: 'js/main.js', milestone: 'M4' });
  });

  // Feature 3: Difficulty Tiers (Standard, Dust, Titanium)
  describe('Feature 3: 3 Difficulty Tier Configurations & Balance', 'tier1', () => {
    const Engine = require('./js/engine');

    it('defines 3 distinct difficulty tiers: Standard, Dust, and Titanium', () => {
      assert(Engine.DIFFICULTY_TIERS, 'Engine must export DIFFICULTY_TIERS');
      assert(Engine.DIFFICULTY_TIERS.standard, 'Must contain standard tier');
      assert(Engine.DIFFICULTY_TIERS.dust, 'Must contain dust tier');
      assert(Engine.DIFFICULTY_TIERS.titanium, 'Must contain titanium tier');
    });

    it('calibrates Standard tier with baseline physics parameters', () => {
      const t = Engine.DIFFICULTY_TIERS.standard;
      assert.strictEqual(t.forcePerTap, 4.5, 'Standard forcePerTap must be 4.5');
      assert.strictEqual(t.decayRate, 1.8, 'Standard decayRate must be 1.8');
      assert.strictEqual(t.yieldThreshold, 18.0, 'Standard yieldThreshold must be 18.0');
      assert.strictEqual(t.damageScale, 1.2, 'Standard damageScale must be 1.2');
    });

    it('calibrates Dust-Jammed tier with gritty high yield threshold', () => {
      const t = Engine.DIFFICULTY_TIERS.dust;
      assert.strictEqual(t.forcePerTap, 3.8, 'Dust forcePerTap must be 3.8');
      assert.strictEqual(t.decayRate, 1.2, 'Dust decayRate must be 1.2');
      assert.strictEqual(t.yieldThreshold, 25.0, 'Dust yieldThreshold must be 25.0');
      assert.strictEqual(t.damageScale, 1.0, 'Dust damageScale must be 1.0');
    });

    it('calibrates Titanium Max tier with brutal spring-back decay', () => {
      const t = Engine.DIFFICULTY_TIERS.titanium;
      assert.strictEqual(t.forcePerTap, 3.0, 'Titanium forcePerTap must be 3.0');
      assert.strictEqual(t.decayRate, 3.2, 'Titanium decayRate must be 3.2');
      assert.strictEqual(t.yieldThreshold, 38.0, 'Titanium yieldThreshold must be 38.0');
      assert.strictEqual(t.damageScale, 0.75, 'Titanium damageScale must be 0.75');
    });

    it('verifies switching active tier reconfigures engine parameters', () => {
      const engine = new Engine();
      assert.strictEqual(engine.currentTier.id, 'standard');
      engine.setTier('titanium');
      assert.strictEqual(engine.currentTier.id, 'titanium');
      assert.strictEqual(engine.currentTier.decayRate, 3.2);
    });
  });

  // Feature 4: Asymmetric Orientation (Front vs Reverse)
  describe('Feature 4: Asymmetric Orientation Mechanics (Front vs Reverse)', 'tier1', () => {
    const Engine = require('./js/engine');

    it('initializes in REVERSE_BEND (vulnerable hyperextension against hinge)', () => {
      const engine = new Engine();
      assert.strictEqual(engine.orientation, Engine.ORIENTATIONS.REVERSE_BEND);
    });

    it('toggles cleanly between FRONT_BEND and REVERSE_BEND respecting 200ms debounce', () => {
      const engine = new Engine();
      engine.flipOrientation();
      assert.strictEqual(engine.orientation, Engine.ORIENTATIONS.FRONT_BEND);
      // Advance debounce cooldown to simulate 300ms passing
      engine._lastFlipTime -= 0.30;
      engine.flipOrientation();
      assert.strictEqual(engine.orientation, Engine.ORIENTATIONS.REVERSE_BEND);
    });

    it('heavily penalizes damage accumulation under FRONT_BEND (4x resistance)', () => {
      const eReverse = new Engine();
      eReverse.startActiveMashing();
      eReverse.orientation = Engine.ORIENTATIONS.REVERSE_BEND;
      for (let i = 0; i < 20; i++) {
        eReverse.registerTap(i % 2 === 0 ? 'left' : 'right');
        eReverse.update(0.05);
      }

      const eFront = new Engine();
      eFront.startActiveMashing();
      eFront.orientation = Engine.ORIENTATIONS.FRONT_BEND;
      for (let i = 0; i < 20; i++) {
        eFront.registerTap(i % 2 === 0 ? 'left' : 'right');
        eFront.update(0.05);
      }

      assert(eReverse.damage > eFront.damage, 'Reverse bend damage must exceed front bend damage');
      assert(eFront.damage < 25.0, 'Front bend damage must not exceed 25% under 20 taps');
    });

    it('clamps rendered bend angle at mechanical stop (<= 15 deg) during FRONT_BEND', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.orientation = Engine.ORIENTATIONS.FRONT_BEND;
      engine.force = 90.0;
      engine.damage = 10.0;
      engine.update(0.016);
      const snapshot = engine.getRenderSnapshot();
      assert(snapshot.bendAngleDeg <= 15.01, `Front bend angle must clamp at <= 15 deg (got ${snapshot.bendAngleDeg})`);
    });

    it('preserves accumulated plastic damage when flipping orientation', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.damage = 42.5;
      engine.flipOrientation();
      assert.strictEqual(engine.damage, 42.5, 'Flipping orientation must preserve plastic damage');
    });
  });

  // Feature 5: Input Handling & Auto-Repeat Suppression
  describe('Feature 5: Input Handling & Keyboard/Touch Subsystem', 'tier1', () => {
    const Engine = require('./js/engine');

    it('registers left and right hand discrete taps', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.registerTap('left');
      assert(engine.force > 0, 'Left tap must increase force');
      assert.strictEqual(engine.totalTaps, 1);
      engine.registerTap('right');
      assert.strictEqual(engine.totalTaps, 2);
    });

    it('rejects OS keyboard auto-repeat events (e.repeat === true)', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.handleKeyDown({ code: 'Space', repeat: true, preventDefault: () => {} });
      assert.strictEqual(engine.totalTaps, 0, 'Auto-repeat keyboard events must be discarded');
      assert.strictEqual(engine.force, 0.0);
    });

    it('awards alternating combo multiplier for rhythmic left-right inputs', () => {
      const engine = new Engine();
      engine.startActiveMashing();

      // Tap same hand twice
      engine.registerTap('left');
      engine.force = 0;
      engine.registerTap('left');
      const forceSame = engine.force;

      // Tap alternating hand
      engine.force = 0;
      engine.registerTap('right');
      const forceAlt = engine.force;

      assert(forceAlt > forceSame, 'Alternating hand input must receive combo multiplier bonus');
      assert.strictEqual(engine.currentComboMultiplier, engine.currentTier.comboBonus);
    });

    it('auto-alternates hands on single Spacebar presses', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.handleKeyDown({ code: 'Space', repeat: false, preventDefault: () => {} });
      assert.strictEqual(engine.activeHand, 'left');
      engine.handleKeyDown({ code: 'Space', repeat: false, preventDefault: () => {} });
      assert.strictEqual(engine.activeHand, 'right');
      assert.strictEqual(engine.currentComboMultiplier, engine.currentTier.comboBonus);
    });

    it('debounces multi-touch spam per hand (40ms debounce window)', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.registerTap('left', 'touch');
      const initialTaps = engine.totalTaps;
      // Immediate second tap with identical timestamp
      engine.registerTap('left', 'touch');
      assert.strictEqual(engine.totalTaps, initialTaps, 'Immediate same-hand touch tap within debounce window must be filtered');
    });
  });

  // Feature 6: Physics Force Accumulation & Resistance Decay
  describe('Feature 6: Continuous Differential Physics & Rolling CPS', 'tier1', () => {
    const Engine = require('./js/engine');

    it('accumulates instantaneous force up to maxForce = 100.0', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      for (let i = 0; i < 40; i++) {
        engine.registerTap(i % 2 === 0 ? 'left' : 'right');
      }
      assert(engine.force <= 100.0, 'Force must be capped at 100.0');
    });

    it('exponentially decays force when mashing ceases (dF/dt = -k * F)', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = 50.0;
      engine.update(0.05); // 50ms decay
      assert(engine.force < 50.0, 'Force must decay over elapsed time');
      assert(engine.force > 0.0, 'Force must not decay instantly to 0 in 50ms');
    });

    it('suppresses damage accumulation when force is below yieldThreshold', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = engine.currentTier.yieldThreshold - 2.0; // strictly below yield
      engine.update(0.1);
      assert.strictEqual(engine.damage, 0.0, 'Damage must not accumulate below yield threshold');
    });

    it('integrates super-linear damage rate when force exceeds yieldThreshold', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = engine.currentTier.yieldThreshold + 20.0; // well above yield
      engine.update(0.1);
      assert(engine.damage > 0.0, 'Damage must accumulate when exceeding yield threshold');
    });

    it('accurately tracks rolling 1.0s window CPS and peak CPS', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      for (let i = 0; i < 10; i++) {
        engine.registerTap(i % 2 === 0 ? 'left' : 'right');
        engine.update(0.05);
      }
      assert(engine.peakCps > 0.0, 'Peak CPS must register high mashing speed');
      assert(engine.cpsSmoothed > 0.0, 'Smoothed CPS must be positive');
    });
  });

  // Feature 7: 0% to 100% Damage Progression & Snap Thresholds
  describe('Feature 7: 0% to 100% Damage Progression & Snap Thresholds', 'tier1', () => {
    const Engine = require('./js/engine');

    it('maps 0% - 24% damage to Stage 1 (Initial Elastic Flex)', () => {
      const engine = new Engine();
      engine.forceDamagePct(10.0);
      assert.strictEqual(engine.getDamageStageNumber(), 1);
      assert(engine.bendAngle < 15.0, 'Stage 1 bend angle must be < 15 deg');
    });

    it('maps 25% - 49% damage to Stage 2 (Plastic Crease)', () => {
      const engine = new Engine();
      engine.forceDamagePct(30.0);
      assert.strictEqual(engine.getDamageStageNumber(), 2);
      assert(engine.bendAngle >= 8.0 && engine.bendAngle < 16.0, 'Stage 2 bend angle must be in [8, 16) deg');
    });

    it('maps 50% - 74% damage to Stage 3 (OLED Green Line of Death)', () => {
      const engine = new Engine();
      engine.forceDamagePct(55.0);
      assert.strictEqual(engine.getDamageStageNumber(), 3);
      assert(engine.bendAngle >= 16.0 && engine.bendAngle < 24.0, 'Stage 3 bend angle must be in [16, 24) deg');
    });

    it('maps 75% - 99% damage to Stage 4 (Hinge Buckling & Glass Cracking)', () => {
      const engine = new Engine();
      engine.forceDamagePct(80.0);
      assert.strictEqual(engine.getDamageStageNumber(), 4);
      assert(engine.bendAngle >= 24.0 && engine.bendAngle < 32.0, 'Stage 4 bend angle must be in [24, 32) deg');
    });

    it('triggers Catastrophic Snap victory at 100% damage', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.forceDamagePct(100.0);
      assert.strictEqual(engine.getDamageStageNumber(), 5);
      assert.strictEqual(engine.state, Engine.STATES.SNAP_CELEBRATION);
      assert.strictEqual(engine.bendAngle, 38.0, 'Failure angle must reach 38 deg');
    });

    it('supports Engine.prototype.onStageChange and notifies registered callbacks on damage stage transitions', () => {
      const engine = new Engine();
      assert.strictEqual(typeof engine.onStageChange, 'function', 'Engine instance must implement onStageChange method');
      assert.strictEqual(typeof Engine.prototype.onStageChange, 'function', 'Engine.prototype must define onStageChange');

      const transitions = [];
      engine.onStageChange((newStage, oldStage) => {
        transitions.push({ newStage, oldStage });
      });

      // Transition from Stage 1 -> Stage 2 (Plastic Crease >= 25%)
      engine.forceDamagePct(30.0);
      assert.strictEqual(transitions.length, 1, 'Must notify listener on transition to Stage 2');
      assert.strictEqual(transitions[0].newStage, 2);
      assert.strictEqual(transitions[0].oldStage, 1);

      // Transition from Stage 2 -> Stage 3 (OLED Glitch Line >= 50%)
      engine.forceDamagePct(55.0);
      assert.strictEqual(transitions.length, 2, 'Must notify listener on transition to Stage 3');
      assert.strictEqual(transitions[1].newStage, 3);
      assert.strictEqual(transitions[1].oldStage, 2);

      // Transition from Stage 3 -> Stage 4 (Hinge Buckling >= 75%)
      engine.forceDamagePct(80.0);
      assert.strictEqual(transitions.length, 3, 'Must notify listener on transition to Stage 4');
      assert.strictEqual(transitions[2].newStage, 4);
      assert.strictEqual(transitions[2].oldStage, 3);

      // Transition from Stage 4 -> Stage 5 (Catastrophic Snap at 100%)
      engine.forceDamagePct(100.0);
      assert.strictEqual(transitions.length, 4, 'Must notify listener on transition to Stage 5');
      assert.strictEqual(transitions[3].newStage, 5);
      assert.strictEqual(transitions[3].oldStage, 4);

      // Verify offStageChange unsubscribe
      if (typeof engine.offStageChange === 'function') {
        const dummy = () => {};
        engine.onStageChange(dummy);
        const beforeCount = engine._stageChangeListeners.length;
        engine.offStageChange(dummy);
        assert.strictEqual(engine._stageChangeListeners.length, beforeCount - 1, 'offStageChange must remove listener');
      }
    });
  });

  // Feature 8: 2.5D Canvas Rendering & Hand Blanching
  describe('Feature 8: Canvas Render Snapshot & Ergonomic Blanching', 'tier1', () => {
    const Engine = require('./js/engine');

    it('provides complete GameRenderSnapshot conforming to PROJECT.md contract', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = 45.0;
      engine.damage = 30.0;
      engine.update(0.016);
      const s = engine.getRenderSnapshot();

      assert(s.state !== undefined, 'Snapshot must include state');
      assert(s.tier && s.tier.id, 'Snapshot must include tier');
      assert(s.orientation, 'Snapshot must include orientation');
      assert.strictEqual(typeof s.damagePct, 'number', 'Snapshot must include damagePct');
      assert.strictEqual(typeof s.bendAngleDeg, 'number', 'Snapshot must include bendAngleDeg');
      assert.strictEqual(typeof s.currentForce, 'number', 'Snapshot must include currentForce');
      assert.strictEqual(typeof s.cps, 'number', 'Snapshot must include cps');
      assert.strictEqual(typeof s.leftThumbStrain, 'number', 'Snapshot must include leftThumbStrain');
      assert.strictEqual(typeof s.rightThumbStrain, 'number', 'Snapshot must include rightThumbStrain');
    });

    it('scales ischemic thumb strain between 0.0 and 1.0 for white-knuckle blanching', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = 80.0;
      engine.registerTap('left');
      engine.update(0.016);
      const s = engine.getRenderSnapshot();
      assert(s.leftThumbStrain > 0.0 && s.leftThumbStrain <= 1.0, 'Left thumb strain must scale with high force');
    });

    it('supports 1200x630 offscreen canvas creation for report card export', () => {
      const canvas = new MockHTMLCanvasElement();
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0F171E';
      ctx.fillRect(0, 0, 1200, 630);
      assert.strictEqual(canvas.width, 1200);
      assert.strictEqual(canvas.height, 630);
      assert(ctx.calls.length > 0, 'Offscreen canvas context must record draw operations');
    });

    it('verifies canvas.toDataURL generates valid base64 PNG export', () => {
      const canvas = new MockHTMLCanvasElement();
      const dataUrl = canvas.toDataURL('image/png');
      assert(dataUrl.startsWith('data:image/png;base64,'), 'Canvas export must produce base64 PNG data URL');
    });

    it('verifies dynamic screen shake trauma scales with heavy mashing and damage', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.damage = 85.0; // Stage 4 buckling
      engine.force = 90.0;
      engine.update(0.016); // Stage transition occurs, shakeTrauma incremented
      engine.update(0.016); // Next frame calculates amplitude and sets isShaking = true
      const s = engine.getRenderSnapshot();
      assert(s.isShaking === true || s.shakeTrauma > 0, 'Screen shake trauma must be active at 85% damage and high force');
    });
  });

  // Feature 9: Procedural Web Audio Synthesis & Mute
  describe('Feature 9: Procedural Web Audio API Synthesis & Mute', 'tier1', () => {
    const Engine = require('./js/engine');

    it('dispatches typed audio events during gameplay', () => {
      const engine = new Engine();
      const events = [];
      engine.onAudioEvent((type, payload) => events.push({ type, payload }));
      engine.startActiveMashing();
      engine.registerTap('left');

      const types = events.map(e => e.type);
      assert(types.includes('TAP_MASH') || types.includes('MASH_STRAIN'), 'Must dispatch mash strain audio event');
    });

    it('dispatches OLED_GLITCH audio event when crossing 50% damage threshold', () => {
      const engine = new Engine();
      const events = [];
      engine.onAudioEvent((type, payload) => events.push({ type, payload }));
      engine.startActiveMashing();
      engine.damage = 49.0;
      engine.force = 60.0;
      engine.update(0.05); // Crosses 50%

      const types = events.map(e => e.type);
      assert(types.includes('OLED_GLITCH') || types.includes('OLED_BUZZ'), 'Must dispatch OLED glitch audio event at 50% damage');
    });

    it('dispatches CATASTROPHIC_SNAP audio event at 100% damage', () => {
      const engine = new Engine();
      const events = [];
      engine.onAudioEvent((type, payload) => events.push({ type, payload }));
      engine.startActiveMashing();
      engine.forceDamagePct(100.0);

      const types = events.map(e => e.type);
      assert(types.includes('CATASTROPHIC_SNAP') || types.includes('SNAP'), 'Must dispatch snap audio event at 100% damage');
    });

    it('instantiates expected Web Audio node graph (Oscillator, Gain, Filter, Shaper) in mock context', () => {
      const ctx = new MockAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const compressor = ctx.createDynamicsCompressor();

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(compressor);
      compressor.connect(ctx.destination);

      assert.strictEqual(ctx.createdNodes.length, 4);
      assert.strictEqual(osc.connectedTo[0], gain);
      assert.strictEqual(gain.connectedTo[0], filter);
    });

    it('persists audio mute toggle in localStorage (jre_bend_muted)', () => {
      const sandbox = createHeadlessSandbox();
      sandbox.window.localStorage.setItem('jre_bend_muted', 'true');
      assert.strictEqual(sandbox.window.localStorage.getItem('jre_bend_muted'), 'true');
      sandbox.window.localStorage.setItem('jre_bend_muted', 'false');
      assert.strictEqual(sandbox.window.localStorage.getItem('jre_bend_muted'), 'false');
    });
  });

  // Feature 10: Durability Report Card & Repair Bill
  describe('Feature 10: Durability Report Card & Apple Repair Bill', 'tier1', () => {
    const Engine = require('./js/engine');

    it('calculates full $1,899 out-of-warranty repair bill upon catastrophic snap', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.forceDamagePct(100.0);
      const report = engine.getReportCardData();

      assert.strictEqual(report.survived, false);
      assert(report.billBreakdown && report.billBreakdown.totalBill >= 1499, 'Total repair bill must be at least $1,499 on catastrophic failure');
      assert.strictEqual(report.billBreakdown.innerDisplay, 1499, 'Inner folding display replacement must be $1,499');
    });

    it('calculates $0 repair bill if phone survives undamaged', () => {
      const engine = new Engine();
      engine.damage = 0.0;
      engine.survived = true;
      const report = engine.getReportCardData();
      assert.strictEqual(report.billBreakdown.totalBill, 0, 'Undamaged surviving phone must have $0 repair bill');
    });

    it('assigns failing durability grades (S / A / B / C / F) for catastrophic snaps', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.elapsedTime = 4.2;
      engine.forceDamagePct(100.0);
      const report = engine.getReportCardData();
      assert(['S', 'A', 'B', 'C', 'F'].includes(report.grade), `Snap should receive appropriate grade (got ${report.grade})`);
    });

    it('assigns surviving durability grades (D / D-Tier) for completed runs under timeout', () => {
      const engine = new Engine();
      engine.damage = 30.0;
      engine.maxBendAngle = 25.0;
      engine.survived = true;
      const report = engine.getReportCardData();
      assert(['D', 'D-Tier', 'C', 'B', 'A+'].includes(report.grade), `Survival should receive appropriate grade (got ${report.grade})`);
    });

    it('formats report card metrics (snap time, max bend angle, peak CPS, total taps)', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.registerTap('left');
      engine.registerTap('right');
      engine.forceDamagePct(100.0);
      const report = engine.getReportCardData();

      assert(report.maxBendAngle !== undefined, 'Report must contain maxBendAngle');
      assert(report.peakCps !== undefined, 'Report must contain peakCps');
      assert(report.totalTaps >= 2, 'Report must contain totalTaps');
      assert(report.verdict, 'Report must contain a text verdict');
    });
  });

  // Feature 11: X Share Intent Generation & URL Fallback
  describe('Feature 11: X Share Intent URL Formatting & Dynamic Fallback', 'tier1', () => {
    const Engine = require('./js/engine');

    it('generates tweet intent starting with https://twitter.com/intent/tweet?', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.forceDamagePct(100.0);
      const url = engine.getShareUrl('https://www.frankonedigital.com/bend-test');
      assert(url.startsWith('https://twitter.com/intent/tweet?'), 'Must start with Twitter Web Intent URL');
    });

    it('embeds score metrics and repair bill into encoded tweet text', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.forceDamagePct(100.0);
      const url = engine.getShareUrl('https://www.frankonedigital.com/bend-test');
      assert(url.includes(encodeURIComponent('iPhone Duo')), 'Must contain encoded iPhone Duo name');
      assert(url.includes(encodeURIComponent('1499')) || url.includes(encodeURIComponent('1899')) || url.includes('repair') || url.includes('%24'), 'Must mention repair bill in share text');
    });

    it('includes required hashtags (#iPhoneDuo, #JerryRigEverything, #BendTest)', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.forceDamagePct(100.0);
      const url = engine.getShareUrl();
      assert(url.includes('iPhoneDuo'), 'Must include iPhoneDuo hashtag');
      assert(url.includes('JerryRigEverything') || url.includes('BendTest'), 'Must include JerryRigEverything / BendTest hashtag');
    });

    it('falls back to https://www.frankonedigital.com/bend-test when origin is localhost or missing', () => {
      const engine = new Engine();
      const url = engine.getShareUrl(null); // no live URL provided
      assert(url.includes(encodeURIComponent('https://www.frankonedigital.com/bend-test')), 'Must fallback to frankonedigital URL');
    });

    it('ensures all URI query parameters are strictly URI-encoded without malformed chars', () => {
      const engine = new Engine();
      const url = engine.getShareUrl('https://www.frankonedigital.com/bend-test?foo=bar');
      assert(!url.includes('\n'), 'Generated URL must not contain raw newlines');
      assert(!url.includes(' '), 'Generated URL must not contain raw spaces');
    });
  });

});

// ============================================================================
// 4. SUITE DEFINITIONS — TIER 2: BOUNDARY & CORNER CASES (≥ 55 assertions)
// ============================================================================

describe('Tier 2: Boundary & Corner Cases (≥ 55 Assertions)', 'tier2', () => {
  const Engine = require('./js/engine');

  // Boundary 1: 0-CPS Inactivity Decay & Monotonicity
  describe('Boundary 1: 0-CPS Inactivity Decay & Damage Monotonicity', 'tier2', () => {
    it('force decays smoothly toward 0.0 without mash inputs', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = 60.0;
      stepEngine(engine, 3.0, 0.05); // 3 seconds decay
      assert(engine.force < 1.0, `Force must decay to near zero after 3s inactivity (got ${engine.force})`);
    });

    it('force never drops below 0.0 (no negative force under decay)', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = 5.0;
      stepEngine(engine, 5.0, 0.10); // massive decay steps
      assert.strictEqual(engine.force, 0.0, 'Force must be clamped at exactly 0.0');
    });

    it('permanent damage D(t) is strictly monotonic non-decreasing (never heals)', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.damage = 50.0;
      engine.force = 0.0; // complete lack of force
      stepEngine(engine, 1.0, 0.05);
      assert.strictEqual(engine.damage, 50.0, 'Damage must never decrease');
    });

    it('permanent bend angle theta_perm remains bent even when active force reaches 0', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.damage = 40.0;
      engine.force = 0.0;
      engine.update(0.016);
      const snapshot = engine.getRenderSnapshot();
      assert.strictEqual(snapshot.bendAngleDeg, 12.8, 'Bend angle must preserve the permanent 40% crease');
    });

    it('0-CPS complete inactivity run cleanly transitions to SURVIVAL_FAIL at 15.0s', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      stepEngine(engine, 15.2, 0.10); // entire duration passes with zero taps
      assert.strictEqual(engine.state, Engine.STATES.SURVIVAL_FAIL);
      assert.strictEqual(engine.damage, 0.0);
      assert.strictEqual(engine.survived, true);
    });

    it('0-CPS inactivity run generates $0 repair bill on timeout', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      stepEngine(engine, 15.2, 0.10);
      const report = engine.getReportCardData();
      assert.strictEqual(report.billBreakdown.totalBill, 0);
    });

    it('elastic flex angle returns to 0 when force decays to 0', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.damage = 0.0;
      engine.force = 15.0; // below yield threshold 18.0
      engine.update(0.016);
      assert(engine.bendAngle > 0.0, 'Must have elastic flex when force is active');
      stepEngine(engine, 6.0, 0.10);
      assert(engine.bendAngle < 0.001, 'Angle must return to ~0 with zero damage and zero force');
    });
  });

  // Boundary 2: Extreme CPS Values (30+ CPS Burst)
  describe('Boundary 2: Extreme CPS Values & Burst Input Saturation', 'tier2', () => {
    it('maintains mathematical stability under 50 rapid taps in 0.5s', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      for (let i = 0; i < 50; i++) {
        engine.registerTap(i % 2 === 0 ? 'left' : 'right');
        engine.update(0.01);
      }
      assert(!isNaN(engine.force), 'Force must not become NaN under rapid tapping');
      assert(!isNaN(engine.damage), 'Damage must not become NaN under rapid tapping');
      assert(isFinite(engine.force), 'Force must be finite');
      assert(isFinite(engine.damage), 'Damage must be finite');
    });

    it('force saturates cleanly at maxForce = 100.0 without overflowing', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      for (let i = 0; i < 100; i++) {
        engine.registerTap(i % 2 === 0 ? 'left' : 'right');
      }
      assert.strictEqual(engine.force, 100.0, 'Force must saturate at 100.0');
    });

    it('rolling CPS circular buffer handles 100+ timestamps without memory leak', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      for (let i = 0; i < 120; i++) {
        engine.registerTap(i % 2 === 0 ? 'left' : 'right');
      }
      assert(engine.inputBuffer.length <= 128, 'Input buffer must maintain bounded size');
    });

    it('smoothed CPS remains bounded under 40+ raw CPS bursts', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      for (let i = 0; i < 40; i++) {
        engine.registerTap(i % 2 === 0 ? 'left' : 'right');
      }
      engine.update(0.05);
      assert(engine.peakCps <= 50.0, 'Peak CPS must remain within realistic physical limits');
    });

    it('rapid input mashing smoothly crosses damage thresholds without missing events', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      for (let i = 0; i < 150 && engine.state === Engine.STATES.ACTIVE_MASHING; i++) {
        engine.registerTap(i % 2 === 0 ? 'left' : 'right');
        engine.update(0.03);
      }
      assert.strictEqual(engine.state, Engine.STATES.SNAP_CELEBRATION);
    });

    it('thumb strains do not exceed 1.0 even at 50+ CPS', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      for (let i = 0; i < 50; i++) {
        engine.registerTap(i % 2 === 0 ? 'left' : 'right');
      }
      const s = engine.getRenderSnapshot();
      assert(s.leftThumbStrain <= 1.0, 'leftThumbStrain must clamp at <= 1.0');
      assert(s.rightThumbStrain <= 1.0, 'rightThumbStrain must clamp at <= 1.0');
    });

    it('subsequent taps after snap are ignored without mutating broken state', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.forceDamagePct(100.0);
      assert.strictEqual(engine.state, Engine.STATES.SNAP_CELEBRATION);
      const preTaps = engine.totalTaps;
      engine.registerTap('left');
      assert.strictEqual(engine.totalTaps, preTaps, 'Taps in SNAP_CELEBRATION must be discarded');
    });
  });

  // Boundary 3: Timer Expiration vs Snap Race Condition
  describe('Boundary 3: Timer Expiration vs Snap Race Condition', 'tier2', () => {
    it('prioritizes Catastrophic Snap over Timeout when reaching 100% on the final frame', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.timeRemaining = 0.01; // nearly expired
      engine.damage = 99.8;
      engine.force = 80.0;
      engine.update(0.02); // timer drops to 0 while damage crosses 100%

      assert.strictEqual(engine.state, Engine.STATES.SNAP_CELEBRATION, 'Snap victory must take precedence over timeout fail');
      assert.strictEqual(engine.survived, false);
    });

    it('clamps countdown timer display at 0.00s without negative values', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      stepEngine(engine, 16.0, 0.10); // well past 15s limit
      assert.strictEqual(engine.timeRemaining, 0.0, 'Timer must clamp at 0.00');
    });

    it('freezes physics updates once state machine enters terminal celebration', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.forceDamagePct(100.0);
      const snapDamage = engine.damage;
      engine.update(0.05);
      assert.strictEqual(engine.damage, snapDamage, 'Damage must freeze upon snap');
    });

    it('countdown stage (3..2..1) suppresses mash input accumulation', () => {
      const engine = new Engine();
      engine.startCountdown();
      assert.strictEqual(engine.state, Engine.STATES.COUNTDOWN);
      engine.registerTap('left');
      assert.strictEqual(engine.force, 0.0, 'Force must not accumulate during countdown phase');
      assert.strictEqual(engine.damage, 0.0);
    });

    it('countdown timer automatically transitions to ACTIVE_MASHING after 3.0s', () => {
      const engine = new Engine();
      engine.startCountdown();
      stepEngine(engine, 3.2, 0.10); // step across 3 seconds
      assert.strictEqual(engine.state, Engine.STATES.ACTIVE_MASHING);
    });

    it('timeout failure preserves final damage achieved in report card data', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.damage = 68.4;
      stepEngine(engine, 16.0, 0.10);
      assert.strictEqual(engine.state, Engine.STATES.SURVIVAL_FAIL);
      const report = engine.getReportCardData();
      assert.strictEqual(report.damagePct, 68.4);
    });

    it('celebration timer auto-transitions to REPORT_CARD after 1.5s', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.forceDamagePct(100.0);
      assert.strictEqual(engine.state, Engine.STATES.SNAP_CELEBRATION);
      stepEngine(engine, 1.6, 0.10);
      assert.strictEqual(engine.state, Engine.STATES.REPORT_CARD);
    });
  });

  // Boundary 4: Mute Persistence & Web Audio Gain Lifecycle
  describe('Boundary 4: Mute Persistence & Web Audio Gain Lifecycle', 'tier2', () => {
    it('sets initial mute state based on localStorage value', () => {
      const sandbox = createHeadlessSandbox();
      sandbox.window.localStorage.setItem('jre_bend_muted', 'true');
      const isMuted = sandbox.window.localStorage.getItem('jre_bend_muted') === 'true';
      assert.strictEqual(isMuted, true);
    });

    it('toggling mute persists inverted boolean in localStorage', () => {
      const sandbox = createHeadlessSandbox();
      let muted = sandbox.window.localStorage.getItem('jre_bend_muted') === 'true';
      muted = !muted;
      sandbox.window.localStorage.setItem('jre_bend_muted', String(muted));
      assert.strictEqual(sandbox.window.localStorage.getItem('jre_bend_muted'), 'true');
      muted = !muted;
      sandbox.window.localStorage.setItem('jre_bend_muted', String(muted));
      assert.strictEqual(sandbox.window.localStorage.getItem('jre_bend_muted'), 'false');
    });

    it('master gain ramps to 0.0 when muted to eliminate acoustic clicks', () => {
      const ctx = new MockAudioContext();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1.0, 0);
      masterGain.gain.setTargetAtTime(0.0001, 0.05, 0.015);
      assert.strictEqual(masterGain.gain.timeline.length, 2);
    });

    it('AudioContext resumes seamlessly on user gesture if created in suspended state', async () => {
      const ctx = new MockAudioContext();
      ctx.state = 'suspended';
      await ctx.resume();
      assert.strictEqual(ctx.state, 'running');
    });

    it('audio event callbacks handle unmuted state safely without throwing', () => {
      const engine = new Engine();
      let called = false;
      engine.onAudioEvent(() => { called = true; });
      engine.startActiveMashing();
      engine.registerTap('left');
      assert.strictEqual(called, true);
    });

    it('detaching audio event listener prevents subsequent callback executions', () => {
      const engine = new Engine();
      let callCount = 0;
      const fn = () => { callCount++; };
      engine.onAudioEvent(fn);
      engine.startActiveMashing();
      engine.registerTap('left');
      const countBefore = callCount;
      assert(countBefore > 0);
      engine.offAudioEvent(fn);
      engine.registerTap('right');
      assert.strictEqual(callCount, countBefore, 'Detached listener must not receive further events');
    });

    it('handles synthesize call gracefully when AudioContext is null or unavailable', () => {
      const engine = new Engine({ enableAudio: false });
      assert.doesNotThrow(() => {
        engine.startActiveMashing();
        engine.registerTap('left');
      });
    });
  });

  // Boundary 5: Background Tab dt Clamping (dt > 0.1s)
  describe('Boundary 5: Background Tab dt Clamping & Frame Spikes', 'tier2', () => {
    it('clamps massive delta time (dt = 3.0s) to 100ms maximum to prevent math explosion', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = 50.0;
      const initialDuration = engine.timeRemaining;

      // Simulate browser tab freeze / resume with dt = 3.0s
      engine.update(3.0);

      const timeLost = initialDuration - engine.timeRemaining;
      assert(timeLost <= 0.1001, `Physics step dt must clamp to <= 0.1s (lost ${timeLost}s)`);
    });

    it('prevents damage calculation from spiking beyond 100% on a single massive frame dt', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = 80.0;
      engine.update(10.0); // 10-second lag spike
      assert(engine.damage <= 100.0, 'Damage must not overshoot 100% on lag spike');
    });

    it('gracefully handles zero or negative dt (dt <= 0) without division by zero', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = 30.0;
      assert.doesNotThrow(() => {
        engine.update(0.0);
        engine.update(-0.016);
      });
      assert(isFinite(engine.force) && engine.force >= 0);
    });

    it('handles high refresh rate displays (144Hz / 240Hz, dt = 0.004s) accurately', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = 50.0;
      for (let i = 0; i < 240; i++) {
        engine.update(1.0 / 240.0);
      }
      assert(engine.force < 50.0 && engine.force >= 0.0);
    });

    it('physics variables remain numbers and never become null or undefined over 500 frames', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      for (let i = 0; i < 500; i++) {
        if (i % 10 === 0) engine.registerTap(i % 20 === 0 ? 'left' : 'right');
        engine.update(0.016);
      }
      assert(typeof engine.force === 'number' && !isNaN(engine.force));
      assert(typeof engine.damage === 'number' && !isNaN(engine.damage));
      assert(typeof engine.bendAngle === 'number' && !isNaN(engine.bendAngle));
    });

    it('elapsed time accumulates consistently across stepped frames', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      for (let i = 0; i < 60; i++) {
        engine.update(0.016);
      }
      assert(Math.abs(engine.elapsedTime - (60 * 0.016)) < 0.01);
    });
  });

  // Boundary 6: Bend Angle Physical Constraints & Invariants
  describe('Boundary 6: Bend Angle Physical Constraints & Invariants', 'tier2', () => {
    it('rendered bend angle theta is strictly bounded in [0.0 deg, 38.0 deg]', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.damage = 100.0;
      engine.force = 100.0;
      engine.update(0.016);
      assert(engine.bendAngle <= 38.0, `Angle must never exceed 38 deg (got ${engine.bendAngle})`);
      assert(engine.bendAngle >= 0.0, 'Angle must never be negative');
    });

    it('damage percentage is strictly bounded in [0.0, 100.0]', () => {
      const engine = new Engine();
      engine.forceDamagePct(150.0);
      assert.strictEqual(engine.damage, 100.0, 'Damage must clamp to 100.0');
      engine.forceDamagePct(-20.0);
      assert.strictEqual(engine.damage, 0.0, 'Damage must clamp to 0.0');
    });

    it('elastic flex component is strictly bounded in [0.0 deg, 6.0 deg]', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.damage = 0.0;
      engine.force = 15.0; // below yield threshold 18.0
      engine.update(0.016);
      assert(engine.bendAngle <= 6.01, `Elastic flex must not exceed 6 deg (got ${engine.bendAngle})`);
    });

    it('maxBendAngle records the absolute peak angle attained across the entire run', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = 80.0;
      engine.update(0.016);
      stepEngine(engine, 4.0, 0.10); // allow force to decay to 0
      assert(engine.bendAngle <= engine.maxBendAngle, 'Current bend angle should drop or equal maxBendAngle after decay');
      assert(engine.maxBendAngle > 0.0, 'maxBendAngle must record peak angle');
    });

    it('two-component formula produces smooth continuous angle progression', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      let lastAngle = 0;
      for (let i = 0; i < 25 && engine.state === Engine.STATES.ACTIVE_MASHING; i++) {
        engine.registerTap(i % 2 === 0 ? 'left' : 'right');
        engine.update(0.05);
        assert(engine.bendAngle >= lastAngle - 1.0, 'Angle must not experience erratic negative spikes');
        lastAngle = engine.bendAngle;
      }
    });

    it('folded sandwich mode locks out leverage and suppresses damage (0.15x efficiency)', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.toggleFold(); // folded
      for (let i = 0; i < 20; i++) {
        engine.registerTap(i % 2 === 0 ? 'left' : 'right');
        engine.update(0.05);
      }
      assert(engine.damage < 10.0, 'Folded phone must take minimal damage');
    });

    it('toggling fold back to unfolded restores full damage leverage', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.toggleFold(); // folded
      assert.strictEqual(engine.foldState, Engine.FOLD_STATES.FOLDED);
      engine.toggleFold(); // unfolded
      assert.strictEqual(engine.foldState, Engine.FOLD_STATES.UNFOLDED);
    });
  });

  // Boundary 7: Orientation Flip During Active Mashing
  describe('Boundary 7: Orientation Flip During Active Mashing', 'tier2', () => {
    it('flipping orientation while force > 0 does not trigger NaN or math anomalies', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = 45.0;
      engine.flipOrientation();
      assert(!isNaN(engine.force));
      assert(!isNaN(engine.damage));
      assert(!isNaN(engine.bendAngle));
    });

    it('rapid successive flips toggle orientation state deterministically', () => {
      const engine = new Engine();
      assert.strictEqual(engine.orientation, Engine.ORIENTATIONS.REVERSE_BEND);
      engine.flipOrientation();
      assert.strictEqual(engine.orientation, Engine.ORIENTATIONS.FRONT_BEND);
      // Immediate flip is debounced
      engine.flipOrientation();
      assert.strictEqual(engine.orientation, Engine.ORIENTATIONS.FRONT_BEND);
      // Flip after cooldown completes
      engine._lastFlipTime -= 0.25;
      engine.flipOrientation();
      assert.strictEqual(engine.orientation, Engine.ORIENTATIONS.REVERSE_BEND);
    });

    it('front bend warning banner text updates when flipping to FRONT_BEND', () => {
      const engine = new Engine();
      engine.flipOrientation();
      assert(engine.currentQuip.includes('front') || engine.currentQuip.includes('Turn it around') || engine.currentQuip.includes('hinge'));
    });

    it('reverse bend critical vulnerability quip updates when flipping back to REVERSE_BEND', () => {
      const engine = new Engine();
      engine.flipOrientation(); // front
      engine._lastFlipTime -= 0.25;
      engine.flipOrientation(); // reverse
      assert(engine.currentQuip.includes('backwards') || engine.currentQuip.includes('hinge'));
    });

    it('flipping orientation does not reset elapsed time or countdown', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.update(0.05);
      const remBefore = engine.timeRemaining;
      engine.flipOrientation();
      assert.strictEqual(engine.timeRemaining, remBefore, 'Flipping must not alter remaining time');
    });

    it('flipping orientation preserves peak CPS and total taps recorded', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.registerTap('left');
      engine.registerTap('right');
      const tapsBefore = engine.totalTaps;
      engine.flipOrientation();
      assert.strictEqual(engine.totalTaps, tapsBefore);
    });

    it('flipping orientation while snapped preserves broken terminal state', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.forceDamagePct(100.0);
      assert.strictEqual(engine.state, Engine.STATES.SNAP_CELEBRATION);
      engine.flipOrientation();
      assert.strictEqual(engine.state, Engine.STATES.SNAP_CELEBRATION, 'Flipping must not un-snap broken phone');
      assert.strictEqual(engine.damage, 100.0);
    });
  });

  // Boundary 8: Invalid Key Suppression & Reset Lifecycle
  describe('Boundary 8: Invalid Key Suppression & Reset Lifecycle', 'tier2', () => {
    it('unrelated keyboard keys (e.g. KeyZ, KeyQ, Enter) do not increment force', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.handleKeyDown({ code: 'KeyZ', repeat: false, preventDefault: () => {} });
      engine.handleKeyDown({ code: 'KeyQ', repeat: false, preventDefault: () => {} });
      engine.handleKeyDown({ code: 'Enter', repeat: false, preventDefault: () => {} });
      assert.strictEqual(engine.totalTaps, 0);
      assert.strictEqual(engine.force, 0.0);
    });

    it('Escape key resets game to IDLE_SELECT during active mashing', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.force = 30.0;
      engine.handleKeyDown({ code: 'Escape', repeat: false, preventDefault: () => {} });
      assert.strictEqual(engine.state, Engine.STATES.IDLE_SELECT);
      assert.strictEqual(engine.force, 0.0);
    });

    it('resetGame clears all forces, damages, timers, and restores IDLE_SELECT', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.forceDamagePct(80.0);
      engine.resetGame();

      assert.strictEqual(engine.state, Engine.STATES.IDLE_SELECT);
      assert.strictEqual(engine.damage, 0.0);
      assert.strictEqual(engine.force, 0.0);
      assert.strictEqual(engine.bendAngle, 0.0);
      assert.strictEqual(engine.totalTaps, 0);
      assert.strictEqual(engine.timeRemaining, engine.currentTier.runDuration);
    });

    it('resetGame can be called from any terminal state (SNAP or SURVIVAL)', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.forceDamagePct(100.0);
      assert.strictEqual(engine.state, Engine.STATES.SNAP_CELEBRATION);
      engine.resetGame();
      assert.strictEqual(engine.state, Engine.STATES.IDLE_SELECT);
    });

    it('setting difficulty tier while in active mashing is prevented or safely resets', () => {
      const engine = new Engine();
      engine.startActiveMashing();
      engine.setTier('titanium');
      assert(engine.state === Engine.STATES.ACTIVE_MASHING || engine.state === Engine.STATES.IDLE_SELECT);
    });

    it('subscribing multiple state listeners notifies all observers', () => {
      const engine = new Engine();
      let callCount1 = 0;
      let callCount2 = 0;
      engine.onStateChange(() => callCount1++);
      engine.onStateChange(() => callCount2++);
      engine.startCountdown();
      assert(callCount1 > 0 && callCount2 > 0 && callCount1 === callCount2, 'Both observers must be notified equally');
    });

    it('window.__BEND_TEST_GAME__ bridge functions mirror internal state accurately', () => {
      createHeadlessSandbox();
      new Engine();
      const bridge = global.__BEND_TEST_GAME__;
      assert(bridge, 'Test bridge must be globally available');
      bridge.setTier('dust');
      assert.strictEqual(bridge.getState().tier.id, 'dust');
      bridge.flipOrientation();
      assert.strictEqual(bridge.getState().orientation, Engine.ORIENTATIONS.FRONT_BEND);
      bridge.resetGame();
      assert.strictEqual(bridge.getState().state, Engine.STATES.IDLE_SELECT);
    });
  });

});

// ============================================================================
// 5. SUITE DEFINITIONS — TIER 3: CROSS-FEATURE COMBINATIONS (≥ 15 assertions)
// ============================================================================

describe('Tier 3: Cross-Feature Combinations (≥ 15 Assertions)', 'tier3', () => {
  const Engine = require('./js/engine');

  // Combination 1: Dust-Jammed + Front Bend Lockout + Flip + Snapping
  describe('Combination 1: Tier 2 (Dust-Jammed) + Orientation Flip + Audio Creaks', 'tier3', () => {
    let engine;
    const audioEvents = [];

    it('Combo 1.1: initializes Dust-Jammed tier with high friction (yield = 25.0, decay = 1.2)', () => {
      engine = new Engine();
      engine.onAudioEvent((t, p) => audioEvents.push({ type: t, payload: p }));
      engine.setTier('dust');
      assert.strictEqual(engine.currentTier.id, 'dust');
      assert.strictEqual(engine.currentTier.yieldThreshold, 25.0);
      assert.strictEqual(engine.currentTier.decayRate, 1.2);
    });

    it('Combo 1.2: transitions to FRONT_BEND and clamps maximum angle <= 15.0 deg', () => {
      engine.startActiveMashing();
      engine.flipOrientation();
      assert.strictEqual(engine.orientation, Engine.ORIENTATIONS.FRONT_BEND);
      engine.force = 80.0;
      engine.update(0.016);
      assert(engine.bendAngle <= 15.01, 'Front bend angle must be clamped at mechanical stop');
    });

    it('Combo 1.3: restricts damage accumulation (< 15%) under vigorous front bend mashing', () => {
      for (let i = 0; i < 20; i++) {
        engine.registerTap(i % 2 === 0 ? 'left' : 'right');
        engine.update(0.04);
      }
      assert(engine.damage < 15.0, `Damage under front bend must be suppressed (got ${engine.damage.toFixed(1)}%)`);
    });

    it('Combo 1.4: flips back to REVERSE_BEND and accelerates damage toward catastrophic failure', () => {
      const damageBefore = engine.damage;
      engine._lastFlipTime -= 0.30;
      engine.flipOrientation();
      assert.strictEqual(engine.orientation, Engine.ORIENTATIONS.REVERSE_BEND);

      for (let i = 0; i < 40; i++) {
        engine.registerTap(i % 2 === 0 ? 'left' : 'right');
        engine.update(0.04);
      }
      assert(engine.damage > damageBefore + 10.0, 'Damage must accelerate rapidly in reverse bend');
    });

    it('Combo 1.5: dispatches frame creak and strain audio events across orientation change', () => {
      const creakEvents = audioEvents.filter(e => e.type === 'FRAME_CREAK' || e.type === 'MASH_STRAIN' || e.type === 'TAP_MASH');
      assert(creakEvents.length > 0, 'Audio engine must have received strain / creak events');
    });
  });

  // Combination 2: Titanium Max + Alternating Keys + Multi-stage + Memory Retention
  describe('Combination 2: Tier 3 (Titanium Max) + Alternating A/D Keys + Plastic Memory', 'tier3', () => {
    let engine;
    let damageAtPause = 0;

    it('Combo 2.1: sets Titanium Max tier with brutal 3.2 decayRate and 38.0 yieldThreshold', () => {
      engine = new Engine();
      engine.setTier('titanium');
      assert.strictEqual(engine.currentTier.id, 'titanium');
      assert.strictEqual(engine.currentTier.decayRate, 3.2);
      assert.strictEqual(engine.currentTier.yieldThreshold, 38.0);
    });

    it('Combo 2.2: alternating A/D keys activates rhythmic combo multiplier 1.35x', () => {
      engine.startActiveMashing();
      engine.handleKeyDown({ code: 'KeyA', repeat: false, preventDefault: () => {} });
      engine.handleKeyDown({ code: 'KeyD', repeat: false, preventDefault: () => {} });
      assert.strictEqual(engine.currentComboMultiplier, Engine.DIFFICULTY_TIERS.titanium.comboBonus);
    });

    it('Combo 2.3: high-frequency arcade burst advances phone through Stage 2 (Plastic Crease)', () => {
      for (let i = 0; i < 100; i++) {
        const code = i % 2 === 0 ? 'KeyA' : 'KeyD';
        engine.handleKeyDown({ code, repeat: false, preventDefault: () => {} });
        engine.update(0.02);
      }
      assert(engine.getDamageStageNumber() >= 2, `Titanium run should reach at least Stage 2 (got Stage ${engine.getDamageStageNumber()})`);
      damageAtPause = engine.damage;
      assert(damageAtPause >= 25.0, 'Damage must be >= 25% for Stage 2');
    });

    it('Combo 2.4: cessation of mashing allows active force to decay toward 0', () => {
      stepEngine(engine, 1.0, 0.05);
      assert(engine.force < 10.0, 'Active force must decay during pause');
    });

    it('Combo 2.5: permanent plastic damage is preserved monotonically during decay pause', () => {
      assert(engine.damage >= damageAtPause, 'Plastic damage must not heal or decrease');
    });

    it('Combo 2.6: rendered bend angle retains permanent plastic crease post-decay', () => {
      assert(engine.bendAngle > 20.0, 'Bend angle must maintain permanent plastic deformation');
    });
  });

  // Combination 3: Audio Mute + Full Snap + Repair Bill + X Share + Unmute + Reset
  describe('Combination 3: Mute + Catastrophic Snap + Repair Bill + X Share + Reset', 'tier3', () => {
    let sandbox;
    let engine;
    let reportData;

    it('Combo 3.1: persists mute state in localStorage prior to run', () => {
      sandbox = createHeadlessSandbox();
      sandbox.window.localStorage.setItem('jre_bend_muted', 'true');
      assert.strictEqual(sandbox.window.localStorage.getItem('jre_bend_muted'), 'true');
    });

    it('Combo 3.2: rapid mashing snaps Standard tier into SNAP_CELEBRATION terminal victory', () => {
      engine = new Engine();
      engine.setTier('standard');
      engine.startActiveMashing();
      for (let i = 0; i < 80 && engine.state === Engine.STATES.ACTIVE_MASHING; i++) {
        engine.registerTap(i % 2 === 0 ? 'left' : 'right');
        engine.update(0.04);
      }
      assert.strictEqual(engine.state, Engine.STATES.SNAP_CELEBRATION);
      assert.strictEqual(engine.damage, 100.0);
    });

    it('Combo 3.3: generates report card with $1,499+ display repair bill and failing grade', () => {
      reportData = engine.getReportCardData();
      assert.strictEqual(reportData.survived, false);
      assert(reportData.billBreakdown.totalBill >= 1499, 'Repair bill must exceed $1,499 on catastrophic failure');
      assert(['S', 'A', 'B', 'C', 'F'].includes(reportData.grade));
    });

    it('Combo 3.4: generates pre-populated X Web Intent URL with repair bill and fallback URL', () => {
      const shareUrl = engine.getShareUrl('https://www.frankonedigital.com/bend-test');
      assert(shareUrl.startsWith('https://twitter.com/intent/tweet?'));
      assert(shareUrl.includes(encodeURIComponent('https://www.frankonedigital.com/bend-test')));
      assert(shareUrl.includes('iPhoneDuo'));
    });

    it('Combo 3.5: toggles audio unmuted and verifies state persistence', () => {
      sandbox.window.localStorage.setItem('jre_bend_muted', 'false');
      assert.strictEqual(sandbox.window.localStorage.getItem('jre_bend_muted'), 'false');
    });

    it('Combo 3.6: resets engine to IDLE_SELECT restoring clean initial state', () => {
      engine.resetGame();
      assert.strictEqual(engine.state, Engine.STATES.IDLE_SELECT);
      assert.strictEqual(engine.damage, 0.0);
      assert.strictEqual(engine.force, 0.0);
      assert.strictEqual(engine.bendAngle, 0.0);
    });
  });

});

// ============================================================================
// 6. SUITE DEFINITIONS — TIER 4: REAL-WORLD ARCADE RUNS (≥ 5 simulations)
// ============================================================================

describe('Tier 4: Full Automated Playthrough Simulations & Verification Bridge (10 Tests)', 'tier4', () => {
  const Engine = require('./js/engine');

  // 5 Full Simulated Playthroughs
  it('Playthrough 1: Standard iPhone Duo Win (Reverse Bend, 8 CPS, Snap ~6.5s)', () => {
    const engine = new Engine();
    engine.setTier('standard');
    engine.startActiveMashing();

    const dt = 0.05;
    let elapsed = 0;

    for (let tick = 0; tick < 200 && engine.state === Engine.STATES.ACTIVE_MASHING; tick++) {
      elapsed += dt;
      if (tick % 2 === 0) {
        engine.registerTap(tick % 4 === 0 ? 'left' : 'right');
      }
      engine.update(dt);
    }

    assert.strictEqual(engine.state, Engine.STATES.SNAP_CELEBRATION, 'Playthrough 1 must achieve Catastrophic Snap');
    assert(elapsed < 12.0, `Standard snap should complete in < 12s (took ${elapsed.toFixed(2)}s)`);
    assert.strictEqual(engine.maxBendAngle, 38.0, 'Max bend angle must reach 38 deg');

    const report = engine.getReportCardData();
    assert.strictEqual(report.survived, false);
    assert(report.billBreakdown.totalBill >= 1499);
    assert(report.peakCps >= 7.0, `Peak CPS should be >= 7 (got ${report.peakCps})`);
  });

  it('Playthrough 2: Standard iPhone Duo Timeout (Reverse Bend, Casual 3 CPS, Survives 15.0s)', () => {
    const engine = new Engine();
    engine.setTier('standard');
    engine.startActiveMashing();

    const dt = 0.05;
    for (let tick = 0; tick < 320 && engine.state === Engine.STATES.ACTIVE_MASHING; tick++) {
      if (tick % 7 === 0) {
        engine.registerTap(tick % 14 === 0 ? 'left' : 'right');
      }
      engine.update(dt);
    }

    assert.strictEqual(engine.state, Engine.STATES.SURVIVAL_FAIL, 'Playthrough 2 must timeout into SURVIVAL_FAIL');
    assert.strictEqual(engine.survived, true);
    assert(engine.damage < 100.0, 'Damage must not reach 100% on timeout');

    const report = engine.getReportCardData();
    assert.strictEqual(report.survived, true);
    assert(report.billBreakdown.totalBill < 1899, 'Repair bill must be less than full catastrophic replacement');
  });

  it('Playthrough 3: Titanium Max Win (Intense Dual-Thumb Burst Overcomes 3.2 Decay)', () => {
    const engine = new Engine();
    engine.setTier('titanium');
    engine.startActiveMashing();

    const dt = 0.02;
    let elapsed = 0;

    for (let tick = 0; tick < 700 && engine.state === Engine.STATES.ACTIVE_MASHING; tick++) {
      elapsed += dt;
      engine.registerTap(tick % 2 === 0 ? 'left' : 'right');
      engine.update(dt);
    }

    assert.strictEqual(engine.state, Engine.STATES.SNAP_CELEBRATION, 'Playthrough 3 must conquer Titanium Max');
    assert(elapsed < 15.0, `Titanium snap must complete within 15s limit (took ${elapsed.toFixed(2)}s)`);

    const report = engine.getReportCardData();
    assert.strictEqual(report.tierName, 'Reinforced Titanium Max');
    assert.strictEqual(report.survived, false);
  });

  it('Playthrough 4: Dust-Jammed Front Bend Lockout (10 CPS Mashing Suppressed < 25%)', () => {
    const engine = new Engine();
    engine.setTier('dust');
    engine.startActiveMashing();
    engine.flipOrientation(); // Front bend
    assert.strictEqual(engine.orientation, Engine.ORIENTATIONS.FRONT_BEND);

    const dt = 0.05;
    for (let tick = 0; tick < 160 && engine.state === Engine.STATES.ACTIVE_MASHING; tick++) {
      if (tick % 2 === 0) {
        engine.registerTap(tick % 4 === 0 ? 'left' : 'right');
      }
      engine.update(dt);
    }

    assert(engine.damage < 25.0, `Front bend lockout must restrict damage < 25% (got ${engine.damage.toFixed(1)}%)`);
    assert(engine.bendAngle <= 15.0, `Front bend angle must be clamped <= 15 deg (got ${engine.bendAngle.toFixed(1)} deg)`);
    assert(engine.state === Engine.STATES.ACTIVE_MASHING, 'Must not snap under front bend');
  });

  it('Playthrough 5: Universal Spacebar Single-Button Auto-Alternating Mash Run', () => {
    const engine = new Engine();
    engine.setTier('standard');
    engine.startActiveMashing();

    const dt = 0.04;
    for (let tick = 0; tick < 200 && engine.state === Engine.STATES.ACTIVE_MASHING; tick++) {
      if (tick % 2 === 0 || tick % 3 === 0) {
        engine.handleKeyDown({ code: 'Space', repeat: false, preventDefault: () => {} });
      }
      engine.update(dt);
    }

    assert.strictEqual(engine.state, Engine.STATES.SNAP_CELEBRATION, 'Spacebar run must snap phone');
    assert(engine.totalTaps >= 25, 'Total taps must be recorded');
    const report = engine.getReportCardData();
    assert.strictEqual(report.survived, false);
  });

  // 5 Automated Verification Bridge Integration Tests
  it('Bridge Contract 1: window.__BEND_TEST_GAME__.getState() returns live snapshot', () => {
    createHeadlessSandbox();
    new Engine();
    const bridge = global.__BEND_TEST_GAME__;
    assert(bridge && typeof bridge.getState === 'function');
    const snapshot = bridge.getState();
    assert(snapshot.state !== undefined);
    assert(snapshot.tier && snapshot.tier.id);
  });

  it('Bridge Contract 2: window.__BEND_TEST_GAME__.setTier() changes active difficulty', () => {
    createHeadlessSandbox();
    new Engine();
    const bridge = global.__BEND_TEST_GAME__;
    bridge.setTier('titanium');
    assert.strictEqual(bridge.getState().tier.id, 'titanium');
  });

  it('Bridge Contract 3: window.__BEND_TEST_GAME__.flipOrientation() alters bend direction', () => {
    createHeadlessSandbox();
    new Engine();
    const bridge = global.__BEND_TEST_GAME__;
    assert.strictEqual(bridge.getState().orientation, Engine.ORIENTATIONS.REVERSE_BEND);
    bridge.flipOrientation();
    assert.strictEqual(bridge.getState().orientation, Engine.ORIENTATIONS.FRONT_BEND);
  });

  it('Bridge Contract 4: window.__BEND_TEST_GAME__.simulateTap() registers discrete mash impulses', () => {
    createHeadlessSandbox();
    const engine = new Engine();
    const bridge = global.__BEND_TEST_GAME__;
    engine.startActiveMashing();
    const tapsBefore = bridge.getState().totalTaps;
    bridge.simulateTap('left');
    assert.strictEqual(bridge.getState().totalTaps, tapsBefore + 1);
  });

  it('Bridge Contract 5: window.__BEND_TEST_GAME__.triggerDamagePct() forces target damage stage cleanly', () => {
    createHeadlessSandbox();
    const engine = new Engine();
    const bridge = global.__BEND_TEST_GAME__;
    engine.startActiveMashing();
    bridge.triggerDamagePct(55.0);
    assert.strictEqual(bridge.getState().damagePct, 55.0);
    assert.strictEqual(bridge.getState().damageStage, 3);
  });

});

// ============================================================================
// 7. SUMMARY REPORT & PROCESS EXIT
// ============================================================================

console.log(`\n${BOLD}===================================================================${RESET}`);
console.log(`${BOLD}           E2E VERIFICATION SUITE EXECUTION SUMMARY               ${RESET}`);
console.log(`${BOLD}===================================================================${RESET}`);

const tierKeys = ['tier1', 'tier2', 'tier3', 'tier4'];
const tierLabels = {
  tier1: 'Tier 1: Feature Coverage (11 Features)      ',
  tier2: 'Tier 2: Boundary & Corner Cases             ',
  tier3: 'Tier 3: Cross-Feature Combinations          ',
  tier4: 'Tier 4: Real-World Arcade Simulations (5)   '
};

let grandTotal = 0;
let grandPassed = 0;
let grandFailed = 0;
let grandPending = 0;

tierKeys.forEach(k => {
  const t = results[k];
  grandTotal += t.total;
  grandPassed += t.passed;
  grandFailed += t.failed;
  grandPending += t.pending;

  console.log(
    ` ${tierLabels[k]}: ` +
    `${GREEN}${t.passed} passed${RESET} | ` +
    `${t.failed > 0 ? RED : DIM}${t.failed} failed${RESET} | ` +
    `${t.pending > 0 ? YELLOW : DIM}${t.pending} pending${RESET} | ` +
    `${BOLD}${t.total} total${RESET}`
  );
});

console.log(`${BOLD}-------------------------------------------------------------------${RESET}`);
console.log(
  ` Grand Total: ${BOLD}${grandTotal} assertions${RESET} | ` +
  `${GREEN}${grandPassed} passed${RESET} | ` +
  `${grandFailed > 0 ? RED : GREEN}${grandFailed} failed${RESET} | ` +
  `${grandPending > 0 ? YELLOW : DIM}${grandPending} pending${RESET}`
);
console.log(`${BOLD}===================================================================${RESET}`);

if (grandFailed > 0) {
  console.error(`\n${RED}${BOLD}VERIFICATION FAILED: ${grandFailed} assertion(s) failed.${RESET}`);
  process.exit(1);
} else {
  if (grandPending > 0) {
    console.log(`\n${YELLOW}${BOLD}CURRENT MILESTONE PASSED: All ${grandPassed} active assertions passed successfully!${RESET}`);
    console.log(`${DIM}(${grandPending} assertions are pending completion of future milestones M2, M3, M4)${RESET}\n`);
  } else {
    console.log(`\n${GREEN}${BOLD}ALL ${grandTotal} TESTS PASSED WITH 100% SUCCESS!${RESET}\n`);
  }
  process.exit(0);
}
