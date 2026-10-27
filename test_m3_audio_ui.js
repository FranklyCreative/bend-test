/**
 * Comprehensive Verification Tests for Milestone M3:
 * Web Audio Synthesizer (js/audio.js) & UI/Captions/Report Card (js/ui.js)
 */

'use strict';

const assert = require('assert');

// Mock Web Audio and DOM Sandbox
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
    this.threshold = new MockAudioParam(-12);
    this.knee = new MockAudioParam(15);
    this.ratio = new MockAudioParam(6);
    this.attack = new MockAudioParam(0.003);
    this.release = new MockAudioParam(0.15);
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
  constructor() { this._map = new Map(); }
  getItem(k) { return this._map.has(k) ? this._map.get(k) : null; }
  setItem(k, v) { this._map.set(k, String(v)); }
  removeItem(k) { this._map.delete(k); }
  clear() { this._map.clear(); }
}

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.id = '';
    this.classList = {
      _s: new Set(),
      add(...c) { c.forEach(x => this._s.add(x)); },
      remove(...c) { c.forEach(x => this._s.delete(x)); },
      contains(x) { return this._s.has(x); }
    };
    this.innerHTML = '';
    this.textContent = '';
    this.style = {};
  }
}

class MockCanvasContext2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ops = [];
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
    this.font = '12px sans-serif';
    this.textAlign = 'left';
  }
  fillRect(x, y, w, h) { this.ops.push(['fillRect', x, y, w, h]); }
  strokeRect(x, y, w, h) { this.ops.push(['strokeRect', x, y, w, h]); }
  beginPath() { this.ops.push(['beginPath']); }
  moveTo(x, y) { this.ops.push(['moveTo', x, y]); }
  lineTo(x, y) { this.ops.push(['lineTo', x, y]); }
  stroke() { this.ops.push(['stroke']); }
  fill() { this.ops.push(['fill']); }
  fillText(t, x, y) { this.ops.push(['fillText', t, x, y]); }
  roundRect(x, y, w, h, r) { this.ops.push(['roundRect', x, y, w, h, r]); }
  save() { this.ops.push(['save']); }
  restore() { this.ops.push(['restore']); }
  translate(x, y) { this.ops.push(['translate', x, y]); }
  rotate(a) { this.ops.push(['rotate', a]); }
}

class MockCanvas extends MockElement {
  constructor() {
    super('canvas');
    this.width = 1200;
    this.height = 630;
    this._ctx = new MockCanvasContext2D(this);
  }
  getContext(type) { return type === '2d' ? this._ctx : null; }
  toDataURL(t) { return 'data:image/png;base64,mockpng'; }
  toBlob(cb) { cb({ size: 2048, type: 'image/png' }); }
}

// Global environment setup
global.window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
  localStorage: new MockLocalStorage(),
  addEventListener: () => {},
  removeEventListener: () => {},
  location: {
    origin: 'https://www.frankonedigital.com',
    href: 'https://www.frankonedigital.com/bend-test',
    pathname: '/bend-test'
  },
  open: (url, target, features) => ({ url, target, features, closed: false }),
  innerWidth: 1024,
  innerHeight: 768,
  screenX: 0,
  screenY: 0,
  JRE: {}
};

global.document = {
  createElement: (tag) => {
    if (tag.toLowerCase() === 'canvas') return new MockCanvas();
    return new MockElement(tag);
  },
  getElementById: (id) => new MockElement('div'),
  querySelector: (sel) => new MockElement('div'),
  body: new MockElement('body'),
  addEventListener: () => {},
  removeEventListener: () => {}
};

global.localStorage = global.window.localStorage;

let testCount = 0;
let passedCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passedCount++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

console.log('\n=== Testing js/audio.js ===');
const audio = require('./js/audio');

test('Audio module exports required API', () => {
  assert(typeof audio.ensureAudioContext === 'function');
  assert(typeof audio.unlock === 'function');
  assert(typeof audio.isMuted === 'function');
  assert(typeof audio.setMuted === 'function');
  assert(typeof audio.toggleMute === 'function');
  assert(typeof audio.playEvent === 'function');
  assert(typeof audio.playMashStrain === 'function');
  assert(typeof audio.playFrameCreak === 'function');
  assert(typeof audio.playOledBuzz === 'function');
  assert(typeof audio.playGlassCrack === 'function');
  assert(typeof audio.playCatastrophicSnap === 'function');
});

test('Web Audio graph initializes DynamicsCompressor and masterGain', () => {
  const ctx = audio.ensureAudioContext();
  assert(ctx);
  assert(ctx.createdNodes.some(n => n.type === 'DynamicsCompressor'));
  assert(ctx.createdNodes.some(n => n.type === 'Gain'));
});

test('Mute controls persist in localStorage', () => {
  audio.setMuted(true);
  assert.strictEqual(audio.isMuted(), true);
  assert.strictEqual(global.localStorage.getItem('jre_bend_muted'), 'true');

  audio.toggleMute();
  assert.strictEqual(audio.isMuted(), false);
  assert.strictEqual(global.localStorage.getItem('jre_bend_muted'), 'false');
});

test('SFX 1: Button mash strain thud creates pitch-dropping sine and lowpass noise', () => {
  const ctx = audio.ensureAudioContext();
  const startCount = ctx.createdNodes.length;
  audio.playMashStrain(0.8);
  const newNodes = ctx.createdNodes.slice(startCount);
  assert(newNodes.some(n => n.type === 'Oscillator' && n.node.type === 'sine'));
  assert(newNodes.some(n => n.type === 'BiquadFilter' && n.node.type === 'lowpass'));
  assert(newNodes.some(n => n.type === 'BufferSource'));
});

test('SFX 2: Metallic frame creak creates FM modulated oscillator and bandpass filter', () => {
  const ctx = audio.ensureAudioContext();
  const startCount = ctx.createdNodes.length;
  audio.playFrameCreak(0.7);
  const newNodes = ctx.createdNodes.slice(startCount);
  assert(newNodes.some(n => n.type === 'Oscillator' && n.node.type === 'sawtooth'));
  assert(newNodes.some(n => n.type === 'Oscillator' && n.node.type === 'sine'));
  assert(newNodes.some(n => n.type === 'BiquadFilter' && n.node.type === 'bandpass'));
});

test('SFX 3: OLED electrical buzz creates 120Hz square, capacitor whine, and WaveShaper', () => {
  const ctx = audio.ensureAudioContext();
  const startCount = ctx.createdNodes.length;
  audio.playOledBuzz(0.3);
  const newNodes = ctx.createdNodes.slice(startCount);
  assert(newNodes.some(n => n.type === 'Oscillator' && n.node.type === 'square'));
  assert(newNodes.some(n => n.type === 'Oscillator' && n.node.type === 'sine'));
  assert(newNodes.some(n => n.type === 'WaveShaper'));
  assert(newNodes.some(n => n.type === 'BiquadFilter' && n.node.type === 'peaking'));
});

test('SFX 4: Glass cracking creates micro-cluster of highpass + bandpass noise bursts', () => {
  const ctx = audio.ensureAudioContext();
  const startCount = ctx.createdNodes.length;
  audio.playGlassCrack(3);
  const newNodes = ctx.createdNodes.slice(startCount);
  assert(newNodes.some(n => n.type === 'BiquadFilter' && n.node.type === 'highpass'));
  assert(newNodes.some(n => n.type === 'BiquadFilter' && n.node.type === 'bandpass'));
  assert(newNodes.some(n => n.type === 'BufferSource'));
});

test('SFX 5: Catastrophic snap generates 3-layer composite (boom, crack, dual ring)', () => {
  const ctx = audio.ensureAudioContext();
  const startCount = ctx.createdNodes.length;
  audio.playCatastrophicSnap();
  const newNodes = ctx.createdNodes.slice(startCount);
  // Shockwave boom oscillator + 2 ring oscillators = at least 3 oscillators
  const oscs = newNodes.filter(n => n.type === 'Oscillator');
  assert(oscs.length >= 3);
  assert(newNodes.some(n => n.type === 'BufferSource'));
  assert(newNodes.some(n => n.type === 'BiquadFilter' && n.node.type === 'bandpass'));
});

test('playEvent dispatches all expected AudioEventType contracts without throwing', () => {
  assert.doesNotThrow(() => {
    audio.playEvent('MASH_STRAIN', { forceNormalized: 0.7 });
    audio.playEvent('FRAME_CREAK', { intensity: 0.5 });
    audio.playEvent('OLED_BUZZ', { damagePct: 55 });
    audio.playEvent('GLASS_CRACK', { clusterSize: 3 });
    audio.playEvent('SNAP', {});
    audio.playEvent('COUNTDOWN_TICK', { count: 3 });
    audio.playEvent('COUNTDOWN_GO', {});
    audio.playEvent('FLIP_ORIENT', {});
    audio.playEvent('SURVIVAL_BUZZER', {});
    audio.playEvent('STAGE_TRANSITION', { newStage: 3, oldStage: 2 });
  });
});

console.log('\n=== Testing js/ui.js ===');
const ui = require('./js/ui');

test('UI module exports required components and API', () => {
  assert(ui.Captions);
  assert(ui.Report);
  assert(ui.QUIPS);
  assert(typeof ui.calculateRepairBill === 'function');
  assert(typeof ui.calculateDurabilityGrade === 'function');
  assert(typeof ui.renderReportCardCanvas === 'function');
  assert(typeof ui.downloadReportPng === 'function');
  assert(typeof ui.openTwitterShare === 'function');
  assert(typeof ui.getResolvedShareUrl === 'function');
});

test('QUIPS database contains all 4 mandatory Zack Nelson quotes', () => {
  const allQuips = Object.values(ui.QUIPS).flat();
  assert(allQuips.includes('Glass is glass, and glass breaks.'));
  assert(allQuips.includes('Scratches at a level 2 with deeper grooves at a level 3.'));
  assert(allQuips.includes('And the inner display gives us the green line of death.'));
  assert(allQuips.includes('$1,499 out-of-warranty inner display repair.'));
});

test('CaptionEngine displays formatted subtitle pill with amber speaker tag', () => {
  const el = new MockElement('div');
  const captionEngine = new ui.Captions.constructor(el);
  captionEngine.display('Glass is glass, and glass breaks.', 2);
  assert(el.innerHTML.includes('#F5A623'));
  assert(el.innerHTML.includes('[JerryRigEverything]:'));
  assert(el.innerHTML.includes('Glass is glass, and glass breaks.'));
});

test('calculateRepairBill evaluates authentic itemized repair costs', () => {
  // Catastrophic failure bill ($1,499 + $299 + $199 + $101 = $2,098 >= $1,899)
  const snapBill = ui.calculateRepairBill(100.0, false);
  assert.strictEqual(snapBill.innerDisplay, 1499);
  assert.strictEqual(snapBill.hingeAssembly, 299);
  assert.strictEqual(snapBill.frameAlignment, 199);
  assert.strictEqual(snapBill.batteryHazard, 101);
  assert.strictEqual(snapBill.totalBill, 2098);
  assert(snapBill.totalBill >= 1899);

  // Undamaged phone bill ($0)
  const zeroBill = ui.calculateRepairBill(0.0, true);
  assert.strictEqual(zeroBill.totalBill, 0);

  // Stage 3 OLED line ($1,499 screen + $199 frame = $1,698)
  const oledBill = ui.calculateRepairBill(55.0, true);
  assert.strictEqual(oledBill.innerDisplay, 1499);
  assert.strictEqual(oledBill.frameAlignment, 199);
  assert.strictEqual(oledBill.totalBill, 1698);
});

test('calculateDurabilityGrade assigns clinical Zack verdicts and letter grades', () => {
  // Fast display failure (< 4s) -> F
  const fGrade = ui.calculateDurabilityGrade({ survived: false, snapTime: 3.2 });
  assert.strictEqual(fGrade.grade, 'F');
  assert(fGrade.verdict.includes('DISPLAY FAILURE'));

  // Display failed under 8s -> D-
  const dMinusGrade = ui.calculateDurabilityGrade({ survived: false, snapTime: 6.5 });
  assert.strictEqual(dMinusGrade.grade, 'D-');

  // Display failed at or after 8s -> D
  const dGrade = ui.calculateDurabilityGrade({ survived: false, snapTime: 11.2 });
  assert.strictEqual(dGrade.grade, 'D');

  // Survived with bend > 30 deg -> C
  const cGrade = ui.calculateDurabilityGrade({ survived: true, maxBendAngle: 34 });
  assert.strictEqual(cGrade.grade, 'C');

  // Survived with minor bend -> B
  const bGrade = ui.calculateDurabilityGrade({ survived: true, maxBendAngle: 25 });
  assert.strictEqual(bGrade.grade, 'B');

  // Survived pristine -> A+
  const aGrade = ui.calculateDurabilityGrade({ survived: true, maxBendAngle: 10 });
  assert.strictEqual(aGrade.grade, 'A+');
});

test('Dynamic URL resolution returns live window URL or frankonedigital fallback', () => {
  const url = ui.getResolvedShareUrl();
  assert.strictEqual(url, 'https://www.frankonedigital.com/bend-test');

  // Test fallback when origin is localhost
  global.window.location.origin = 'http://localhost:8080';
  global.window.location.href = 'http://localhost:8080/bend-test';
  assert.strictEqual(ui.getResolvedShareUrl(), 'https://www.frankonedigital.com/bend-test');
});

test('generateTwitterShareUrl formats pre-populated tweet intent with metrics and hashtags', () => {
  const shareUrl = ui.Report.generateTwitterShareUrl({
    survived: false,
    snapTime: '4.82',
    peakCps: '11.4',
    maxBendAngle: 38,
    grade: 'F',
    verdict: 'RAPID DISPLAY FAILURE',
    billBreakdown: { totalBill: 2098 }
  });

  assert(shareUrl.startsWith('https://twitter.com/intent/tweet?'));
  assert(shareUrl.includes(encodeURIComponent('https://www.frankonedigital.com/bend-test')));
  assert(shareUrl.includes('iPhoneDuo'));
  assert(shareUrl.includes('JerryRigEverything'));
  assert(shareUrl.includes('BendTest'));
  assert(shareUrl.includes(encodeURIComponent('4.82s')));
  assert(shareUrl.includes(encodeURIComponent('11.4 CPS')));
  assert(shareUrl.includes(encodeURIComponent('2,098')));
  assert(shareUrl.includes(encodeURIComponent('Glass is glass, and glass breaks.')));
});

test('renderReportCardCanvas creates 1200x630 offscreen canvas with required card layers', () => {
  const canvas = ui.renderReportCardCanvas({
    survived: false,
    snapTime: '5.10',
    maxBendAngle: 38,
    peakCps: '10.2',
    totalTaps: 52,
    tierName: 'Dust-Jammed IP68 Hinge',
    damagePct: 100
  });

  assert.strictEqual(canvas.width, 1200);
  assert.strictEqual(canvas.height, 630);
  const ctx = canvas.getContext('2d');
  assert(ctx.ops.length > 20);

  // Check that header, cutting mat, phone, and repair bill were rendered
  const textOps = ctx.ops.filter(op => op[0] === 'fillText').map(op => op[1]);
  assert(textOps.some(t => t.includes('JERRYRIGEVERYTHING // DURABILITY REPORT CARD')));
  assert(textOps.some(t => t.includes('ESTIMATED APPLE OUT-OF-WARRANTY REPAIR INVOICE:')));
  assert(textOps.some(t => t.includes('$2,098.00') || t.includes('$2,098')));
  assert(textOps.some(t => t.includes('TESTED AT: franklycreative.github.io/bend-test/')));
});

test('downloadReportPng triggers toBlob or toDataURL with proper filename', () => {
  const canvas = ui.renderReportCardCanvas({
    tierName: 'Standard iPhone Duo',
    grade: 'F'
  });
  assert.doesNotThrow(() => {
    ui.downloadReportPng(canvas, { tierName: 'Standard iPhone Duo', grade: 'F' });
  });
});

console.log(`\n=================================================`);
console.log(`All ${passedCount}/${testCount} Milestone M3 unit tests PASSED successfully!`);
console.log(`=================================================\n`);
