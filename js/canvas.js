/**
 * JerryRigEverything iPhone Duo Bend Test Arcade Game
 * 2D / 2.5D HTML5 Canvas Rendering Engine (js/canvas.js)
 * 
 * High-performance, zero-external-dependency Canvas 2D rendering pipeline
 * modeled directly after the edge-on POV bend test frame from the
 * JerryRigEverything iPhone Duo Durability video:
 * - Pass 0: Viewport clear & trauma-based screen shake offset (max 16px amplitude).
 * - Pass 1: Scuffed white workbench tabletop with central desert sand & dirt mound
 *           from the IP68 hinge dust test.
 * - Pass 2: Authentic peripheral desk props from the video frame (angled glowing
 *           phone screen in top-left, interwoven steel chainmail scrubber in
 *           top-right, and orange disposable lighter on the right edge).
 * - Pass 3: Back-layer first-person index & middle fingers curling over the top of
 *           the left and right phone wings to pull the outer ends downward.
 * - Pass 4 & 5: Edge-on horizontal profile of the unfolded iPhone Duo (glossy dark
 *           titanium rails with polished chrome bevels, white antenna bands, side
 *           buttons, 6 speaker grille holes on right wing, sculpted white ceramic
 *           camera plateau & dark protruding lenses underneath left wing, and
 *           center hinge seam that kinks upward into a V-arch ^ as it bends).
 * - Pass 6: Progressive damage effects (widening hinge V-seam, glowing green/magenta
 *           OLED glitch lines, buckling/delaminating Ultra-Thin Glass ribbon,
 *           catastrophic snap with torn flex cables, glass shards, and sparks).
 * - Pass 7: Foreground first-person hands & proportional thumbs entering from the
 *           bottom-left (with black wristwatch edge) and bottom-right corners,
 *           bracing directly underneath the center hinge with transverse knuckle
 *           wrinkles and dynamic ischemic white-knuckle blanching.
 * - Pass 8: Floating damage labels, spark particle bursts, and arcade HUD overlays.
 * 
 * Compatible with both browser (window.JRE.CanvasRenderer) and Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js CommonJS
    const CanvasRenderer = factory();
    module.exports = CanvasRenderer;
    module.exports.CanvasRenderer = CanvasRenderer;
  } else {
    // Browser global
    root.JRE = root.JRE || {};
    const CanvasRenderer = factory();
    root.JRE.CanvasRenderer = CanvasRenderer;
    root.JRE_CanvasRenderer = CanvasRenderer;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this), function () {
  'use strict';

  // =========================================================================
  // 1. CONSTANTS & GEOMETRIC SPECIFICATIONS
  // =========================================================================

  const VIRTUAL_WIDTH = 1200;
  const VIRTUAL_HEIGHT = 800;

  // Canonical Phone Dimensions
  const PHONE_WIDTH = 380;
  const PHONE_HEIGHT = 480;
  const WING_WIDTH = 186;
  const HINGE_GAP = 8;
  const CORNER_RADIUS = 20;
  const CHASSIS_THICKNESS = 7.5;
  const CAMERA_DISTANCE = 650;
  const SLICES_PER_WING = 24;

  // Edge-On Profile Dimensions (matching reference frame)
  const EDGE_WING_LEN = 358; // Each unfolded half is 358px wide (~720px total span)
  const EDGE_RAIL_THICK = 22; // 22px metallic titanium rail thickness
  const EDGE_BASE_Y = -22; // Horizontal phone axis just above vertical center

  // Color Palette Constants
  const PALETTE = {
    matDark: '#d6d2c9',
    matBase: '#ebe8e1',
    matLight: '#f7f6f2',
    gridMajor: 'rgba(120, 115, 105, 0.12)',
    gridMinor: 'rgba(120, 115, 105, 0.05)',
    gridText: 'rgba(90, 85, 78, 0.35)',
    gridAngle: 'rgba(120, 115, 105, 0.08)',
    cutDark: 'rgba(60, 52, 42, 0.16)',
    cutLight: 'rgba(255, 255, 255, 0.45)',

    // Realistic First-Person Skin & Subsurface Blanching Palette (matched to gGAgL9-WQ5g)
    skinHighlight: '#f6c8a8',
    skinWarm: '#e6a37a',
    skinMid: '#cf8258',
    skinShadow: '#9e5432',
    skinDeepShadow: '#6e341b',
    skinContour: '#52230f',
    skinSubsurface: 'rgba(218, 86, 54, 0.24)',
    blanchBone: '#fff8f0',
    blanchPure: '#ffffff',
    erythemaRed: '#c93a3a',
    erythemaDeep: '#8f1f1f',
    nailBed: '#ecc5b4',
    nailLunula: 'rgba(255, 250, 246, 0.88)',

    // Titanium, Chrome & Ceramic
    titaniumLight: '#8a8e94',
    titaniumMid: '#5a5e64',
    titaniumDark: '#16181c',
    titaniumBevel: '#e4e9f2',
    ceramicWhite: '#eaedf2',
    ceramicShadow: '#c7cdd8',
    brassGold: '#c9a444',
    brassDark: '#8c6b1c',

    // OLED & Electronic Damage
    oledGreen: '#00ff55',
    oledGreenCore: '#ffffff',
    oledMagenta: '#ff0077',
    oledMagentaCore: '#ffffff',
    oledDead: 'rgba(10, 10, 15, 0.88)',

    // Glass & Sparks
    glassCrackDark: 'rgba(0, 0, 0, 0.70)',
    glassCrackLight: 'rgba(255, 255, 255, 0.92)',
    sparkYellow: '#ffea00',
    sparkCyan: '#00f0ff',
    dustSmoke: 'rgba(185, 170, 145, 0.52)'
  };

  // Helper to create safe offscreen canvas buffers in browser and mock environments
  function createBuffer(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        return new OffscreenCanvas(width, height);
      } catch (e) {}
    }
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      return c;
    }
    // Headless Mock Buffer fallback
    return {
      width: width,
      height: height,
      getContext: function () {
        return {
          canvas: this,
          fillStyle: '#000000',
          strokeStyle: '#000000',
          lineWidth: 1,
          lineCap: 'butt',
          lineJoin: 'miter',
          font: '10px sans-serif',
          textAlign: 'left',
          textBaseline: 'alphabetic',
          globalAlpha: 1.0,
          shadowColor: 'transparent',
          shadowBlur: 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          fillRect: () => {},
          strokeRect: () => {},
          clearRect: () => {},
          beginPath: () => {},
          closePath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          arc: () => {},
          ellipse: () => {},
          bezierCurveTo: () => {},
          quadraticCurveTo: () => {},
          fill: () => {},
          stroke: () => {},
          save: () => {},
          restore: () => {},
          translate: () => {},
          rotate: () => {},
          scale: () => {},
          setTransform: () => {},
          resetTransform: () => {},
          clip: () => {},
          drawImage: () => {},
          fillText: () => {},
          strokeText: () => {},
          roundRect: () => {},
          setLineDash: () => {},
          createLinearGradient: () => ({ addColorStop: () => {} }),
          createRadialGradient: () => ({ addColorStop: () => {} }),
          measureText: (txt) => ({ width: (txt ? String(txt).length * 8 : 0) }),
          getImageData: () => ({ data: new Uint8ClampedArray(4) }),
          putImageData: () => {}
        };
      },
      toDataURL: (type) => `data:${type || 'image/png'};base64,`
    };
  }

  // =========================================================================
  // 2. PROCEDURAL CRACK TREE GENERATOR (STOCHASTIC RECURSIVE FRACTURES)
  // =========================================================================

  class CrackBranch {
    constructor(x0, y0, angle, length, depth, seedRatio) {
      this.x0 = x0;
      this.y0 = y0;
      this.angle = angle;
      this.length = length;
      this.depth = depth;
      this.x1 = x0 + Math.cos(angle) * length;
      this.y1 = y0 + Math.sin(angle) * length;
      this.children = [];

      if (depth < 4 && length > 7) {
        const branchCount = (depth === 1) ? 2 : (seedRatio > 0.4 ? 2 : 1);
        for (let b = 0; b < branchCount; b++) {
          const spread = (b === 0 ? -0.42 : 0.48) * (0.8 + 0.4 * seedRatio);
          const nextLen = length * (0.62 + 0.28 * (1 - seedRatio));
          const nextAngle = angle + spread;
          const nextSeed = (seedRatio * 1.61803) % 1.0;
          this.children.push(new CrackBranch(this.x1, this.y1, nextAngle, nextLen, depth + 1, nextSeed));
        }
      }
    }

    draw(ctx, maxVisibleDepth) {
      if (this.depth > maxVisibleDepth) return;

      ctx.strokeStyle = PALETTE.glassCrackDark;
      ctx.lineWidth = Math.max(0.6, 2.2 - this.depth * 0.45);
      ctx.beginPath();
      ctx.moveTo(this.x0 + 0.8, this.y0 + 0.8);
      ctx.lineTo(this.x1 + 0.8, this.y1 + 0.8);
      ctx.stroke();

      ctx.strokeStyle = PALETTE.glassCrackLight;
      ctx.lineWidth = Math.max(0.4, 1.4 - this.depth * 0.25);
      ctx.beginPath();
      ctx.moveTo(this.x0, this.y0);
      ctx.lineTo(this.x1, this.y1);
      ctx.stroke();

      for (let i = 0; i < this.children.length; i++) {
        this.children[i].draw(ctx, maxVisibleDepth);
      }
    }
  }

  // =========================================================================
  // 3. PARTICLE SYSTEMS (GLASS SHARDS, ELECTRICAL SPARKS & SAND/DUST PUFFS)
  // =========================================================================

  class ParticlePool {
    constructor(maxParticles = 220) {
      this.maxParticles = maxParticles;
      this.particles = [];
      for (let i = 0; i < maxParticles; i++) {
        this.particles.push({
          active: false,
          type: 'spark',
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          prevX: 0,
          prevY: 0,
          size: 2,
          rotation: 0,
          vRot: 0,
          life: 0,
          maxLife: 1,
          color: '#ffffff',
          alpha: 1.0
        });
      }
    }

    spawn(type, x, y, count = 1, options = {}) {
      let spawned = 0;
      for (let i = 0; i < this.particles.length && spawned < count; i++) {
        const p = this.particles[i];
        if (!p.active) {
          p.active = true;
          p.type = type;
          p.x = x + (Math.random() - 0.5) * (options.spreadX || 24);
          p.y = y + (Math.random() - 0.5) * (options.spreadY || 16);
          p.prevX = p.x;
          p.prevY = p.y;
          p.life = 0;

          if (type === 'shard') {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
            const speed = 130 + Math.random() * 280;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed - 60;
            p.size = 3 + Math.random() * 6.5;
            p.rotation = Math.random() * Math.PI * 2;
            p.vRot = (Math.random() - 0.5) * 18;
            p.maxLife = 0.6 + Math.random() * 0.6;
            p.color = 'rgba(235, 248, 255, 0.90)';
          } else if (type === 'spark') {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.0;
            const speed = 220 + Math.random() * 440;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.size = 1.6 + Math.random() * 2.6;
            p.rotation = 0;
            p.vRot = 0;
            p.maxLife = 0.18 + Math.random() * 0.28;
            p.color = Math.random() < 0.6 ? PALETTE.sparkYellow : PALETTE.sparkCyan;
          } else if (type === 'dust') {
            const angle = Math.random() * Math.PI * 2;
            const speed = 25 + Math.random() * 75;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed + 25;
            p.size = 6 + Math.random() * 14;
            p.rotation = Math.random() * Math.PI * 2;
            p.vRot = (Math.random() - 0.5) * 2;
            p.maxLife = 0.5 + Math.random() * 0.5;
            p.color = PALETTE.dustSmoke;
          }
          spawned++;
        }
      }
    }

    update(dt) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (!p.active) continue;

        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }

        p.prevX = p.x;
        p.prevY = p.y;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.type === 'shard') {
          p.vy += 550 * dt;
          p.rotation += p.vRot * dt;
          p.alpha = Math.max(0, 1.0 - (p.life / p.maxLife));
        } else if (p.type === 'spark') {
          p.vy += 350 * dt;
          p.vx *= Math.pow(0.1, dt);
          p.alpha = Math.max(0, 1.0 - (p.life / p.maxLife));
        } else if (p.type === 'dust') {
          p.size += 28 * dt;
          p.alpha = Math.max(0, (1.0 - (p.life / p.maxLife)) * 0.52);
        }
      }
    }

    draw(ctx) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (!p.active) continue;

        ctx.save();
        ctx.globalAlpha = p.alpha;

        if (p.type === 'shard') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(-p.size, -p.size * 0.6);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(-p.size * 0.2, p.size);
          ctx.closePath();
          ctx.fill();
        } else if (p.type === 'spark') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(p.prevX, p.prevY);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        } else if (p.type === 'dust') {
          const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, 'rgba(185, 170, 145, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    clear() {
      for (let i = 0; i < this.particles.length; i++) {
        this.particles[i].active = false;
      }
    }
  }

  // =========================================================================
  // 4. MAIN CANVAS RENDERER CLASS
  // =========================================================================

  class CanvasRenderer {
    constructor(canvas, options = {}) {
      this.canvas = canvas || null;
      this.ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
      this.options = Object.assign({
        enableHiDPI: true,
        enableShake: true,
        enableParticles: true,
        viewMode: 'front',
        showProps: true,
        showHud: true
      }, options);

      this.width = canvas ? (canvas.width || 800) : 800;
      this.height = canvas ? (canvas.height || 600) : 600;
      this.dpr = 1.0;

      // Camera trauma and shake state (Pass 0)
      this.trauma = 0.0;
      this.shakeTime = 0.0;
      this.shakeX = 0.0;
      this.shakeY = 0.0;
      this.shakeAngle = 0.0;

      // Micro-squeeze & tap-pump spring dynamics for all fingers & hands (Pass 3 & 7)
      this.leftSqueeze = 0.0;
      this.rightSqueeze = 0.0;
      this.tapPump = 0.0;
      this._lastTotalTaps = 0;
      this.lastActiveHand = null;
      this._leftGripStrain = 0;
      this._rightGripStrain = 0;
      this._gripTrembleX = 0;
      this._gripTrembleY = 0;

      // Current frame bend kinematics shared between phone and hands
      this._currentWingAngle = 0.04;
      this._currentHingeY = EDGE_BASE_Y;
      this._currentBendDeg = 0.0;
      this._currentDamagePct = 0.0;
      this._currentOrientation = 'REVERSE_BEND';
      this._currentTierId = 'standard';

      // Floating damage labels pool (Pass 8)
      this.floatingLabels = [];

      // Particle system (Pass 6 & 8)
      this.particlePool = new ParticlePool(220);

      // Procedural glass fracture trees
      this._initGlassFractures();

      // Pre-cached table score marks & grit
      this._initMatScoreMarks();

      // Offscreen buffers for Phone Face & Desk Props/Sand (1600x900 widescreen bleed)
      this.phoneBuffer = createBuffer(PHONE_WIDTH, PHONE_HEIGHT);
      this.phoneCtx = this.phoneBuffer.getContext('2d');

      this.propsBuffer = createBuffer(1600, 900);
      this.propsCtx = this.propsBuffer.getContext('2d');
      this._renderStaticProps(this.propsCtx);

      // Track stage transitions for particle/label bursts
      this._lastDamageStage = 1;
      this._lastDamagePct = 0;
      this._lastOrientation = null;

      // Auto-resize if in browser
      if (typeof window !== 'undefined' && this.canvas) {
        this.resize();
        this._boundResize = () => this.resize();
        window.addEventListener('resize', this._boundResize);
      }
    }

    // =======================================================================
    // 4.1 INITIALIZATION & PRE-CACHING
    // =======================================================================

    _initGlassFractures() {
      this.crackRoots = [];
      const seeds = [
        { y: -160, angle: -0.25, len: 95 },
        { y: -90, angle: 0.15, len: 125 },
        { y: -10, angle: -0.10, len: 155 },
        { y: 60, angle: 0.30, len: 110 },
        { y: 130, angle: -0.22, len: 140 },
        { y: 195, angle: 0.18, len: 85 }
      ];

      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        this.crackRoots.push(new CrackBranch(0, s.y, Math.PI + s.angle, s.len, 1, 0.35 + i * 0.1));
        this.crackRoots.push(new CrackBranch(0, s.y, s.angle, s.len, 1, 0.65 - i * 0.1));
      }
    }

    _initMatScoreMarks() {
      this.matScoreMarks = [];
      this.tableGritSpecks = [];
      let pseudoRand = 42;
      const nextRand = () => {
        pseudoRand = (pseudoRand * 1664525 + 1013904223) % 4294967296;
        return pseudoRand / 4294967296;
      };

      // Subtle desk surface scratches
      for (let i = 0; i < 45; i++) {
        const x = (nextRand() - 0.5) * 1140;
        const y = (nextRand() - 0.5) * 760;
        const len = 18 + nextRand() * 60;
        const angle = nextRand() * Math.PI * 2;
        this.matScoreMarks.push({
          x0: x,
          y0: y,
          x1: x + Math.cos(angle) * len,
          y1: y + Math.sin(angle) * len
        });
      }

      // Scattered dark sand/dirt specks across the white tabletop
      const speckColors = ['#2c251d', '#544636', '#7a6852', '#3d352b', '#8f7c63'];
      for (let i = 0; i < 320; i++) {
        const angle = nextRand() * Math.PI * 2;
        const dist = 160 + nextRand() * 440;
        this.tableGritSpecks.push({
          x: Math.cos(angle) * dist * 1.15,
          y: Math.sin(angle) * dist * 0.82,
          r: 0.8 + nextRand() * 2.4,
          color: speckColors[i % speckColors.length]
        });
      }
    }

    /**
     * Resizes the canvas to match client dimensions and adjusts for HiDPI/Retina.
     */
    resize(customWidth = null, customHeight = null) {
      if (!this.canvas) return;

      const clientW = customWidth || this.canvas.clientWidth || window.innerWidth || 1200;
      const clientH = customHeight || this.canvas.clientHeight || window.innerHeight || 800;

      this.dpr = this.options.enableHiDPI && typeof window !== 'undefined' && window.devicePixelRatio
        ? Math.min(window.devicePixelRatio, 2.0)
        : 1.0;

      this.width = clientW;
      this.height = clientH;

      this.canvas.width = Math.round(clientW * this.dpr);
      this.canvas.height = Math.round(clientH * this.dpr);

      // CSS keeps the canvas fitted to its viewport. Setting inline pixel sizes
      // here would freeze its layout size and prevent later window resizes.
    }

    // =======================================================================
    // 4.2 PASS 0: VIEWPORT CLEAR & TRAUMA-BASED SCREEN SHAKE
    // =======================================================================

    _applyScreenShake(ctx, dt, snapshot) {
      if (!this.options.enableShake) {
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeAngle = 0;
        return;
      }

      if (snapshot && typeof snapshot.shakeTrauma === 'number') {
        this.trauma = Math.max(this.trauma, snapshot.shakeTrauma);
      }

      this.shakeTime += dt;

      const magnitude = Math.pow(Math.min(1.0, this.trauma), 2);
      const amp = magnitude * 16.0;

      if (amp > 0.05) {
        this.shakeX = amp * Math.sin(this.shakeTime * 48.0);
        this.shakeY = amp * 0.85 * Math.cos(this.shakeTime * 56.0);
        this.shakeAngle = magnitude * 0.028 * Math.sin(this.shakeTime * 38.0);
      } else {
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeAngle = 0;
      }

      this.trauma = Math.max(0, this.trauma - 1.25 * dt);
    }

    triggerTrauma(amount = 0.4) {
      this.trauma = Math.min(1.0, this.trauma + amount);
    }

    // =======================================================================
    // 4.3 PASS 1: SCUFFED WHITE WORKBENCH SURFACE
    // =======================================================================

    _renderCuttingMat(ctx, viewLeft, viewTop, viewRight, viewBottom) {
      // 1. Matte Off-White Studio Workbench Surface (matching reference video frame)
      const baseGrad = ctx.createRadialGradient(-40, -120, 80, 0, 0, Math.max(VIRTUAL_WIDTH, VIRTUAL_HEIGHT) * 0.9);
      baseGrad.addColorStop(0, PALETTE.matLight);
      baseGrad.addColorStop(0.65, PALETTE.matBase);
      baseGrad.addColorStop(1, PALETTE.matDark);

      ctx.fillStyle = baseGrad;
      ctx.fillRect(viewLeft, viewTop, viewRight - viewLeft, viewBottom - viewTop);

      // 2. Subtle Razor Scuffs on Workbench
      for (let i = 0; i < this.matScoreMarks.length; i++) {
        const c = this.matScoreMarks[i];
        ctx.strokeStyle = PALETTE.cutDark;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(c.x0, c.y0);
        ctx.lineTo(c.x1, c.y1);
        ctx.stroke();
      }

      // 3. Scattered Stray Dirt & Sand Specks on White Tabletop
      for (let i = 0; i < this.tableGritSpecks.length; i++) {
        const sp = this.tableGritSpecks[i];
        ctx.fillStyle = sp.color;
        ctx.fillRect(sp.x, sp.y, sp.r, sp.r);
      }
    }

    // =======================================================================
    // 4.4 PASS 2: SAND/DIRT MOUND & AUTHENTIC DESK PROPS FROM VIDEO FRAME
    // =======================================================================

    _renderStaticProps(ctx) {
      ctx.save();
      ctx.translate(800, 450);

      // Deterministic PRNG for granular sand & chainmail texture
      let seed = 133742;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      // =====================================================================
      // 1. CENTRAL DESERT SAND & DIRT MOUND (FROM IP68 HINGE DUST TEST)
      // =====================================================================
      ctx.save();

      // Organic multi-lobed base wash (no sharp circular rings)
      const sandLobes = [
        { x: -75, y: -95, rx: 240, ry: 185, rot: -0.25, c0: 'rgba(165, 148, 122, 0.72)' },
        { x: 55, y: -85, rx: 220, ry: 175, rot: 0.22, c0: 'rgba(172, 155, 128, 0.68)' },
        { x: -135, y: 15, rx: 230, ry: 155, rot: -0.15, c0: 'rgba(158, 140, 114, 0.75)' },
        { x: 115, y: 20, rx: 215, ry: 145, rot: 0.18, c0: 'rgba(162, 145, 118, 0.70)' },
        { x: -5, y: -15, rx: 270, ry: 195, rot: 0.05, c0: 'rgba(142, 126, 98, 0.82)' },
        { x: -8, y: 155, rx: 215, ry: 190, rot: -0.06, c0: 'rgba(78, 70, 50, 0.88)' },
        { x: -25, y: 245, rx: 175, ry: 155, rot: 0.12, c0: 'rgba(56, 50, 35, 0.90)' },
        { x: 35, y: 255, rx: 165, ry: 145, rot: -0.14, c0: 'rgba(52, 46, 32, 0.88)' }
      ];

      for (let i = 0; i < sandLobes.length; i++) {
        const lb = sandLobes[i];
        ctx.save();
        ctx.translate(lb.x, lb.y);
        ctx.rotate(lb.rot);
        ctx.scale(lb.rx, lb.ry);
        const g = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1.0);
        g.addColorStop(0, lb.c0);
        g.addColorStop(0.55, lb.c0.replace(/[\d.]+\)$/, '0.38)'));
        g.addColorStop(1, 'rgba(210, 198, 180, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 14,000+ Multi-Sized Irregular Sand Grains, Grit & Soil Clumps
      const lightSandPalette = [
        '#e3d8c6', '#cfc0a8', '#baa689', '#a38e70',
        '#8a7558', '#6e5b42', '#52432f', '#f4efe6', '#7d6c55'
      ];
      const darkEarthPalette = [
        '#262116', '#363020', '#4a422d', '#5e543b',
        '#75694b', '#8c7e5d', '#1c1810', '#695d42', '#3f3826'
      ];

      for (let g = 0; g < 14000; g++) {
        // Organic irregular distribution with angular lobes
        const u = (rand() + rand() + rand()) / 3.0 - 0.5;
        const v = (rand() + rand() + rand()) / 3.0 - 0.5;
        const gx = -18 + u * 880 + (rand() - 0.5) * 45;
        const gy = 20 + v * 800 + (rand() - 0.5) * 45;

        const angle = Math.atan2(gy + 20, gx + 20);
        const lobeWobble = 1.0 + 0.14 * Math.sin(angle * 5.0) + 0.10 * Math.cos(angle * 3.0);

        const normUpper = (Math.pow((gx + 25) / 360, 2) + Math.pow((gy + 45) / 270, 2)) / lobeWobble;
        const normLower = (Math.pow((gx + 5) / 235, 2) + Math.pow((gy - 180) / 235, 2)) / lobeWobble;

        if (normUpper <= 1.12 || normLower <= 1.12) {
          const isLowerDark = (gy > 20 && Math.abs(gx) < 205 - (gy - 20) * 0.12);
          const pal = isLowerDark ? darkEarthPalette : lightSandPalette;
          ctx.fillStyle = pal[g % pal.length];

          if (g % 29 === 0) {
            // Small pebble / coarse dirt grain
            const pw = 2.8 + (g % 3) * 1.1;
            const ph = 2.2 + (g % 2) * 1.0;
            ctx.fillStyle = 'rgba(46, 38, 27, 0.22)';
            ctx.fillRect(gx + 0.9, gy + 1.0, pw, ph);
            ctx.fillStyle = pal[g % pal.length];
            ctx.beginPath();
            ctx.moveTo(gx, gy + ph * 0.3);
            ctx.lineTo(gx + pw * 0.62, gy);
            ctx.lineTo(gx + pw, gy + ph * 0.68);
            ctx.lineTo(gx + pw * 0.35, gy + ph);
            ctx.closePath();
            ctx.fill();
          } else {
            const sz = (g % 7 === 0) ? 2.3 : ((g % 3 === 0) ? 1.7 : 1.15);
            ctx.fillRect(gx, gy, sz, sz);
          }
        } else if (normUpper <= 1.65 && rand() < 0.26) {
          // Scattered stray sand grains on the surrounding white workbench
          ctx.fillStyle = lightSandPalette[g % 7];
          const sz = (g % 5 === 0) ? 2.0 : 1.3;
          ctx.fillRect(gx, gy, sz, sz);
        }
      }
      ctx.restore();

      // =====================================================================
      // 2. TOP-LEFT PROP: ANGLED GLOWING PHONE CORNER (EXTENDING OFF LEFT EDGE)
      // =====================================================================
      ctx.save();
      ctx.translate(-565, -245);
      ctx.rotate(-0.43);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 8;

      // Brushed Silver-Titanium Side Chassis
      ctx.fillStyle = '#9aa1ab';
      ctx.beginPath();
      ctx.roundRect(-240, -250, 340, 420, 24);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.strokeStyle = '#d4dae2';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-238, -248, 336, 416);
      ctx.fillStyle = '#686f78';
      ctx.fillRect(94, -60, 6, 10);

      // Inner Glowing Display Wallpaper (White/Yellow/Orange/Blue/Purple)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-232, -242, 324, 404, 18);
      ctx.clip();

      const screenGrad = ctx.createLinearGradient(-220, -180, 100, 140);
      screenGrad.addColorStop(0, '#ff4800');
      screenGrad.addColorStop(0.28, '#ffae00');
      screenGrad.addColorStop(0.52, '#ffffff');
      screenGrad.addColorStop(0.75, '#ff9000');
      screenGrad.addColorStop(1, '#d43800');
      ctx.fillStyle = screenGrad;
      ctx.fillRect(-240, -250, 340, 420);

      // Electric Blue & Violet Orbs near bottom-right and left of that screen
      const blueOrb = ctx.createRadialGradient(25, 120, 6, 25, 120, 62);
      blueOrb.addColorStop(0, '#a8e6ff');
      blueOrb.addColorStop(0.35, '#1a66ff');
      blueOrb.addColorStop(0.7, '#5900ff');
      blueOrb.addColorStop(1, 'rgba(89, 0, 255, 0)');
      ctx.fillStyle = blueOrb;
      ctx.beginPath();
      ctx.arc(25, 120, 62, 0, Math.PI * 2);
      ctx.fill();

      const purpleOrb = ctx.createRadialGradient(45, -10, 5, 45, -10, 68);
      purpleOrb.addColorStop(0, 'rgba(130, 50, 255, 0.85)');
      purpleOrb.addColorStop(0.6, 'rgba(210, 60, 180, 0.45)');
      purpleOrb.addColorStop(1, 'rgba(255, 120, 0, 0)');
      ctx.fillStyle = purpleOrb;
      ctx.beginPath();
      ctx.arc(45, -10, 68, 0, Math.PI * 2);
      ctx.fill();

      const leftBlueOrb = ctx.createRadialGradient(-95, 35, 5, -95, 35, 65);
      leftBlueOrb.addColorStop(0, '#00ccff');
      leftBlueOrb.addColorStop(0.5, '#0044ff');
      leftBlueOrb.addColorStop(1, 'rgba(0, 68, 255, 0)');
      ctx.fillStyle = leftBlueOrb;
      ctx.beginPath();
      ctx.arc(-95, 35, 65, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.restore();

      // =====================================================================
      // 3. TOP-RIGHT PROP: INTERWOVEN STEEL CHAINMAIL SCRUBBER MESH
      // =====================================================================
      ctx.save();

      // Golden-brass bar peeking underneath the lower edge of the chainmail
      ctx.save();
      ctx.translate(425, -110);
      ctx.rotate(0.48);
      const brassBarGrad = ctx.createLinearGradient(-70, -10, 70, 10);
      brassBarGrad.addColorStop(0, '#7a5c18');
      brassBarGrad.addColorStop(0.5, '#d4af4c');
      brassBarGrad.addColorStop(1, '#6e5012');
      ctx.fillStyle = brassBarGrad;
      ctx.fillRect(-75, -11, 150, 22);
      ctx.restore();

      // Interlocking 3D stainless steel rings across the top-right corner
      for (let row = 0; row < 19; row++) {
        for (let col = 0; col < 30; col++) {
          const rx = 185 + col * 21 + (row % 2) * 10.5 + (rand() - 0.5) * 4.5;
          const ry = -435 + row * 23 + (rand() - 0.5) * 4.5;

          const diagLimit = -365 + (rx - 185) * 0.85 + Math.sin(row * 0.9) * 18;
          if (ry > diagLimit) continue;

          const rad = 11.5 + (rand() - 0.5) * 1.8;
          const tilt = ((row + col) % 2 === 0 ? 0.35 : -0.35) + (rand() - 0.5) * 0.25;

          ctx.save();
          ctx.translate(rx, ry);
          ctx.rotate(tilt);

          ctx.strokeStyle = 'rgba(15, 18, 22, 0.72)';
          ctx.lineWidth = 4.6;
          ctx.beginPath();
          ctx.ellipse(1.5, 2.0, rad, rad * 0.82, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#5c646e';
          ctx.lineWidth = 3.8;
          ctx.beginPath();
          ctx.ellipse(0, 0, rad, rad * 0.82, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#eef3f9';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(-0.5, -0.5, rad, rad * 0.82, 0, -Math.PI * 0.85, Math.PI * 0.15);
          ctx.stroke();

          ctx.restore();
        }
      }
      ctx.restore();

      // =====================================================================
      // 4. RIGHT-EDGE PROP: ZACK'S ORANGE LIGHTER (PEEKING BEHIND RIGHT HAND)
      // =====================================================================
      ctx.save();
      ctx.translate(585, 35);
      ctx.rotate(-0.55);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.32)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = -3;
      ctx.shadowOffsetY = 5;

      const lighterGrad = ctx.createLinearGradient(-24, 0, 24, 0);
      lighterGrad.addColorStop(0, '#ff7722');
      lighterGrad.addColorStop(0.45, '#ff4d00');
      lighterGrad.addColorStop(1, '#c93000');
      ctx.fillStyle = lighterGrad;
      ctx.beginPath();
      ctx.roundRect(-24, -45, 48, 175, 8);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-13, -38);
      ctx.lineTo(-13, 95);
      ctx.stroke();

      const hoodGrad = ctx.createLinearGradient(-18, -80, 18, -45);
      hoodGrad.addColorStop(0, '#f0f4f8');
      hoodGrad.addColorStop(0.5, '#9ea7b2');
      hoodGrad.addColorStop(1, '#586069');
      ctx.fillStyle = hoodGrad;
      ctx.beginPath();
      ctx.roundRect(-18, -78, 36, 35, [6, 6, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#ff1e1e';
      ctx.beginPath();
      ctx.roundRect(-22, -56, 14, 14, 4);
      ctx.fill();

      // Authentic BiC logo oval badge near top of orange body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-2, -30, 12, 6, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#181818';
      ctx.font = '900 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BiC', -1, -30);

      ctx.restore();

      ctx.restore();
    }

    // =======================================================================
    // 4.5 PASS 5: PHONE BUFFER (USED FOR TEXTURE / COMPATIBILITY)
    // =======================================================================

    _renderPhoneFace(viewMode, damagePct, force) {
      const ctx = this.phoneCtx;
      const W = PHONE_WIDTH;
      const H = PHONE_HEIGHT;

      ctx.clearRect(0, 0, W, H);

      // Render metallic titanium texture strip into phoneBuffer so any 24-strip slice
      // sampling remains crisp and consistent
      const railGrad = ctx.createLinearGradient(0, 0, 0, H);
      railGrad.addColorStop(0, '#e2e7f0');
      railGrad.addColorStop(0.12, '#1b1e24');
      railGrad.addColorStop(0.50, '#2c313a');
      railGrad.addColorStop(0.88, '#101216');
      railGrad.addColorStop(1, '#9aa1ab');
      ctx.fillStyle = railGrad;
      ctx.fillRect(0, 0, W, H);

      if (damagePct >= 50.0) {
        this._drawOLEDGlitchLine(ctx, W / 2 + 12, H, PALETTE.oledGreen, PALETTE.oledGreenCore);
      }
    }

    _drawOLEDGlitchLine(ctx, x, height, glowColor, coreColor) {
      ctx.save();
      const jitter = (Math.random() - 0.5) * 0.8;

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 3.0;
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.moveTo(x + jitter, 0);
      ctx.lineTo(x + jitter, height);
      ctx.stroke();

      ctx.shadowBlur = 4;
      ctx.strokeStyle = coreColor;
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = 0.96;
      ctx.beginPath();
      ctx.moveTo(x + jitter, 0);
      ctx.lineTo(x + jitter, height);
      ctx.stroke();

      ctx.restore();
    }

    // =======================================================================
    // 4.6 PASS 3, 4 & 6: EDGE-ON IPHONE DUO PROFILE & BENDING KINEMATICS
    // =======================================================================

    _computeBendKinematics(bendAngleDeg, orientation, damagePct) {
      // The HUD angle is the change in angle between the two halves. Give
      // each wing half of that angle so the silhouette agrees with the readout.
      // A small tap impulse provides tactile feedback without inventing a large bend.
      const pumpExtraDeg = (this.tapPump || 0) * 1.0;
      const clampedDeg = Math.max(0, Math.min(38, (bendAngleDeg || 0) + pumpExtraDeg));
      const isReverse = (orientation !== 'FRONT_BEND');

      // The thumbs brace the hinge while the fingers pull the ends down.
      const wingAngle = clampedDeg * 0.5 * (Math.PI / 180);
      const hingeY = EDGE_BASE_Y - Math.sin(wingAngle) * 116 - (this.tapPump || 0) * 1.0;

      this._currentWingAngle = wingAngle;
      this._currentHingeY = hingeY;
      this._currentBendDeg = clampedDeg;
      this._currentDamagePct = damagePct || 0;
      this._currentOrientation = orientation || 'REVERSE_BEND';

      return { wingAngle, hingeY, isReverse, clampedDeg };
    }

    /**
     * Renders the articulated upper Ring, Middle, and Index fingers curling over
     * the top face of the left and right phone wings. All fingers dynamically
     * curl downward, slide inward, and flex their knuckles on every tap and bend!
     */
    _renderBackFingers(ctx, wingAngle, hingeY, hingeGap, strain) {
      const halfH = EDGE_RAIL_THICK / 2;
      const tx = this._gripTrembleX || 0;
      const ty = this._gripTrembleY || 0;
      const leftStrain = this._leftGripStrain || 0;
      const rightStrain = this._rightGripStrain || 0;

      const bendRatio = Math.min(1.0, (this._currentBendDeg || 0) / 38.0);
      const lFlex = Math.min(1.35, (this.leftSqueeze || 0) * 0.85 + bendRatio * 0.75);
      const rFlex = Math.min(1.35, (this.rightSqueeze || 0) * 0.85 + bendRatio * 0.75);

      // --- LEFT HAND UPPER FINGERS (RING, MIDDLE, INDEX IN LEFT WING ROTATED FRAME) ---
      ctx.save();
      ctx.translate(-hingeGap + tx, hingeY + halfH + ty);
      ctx.rotate(-wingAngle);
      ctx.translate(0, -halfH);

      // 1. Left Ring Finger (innermost upper finger hooking over top rail at u = -195..-96)
      ctx.save();
      ctx.translate(lFlex * 12, lFlex * 10);
      ctx.rotate(-lFlex * 0.06);
      const lRingGrad = ctx.createLinearGradient(-160, -54, -140, -6);
      lRingGrad.addColorStop(0, '#d8926c');
      lRingGrad.addColorStop(0.65, '#ba714c');
      lRingGrad.addColorStop(1, '#87482a');
      ctx.fillStyle = lRingGrad;
      ctx.beginPath();
      ctx.moveTo(-225, -36);
      ctx.bezierCurveTo(-195, -56, -138, -52, -104, -34);
      ctx.bezierCurveTo(-88, -24, -90, -8, -114, -6);
      ctx.lineTo(-235, -6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 2. Left Middle Finger (curling over top rail at u = -315..-132)
      ctx.save();
      ctx.translate(lFlex * 15, lFlex * 12);
      ctx.rotate(-lFlex * 0.08);
      const lMidGrad = ctx.createLinearGradient(-250, -66, -210, -6);
      lMidGrad.addColorStop(0, '#e8a57e');
      lMidGrad.addColorStop(0.6, '#cc845e');
      lMidGrad.addColorStop(1, '#965436');
      ctx.fillStyle = lMidGrad;
      ctx.beginPath();
      ctx.moveTo(-328, -44);
      ctx.bezierCurveTo(-280, -68, -195, -64, -142, -44);
      ctx.bezierCurveTo(-118, -34, -120, -10, -148, -6);
      ctx.lineTo(-335, -6);
      ctx.closePath();
      ctx.fill();

      // Left Middle Finger Knuckle Crease
      ctx.strokeStyle = 'rgba(104, 50, 28, 0.45)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-212, -59);
      ctx.quadraticCurveTo(-206, -34, -214, -10);
      ctx.stroke();
      ctx.restore();

      // 3. Left Index Finger (outer finger hooking around left wing tip u = -434..-215)
      ctx.save();
      ctx.translate(lFlex * 10, lFlex * 14);
      ctx.rotate(-lFlex * 0.09);
      const lIdxGrad = ctx.createLinearGradient(-310, -68, -290, -6);
      lIdxGrad.addColorStop(0, '#f4c2a0');
      lIdxGrad.addColorStop(0.55, '#dfa07a');
      lIdxGrad.addColorStop(0.88, '#bc7652');
      lIdxGrad.addColorStop(1, '#8c4c2e');
      ctx.fillStyle = lIdxGrad;

      ctx.beginPath();
      ctx.moveTo(-434, 38);
      ctx.bezierCurveTo(-424, -26, -396, -68, -342, -68);
      ctx.bezierCurveTo(-288, -67, -238, -58, -198, -44);
      ctx.bezierCurveTo(-176, -36, -176, -10, -202, -6);
      ctx.lineTo(-368, -6);
      ctx.lineTo(-434, 38);
      ctx.closePath();
      ctx.fill();

      // Knuckle Blanching & Joint Crease on Left Index Finger
      this._drawBlanchingPressureNode(ctx, -315, -36, 26, 14, Math.min(1.0, leftStrain + lFlex * 0.45));
      ctx.strokeStyle = 'rgba(98, 46, 24, 0.52)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-284, -64);
      ctx.quadraticCurveTo(-276, -34, -286, -8);
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      // --- RIGHT HAND UPPER FINGERS (RING, MIDDLE, INDEX IN RIGHT WING ROTATED FRAME) ---
      ctx.save();
      ctx.translate(hingeGap - tx, hingeY + halfH + ty);
      ctx.rotate(wingAngle);
      ctx.translate(0, -halfH);

      // 1. Right Ring Finger (innermost upper finger hooking over top rail at u = +100..+215)
      ctx.save();
      ctx.translate(-rFlex * 12, rFlex * 10);
      ctx.rotate(rFlex * 0.06);
      const rRingGrad = ctx.createLinearGradient(160, -56, 145, -6);
      rRingGrad.addColorStop(0, '#d8926c');
      rRingGrad.addColorStop(0.65, '#ba714c');
      rRingGrad.addColorStop(1, '#87482a');
      ctx.fillStyle = rRingGrad;
      ctx.beginPath();
      ctx.moveTo(232, -38);
      ctx.bezierCurveTo(198, -58, 142, -54, 108, -36);
      ctx.bezierCurveTo(92, -26, 94, -8, 118, -6);
      ctx.lineTo(240, -6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 2. Right Middle Finger (curling over top rail at u = +142..+325)
      ctx.save();
      ctx.translate(-rFlex * 15, rFlex * 12);
      ctx.rotate(rFlex * 0.08);
      const rMidFingerGrad = ctx.createLinearGradient(235, -70, 215, -6);
      rMidFingerGrad.addColorStop(0, '#e8a57e');
      rMidFingerGrad.addColorStop(0.6, '#cc845e');
      rMidFingerGrad.addColorStop(1, '#965436');
      ctx.fillStyle = rMidFingerGrad;
      ctx.beginPath();
      ctx.moveTo(332, -46);
      ctx.bezierCurveTo(282, -70, 198, -66, 148, -46);
      ctx.bezierCurveTo(124, -36, 126, -10, 154, -6);
      ctx.lineTo(340, -6);
      ctx.closePath();
      ctx.fill();

      // Right Middle Finger Knuckle Crease
      ctx.strokeStyle = 'rgba(104, 50, 28, 0.48)';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(218, -62);
      ctx.quadraticCurveTo(212, -34, 222, -10);
      ctx.stroke();
      ctx.restore();

      // 3. Right Index Finger (outer finger hooking around right wing tip u = +205..+438)
      ctx.save();
      ctx.translate(-rFlex * 10, rFlex * 14);
      ctx.rotate(rFlex * 0.09);
      const rIdxGrad = ctx.createLinearGradient(310, -72, 290, -6);
      rIdxGrad.addColorStop(0, '#f0ba98');
      rIdxGrad.addColorStop(0.55, '#dc9b74');
      rIdxGrad.addColorStop(0.88, '#b8724e');
      rIdxGrad.addColorStop(1, '#87482b');
      ctx.fillStyle = rIdxGrad;

      ctx.beginPath();
      ctx.moveTo(438, 38);
      ctx.bezierCurveTo(426, -30, 394, -72, 338, -72);
      ctx.bezierCurveTo(285, -71, 240, -60, 202, -46);
      ctx.bezierCurveTo(180, -38, 180, -10, 206, -6);
      ctx.lineTo(368, -6);
      ctx.lineTo(438, 38);
      ctx.closePath();
      ctx.fill();

      // Knuckle Blanching & Joint Crease on Right Index Finger
      this._drawBlanchingPressureNode(ctx, 315, -38, 26, 14, Math.min(1.0, rightStrain + rFlex * 0.45));
      ctx.strokeStyle = 'rgba(98, 48, 26, 0.54)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(278, -68);
      ctx.quadraticCurveTo(286, -36, 292, -10);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    }

    _renderPerspectivePhone(ctx, bendAngleDeg, orientation) {
      const damagePct = this._currentDamagePct || 0;
      const { wingAngle, hingeY, isReverse, clampedDeg } = this._computeBendKinematics(
        bendAngleDeg,
        orientation,
        damagePct
      );

      const N = SLICES_PER_WING;
      const sliceW = EDGE_WING_LEN / N;
      const halfH = EDGE_RAIL_THICK / 2;
      // Bottom inner corners pivot right next to each other (1.2px) so the top
      // corners naturally open into the crisp silver V-cleft (\ /) as wingAngle increases!
      const hingeGap = 1.2;
      this._currentHingeGap = hingeGap;

      // 1. Render Upper Fingers Curling Behind/Over the Phone Wings
      this._renderBackFingers(ctx, wingAngle, hingeY, hingeGap, this._currentStrain || 0);

      // 2. Render Center V-Notch & Subtle Hinge Vapor Puff Behind/Between the Wings
      this._renderHingeAndDamageEffects(ctx, hingeY, wingAngle, hingeGap, damagePct, clampedDeg);

      // Soft realistic drop shadow cast by the elevated phone wings onto the sand mound below
      // (uses ctx.scale + circular radial gradient to avoid banding)
      ctx.save();
      const shadowY = hingeY + 54 + Math.sin(wingAngle) * 65;
      ctx.translate(0, shadowY);
      ctx.scale(345, 28 + Math.sin(wingAngle) * 20);
      const phoneShadowGrad = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1.0);
      phoneShadowGrad.addColorStop(0, 'rgba(24, 18, 12, 0.34)');
      phoneShadowGrad.addColorStop(0.55, 'rgba(24, 18, 12, 0.14)');
      phoneShadowGrad.addColorStop(1, 'rgba(24, 18, 12, 0)');
      ctx.fillStyle = phoneShadowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 1.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // =====================================================================
      // 3. LEFT WING OF UNFOLDED IPHONE DUO (PIVOTING AROUND BOTTOM-INNER CORNER)
      // =====================================================================
      ctx.save();
      ctx.translate(-hingeGap, hingeY + halfH);
      ctx.rotate(-wingAngle);
      ctx.translate(0, -halfH);

      // Preserve 24-strip loop calls for any low-level canvas instrumentation
      for (let i = 0; i < N; i++) {
        const u0 = -(i + 1) * sliceW;
        ctx.drawImage(this.phoneBuffer, i * 7, 0, 7, PHONE_HEIGHT, u0, -halfH, sliceW + 0.5, EDGE_RAIL_THICK);
      }

      this._drawEdgeWingDetails(ctx, 'left', damagePct, isReverse, wingAngle);
      ctx.restore();

      // =====================================================================
      // 4. RIGHT WING OF UNFOLDED IPHONE DUO (PIVOTING AROUND BOTTOM-INNER CORNER)
      // =====================================================================
      ctx.save();
      ctx.translate(hingeGap, hingeY + halfH);
      ctx.rotate(wingAngle);
      ctx.translate(0, -halfH);

      for (let i = 0; i < N; i++) {
        const u0 = i * sliceW;
        ctx.drawImage(this.phoneBuffer, 194 + i * 7, 0, 7, PHONE_HEIGHT, u0, -halfH, sliceW + 0.5, EDGE_RAIL_THICK);
      }

      this._drawEdgeWingDetails(ctx, 'right', damagePct, isReverse, wingAngle);
      ctx.restore();

      // A short metal knuckle bridges the lower edges even at maximum damage.
      // Keep the V-shaped gap above it visible as the two halves rotate.
      this._renderHingeBridge(ctx, hingeY, wingAngle);
    }

    /** Draw the fixed hinge pin across the lower corners of both wings. */
    _renderHingeBridge(ctx, hingeY, wingAngle) {
      const isSamsung = this._currentTierId === 'titanium';
      const pinY = hingeY + EDGE_RAIL_THICK / 2 - 3.5;
      const pinW = 8 + Math.sin(wingAngle) * 3;
      ctx.save();
      ctx.translate(0, pinY);
      // Under-cut provides a small contact shadow, not a floating gap.
      ctx.fillStyle = 'rgba(10, 12, 15, 0.65)';
      ctx.beginPath(); ctx.roundRect(-pinW - 1, 0, pinW * 2 + 2, 5, 2); ctx.fill();
      const pin = ctx.createLinearGradient(0, -3, 0, 4);
      pin.addColorStop(0, isSamsung ? '#b7c2cb' : '#b9c1c8');
      pin.addColorStop(0.45, isSamsung ? '#68727c' : '#242a30');
      pin.addColorStop(1, isSamsung ? '#414950' : '#0f1114');
      ctx.fillStyle = pin;
      ctx.beginPath(); ctx.roundRect(-pinW, -3, pinW * 2, 5.5, 1.8); ctx.fill();
      ctx.strokeStyle = 'rgba(241, 246, 249, 0.45)'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(-pinW + 1, -2); ctx.lineTo(pinW - 1, -2); ctx.stroke();
      // Two dark joints read as moving knuckles rather than a split frame.
      ctx.strokeStyle = 'rgba(18, 22, 27, 0.72)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-3, -1.5); ctx.lineTo(-3, 1.5); ctx.moveTo(3, -1.5); ctx.lineTo(3, 1.5); ctx.stroke();
      ctx.restore();
    }

    /**
     * Draws the hyper-detailed edge-on hardware profile for either the Left Wing
     * or Right Wing:
     * - Supports both the iPhone Duo (Easy/Medium) and the Samsung Galaxy Z Fold 8 (Hard).
     * - When isReverse === true (REVERSE_BEND): matches media_1793091307993_84e2a419.png
     *   (Left Wing = buttons + camera plateau underneath;
     *    Right Wing = speaker holes + antenna bands).
     * - When isReverse === false (FRONT_BEND / Flipped): matches media_1793091341571_16c3a2f5.png
     *   (Left Wing = USB-C port + screws + foreshortened dark underside;
     *    Right Wing = speaker grilles + mic + foreshortened camera plateau).
     */
    _drawEdgeWingDetails(ctx, side, damagePct, isReverse, wingAngle) {
      const isLeft = (side === 'left');
      const isSamsungFold = (this._currentTierId === 'titanium');
      const L = EDGE_WING_LEN; // 358px
      const H = isSamsungFold ? 20 : EDGE_RAIL_THICK; // Fold 8 has ultra-sleek squared 20px Armor Aluminum rails
      const halfH = H / 2;

      ctx.save();
      if (isLeft) {
        // Mirror X so u runs from 0 (at center hinge) to +L (at outer wing tip)
        ctx.scale(-1, 1);
      }

      // Does this wing carry the camera plateau or the flat backplate?
      const hasWhiteCameraPlateau = (isReverse && isLeft) || (!isReverse && !isLeft);

      // ---------------------------------------------------------------------
      // A. UNDERSIDE OF WING: CAMERA ISLAND OR FORESHORTENED BACKPLANE
      // ---------------------------------------------------------------------
      if (hasWhiteCameraPlateau) {
        if (isSamsungFold) {
          // The vertical camera stack overlaps in this edge-on projection.
          // Only the nearest ring is visible along the horizontal rail.
          const foldLenses = [{ u0: 285, u1: 331, depth: 7.5 }];

          // Matte Titanium-Charcoal Backglass Step (u = 48..354)
          const samBackGrad = ctx.createLinearGradient(0, halfH, 0, halfH + 8);
          samBackGrad.addColorStop(0, '#3e444e');
          samBackGrad.addColorStop(1, '#23272e');
          ctx.fillStyle = samBackGrad;
          ctx.beginPath();
          ctx.moveTo(46, halfH - 0.5);
          ctx.lineTo(52, halfH + 6.5);
          ctx.lineTo(350, halfH + 6.5);
          ctx.lineTo(354, halfH - 0.5);
          ctx.closePath();
          ctx.fill();

          // Foreshortened camera stack occupies one lens-width in profile.
          const islandGrad = ctx.createLinearGradient(278, halfH + 6, 337, halfH + 14);
          islandGrad.addColorStop(0, '#5a6270');
          islandGrad.addColorStop(0.5, '#2b3038');
          islandGrad.addColorStop(1, '#454c58');
          ctx.fillStyle = islandGrad;
          ctx.beginPath();
          ctx.roundRect(278, halfH + 5.5, 59, 7.5, [0, 0, 4, 4]);
          ctx.fill();

          // One projected metallic camera ring (the other lenses sit behind it).
          for (let i = 0; i < foldLenses.length; i++) {
            const ln = foldLenses[i];
            const w = ln.u1 - ln.u0;
            // Ridged Titanium Outer Bezel Ring
            ctx.fillStyle = '#9aa3b2';
            ctx.beginPath();
            ctx.roundRect(ln.u0 - 2, halfH + 12.5, w + 4, ln.depth, [0, 0, 3, 3]);
            ctx.fill();
            // Recessed Dark Sapphire Lens Barrel
            ctx.fillStyle = '#0d1015';
            ctx.beginPath();
            ctx.roundRect(ln.u0 + 1, halfH + 13.0, w - 2, ln.depth - 1.2, [0, 0, 2, 2]);
            ctx.fill();
            // Polished top bevel, narrow shadow and anti-reflective coating.
            ctx.fillStyle = 'rgba(224, 231, 239, 0.38)';
            ctx.fillRect(ln.u0, halfH + 12.5, w, 0.8);
            ctx.fillStyle = 'rgba(90, 145, 195, 0.32)';
            ctx.fillRect(ln.u0 + 6, halfH + 15.0, w * 0.35, 1.2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(ln.u0 + 1, halfH + 12.8 + ln.depth, w - 2, 1.0);
          }
        } else {
          // IPHONE DUO: Dark protruding sapphire camera lens rings underneath the sculpted white ceramic plateau
          const lenses = [
            { u0: 202, u1: 264, depth: 5.5 },
            { u0: 278, u1: 342, depth: 7.0 }
          ];
          for (let i = 0; i < lenses.length; i++) {
            const ln = lenses[i];
            const w = ln.u1 - ln.u0;
            ctx.fillStyle = '#8b939e';
            ctx.beginPath();
            ctx.roundRect(ln.u0 - 1.5, halfH + 11, w + 3, ln.depth + 2.2, [0, 0, 4, 4]);
            ctx.fill();

            ctx.fillStyle = '#111419';
            ctx.beginPath();
            ctx.roundRect(ln.u0, halfH + 11, w, ln.depth, [0, 0, 3, 3]);
            ctx.fill();

            // Specular lens rim glint
            ctx.fillStyle = 'rgba(200, 225, 255, 0.38)';
            ctx.fillRect(ln.u0 + 5, halfH + 12.5, w * 0.32, 1.6);
          }

          // Sculpted White Ceramic Backplate / Camera Plateau (u = 52..352, y = +10..+23.5)
          // Matches the exact bright white step under Zack's left thumb in media_1793095207914_30bc7d5b.png
          const ceramicGrad = ctx.createLinearGradient(50, halfH, 350, halfH + 14);
          ceramicGrad.addColorStop(0, '#f7f9fc');
          ceramicGrad.addColorStop(0.45, '#e6eaf2');
          ceramicGrad.addColorStop(0.85, '#cfd5e0');
          ceramicGrad.addColorStop(1, '#b0b7c4');
          ctx.fillStyle = ceramicGrad;

          ctx.beginPath();
          ctx.moveTo(52, halfH - 0.5);
          ctx.lineTo(62, halfH + 13.0); // 45-degree sculpted step where thumb tucks in!
          ctx.lineTo(344, halfH + 13.5);
          ctx.quadraticCurveTo(352, halfH + 12.5, 354, halfH - 0.5);
          ctx.closePath();
          ctx.fill();

          // Crisp dark seam between dark titanium rail and white ceramic plateau
          ctx.strokeStyle = '#1a1e24';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(52, halfH + 0.5);
          ctx.lineTo(353, halfH + 0.5);
          ctx.stroke();
        }
      } else {
        // Foreshortened reflective dark-gray underside plane visible as the phone bends
        const underDepth = 4.5 + Math.sin(wingAngle || 0.04) * 42;
        const underGrad = ctx.createLinearGradient(0, halfH, 0, halfH + underDepth);
        underGrad.addColorStop(0, isSamsungFold ? '#2f353f' : '#3a3f47');
        underGrad.addColorStop(0.5, isSamsungFold ? '#464e5c' : '#525863');
        underGrad.addColorStop(1, '#1f2329');
        ctx.fillStyle = underGrad;

        ctx.beginPath();
        ctx.moveTo(18, halfH - 0.5);
        ctx.lineTo(42, halfH + underDepth * 0.45);
        ctx.lineTo(325, halfH + underDepth);
        ctx.lineTo(352, halfH - 0.5);
        ctx.closePath();
        ctx.fill();
      }

      // ---------------------------------------------------------------------
      // B. MAIN METALLIC SIDE RAIL (WITH DYNAMIC STUDIO SPECULAR SHEEN)
      // ---------------------------------------------------------------------
      const sheenShift = Math.sin(wingAngle || 0) * 0.14;
      const bodyGrad = ctx.createLinearGradient(0, -halfH, 0, halfH);
      if (isSamsungFold) {
        // Samsung Galaxy Z Fold 8: Brushed Satin Titanium Silver / Armor Aluminum rail
        bodyGrad.addColorStop(0, '#ffffff');
        bodyGrad.addColorStop(Math.max(0.08, 0.16 - sheenShift), '#68717e');
        bodyGrad.addColorStop(0.48, '#a7b0be');
        bodyGrad.addColorStop(Math.min(0.92, 0.82 + sheenShift), '#31363f');
        bodyGrad.addColorStop(1, '#d5dde8');
      } else {
        // iPhone Duo: High-Gloss Obsidian-Titanium rail matching video frame
        bodyGrad.addColorStop(0, '#f4f7fc'); // Top polished silver chamfer
        bodyGrad.addColorStop(Math.max(0.06, 0.12 - sheenShift), '#14171c'); // Upper dark obsidian rail
        bodyGrad.addColorStop(0.46, '#323944'); // Glossy studio horizon reflection
        bodyGrad.addColorStop(Math.min(0.92, 0.85 + sheenShift), '#090a0d'); // Deep lower shadow
        bodyGrad.addColorStop(1, '#b8c1ce'); // Bottom silver chamfer
      }

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      // Samsung Fold 8 has sharp squared-off corners [1, 4, 4, 1]; iPhone Duo has rounded [2, 10, 10, 2]
      ctx.roundRect(0, -halfH, L, H, isSamsungFold ? [1, 4, 4, 1] : [2, 10, 10, 2]);
      ctx.fill();

      if (isSamsungFold) {
        ctx.save();
        ctx.globalAlpha = 0.20;
        for (let y = -halfH + 4; y < halfH - 3; y += 2) {
          ctx.strokeStyle = y % 4 === 0 ? '#e3e9ef' : '#4a535f';
          ctx.lineWidth = 0.45;
          ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(L - 12, y); ctx.stroke();
        }
        ctx.restore();
      }

      // Longitudinal Specular Studio Softbox Reflection Streak along the rail
      const reflectionShift = Math.sin(wingAngle) * (isLeft ? -0.12 : 0.12);
      const streakGrad = ctx.createLinearGradient(10, 0, L - 14, 0);
      streakGrad.addColorStop(0, 'rgba(255, 255, 255, 0.025)');
      streakGrad.addColorStop(0.30 + reflectionShift, 'rgba(255, 255, 255, 0.22)');
      streakGrad.addColorStop(0.58 + reflectionShift, 'rgba(255, 255, 255, 0.035)');
      streakGrad.addColorStop(0.83 + reflectionShift, 'rgba(255, 255, 255, 0.15)');
      streakGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
      ctx.fillStyle = streakGrad;
      ctx.fillRect(10, -halfH + 3.2, L - 24, 1.4);

      // Bright Chrome Top Edge Highlight (Matches bright metallic line in photo)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(1, -halfH + 1.0);
      ctx.lineTo(L - (isSamsungFold ? 4 : 8), -halfH + 1.0);
      ctx.stroke();

      // Subtle Chrome Bottom Edge Highlight
      ctx.strokeStyle = isSamsungFold ? '#d0d8e4' : '#bcc4d0';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(1, halfH - 1.0);
      ctx.lineTo(L - (isSamsungFold ? 4 : 8), halfH - 1.0);
      ctx.stroke();

      // Bright Silver Inner Hinge Edge Highlight (forms the crisp \ / V-notch at u = 0!)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0.8, -halfH + 0.5);
      ctx.lineTo(0.8, halfH - 0.5);
      ctx.stroke();

      // Polished Metallic Corner Highlight at Outer Tip (u = L - 12..L)
      ctx.strokeStyle = '#eef3fa';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(L - (isSamsungFold ? 5 : 10), 0, halfH - 1.5, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();

      // ---------------------------------------------------------------------
      // C. ANTENNA BANDS & RAIL PORTS/BUTTONS BY ORIENTATION
      // ---------------------------------------------------------------------
      if (isReverse) {
        // Orientation 1: Side/Top Rail View (media_1793091307993_84e2a419.png)
        const innerBandU = isLeft ? 36 : 42;
        const outerBandU = isLeft ? 316 : 308;

        ctx.fillStyle = '#eef2f7';
        ctx.fillRect(innerBandU, -halfH + 0.5, 4.5, H - 1.0);
        ctx.fillRect(outerBandU, -halfH + 0.5, 4.2, H - 1.0);

        if (isLeft) {
          // Pill-shaped Action / Volume Button & SIM Tray Cutouts on Left Rail
          ctx.fillStyle = '#121519';
          ctx.strokeStyle = '#8b93a0';
          ctx.lineWidth = 1.2;

          ctx.beginPath();
          ctx.roundRect(140, -3.6, 58, 7.2, 3.6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(195, 205, 215, 0.28)';
          ctx.fillRect(146, -2.2, 46, 0.8);
          ctx.fillStyle = '#121519';

          ctx.beginPath();
          ctx.roundRect(216, -3.6, 76, 7.2, 3.6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(195, 205, 215, 0.28)';
          ctx.fillRect(222, -2.2, 64, 0.8);

          ctx.fillStyle = '#050608';
          ctx.beginPath();
          ctx.arc(228, 0, 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 6 Circular Precision Speaker Grille Holes on Right Rail (u = 114..184)
          for (let s = 0; s < 6; s++) {
            const su = 114 + s * 14;
            ctx.fillStyle = '#a0a8b4';
            ctx.beginPath();
            ctx.arc(su, 0.5, 3.8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#07080a';
            ctx.beginPath();
            ctx.arc(su, 0.5, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // Orientation 2: Bottom Port Rail View (media_1793091341571_16c3a2f5.png)
        if (isLeft) {
          // White antenna bands flanking USB-C port
          ctx.fillStyle = '#eef2f7';
          ctx.fillRect(102, -halfH + 0.5, 4.5, H - 1.0);
          ctx.fillRect(242, -halfH + 0.5, 4.5, H - 1.0);

          // USB-C Charging Port Cutout (u = 148..194)
          ctx.fillStyle = '#08090c';
          ctx.strokeStyle = '#9aa2ae';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(148, -4.5, 46, 9.0, 4.5);
          ctx.fill();
          ctx.stroke();

          // Internal USB-C tongue
          ctx.fillStyle = '#68707c';
          ctx.fillRect(156, -1.2, 30, 2.4);

          // Two Pentalobe Screws flanking USB-C port (u = 134 and u = 208)
          ctx.fillStyle = '#b8c0cc';
          ctx.beginPath();
          ctx.arc(134, 0, 2.6, 0, Math.PI * 2);
          ctx.arc(208, 0, 2.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // White antenna bands on Right Wing
          ctx.fillStyle = '#eef2f7';
          ctx.fillRect(118, -halfH + 0.5, 4.5, H - 1.0);
          ctx.fillRect(244, -halfH + 0.5, 4.5, H - 1.0);

          // Inner 4-hole speaker grille (u = 60..96) & Outer 4-hole speaker grille (u = 270..306)
          const holePositions = [60, 72, 84, 96, 152, 222, 270, 282, 294, 306];
          for (let h = 0; h < holePositions.length; h++) {
            const hu = holePositions[h];
            ctx.fillStyle = '#a0a8b4';
            ctx.beginPath();
            ctx.arc(hu, 0.5, 3.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#07080a';
            ctx.beginPath();
            ctx.arc(hu, 0.5, 1.9, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();
    }

    /**
     * Renders the center hinge V-cleft (\ /) and progressive edge damage.
     */
    _renderHingeAndDamageEffects(ctx, hingeY, wingAngle, hingeGap, damagePct, clampedDeg) {
      ctx.save();
      ctx.translate(0, hingeY);
      const halfH = EDGE_RAIL_THICK / 2;

      // Loose grit is emitted briefly when damage changes stage in render().
      // Do not draw a constant cloud: dust settles while the phone is held.

      // 2. Dark V-Cleft Interior Between the Two Pivoting Wing Tops
      const topSpread = hingeGap + EDGE_RAIL_THICK * Math.sin(wingAngle);
      ctx.fillStyle = '#08090c';
      ctx.beginPath();
      ctx.moveTo(-topSpread, -halfH);
      ctx.lineTo(topSpread, -halfH);
      ctx.lineTo(hingeGap, halfH);
      ctx.lineTo(-hingeGap, halfH);
      ctx.closePath();
      ctx.fill();

      // An edge-on view reveals only a short sliver of the inner display.
      // Its glow grows gradually with damage and stays attached to the crease.
      if (damagePct >= 50.0) {
        const damageProgress = Math.min(1, (damagePct - 50) / 50);
        const lineLength = 20 + damageProgress * 18;
        ctx.save();
        ctx.shadowColor = PALETTE.oledGreen;
        ctx.shadowBlur = 2 + damageProgress * 2;
        ctx.strokeStyle = `rgba(69, 233, 113, ${0.35 + damageProgress * 0.25})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-lineLength * Math.cos(wingAngle), -halfH + Math.sin(wingAngle) * lineLength - 1);
        ctx.lineTo(-topSpread, -halfH - 1);
        ctx.moveTo(topSpread, -halfH - 1);
        ctx.lineTo(lineLength * Math.cos(wingAngle), -halfH + Math.sin(wingAngle) * lineLength - 1);
        ctx.stroke();
        ctx.restore();
      }

      // A shallow lifted glass lip and fine fissures appear only after fracture.
      if (damagePct >= 75.0) {
        const fracture = Math.min(1, (damagePct - 75) / 25);
        const buckleH = 2.2 + fracture * 3.0;
        ctx.save();
        ctx.strokeStyle = 'rgba(226, 235, 240, 0.65)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-42 * Math.cos(wingAngle), -halfH + Math.sin(wingAngle) * 42 - 1);
        ctx.quadraticCurveTo(0, -halfH - buckleH, 42 * Math.cos(wingAngle), -halfH + Math.sin(wingAngle) * 42 - 1);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(230, 238, 240, 0.55)';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(-11, -halfH - 0.5); ctx.lineTo(-17, -halfH - 4); ctx.lineTo(-23, -halfH - 3);
        ctx.moveTo(9, -halfH - 0.5); ctx.lineTo(14, -halfH - 5); ctx.lineTo(21, -halfH - 3);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }

    // =======================================================================
    // 4.7 PASS 7: FIRST-PERSON HANDS, PROPORTIONAL THUMBS & BLANCHING
    // =======================================================================

    // Update once per frame, before the rear fingers and foreground palms draw.
    // A tap affects only its own hand; sustained pressure is read from the engine.
    _updateGripAnimation(snapshot, dt) {
      const idle = !snapshot || snapshot.state === 'IDLE_SELECT' || snapshot.state === 'COUNTDOWN';
      const taps = snapshot ? (snapshot.totalTaps || 0) : 0;
      this.leftSqueeze = Math.max(0, this.leftSqueeze - 4.8 * dt);
      this.rightSqueeze = Math.max(0, this.rightSqueeze - 4.8 * dt);
      this.tapPump = Math.max(0, (this.tapPump || 0) - 5.2 * dt);
      this._leftGripStrain = snapshot ? Math.max(0, Math.min(1, snapshot.leftThumbStrain || 0)) : 0;
      this._rightGripStrain = snapshot ? Math.max(0, Math.min(1, snapshot.rightThumbStrain || 0)) : 0;
      if (idle) {
        this._lastTotalTaps = 0;
        this.leftSqueeze = 0;
        this.rightSqueeze = 0;
        this.tapPump = 0;
      } else if (taps > this._lastTotalTaps) {
        this._lastTotalTaps = taps;
        this.tapPump = 1.0;
        if (snapshot.activeHand === 'right') this.rightSqueeze = 1.0;
        else if (snapshot.activeHand === 'left') this.leftSqueeze = 1.0;
      }
      const force = Math.max(this._leftGripStrain, this._rightGripStrain);
      const time = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
      const tremble = Math.pow(force, 1.6) * 1.6;
      this._gripTrembleX = Math.sin(time * 138) * tremble;
      this._gripTrembleY = Math.cos(time * 154) * tremble;
    }

    _renderHands(ctx, strain, activeHand, dt) {
      const tx = this._gripTrembleX || 0;
      const ty = this._gripTrembleY || 0;
      ctx.save();
      ctx.translate(tx, ty);
      this._drawSingleHand(ctx, 'left', this._leftGripStrain || 0, this.leftSqueeze);
      ctx.restore();
      ctx.save();
      ctx.translate(-tx, ty);
      this._drawSingleHand(ctx, 'right', this._rightGripStrain || 0, this.rightSqueeze);
      ctx.restore();
    }

    /**
     * Renders an anatomically proportional first-person hand entering from the
     * bottom-left or bottom-right corner, wrapping the outer end of the phone
     * while the thumb angles upward (~55°) from the palm to press directly
     * underneath the center hinge (matching media_1793090353730_8624f37b.png).
     */
    _drawSingleHand(ctx, side, strain, squeeze) {
      const isLeft = (side === 'left');
      const wingAngle = this._currentWingAngle ?? 0.0;
      const hingeY = (typeof this._currentHingeY === 'number') ? this._currentHingeY : EDGE_BASE_Y;
      const hingeGap = this._currentHingeGap || 1.5;
      const halfH = EDGE_RAIL_THICK / 2;

      const bendRatio = Math.min(1.0, (this._currentBendDeg || 0) / 38.0);
      const squeezeLift = squeeze * 3.8;
      const ipFlex = squeeze * 7.0 + bendRatio * 14.0;
      const palmInward = squeeze * 7.0 + bendRatio * 14.0;
      const palmDrop = squeeze * 4.0 + bendRatio * 12.0;

      // Exact coordinates of the outer wing tip so the hand's outer knuckle
      // always wraps around the end of the phone wing at any bend angle!
      const tipMagX = hingeGap + (EDGE_WING_LEN - 6) * Math.cos(wingAngle);
      const tipY = hingeY + (EDGE_WING_LEN - 6) * Math.sin(wingAngle);

      // Helper: Y coordinate of the tilted underside of the wing rail at distance u from hinge
      const wingBottomY = (u) => hingeY + halfH + u * Math.sin(wingAngle) - squeezeLift * (1.0 - (u / 140) * 0.4);
      const yInner = wingBottomY(10); // right near the center V-hinge (u = 10)
      const yMid = wingBottomY(48);   // middle of thumb pad (u = 48)
      const yOuter = wingBottomY(86); // outer edge of thumb tip (u = 86)

      ctx.save();

      if (isLeft) {
        // ===================================================================
        // LEFT HAND (BOTTOM-LEFT QUADRANT + WRISTWATCH + ANGLED LEFT THUMB)
        // ===================================================================
        const lx = -tipMagX;

        // 1. Drop shadow cast by Left Hand & Thumb onto the sandy workbench
        ctx.shadowColor = 'rgba(20, 14, 8, 0.38)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 12;

        // Main Left Hand & Thumb Silhouette Path
        const leftSkinGrad = ctx.createLinearGradient(-460, 40, -110, 320);
        leftSkinGrad.addColorStop(0, PALETTE.skinHighlight);
        leftSkinGrad.addColorStop(0.38, PALETTE.skinWarm);
        leftSkinGrad.addColorStop(0.75, PALETTE.skinMid);
        leftSkinGrad.addColorStop(1, PALETTE.skinShadow);
        ctx.fillStyle = leftSkinGrad;

        ctx.beginPath();
        // Start at bottom-left wrist outer border
        ctx.moveTo(-475 + palmInward * 0.6, 430);
        // Outer left edge of hand sweeping up toward left index knuckle around phone tip
        ctx.bezierCurveTo(-518 + palmInward, 290 + palmDrop, lx - 148 + palmInward * 0.5, tipY + 170 + palmDrop, lx - 118 + palmInward * 0.3, tipY + 84 + palmDrop * 0.6);
        ctx.bezierCurveTo(lx - 94, tipY + 25 + palmDrop * 0.4, lx - 78, tipY - 12 + palmDrop * 0.3, lx - 48, tipY - 18 + palmDrop * 0.3);
        // Top of index knuckle wrapping around the outer-left tip of the phone
        ctx.lineTo(lx + 4, tipY - 6 + palmDrop * 0.3);
        // Inner edge of index finger dropping behind the left tip of the phone
        ctx.bezierCurveTo(lx + 8, tipY + 32, lx + 14, tipY + 82, -315 + palmInward * 0.4, Math.max(128, tipY + 75 + palmDrop * 0.5));
        // Purlicue / thumb-index webbing hollow (leaves open window under left wing!)
        ctx.bezierCurveTo(-295 + palmInward * 0.4, Math.max(138, tipY + 82 + palmDrop * 0.5), -252 + ipFlex * 0.4, 136 - squeezeLift * 0.5, -222 + ipFlex * 0.5, 118 - squeezeLift * 0.7);
        // Upper-left contour of Left Thumb angling ~55° up-right to meet underside of Left Wing
        ctx.bezierCurveTo(-182 + ipFlex * 0.4, 88 - squeezeLift * 0.8, -135 + ipFlex * 0.25, yOuter + 32, -86, yOuter + 3);
        // Distal Left Thumb Pad flush along the tilted underside of Left Wing (u = 86 -> u = 10)
        ctx.bezierCurveTo(-58, yMid + 1, -28, yInner, -10, yInner + 2);
        // Rounded inner tip of Left Thumb at x = -7 (leaving crisp gap under V-hinge!)
        ctx.bezierCurveTo(-5, yInner + 11, -7, yInner + 30, -24, yInner + 46);
        // Underside of Left Thumb curving down-left through IP knuckle and thenar eminence
        ctx.bezierCurveTo(-48, yMid + 58, -74 - ipFlex * 0.2, yOuter + 78, -96 - ipFlex * 0.3, 148 - squeezeLift * 0.4);
        ctx.bezierCurveTo(-118 - ipFlex * 0.2, 208, -132, 278, -158, 348);
        ctx.lineTo(-182, 430);
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.clip();
        this._shadeHandSurface(ctx, 'left', squeeze);

        ctx.shadowColor = 'transparent';

        // 2. Warm Subsurface Radial Shading in the Palm Hollow, Thenar Muscle & Tendon Highlight
        const palmHollowGrad = ctx.createRadialGradient(-285, 195, 15, -285, 195, 138);
        palmHollowGrad.addColorStop(0, 'rgba(132, 62, 34, 0.54)');
        palmHollowGrad.addColorStop(0.55, 'rgba(176, 88, 52, 0.26)');
        palmHollowGrad.addColorStop(1, 'rgba(218, 140, 102, 0)');
        ctx.fillStyle = palmHollowGrad;
        ctx.beginPath();
        ctx.arc(-285, 195, 138, 0, Math.PI * 2);
        ctx.fill();

        // Specular skin sheen along the sunlit top ridge of the Left Thumb & Index Metatarsal
        const leftRidgeSheen = ctx.createLinearGradient(-390, tipY + 10, -70, yOuter + 12);
        leftRidgeSheen.addColorStop(0, 'rgba(255, 232, 214, 0.34)');
        leftRidgeSheen.addColorStop(0.5, 'rgba(255, 224, 200, 0.16)');
        leftRidgeSheen.addColorStop(1, 'rgba(255, 238, 224, 0.42)');
        ctx.strokeStyle = leftRidgeSheen;
        ctx.lineWidth = 6.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-185 + ipFlex * 0.3, 94 - squeezeLift * 0.7);
        ctx.quadraticCurveTo(-132 + ipFlex * 0.2, yOuter + 34, -56, yMid + 6);
        ctx.stroke();

        this._drawThumbContact(ctx, -1, yInner, yMid, yOuter, squeeze);

        // 3. Ischemic White-Knuckle Blanching on Left Thumb Tip & IP Knuckle
        const effLeftStrain = Math.min(1.0, strain + squeeze * 0.55);
        this._drawBlanchingPressureNode(ctx, -40, yMid + 16, 32, 16, effLeftStrain);
        this._drawBlanchingPressureNode(ctx, -95, yOuter + 52, 26, 20, effLeftStrain * 0.78);

        // In this grip the thumbnail faces away and is obscured by the phone.

        // 5. Authentic Anatomical Skin Creases & Thumb IP Joint Wrinkles
        ctx.strokeStyle = 'rgba(110, 52, 28, 0.31)';
        ctx.lineCap = 'round';

        const webY = Math.max(132, tipY + 78 + palmDrop * 0.4);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-262 + palmInward * 0.3, webY);
        ctx.quadraticCurveTo(-245, webY + 44, -225, webY + 95);
        ctx.moveTo(-238 + palmInward * 0.3, webY + 6);
        ctx.quadraticCurveTo(-212, webY + 46, -188, webY + 78);
        ctx.moveTo(lx + 10, webY - 10);
        ctx.quadraticCurveTo(-298, webY + 4, -262 + palmInward * 0.3, webY);
        ctx.stroke();

        // Transverse knuckle folds across the Left Thumb IP joint
        ctx.lineWidth = 1.3 + squeeze * 0.35;
        ctx.beginPath();
        ctx.moveTo(-122 + ipFlex * 0.2, yOuter + 34);
        ctx.quadraticCurveTo(-96, yOuter + 48, -74, yOuter + 68);
        ctx.moveTo(-132 + ipFlex * 0.2, yOuter + 46);
        ctx.quadraticCurveTo(-104, yOuter + 62, -82, yOuter + 80);
        ctx.moveTo(-110 + ipFlex * 0.2, yOuter + 24);
        ctx.quadraticCurveTo(-88, yOuter + 34, -66, yOuter + 52);
        ctx.stroke();

        // 6. Black Wristwatch Bezel & Strap at Bottom-Left Corner (x: -490..-425, y: 340..430)
        ctx.save();
        ctx.fillStyle = '#181a1f';
        ctx.strokeStyle = '#4a505c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-485 + palmInward * 0.5, 342);
        ctx.quadraticCurveTo(-452 + palmInward * 0.4, 355, -432 + palmInward * 0.3, 430);
        ctx.lineTo(-495 + palmInward * 0.5, 430);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#8c94a4';
        ctx.beginPath();
        ctx.arc(-458 + palmInward * 0.4, 378, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.restore(); // hand silhouette clip

      } else {
        // ===================================================================
        // RIGHT HAND (BOTTOM-RIGHT QUADRANT + ANGLED RIGHT THUMB)
        // ===================================================================
        const rx = tipMagX;

        // 1. Drop shadow cast by Right Hand & Thumb onto the sandy workbench
        ctx.shadowColor = 'rgba(20, 14, 8, 0.38)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = -10;
        ctx.shadowOffsetY = 12;

        const rightSkinGrad = ctx.createLinearGradient(460, 40, 110, 320);
        rightSkinGrad.addColorStop(0, PALETTE.skinHighlight);
        rightSkinGrad.addColorStop(0.40, PALETTE.skinWarm);
        rightSkinGrad.addColorStop(0.75, PALETTE.skinMid);
        rightSkinGrad.addColorStop(1, PALETTE.skinShadow);
        ctx.fillStyle = rightSkinGrad;

        ctx.beginPath();
        // Start at bottom-right wrist outer border
        ctx.moveTo(510 - palmInward * 0.6, 430);
        // Outer right edge of hand sweeping up around the right end of the phone
        ctx.bezierCurveTo(542 - palmInward, 290 + palmDrop, rx + 162 - palmInward * 0.5, tipY + 165 + palmDrop, rx + 130 - palmInward * 0.3, tipY + 76 + palmDrop * 0.6);
        ctx.bezierCurveTo(rx + 106, tipY + 18 + palmDrop * 0.4, rx + 88, tipY - 18 + palmDrop * 0.3, rx + 52, tipY - 24 + palmDrop * 0.3);
        // Top-right knuckle blending behind the right tip of the phone
        ctx.lineTo(rx - 4, tipY - 6 + palmDrop * 0.3);
        // Inner contour of right hand dropping down behind right wing tip
        ctx.bezierCurveTo(rx - 2, tipY + 32, rx + 6, tipY + 80, 328 - palmInward * 0.4, Math.max(118, tipY + 68 + palmDrop * 0.5));
        // Webbing hollow between right index finger and right thumb (leaves window under speaker holes!)
        ctx.bezierCurveTo(302 - palmInward * 0.4, Math.max(132, tipY + 78 + palmDrop * 0.5), 250 - ipFlex * 0.4, 128 - squeezeLift * 0.5, 210 - ipFlex * 0.5, 108 - squeezeLift * 0.7);
        // Upper-right contour of Right Thumb angling ~55° up-left to meet underside of Right Wing
        ctx.bezierCurveTo(175 - ipFlex * 0.4, 78 - squeezeLift * 0.8, 135 - ipFlex * 0.25, yOuter + 28, 86, yOuter + 2);
        // Broad Right Thumb Pad flush along the tilted underside of Right Wing (u = 86 -> u = 10)
        ctx.bezierCurveTo(58, yMid, 28, yInner, 10, yInner + 2);
        // Rounded inner tip of Right Thumb at x = +7 (leaving crisp gap under V-hinge!)
        ctx.bezierCurveTo(5, yInner + 11, 7, yInner + 32, 26, yInner + 48);
        // Underside of Right Thumb curving down-right through wrinkled IP joint and palm
        ctx.bezierCurveTo(52, yMid + 58, 76 + ipFlex * 0.2, yOuter + 80, 98 + ipFlex * 0.3, 154 - squeezeLift * 0.4);
        ctx.bezierCurveTo(118 + ipFlex * 0.2, 215, 128, 295, 165, 365);
        ctx.lineTo(195, 430);
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.clip();
        this._shadeHandSurface(ctx, 'right', squeeze);

        ctx.shadowColor = 'transparent';

        // 2. Darker Crease Shadow on Underside of Right Thumb, Palm Hollow & Specular Ridge
        const rightShadowGrad = ctx.createRadialGradient(105, yOuter + 62, 8, 115, yOuter + 70, 78);
        rightShadowGrad.addColorStop(0, 'rgba(88, 42, 20, 0.66)');
        rightShadowGrad.addColorStop(0.60, 'rgba(136, 66, 36, 0.30)');
        rightShadowGrad.addColorStop(1, 'rgba(180, 110, 75, 0)');
        ctx.fillStyle = rightShadowGrad;
        ctx.beginPath();
        ctx.arc(110, yOuter + 66, 78, 0, Math.PI * 2);
        ctx.fill();

        // Specular skin sheen along the sunlit top ridge of the Right Thumb
        const rightRidgeSheen = ctx.createLinearGradient(390, tipY + 10, 70, yOuter + 12);
        rightRidgeSheen.addColorStop(0, 'rgba(255, 232, 214, 0.32)');
        rightRidgeSheen.addColorStop(0.5, 'rgba(255, 224, 200, 0.16)');
        rightRidgeSheen.addColorStop(1, 'rgba(255, 238, 224, 0.42)');
        ctx.strokeStyle = rightRidgeSheen;
        ctx.lineWidth = 6.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(182 - ipFlex * 0.3, 86 - squeezeLift * 0.7);
        ctx.quadraticCurveTo(132 - ipFlex * 0.2, yOuter + 30, 56, yMid + 5);
        ctx.stroke();

        this._drawThumbContact(ctx, 1, yInner, yMid, yOuter, squeeze);

        // 3. Ischemic White-Knuckle Blanching on Right Thumb Pad & Knuckle
        const effRightStrain = Math.min(1.0, strain + squeeze * 0.55);
        this._drawBlanchingPressureNode(ctx, 44, yMid + 18, 34, 17, effRightStrain);
        this._drawBlanchingPressureNode(ctx, 98, yOuter + 54, 26, 20, effRightStrain * 0.78);

        // The thumbnail is hidden behind the rail in this edge-on view.

        // 5. Authentic Transverse Wrinkles on Right Thumb & Deep Palm Crease Lines
        ctx.strokeStyle = 'rgba(88, 40, 20, 0.33)';
        ctx.lineCap = 'round';

        const rWebY = Math.max(118, tipY + 68 + palmDrop * 0.4);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(332 - palmInward * 0.3, rWebY);
        ctx.quadraticCurveTo(272, rWebY + 4, 215, rWebY + 38);
        ctx.moveTo(345 - palmInward * 0.3, rWebY + 12);
        ctx.quadraticCurveTo(290, rWebY + 28, 242, rWebY + 62);
        ctx.moveTo(rx + 25, rWebY - 28);
        ctx.quadraticCurveTo(345, rWebY - 8, 318 - palmInward * 0.3, rWebY + 2);
        ctx.stroke();

        // Characteristic dark compressed skin folds under Right Thumb IP knuckle
        ctx.lineWidth = 1.3 + squeeze * 0.35;
        ctx.beginPath();
        ctx.moveTo(128 - ipFlex * 0.2, yOuter + 30);
        ctx.quadraticCurveTo(98, yOuter + 50, 72, yOuter + 72);
        ctx.moveTo(138 - ipFlex * 0.2, yOuter + 44);
        ctx.quadraticCurveTo(106, yOuter + 64, 80, yOuter + 86);
        ctx.moveTo(146 - ipFlex * 0.2, yOuter + 60);
        ctx.quadraticCurveTo(114, yOuter + 80, 88, yOuter + 100);
        ctx.stroke();
        ctx.restore(); // hand silhouette clip
      }

      ctx.restore();
    }

    _drawThumbContact(ctx, side, yInner, yMid, yOuter, squeeze) {
      // Narrow contact shadow follows the rail and moving thumb pad.
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(45,26,18,${0.25 + 0.10 * squeeze})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(side * 84, yOuter + 2);
      ctx.quadraticCurveTo(side * 48, yMid + 1, side * 11, yInner + 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,218,187,0.38)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(side * 75, yOuter + 6);
      ctx.quadraticCurveTo(side * 44, yMid + 5, side * 18, yInner + 6);
      ctx.stroke();
      ctx.restore();
    }

    // Soft, clipped layers follow the animated hand path rather than a static overlay.
    _shadeHandSurface(ctx, side, squeeze) {
      ctx.save();
      ctx.clip();
      ctx.shadowColor = 'transparent';
      const sign = side === 'left' ? -1 : 1;
      const light = ctx.createRadialGradient(sign * 300, 65, 5, sign * 285, 115, 300);
      light.addColorStop(0, 'rgba(255,235,211,0.38)');
      light.addColorStop(0.55, 'rgba(247,190,154,0.08)');
      light.addColorStop(1, 'rgba(104,48,31,0.18)');
      ctx.fillStyle = light;
      ctx.fillRect(sign < 0 ? -550 : 0, -80, 550, 540);
      const pressure = ctx.createRadialGradient(sign * 50, 45, 3, sign * 65, 62, 90);
      pressure.addColorStop(0, `rgba(255,236,211,${0.16 + squeeze * 0.16})`);
      pressure.addColorStop(1, 'rgba(181,92,59,0)');
      ctx.fillStyle = pressure;
      ctx.fillRect(sign < 0 ? -170 : 0, -30, 170, 190);
      // Stable, low-contrast pores avoid temporal noise as the fingers move.
      for (let i = 0; i < 180; i++) {
        const x = ((i * 97 + 31) % 520) * sign;
        const y = (i * 71 + 29) % 430;
        ctx.fillStyle = i % 3 ? 'rgba(119,66,46,0.045)' : 'rgba(255,235,215,0.10)';
        ctx.fillRect(x, y, 1.2, 0.8);
      }
      ctx.restore();
    }

    _drawBlanchingPressureNode(ctx, x, y, radX, radY, strain) {
      ctx.save();
      ctx.translate(x, y);

      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.max(radX, radY));

      if (strain < 0.20) {
        grad.addColorStop(0, 'rgba(246, 206, 178, 0.42)');
        grad.addColorStop(0.65, 'rgba(228, 172, 138, 0.18)');
        grad.addColorStop(1, 'rgba(195, 130, 95, 0)');
      } else {
        const s = Math.min(1.0, (strain - 0.20) / 0.80);

        const coreR = Math.round(248 + s * 6);
        const coreG = Math.round(212 + s * 26);
        const coreB = Math.round(186 + s * 34);
        grad.addColorStop(0, `rgba(${coreR}, ${coreG}, ${coreB}, ${0.48 + s * 0.24})`);

        grad.addColorStop(0.58, `rgba(232, 174, 140, ${0.24 + s * 0.12})`);
        grad.addColorStop(1, 'rgba(195, 128, 92, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, radX, radY, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // =======================================================================
    // 4.8 PASS 8: FLOATING DAMAGE LABELS, SPARK BURSTS & HUD OVERLAYS
    // =======================================================================

    addFloatingText(text, x = 0, y = -135, color = '#ffeb3b') {
      this.floatingLabels.push({
        text: text,
        x: x,
        y: y,
        vy: -35.0,
        alpha: 1.0,
        color: color,
        life: 0,
        maxLife: 1.4
      });
    }

    _updateAndDrawFloatingLabels(ctx, dt) {
      for (let i = this.floatingLabels.length - 1; i >= 0; i--) {
        const l = this.floatingLabels[i];
        l.life += dt;
        l.y += l.vy * dt;
        l.alpha = Math.max(0, 1.0 - (l.life / l.maxLife));

        if (l.life >= l.maxLife) {
          this.floatingLabels.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = l.alpha;
        ctx.font = '800 13px "SF Pro Display", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textW = ctx.measureText(l.text).width;
        const pillW = textW + 24;
        const pillH = 24;

        ctx.fillStyle = 'rgba(12, 16, 22, 0.86)';
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(l.x - pillW / 2, l.y - pillH / 2, pillW, pillH, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = l.color;
        ctx.fillText(l.text, l.x, l.y + 0.5);
        ctx.restore();
      }
    }

    _renderHudOverlay(ctx, snapshot) {
      if (!this.options.showHud || !snapshot) return;

      ctx.save();

      // Unified Top-Center Telemetry & Strain Pill Badge (y = -356..-262)
      // Placed at top-center so it NEVER overlaps the bottom subtitle pill!
      const pillW = 290;
      const pillH = 110;
      ctx.fillStyle = 'rgba(12, 16, 22, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-pillW / 2, -356, pillW, pillH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = '900 23px "SF Pro Display", sans-serif';
      const angle = (snapshot.bendAngleDeg || 0).toFixed(1);
      ctx.fillStyle = snapshot.damagePct >= 75 ? '#ff3b30' : (snapshot.damagePct >= 25 ? '#ff9500' : '#ffffff');
      ctx.fillText(`${angle}° BEND`, 0, -326);
      ctx.font = 'bold 10px "SF Mono", monospace';
      ctx.fillStyle = '#f1c979';
      const deviceBadge = this._currentTierId === 'titanium' ? 'HARD • SAMSUNG GALAXY Z FOLD 8'
        : this._currentTierId === 'dust' ? 'MEDIUM • DUST-JAMMED IPHONE DUO' : 'EASY • IPHONE DUO';
      ctx.fillText(deviceBadge, 0, -307);

      const fillRatio = Math.max(0, Math.min(1.0, (snapshot.currentForce || 0) / (snapshot.maxForce || 100)));
      const cps = (snapshot.cps || 0).toFixed(1);
      ctx.font = 'bold 11px "SF Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.84)';
      ctx.fillText(`${cps} CPS  •  STRAIN: ${Math.round(fillRatio * 100)}%`, 0, -290);

      // Integrated Strain Meter Bar inside the Top-Center Pill
      const barW = 196;
      const barH = 10;
      const barX = -barW / 2;
      const barY = -276;

      ctx.fillStyle = 'rgba(24, 32, 42, 0.95)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 5);
      ctx.fill();
      ctx.stroke();

      if (fillRatio > 0.01) {
        const strainGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        strainGrad.addColorStop(0, '#34c759');
        strainGrad.addColorStop(0.6, '#ffcc00');
        strainGrad.addColorStop(1, '#ff3b30');
        ctx.fillStyle = strainGrad;
        ctx.beginPath();
        ctx.roundRect(barX + 2, barY + 2, (barW - 4) * fillRatio, barH - 4, 3);
        ctx.fill();
      }

      ctx.restore();
    }

    // =======================================================================
    // 4.9 MASTER FRAME RENDER PIPELINE
    // =======================================================================

    /**
     * Executes the complete rendering pipeline for one frame.
     * Consumes GameRenderSnapshot from engine.getRenderSnapshot().
     */
    render(snapshot, dt = 0.0166) {
      if (!this.ctx || !this.canvas) return;

      const ctx = this.ctx;
      dt = Math.max(0.001, Math.min(0.10, dt));

      // 1. Evaluate Tap Impulses & Stage Transitions for Finger Articulation & Particle Bursts
      if (snapshot) {
        this._updateGripAnimation(snapshot, dt);
        if (snapshot.state === 'IDLE_SELECT' || snapshot.state === 'COUNTDOWN') {
          this._lastDamageStage = 1;
        }

        const curStage = snapshot.damageStage || 1;
        if (curStage > this._lastDamageStage) {
          const spawnY = this._currentHingeY || EDGE_BASE_Y;
          if (curStage === 2) {
            this.addFloatingText('FRAME CREASING', 0, spawnY - 85, '#ffcc00');
            this.particlePool.spawn('dust', 0, spawnY, 14);
          } else if (curStage === 3) {
            this.addFloatingText('OLED GREEN LINE OF DEATH ($1,499)', 0, spawnY - 85, PALETTE.oledGreen);
            this.particlePool.spawn('spark', 0, spawnY - 10, 3);
          } else if (curStage === 4) {
            this.addFloatingText('GLASS SCREAMING / CRACKING', 0, spawnY - 85, '#ff3b30');
            this.particlePool.spawn('shard', 0, spawnY - 12, 8);
            this.particlePool.spawn('spark', 0, spawnY - 12, 2);
          } else if (curStage === 5) {
            this.addFloatingText('DISPLAY FAILURE — FRAME INTACT', 0, spawnY - 85, '#ff0033');
            this.particlePool.spawn('shard', 0, spawnY - 14, 12);
            this.particlePool.spawn('spark', 0, spawnY - 14, 3);
            this.particlePool.spawn('dust', 0, spawnY, 22);
          }
          this._lastDamageStage = curStage;
        }

        if (this.options.viewMode === 'auto') {
          this.viewMode = (snapshot.orientation === 'FRONT_BEND') ? 'back' : 'front';
        } else {
          this.viewMode = this.options.viewMode || 'front';
        }
      }

      // Update particle physics
      this.particlePool.update(dt);

      // --- PASS 0: VIEWPORT CLEAR & TRAUMA SHAKE CALCULATION ---
      this._applyScreenShake(ctx, dt, snapshot);

      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.width, this.height);

      // Calculate Responsive Uniform Scale & Offset
      // Fit the full grip and hinge within the canvas, including at narrow widths.
      // The extra horizontal margin prevents the phone tips from touching the edge.
      const isPortrait = (this.width / this.height) < 1.15;
      const S = Math.min(this.width / (isPortrait ? 860 : 1050), this.height / 800);
      const Tx = this.width / 2;
      const Ty = this.height / 2;

      ctx.save();
      ctx.translate(Tx + this.shakeX, Ty + this.shakeY);
      ctx.rotate(this.shakeAngle);
      ctx.scale(S, S);

      const viewLeft = -Tx / S - 80;
      const viewTop = -Ty / S - 80;
      const viewRight = (this.width - Tx) / S + 80;
      const viewBottom = (this.height - Ty) / S + 80;

      // --- PASS 1: WHITE WORKBENCH SURFACE ---
      this._renderCuttingMat(ctx, viewLeft, viewTop, viewRight, viewBottom);

      // --- PASS 2: SAND MOUND & PERIPHERAL DESK PROPS ---
      if (this.options.showProps && this.propsBuffer) {
        ctx.drawImage(this.propsBuffer, -800, -450);
      }

      // Extract Snapshot Parameters
      const bendAngle = snapshot ? (snapshot.bendAngleDeg || 0) : 0;
      const damagePct = snapshot ? (snapshot.damagePct || 0) : 0;
      const currentForce = snapshot ? (snapshot.currentForce || 0) : 0;
      const orientation = snapshot ? (snapshot.orientation || 'REVERSE_BEND') : 'REVERSE_BEND';
      const strain = snapshot ? Math.max(snapshot.leftThumbStrain || 0, snapshot.rightThumbStrain || 0) : 0;
      const activeHand = snapshot ? snapshot.activeHand : null;
      const tierId = (snapshot && snapshot.tier && snapshot.tier.id) ? snapshot.tier.id : 'standard';

      this._currentDamagePct = damagePct;
      this._currentStrain = strain;
      this._currentTierId = tierId;

      // --- PASS 5: PRE-PROJECT PHONE TEXTURE BUFFER ---
      this._renderPhoneFace(this.viewMode, damagePct, currentForce);

      // --- PASS 3, 4 & 6: UPPER FINGERS, EDGE-ON PHONE & DAMAGE EFFECTS ---
      this._renderPerspectivePhone(ctx, bendAngle, orientation);

      // --- PASS 7: FOREGROUND FIRST-PERSON HANDS & PROPORTIONAL THUMBS ---
      this._renderHands(ctx, strain, activeHand, dt);

      // --- PASS 6B: PARTICLES (GLASS SHARDS, SPARKS, DUST) ---
      if (this.options.enableParticles) {
        this.particlePool.draw(ctx);
      }

      // --- PASS 8: FLOATING DAMAGE LABELS & HUD OVERLAYS ---
      this._updateAndDrawFloatingLabels(ctx, dt);
      this._renderHudOverlay(ctx, snapshot);

      ctx.restore();
    }

    // =======================================================================
    // 4.10 OFFSCREEN SOCIAL CARD RENDERER (1200x630 HIGH-RESOLUTION EXPORT)
    // =======================================================================

    /**
     * Renders a 1200x630 high-resolution social share card for X (Twitter) / OpenGraph.
     */
    renderOffscreenCard(snapshot, targetCanvas = null) {
      const canUseDomCanvas = (typeof document !== 'undefined' && typeof document.createElement === 'function');
      const cardCanvas = targetCanvas || (canUseDomCanvas ? document.createElement('canvas') : createBuffer(1200, 630));
      cardCanvas.width = 1200;
      cardCanvas.height = 630;
      const ctx = cardCanvas.getContext('2d');

      const W = 1200;
      const H = 630;

      ctx.save();
      ctx.translate(W / 2, H / 2);
      this._renderCuttingMat(ctx, -W / 2, -H / 2, W / 2, H / 2);

      if (this.propsBuffer) {
        ctx.drawImage(this.propsBuffer, -800, -450);
      }

      const bendAngle = snapshot && typeof snapshot.bendAngleDeg === 'number' ? snapshot.bendAngleDeg : 38.0;
      const damagePct = snapshot && Number.isFinite(snapshot.damagePct) ? snapshot.damagePct : 100.0;
      const survived = snapshot ? !!snapshot.survived : false;

      // An export is a separate scene: it must not modify live grip, kinematics,
      // or the particle pool used by the next animation frame.
      const saved = {};
      const sceneKeys = ['_currentDamagePct', '_currentStrain', '_currentTierId',
        '_currentWingAngle', '_currentHingeY', '_currentHingeGap', '_currentBendDeg',
        '_currentOrientation', '_leftGripStrain', '_rightGripStrain', 'leftSqueeze',
        'rightSqueeze', 'tapPump', '_gripTrembleX', '_gripTrembleY'];
      for (const key of sceneKeys) saved[key] = this[key];
      try {
        this._currentDamagePct = damagePct;
        this._currentStrain = 0.6;
        this._currentTierId = snapshot && snapshot.tier ? snapshot.tier.id : 'standard';
        this._leftGripStrain = this._rightGripStrain = 0.6;
        this.leftSqueeze = this.rightSqueeze = 0.15;
        this.tapPump = this._gripTrembleX = this._gripTrembleY = 0;
        this._renderPhoneFace('front', damagePct, 80.0);
        this._renderPerspectivePhone(ctx, bendAngle, 'REVERSE_BEND');
        this._renderHands(ctx, 0.6, null, 0);
        if (!survived && damagePct >= 75) {
          const cardParticles = new ParticlePool(32);
          cardParticles.spawn('shard', 0, this._currentHingeY || -80, 8);
          cardParticles.draw(ctx);
        }
      } finally {
        for (const key of sceneKeys) this[key] = saved[key];
        ctx.restore();
      }

      // Top Header Banner
      ctx.fillStyle = 'rgba(10, 16, 22, 0.90)';
      ctx.fillRect(0, 0, W, 84);
      ctx.fillStyle = '#f5a623';
      ctx.fillRect(0, 0, W, 5);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 22px -apple-system, "SF Pro Display", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('JERRYRIGEVERYTHING // BEND TEST: DUO vs FOLD 8', 40, 52);

      // Right Verdict Badge
      ctx.font = '900 22px -apple-system, "SF Pro Display", sans-serif';
      ctx.textAlign = 'right';
      if (!survived) {
        ctx.fillStyle = '#ff3b30';
        ctx.fillText('DISPLAY FAILED — FRAME INTACT', W - 40, 52);
      } else {
        ctx.fillStyle = '#34c759';
        ctx.fillText('SURVIVED THE BEND TEST', W - 40, 52);
      }

      // Bottom Stats Glass Card
      ctx.fillStyle = 'rgba(10, 16, 22, 0.92)';
      ctx.beginPath();
      ctx.roundRect(40, H - 110, W - 80, 80, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      const snapTime = snapshot && snapshot.snapTime ? `${Number(snapshot.snapTime).toFixed(2)}s` : '20.00s';
      const peakCps = snapshot && snapshot.peakCps ? `${Number(snapshot.peakCps).toFixed(1)} CPS` : '12.0 CPS';
      const maxAngle = snapshot && snapshot.bendAngleDeg ? `${Number(snapshot.bendAngleDeg).toFixed(1)}°` : `${bendAngle.toFixed(1)}°`;
      const repairBill = !survived ? '$1,899 (Out-of-Warranty)' : '$0';

      ctx.textAlign = 'left';
      ctx.font = 'bold 12px "SF Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fillText('FAILURE TIME', 70, H - 76);
      ctx.fillText('MAX BEND ANGLE', 240, H - 76);
      ctx.fillText('PEAK SPEED', 440, H - 76);
      ctx.fillText('ESTIMATED REPAIR BILL', 640, H - 76);

      ctx.font = '900 20px -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(snapTime, 70, H - 48);
      ctx.fillText(maxAngle, 240, H - 48);
      ctx.fillText(peakCps, 440, H - 48);
      ctx.fillStyle = !survived ? '#ff3b30' : '#34c759';
      ctx.fillText(repairBill, 640, H - 48);

      ctx.textAlign = 'right';
      ctx.font = 'bold 13px "SF Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText('frankonedigital.com/bend-test', W - 65, H - 52);

      return cardCanvas;
    }

    // =======================================================================
    // 4.11 CLEANUP & LIFECYCLE
    // =======================================================================

    destroy() {
      if (typeof window !== 'undefined' && this._boundResize) {
        window.removeEventListener('resize', this._boundResize);
        this._boundResize = null;
      }
      this.particlePool.clear();
      this.floatingLabels = [];
    }
  }

  // Expose Constants & Subsystems on CanvasRenderer Class
  CanvasRenderer.VIRTUAL_WIDTH = VIRTUAL_WIDTH;
  CanvasRenderer.VIRTUAL_HEIGHT = VIRTUAL_HEIGHT;
  CanvasRenderer.PHONE_WIDTH = PHONE_WIDTH;
  CanvasRenderer.PHONE_HEIGHT = PHONE_HEIGHT;
  CanvasRenderer.WING_WIDTH = WING_WIDTH;
  CanvasRenderer.HINGE_GAP = HINGE_GAP;
  CanvasRenderer.SLICES_PER_WING = SLICES_PER_WING;
  CanvasRenderer.PALETTE = PALETTE;

  return CanvasRenderer;
});
