/**
 * JerryRigEverything iPhone Duo Bend Test Arcade Game
 * Procedural Web Audio API Sound Synthesizer (js/audio.js)
 * 
 * 100% algorithmic audio synthesis with ZERO external audio files (.mp3/.wav/.ogg).
 * Provides 5 distinct sound signatures:
 *   1. Button mash strain thud (pitch-dropping sine 120Hz->42Hz + 220Hz lowpass noise)
 *   2. Metallic frame creaks (FM synthesis: carrier 380-520Hz, mod 45-75Hz, bandpass Q=8.5)
 *   3. OLED electrical buzz (120Hz pulse + 3.8kHz capacitor whine + waveshaper sigmoid distortion)
 *   4. Glass cracking (highpass 2.8kHz + bandpass 6.2kHz noise bursts in 12-28ms micro-clusters)
 *   5. Catastrophic snap (3-layer composite: 220Hz sub-bass shockwave + 3.4kHz crack + dual 1380Hz/2760Hz metallic ring)
 * 
 * Features:
 *   - Universal user-gesture AudioContext unlock (pointerdown, touchstart, keydown, click)
 *   - Master DynamicsCompressorNode preventing digital clipping during rapid mashing
 *   - Smooth gain ramping and localStorage persistence ('jre_bend_muted')
 *   - Event subscriber method: playEvent(type, payload) matching AudioEventType contract
 *   - Universal Module Definition (UMD) for browser (window.JRE.audio) and Node.js (module.exports)
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js CommonJS
    const audio = factory();
    module.exports = audio;
    module.exports.audio = audio;
    module.exports.Audio = audio;
  } else {
    // Browser global
    root.JRE = root.JRE || {};
    const audio = factory();
    root.JRE.audio = audio;
    root.JRE.Audio = audio; // alias
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this), function () {
  'use strict';

  // =========================================================================
  // 1. STATE & CONSTANTS
  // =========================================================================

  const STORAGE_KEY_MUTED = 'jre_bend_muted';

  let audioCtx = null;
  let masterGain = null;
  let compressorNode = null;
  let isMuted = false;
  let isUnlocked = false;
  let listenersAttached = false;

  // =========================================================================
  // 2. LOCAL STORAGE PERSISTENCE SAFELY
  // =========================================================================

  function getStoredMutePreference() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage !== null) {
        return localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
      }
    } catch (e) {
      // Ignore private-browsing or security exceptions
    }
    return false;
  }

  function setStoredMutePreference(val) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage !== null) {
        localStorage.setItem(STORAGE_KEY_MUTED, String(val));
      }
    } catch (e) {
      // Ignore exceptions
    }
  }

  // Initialize mute state from storage
  isMuted = getStoredMutePreference();

  // =========================================================================
  // 3. MASTER GRAPH INITIALIZATION & USER-GESTURE UNLOCK
  // =========================================================================

  /**
   * Initializes or retrieves the singleton Web AudioContext and master bus graph.
   * Graph Topology:
   *   [SFX Nodes] -> [compressorNode] -> [masterGain] -> [destination]
   */
  function ensureAudioContext() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          isUnlocked = true;
        }).catch(() => {});
      }
      return audioCtx;
    }

    const AudioContextClass = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) ||
                              (typeof global !== 'undefined' && (global.AudioContext || global.webkitAudioContext)) ||
                              null;

    if (!AudioContextClass) {
      return null;
    }

    try {
      audioCtx = new AudioContextClass();

      // Master Dynamics Compressor to prevent clipping during chaotic mashing
      compressorNode = audioCtx.createDynamicsCompressor();
      if (compressorNode.threshold) compressorNode.threshold.value = -12;
      if (compressorNode.knee) compressorNode.knee.value = 15;
      if (compressorNode.ratio) compressorNode.ratio.value = 6;
      if (compressorNode.attack) compressorNode.attack.value = 0.003;
      if (compressorNode.release) compressorNode.release.value = 0.15;

      // Master Volume & Mute Gain Node
      masterGain = audioCtx.createGain();
      const initialGain = isMuted ? 0.0001 : 1.0;
      const now = audioCtx.currentTime || 0;
      masterGain.gain.setValueAtTime(initialGain, now);

      compressorNode.connect(masterGain);
      masterGain.connect(audioCtx.destination);

      if (audioCtx.state === 'running') {
        isUnlocked = true;
      }
    } catch (e) {
      // AudioContext creation failed or blocked
      audioCtx = null;
      return null;
    }

    return audioCtx;
  }

  /**
   * Triggered on user interaction to unlock browser autoplay policy.
   */
  function unlock() {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        isUnlocked = true;
      }).catch(() => {});
    } else if (ctx.state === 'running') {
      isUnlocked = true;
    }
  }

  /**
   * Binds universal user gesture listeners to document / window.
   */
  function setupUnlockListeners() {
    if (listenersAttached) return;
    const target = typeof window !== 'undefined' ? window : (typeof document !== 'undefined' ? document : null);
    if (!target || !target.addEventListener) return;

    const events = ['pointerdown', 'touchstart', 'keydown', 'click'];
    const onGesture = function () {
      unlock();
      if (isUnlocked && audioCtx && audioCtx.state === 'running') {
        events.forEach(ev => {
          try {
            target.removeEventListener(ev, onGesture);
          } catch (e) {}
        });
        listenersAttached = false;
      }
    };

    events.forEach(ev => {
      try {
        target.addEventListener(ev, onGesture, { passive: true, capture: true });
      } catch (e) {
        try {
          target.addEventListener(ev, onGesture, false);
        } catch (err) {}
      }
    });

    listenersAttached = true;
  }

  // Automatically register listeners if running in a browser environment
  if (typeof window !== 'undefined') {
    setupUnlockListeners();
  }

  // =========================================================================
  // 4. MUTE CONTROL & VOLUME LIFECYCLE
  // =========================================================================

  /**
   * Check if sound is currently muted.
   */
  function getIsMuted() {
    return isMuted;
  }

  /**
   * Set mute state explicitly with smooth gain ramping to avoid clicks.
   */
  function setMuted(muted) {
    isMuted = Boolean(muted);
    setStoredMutePreference(isMuted);

    if (masterGain && audioCtx) {
      const now = audioCtx.currentTime || 0;
      const targetVal = isMuted ? 0.0001 : 1.0;
      if (masterGain.gain.setTargetAtTime) {
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.setTargetAtTime(targetVal, now, 0.015);
      } else if (masterGain.gain.linearRampToValueAtTime) {
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.linearRampToValueAtTime(targetVal, now + 0.02);
      } else {
        masterGain.gain.setValueAtTime(targetVal, now);
      }
    }

    return isMuted;
  }

  /**
   * Toggles mute state. Returns new muted boolean.
   */
  function toggleMute() {
    return setMuted(!isMuted);
  }

  /**
   * Get current AudioContext state string ('running' | 'suspended' | 'closed' | 'uninitialized').
   */
  function getState() {
    return audioCtx ? audioCtx.state : 'uninitialized';
  }

  // =========================================================================
  // 5. PROCEDURAL SYNTHESIS UTILITIES
  // =========================================================================

  /**
   * Generates a single-channel white noise AudioBuffer.
   */
  function createNoiseBuffer(ctx, durationSec) {
    const sampleRate = ctx.sampleRate || 44100;
    const bufferSize = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      channelData[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Creates and returns an AudioBufferSourceNode with fresh white noise.
   */
  function createNoiseSource(ctx, durationSec) {
    const buffer = createNoiseBuffer(ctx, durationSec);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  /**
   * Sigmoid transfer function for WaveShaper soft distortion.
   */
  function makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 30;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // =========================================================================
  // 6. PROCEDURAL SOUND EFFECTS (THE 5 CORE SFX)
  // =========================================================================

  /**
   * SFX 1: Button Mash Strain Thud
   * Layer A: Pitch-dropping sine wave (120Hz -> 42Hz)
   * Layer B: Low-pass filtered noise burst (cutoff 220Hz)
   * Scaled dynamically with tap force/CPS intensity (0.0 to 1.0).
   */
  function playMashStrain(intensity = 0.5) {
    if (isMuted) return;
    const ctx = ensureAudioContext();
    if (!ctx || !compressorNode) return;

    try {
      const now = ctx.currentTime || 0;
      const clampedIntensity = Math.max(0.1, Math.min(1.0, intensity));

      // Layer A: Sub-bass transient sine sweep (120Hz -> 42Hz)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';

      const startFreq = 120 + (clampedIntensity - 0.5) * 20; // 110 - 130 Hz centered at 120Hz
      osc.frequency.setValueAtTime(startFreq, now);
      if (osc.frequency.exponentialRampToValueAtTime) {
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);
      } else {
        osc.frequency.setValueAtTime(42, now + 0.08);
      }

      const peakOscGain = 0.4 + clampedIntensity * 0.3;
      oscGain.gain.setValueAtTime(peakOscGain, now);
      if (oscGain.gain.exponentialRampToValueAtTime) {
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      } else {
        oscGain.gain.setValueAtTime(0.001, now + 0.085);
      }

      osc.connect(oscGain);
      oscGain.connect(compressorNode);
      osc.start(now);
      if (osc.stop) osc.stop(now + 0.09);

      // Layer B: Impact friction noise burst filtered at 220Hz
      const noise = createNoiseSource(ctx, 0.07);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);
      if (filter.Q) filter.Q.value = 2.0;

      const noiseGain = ctx.createGain();
      const peakNoiseGain = 0.22 + clampedIntensity * 0.2;
      noiseGain.gain.setValueAtTime(peakNoiseGain, now);
      if (noiseGain.gain.exponentialRampToValueAtTime) {
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      } else {
        noiseGain.gain.setValueAtTime(0.001, now + 0.07);
      }

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(compressorNode);
      noise.start(now);
      if (noise.stop) noise.stop(now + 0.075);
    } catch (e) {
      // Audio playback fault tolerance
    }
  }

  /**
   * SFX 2: Metallic Frame Creaks
   * FM synthesis: Sawtooth/triangle carrier (380-520Hz) modulated by a 45-75Hz sine oscillator,
   * shaped by a high-Q bandpass filter (Q = 8.5) sweeping downward to simulate metal micro-groaning.
   */
  function playFrameCreak(severity = 0.5) {
    if (isMuted) return;
    const ctx = ensureAudioContext();
    if (!ctx || !compressorNode) return;

    try {
      const now = ctx.currentTime || 0;
      const sev = Math.max(0.1, Math.min(1.0, severity));
      const duration = 0.18 + Math.random() * 0.12;

      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const creakGain = ctx.createGain();

      carrier.type = 'sawtooth';
      const baseFreq = 380 + Math.random() * 80; // 380 - 460 Hz
      carrier.frequency.setValueAtTime(baseFreq, now);
      if (carrier.frequency.linearRampToValueAtTime) {
        carrier.frequency.linearRampToValueAtTime(450 + sev * 70, now + duration);
      }

      modulator.type = 'sine';
      const modFreq = 45 + Math.random() * 30; // 45 - 75 Hz
      modulator.frequency.setValueAtTime(modFreq, now);

      const modIndex = 180 + sev * 140; // 180 - 320
      modGain.gain.setValueAtTime(modIndex, now);
      modulator.connect(carrier.frequency);

      filter.type = 'bandpass';
      if (filter.Q) {
        if (filter.Q.setValueAtTime) filter.Q.setValueAtTime(8.5, now);
        else filter.Q.value = 8.5;
      }
      filter.frequency.setValueAtTime(1400, now);
      if (filter.frequency.exponentialRampToValueAtTime) {
        filter.frequency.exponentialRampToValueAtTime(850 + Math.random() * 400, now + duration);
      }

      creakGain.gain.setValueAtTime(0.01, now);
      if (creakGain.gain.linearRampToValueAtTime) {
        creakGain.gain.linearRampToValueAtTime(0.35 * sev, now + 0.035);
      }
      if (creakGain.gain.exponentialRampToValueAtTime) {
        creakGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      }

      carrier.connect(filter);
      filter.connect(creakGain);
      creakGain.connect(compressorNode);

      modulator.start(now);
      carrier.start(now);
      if (modulator.stop) modulator.stop(now + duration);
      if (carrier.stop) carrier.stop(now + duration);
    } catch (e) {}
  }

  /**
   * SFX 3: OLED Electrical Buzzing
   * 120Hz display refresh pulse/square wave + 3.8kHz capacitor whine,
   * run through a WaveShaper sigmoid distortion curve and peaking filter.
   */
  function playOledBuzz(duration = 0.28) {
    if (isMuted) return;
    const ctx = ensureAudioContext();
    if (!ctx || !compressorNode) return;

    try {
      const now = ctx.currentTime || 0;
      const dur = Math.max(0.15, Math.min(0.6, duration || 0.28));

      // 120Hz pulse wave (ground hum / display refresh)
      const humOsc = ctx.createOscillator();
      humOsc.type = 'square';
      humOsc.frequency.setValueAtTime(120, now);

      // 3.8kHz capacitor / backlight whine
      const whineOsc = ctx.createOscillator();
      whineOsc.type = 'sine';
      whineOsc.frequency.setValueAtTime(3800, now);

      // Sigmoid distortion curve
      const shaper = ctx.createWaveShaper();
      shaper.curve = makeDistortionCurve(30);
      shaper.oversample = '2x';

      // Peaking filter centered around 3.5kHz for nasty buzz emphasis
      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = 3500;
      filter.gain.value = 8;

      const buzzGain = ctx.createGain();
      buzzGain.gain.setValueAtTime(0.02, now);
      if (buzzGain.gain.linearRampToValueAtTime) {
        buzzGain.gain.linearRampToValueAtTime(0.24, now + 0.02);
      }
      if (buzzGain.gain.exponentialRampToValueAtTime) {
        buzzGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      }

      humOsc.connect(shaper);
      whineOsc.connect(shaper);
      shaper.connect(filter);
      filter.connect(buzzGain);
      buzzGain.connect(compressorNode);

      humOsc.start(now);
      whineOsc.start(now);
      if (humOsc.stop) humOsc.stop(now + dur);
      if (whineOsc.stop) whineOsc.stop(now + dur);
    } catch (e) {}
  }

  /**
   * SFX 4: Glass Cracking
   * Rapid micro-clusters (12-28ms intervals) of highpass (2.8kHz) +
   * bandpass (6.2kHz, Q=11) filtered noise bursts.
   */
  function playGlassCrack(clusterSize = 3) {
    if (isMuted) return;
    const ctx = ensureAudioContext();
    if (!ctx || !compressorNode) return;

    try {
      const now = ctx.currentTime || 0;
      const bursts = Math.max(2, Math.min(5, clusterSize || 3));

      for (let i = 0; i < bursts; i++) {
        const offset = i * (0.012 + Math.random() * 0.016); // 12 - 28ms spacing
        const burstTime = now + offset;
        const noise = createNoiseSource(ctx, 0.05);

        const hpFilter = ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(2800, burstTime);

        const bpFilter = ctx.createBiquadFilter();
        bpFilter.type = 'bandpass';
        if (bpFilter.Q) bpFilter.Q.value = 11;
        const bpFreq = 6200 + (Math.random() - 0.5) * 800; // 5800 - 6600Hz centered at ~6.2kHz
        bpFilter.frequency.setValueAtTime(bpFreq, burstTime);

        const burstGain = ctx.createGain();
        const peakAmp = 0.45 / (i + 1); // Primary crack is sharpest
        burstGain.gain.setValueAtTime(peakAmp, burstTime);
        if (burstGain.gain.exponentialRampToValueAtTime) {
          burstGain.gain.exponentialRampToValueAtTime(0.0001, burstTime + 0.04);
        }

        noise.connect(hpFilter);
        hpFilter.connect(bpFilter);
        bpFilter.connect(burstGain);
        burstGain.connect(compressorNode);

        noise.start(burstTime);
        if (noise.stop) noise.stop(burstTime + 0.045);
      }
    } catch (e) {}
  }

  /**
   * SFX 5: Catastrophic Snap (Climactic Failure)
   * 3-Layer Composite Architecture:
   *   Layer 1: Sub-bass shockwave boom (sine pitching 220Hz -> 28Hz over 450ms)
   *   Layer 2: Explosive shrapnel crack (3.4kHz bandpass noise burst, Q=3.5, 90ms decay)
   *   Layer 3: Dual metallic hinge ring (dual resonant sines at 1380Hz and 2760Hz with 750ms decay)
   */
  function playCatastrophicSnap() {
    if (isMuted) return;
    const ctx = ensureAudioContext();
    if (!ctx || !compressorNode) return;

    try {
      const now = ctx.currentTime || 0;

      // Layer 1: Shockwave Sub-bass Boom (220Hz -> 28Hz)
      const boomOsc = ctx.createOscillator();
      const boomGain = ctx.createGain();
      boomOsc.type = 'sine';
      boomOsc.frequency.setValueAtTime(220, now);
      if (boomOsc.frequency.exponentialRampToValueAtTime) {
        boomOsc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
      }

      boomGain.gain.setValueAtTime(1.0, now);
      if (boomGain.gain.exponentialRampToValueAtTime) {
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.50);
      }

      boomOsc.connect(boomGain);
      boomGain.connect(compressorNode);
      boomOsc.start(now);
      if (boomOsc.stop) boomOsc.stop(now + 0.52);

      // Layer 2: Explosive Shrapnel Crack (3.4kHz, Q=3.5)
      const noise = createNoiseSource(ctx, 0.12);
      const crackFilter = ctx.createBiquadFilter();
      crackFilter.type = 'bandpass';
      crackFilter.frequency.setValueAtTime(3400, now);
      if (crackFilter.Q) crackFilter.Q.value = 3.5;

      const crackGain = ctx.createGain();
      crackGain.gain.setValueAtTime(0.9, now);
      if (crackGain.gain.exponentialRampToValueAtTime) {
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
      }

      noise.connect(crackFilter);
      crackFilter.connect(crackGain);
      crackGain.connect(compressorNode);
      noise.start(now);
      if (noise.stop) noise.stop(now + 0.11);

      // Layer 3: Dual Metallic Hinge Ring (1380Hz & 2760Hz harmonics)
      const ringFreqs = [1380, 2760];
      ringFreqs.forEach((freq, idx) => {
        const ringOsc = ctx.createOscillator();
        const ringGain = ctx.createGain();
        ringOsc.type = 'sine';
        ringOsc.frequency.setValueAtTime(freq, now);

        const amp = 0.28 / (idx + 1); // Fundamental louder than harmonic
        ringGain.gain.setValueAtTime(amp, now);
        if (ringGain.gain.exponentialRampToValueAtTime) {
          ringGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.80);
        }

        ringOsc.connect(ringGain);
        ringGain.connect(compressorNode);
        ringOsc.start(now);
        if (ringOsc.stop) ringOsc.stop(now + 0.82);
      });
    } catch (e) {}
  }

  // =========================================================================
  // 7. AUXILIARY SOUND EFFECTS (UI / COUNTDOWN / BUZZERS)
  // =========================================================================

  /**
   * Countdown tick beep (3.. 2.. 1..)
   */
  function playCountdownTick(count = 3) {
    if (isMuted) return;
    const ctx = ensureAudioContext();
    if (!ctx || !compressorNode) return;

    try {
      const now = ctx.currentTime || 0;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);

      gain.gain.setValueAtTime(0.25, now);
      if (gain.gain.exponentialRampToValueAtTime) {
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      }

      osc.connect(gain);
      gain.connect(compressorNode);
      osc.start(now);
      if (osc.stop) osc.stop(now + 0.09);
    } catch (e) {}
  }

  /**
   * Countdown GO! beep (higher octave)
   */
  function playCountdownGo() {
    if (isMuted) return;
    const ctx = ensureAudioContext();
    if (!ctx || !compressorNode) return;

    try {
      const now = ctx.currentTime || 0;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.35, now);
      if (gain.gain.exponentialRampToValueAtTime) {
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      }

      osc.connect(gain);
      gain.connect(compressorNode);
      osc.start(now);
      if (osc.stop) osc.stop(now + 0.20);
    } catch (e) {}
  }

  /**
   * Orientation flip / mechanical click whoosh
   */
  function playFlip() {
    if (isMuted) return;
    const ctx = ensureAudioContext();
    if (!ctx || !compressorNode) return;

    try {
      const now = ctx.currentTime || 0;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      if (osc.frequency.exponentialRampToValueAtTime) {
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.09);
      }

      gain.gain.setValueAtTime(0.25, now);
      if (gain.gain.exponentialRampToValueAtTime) {
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      }

      osc.connect(gain);
      gain.connect(compressorNode);
      osc.start(now);
      if (osc.stop) osc.stop(now + 0.10);
    } catch (e) {}
  }

  /**
   * Survival / timeout chime (arcade victory chord)
   */
  function playSurvival() {
    if (isMuted) return;
    const ctx = ensureAudioContext();
    if (!ctx || !compressorNode) return;

    try {
      const now = ctx.currentTime || 0;
      // C major triad (523Hz, 659Hz, 784Hz)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.setValueAtTime(0.20, now + idx * 0.08);
        if (gain.gain.exponentialRampToValueAtTime) {
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
        }

        osc.connect(gain);
        gain.connect(compressorNode);
        osc.start(now + idx * 0.08);
        if (osc.stop) osc.stop(now + idx * 0.08 + 0.50);
      });
    } catch (e) {}
  }

  // =========================================================================
  // 8. EVENT SUBSCRIBER METHOD (AudioEventType Contract)
  // =========================================================================

  /**
   * Main dispatch method conforming to window.JRE.audio.playEvent(type, payload).
   * Maps typed events from engine.js to synthesized audio routines.
   */
  function playEvent(type, payload = {}) {
    switch (type) {
      case 'MASH_STRAIN':
      case 'TAP_MASH':
      case 'TAP_ALTERNATE_COMBO':
        playMashStrain(payload ? (payload.forceNormalized || payload.intensity || 0.5) : 0.5);
        break;

      case 'FRAME_CREAK':
        playFrameCreak(payload ? (payload.intensity || 0.6) : 0.6);
        break;

      case 'OLED_BUZZ':
      case 'OLED_GLITCH':
        playOledBuzz(0.30);
        break;

      case 'GLASS_CRACK':
        playGlassCrack(payload ? (payload.clusterSize || 3) : 3);
        break;

      case 'SNAP':
      case 'CATASTROPHIC_SNAP':
        playCatastrophicSnap();
        break;

      case 'COUNTDOWN_TICK':
        playCountdownTick(payload ? payload.count : 3);
        break;

      case 'COUNTDOWN_GO':
        playCountdownGo();
        break;

      case 'FLIP_ORIENT':
        playFlip();
        break;

      case 'SURVIVAL_BUZZER':
        playSurvival();
        break;

      case 'STAGE_TRANSITION':
        if (payload && payload.newStage === 3) {
          playOledBuzz(0.35);
        } else if (payload && payload.newStage === 4) {
          playGlassCrack(4);
        } else if (payload && payload.newStage === 5) {
          playCatastrophicSnap();
        } else {
          playFrameCreak(0.7);
        }
        break;

      default:
        break;
    }
  }

  // =========================================================================
  // 9. PUBLIC API EXPORT
  // =========================================================================

  return {
    // Lifecycle & Mute Controls
    ensureAudioContext,
    unlock,
    isMuted: getIsMuted,
    setMuted,
    toggleMute,
    getState,

    // Core Event Dispatcher
    playEvent,

    // 5 Procedural SFX & Named Aliases
    playMashStrain,
    playStrain: playMashStrain,
    playFrameCreak,
    playCreak: playFrameCreak,
    playOledBuzz,
    playGlassCrack,
    playCatastrophicSnap,
    playSnap: playCatastrophicSnap,

    // Auxiliary SFX
    playCountdownTick,
    playCountdownGo,
    playFlip,
    playSurvival
  };
});
