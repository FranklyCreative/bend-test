/**
 * JerryRigEverything iPhone Duo Bend Test Arcade Game
 * Core Game & Physics Engine (js/engine.js)
 * 
 * Production-grade state machine, continuous differential physics simulation,
 * asymmetric orientation mechanics, 3 difficulty tiers, input handling with
 * alternating combo bonus, audio event dispatch, and test bridge.
 * 
 * Compatible with both browser (window.JRE.Engine) and Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js CommonJS
    const Engine = factory();
    module.exports = Engine;
    module.exports.Engine = Engine;
  } else {
    // Browser global
    root.JRE = root.JRE || {};
    const Engine = factory();
    root.JRE.Engine = Engine;
    root.JRE_Engine = Engine;
    // Backwards-compatible alias for any surveyor/test looking for Mechanics
    root.JRE.Mechanics = Engine;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this), function () {
  'use strict';

  // =========================================================================
  // 1. CONSTANTS & DIFFICULTY TIERS
  // =========================================================================

  const STATES = {
    IDLE_SELECT: 'IDLE_SELECT',
    COUNTDOWN: 'COUNTDOWN',
    ACTIVE_MASHING: 'ACTIVE_MASHING',
    SNAP_CELEBRATION: 'SNAP_CELEBRATION',
    SURVIVAL_FAIL: 'SURVIVAL_FAIL',
    REPORT_CARD: 'REPORT_CARD'
  };

  const ORIENTATIONS = {
    REVERSE_BEND: 'REVERSE_BEND', // Outward hyperextension against hinge (vulnerable)
    FRONT_BEND: 'FRONT_BEND'       // Inward folding along native hinge (resists)
  };

  const FOLD_STATES = {
    UNFOLDED: 'unfolded',
    FOLDED: 'folded'
  };

  const DIFFICULTY_TIERS = {
    standard: {
      id: 'standard',
      tierNumber: 1,
      name: 'Standard iPhone Duo',
      displayName: 'iPhone Duo',
      deviceBrand: 'Apple',
      deviceModel: 'iPhone Duo',
      difficultyLabel: 'Easy • iPhone Duo',
      chassis: '7000-series Anodized Aluminum',
      runDuration: 15.0,
      forcePerTap: 4.5,
      yieldThreshold: 18.0,
      decayRate: 1.8,
      damageScale: 1.2,
      comboBonus: 1.25,
      targetCps: 7.0,
      description: 'Baseline retail foldable. Catastrophically vulnerable to reverse bend.',
      // Calibrated parameters (Item 1 consensus remediation)
      calibrated: {
        forcePerTap: 4.2,
        yieldThreshold: 15.0,
        decayRate: 1.6,
        damageScale: 0.30,
        comboBonus: 1.25
      }
    },
    dust: {
      id: 'dust',
      tierNumber: 2,
      name: 'Dust-Jammed IP68 Hinge',
      displayName: 'iPhone Duo (Dust-Jammed)',
      deviceBrand: 'Apple',
      deviceModel: 'iPhone Duo (Dust-Jammed)',
      difficultyLabel: 'Medium • Dust-Jammed',
      chassis: 'Aluminum with Sand-Jammed Micro-Gears',
      runDuration: 15.0,
      forcePerTap: 3.8,
      yieldThreshold: 25.0,
      decayRate: 1.2,
      damageScale: 1.0,
      comboBonus: 1.25,
      targetCps: 9.0,
      description: 'Fine sand and grit ground into the hinge gears. High friction, gritty resistance.',
      // Calibrated parameters (Item 1 consensus remediation)
      calibrated: {
        forcePerTap: 3.8,
        yieldThreshold: 20.0,
        decayRate: 1.35,
        damageScale: 0.32,
        comboBonus: 1.25
      }
    },
    titanium: {
      id: 'titanium',
      tierNumber: 3,
      name: 'Reinforced Titanium Max',
      displayName: 'Samsung Galaxy Z Fold 8',
      deviceBrand: 'Samsung',
      deviceModel: 'Samsung Galaxy Z Fold 8',
      difficultyLabel: 'Hard • Samsung Fold 8',
      chassis: 'Armor Aluminum + Dual-Rail FlexHinge + Grade 5 Titanium',
      runDuration: 15.0,
      forcePerTap: 3.0,
      yieldThreshold: 38.0,
      decayRate: 3.2,
      damageScale: 0.75,
      comboBonus: 1.35,
      targetCps: 12.0,
      description: 'Samsung Galaxy Z Fold 8 with Armor FlexHinge and titanium backplate. Brutal spring-back resistance.',
      // Calibrated parameters (Item 1 consensus remediation)
      calibrated: {
        forcePerTap: 3.8,
        yieldThreshold: 26.0,
        decayRate: 2.1,
        damageScale: 0.55,
        comboBonus: 1.35
      }
    },
    pixel: {
      id: 'pixel',
      tierNumber: 4,
      name: 'Google Pixel 10 Pro Fold',
      displayName: 'Google Pixel 10 Pro Fold',
      deviceBrand: 'Google',
      deviceModel: 'Google Pixel 10 Pro Fold',
      difficultyLabel: 'Expert • Pixel 10 Pro Fold',
      chassis: 'Aerospace Aluminum + Fluid-Friction Hinge + Offset Antenna Seam',
      runDuration: 15.0,
      forcePerTap: 3.4,
      yieldThreshold: 31.0,
      decayRate: 2.3,
      damageScale: 0.90,
      comboBonus: 1.30,
      targetCps: 10.5,
      description: 'Google Pixel 10 Pro Fold with fluid-friction gearless hinge and offset antenna seam right beside the spine.',
      calibrated: {
        forcePerTap: 3.8,
        yieldThreshold: 23.0,
        decayRate: 1.8,
        damageScale: 0.45,
        comboBonus: 1.30
      }
    },
    trifold: {
      id: 'trifold',
      tierNumber: 5,
      name: 'Huawei Mate XT Tri-Fold',
      displayName: 'Huawei Mate XT Tri-Fold',
      deviceBrand: 'Huawei',
      deviceModel: 'Huawei Mate XT Tri-Fold',
      difficultyLabel: 'Boss • Mate XT Tri-Fold',
      chassis: 'Ultra-Thin 3.6mm Dual-Hinge Ti-Alloy + Carbon Fiber Spine',
      runDuration: 15.0,
      forcePerTap: 2.8,
      yieldThreshold: 42.0,
      decayRate: 3.5,
      damageScale: 0.72,
      comboBonus: 1.40,
      targetCps: 13.5,
      description: 'Ultra-thin 3.6mm dual-hinge Z-fold flagship with twin opposing hinges and carbon-fiber reinforcement.',
      calibrated: {
        forcePerTap: 3.7,
        yieldThreshold: 28.0,
        decayRate: 2.3,
        damageScale: 0.52,
        comboBonus: 1.40
      }
    }
  };

  /**
   * Consensus Calibrated Difficulty Tiers (Milestone M1 Remediation)
   * Standard: forcePerTap: 4.2, yieldThreshold: 15.0, decayRate: 1.6, damageScale: 0.30, comboBonus: 1.25
   * Dust: forcePerTap: 3.8, yieldThreshold: 20.0, decayRate: 1.35, damageScale: 0.32, comboBonus: 1.25
   * Titanium: forcePerTap: 3.8, yieldThreshold: 26.0, decayRate: 2.1, damageScale: 0.55, comboBonus: 1.35
   * Makes Titanium winnable at ~12 CPS alternating and unwinnable at <=10 CPS.
   */
  const CALIBRATED_TIERS = {
    standard: {
      id: 'standard',
      tierNumber: 1,
      name: 'Standard iPhone Duo',
      chassis: '7000-series Anodized Aluminum',
      runDuration: 15.0,
      forcePerTap: 4.2,
      yieldThreshold: 15.0,
      decayRate: 1.6,
      damageScale: 0.30,
      comboBonus: 1.25,
      targetCps: 7.0,
      description: 'Baseline retail foldable. Catastrophically vulnerable to reverse bend.'
    },
    dust: {
      id: 'dust',
      tierNumber: 2,
      name: 'Dust-Jammed IP68 Hinge',
      chassis: 'Aluminum with Sand-Jammed Micro-Gears',
      runDuration: 15.0,
      forcePerTap: 3.8,
      yieldThreshold: 20.0,
      decayRate: 1.35,
      damageScale: 0.32,
      comboBonus: 1.25,
      targetCps: 9.0,
      description: 'Fine sand and grit ground into the hinge gears. High friction, gritty resistance.'
    },
    titanium: {
      id: 'titanium',
      tierNumber: 3,
      name: 'Reinforced Titanium Max',
      chassis: 'Grade 5 Titanium + Internal Ribbing',
      runDuration: 15.0,
      forcePerTap: 3.8,
      yieldThreshold: 26.0,
      decayRate: 2.1,
      damageScale: 0.55,
      comboBonus: 1.35,
      targetCps: 12.0,
      description: 'Brutal spring-back decay and reinforced titanium rails. Requires relentless arcade mashing.'
    }
  };

  DIFFICULTY_TIERS.calibrated = CALIBRATED_TIERS;

  const ZACK_QUIPS = {
    intro: "Let's see if Apple's new folding hinge can survive the bend test.",
    frontBendWarning: "Bending from the front locks against the native hinge. Turn it around to test the spine.",
    reverseBendActive: "Now we're bending backwards against the hinge. Let's see what happens.",
    foldedWarning: "Bending it folded is twice as thick. We need to open it up to find the weak spot.",
    stage1: "Initial flex... structural aluminum is groaning.",
    stage2: "There's a permanent crease forming. Glass is glass, and glass breaks.",
    stage3: "And the inner display gives us the green line of death. That's a $1,499 out-of-warranty repair.",
    stage4: "You can hear the glass screaming under the thumbs.",
    snap: "The inner display has failed. The frame is still holding together.",
    survival: "Remarkable. The iPhone Duo survives the bend test... for now.",
    lowCps: "You gotta put some muscle into it. Thumbs to the center."
  };

  // =========================================================================
  // 2. CORE ENGINE CLASS
  // =========================================================================

  class Engine {
    constructor(options = {}) {
      // Configuration
      this.options = Object.assign({
        autoTick: false,
        defaultTier: 'standard',
        enableAudio: true,
        enableHaptics: true
      }, options);

      // Event listeners
      this._audioListeners = [];
      this._stateChangeListeners = [];
      this._stageChangeListeners = [];

      // Current difficulty tier
      this.currentTier = Object.assign({}, DIFFICULTY_TIERS[this.options.defaultTier] || DIFFICULTY_TIERS.standard);
      if (Number.isFinite(this.options.runDuration) && this.options.runDuration > 0) this.currentTier.runDuration = this.options.runDuration;

      // Primary state variables
      this.state = STATES.IDLE_SELECT;
      this.orientation = ORIENTATIONS.REVERSE_BEND;
      this.foldState = FOLD_STATES.UNFOLDED;

      // Continuous differential physics variables
      this.force = 0.0;              // Instantaneous force F(t) in [0, 100]
      this.maxForce = 100.0;
      this.damage = 0.0;             // Cumulative damage D(t) in [0, 100]%
      this.bendAngle = 0.0;          // Total angle between the two halves, up to 38°
      this.peakForce = 0.0;
      this.maxBendAngle = 0.0;

      // Timers & countdowns
      this.timeRemaining = this.currentTier.runDuration;
      this.totalDuration = this.currentTier.runDuration;
      this.elapsedTime = 0.0;
      this.countdownRemaining = 3.0; // 3.0s countdown
      this._lastCountdownTick = null;
      this.celebrationTimer = 0.0;

      // CPS & Input tracking
      this.inputBuffer = [];         // Timestamps for rolling 1.0s window
      this.cpsRaw = 0.0;
      this.cpsSmoothed = 0.0;
      this.peakCps = 0.0;
      this.totalTaps = 0;
      this.lastTapHand = null;
      this.lastTapTime = -1.0;
      this.lastTapHandTime = { left: -1.0, right: -1.0 };
      this.activeHand = null;
      this.currentComboMultiplier = 1.0;
      this.comboStreak = 0;
      this.maxComboStreak = 0;
      this.labToolsUsed = { scratch: false, burn: false, sand: false };
      this.telemetryHistory = [{ t: 0, force: 0, damage: 0, angle: 0 }];
      this._lastTelemetrySampleTime = 0.0;

      // Ergonomic blanching & screen shake
      this.leftThumbStrain = 0.0;    // 0 to 1 for ischemic blanching
      this.rightThumbStrain = 0.0;   // 0 to 1
      this.shakeTrauma = 0.0;        // 0 to 1
      this.shakeAmplitude = 0.0;     // 0 to 16 pixels
      this.isShaking = false;
      this.sparkCount = 0;

      // Thematic commentary
      this.currentQuip = ZACK_QUIPS.intro;
      this.currentStage = 1;         // 1 to 5

      // Run outcome
      this.survived = false;
      this.snapTime = null;
      this.isSnapped = false;

      // Orientation cooldown
      this._lastFlipTime = -1.0;

      // Internal clock
      this._lastFrameTime = null;

      // Auto-bind input if in browser
      this._boundKeyDown = null;
      this._boundPointerDown = null;

      this.resetGame(false);
      if (this.options.calibrated) {
        this.useCalibratedTiers(true);
      }
      this._setupTestingBridge();
    }

    // =======================================================================
    // 3. LIFECYCLE & STATE MACHINE
    // =======================================================================

    /**
     * Resets game to IDLE_SELECT state with pristine device parameters.
     */
    resetGame(notify = true) {
      this.state = STATES.IDLE_SELECT;
      this.orientation = ORIENTATIONS.REVERSE_BEND;
      this.foldState = FOLD_STATES.UNFOLDED;
      this.isSnapped = false;

      this.force = 0.0;
      this.damage = 0.0;
      this.bendAngle = 0.0;
      this.peakForce = 0.0;
      this.maxBendAngle = 0.0;

      this.timeRemaining = this.currentTier.runDuration;
      this.totalDuration = this.currentTier.runDuration;
      this.elapsedTime = 0.0;
      this.countdownRemaining = 3.0;
      this._lastCountdownTick = null;
      this.celebrationTimer = 0.0;

      this.inputBuffer = [];
      this.cpsRaw = 0.0;
      this.cpsSmoothed = 0.0;
      this.peakCps = 0.0;
      this.totalTaps = 0;
      this.lastTapHand = null;
      this.lastTapTime = -1.0;
      this.lastTapHandTime = { left: -1.0, right: -1.0 };
      this.activeHand = null;
      this.currentComboMultiplier = 1.0;
      this.comboStreak = 0;
      this.maxComboStreak = 0;
      this.labToolsUsed = { scratch: false, burn: false, sand: false };
      this.telemetryHistory = [{ t: 0, force: 0, damage: 0, angle: 0 }];
      this._lastTelemetrySampleTime = 0.0;

      this.leftThumbStrain = 0.0;
      this.rightThumbStrain = 0.0;
      this.shakeTrauma = 0.0;
      this.shakeAmplitude = 0.0;
      this.isShaking = false;
      this.sparkCount = 0;

      this.currentQuip = ZACK_QUIPS.intro;
      this.currentStage = 1;
      this.survived = false;
      this.snapTime = null;

      if (notify) {
        this._notifyStateChange();
      }
    }

    /**
     * Start the 3-second pre-test countdown.
     */
    startCountdown() {
      if (this.state !== STATES.IDLE_SELECT && this.state !== STATES.REPORT_CARD) {
        return;
      }
      if (this.state !== STATES.IDLE_SELECT) {
        this.resetGame(false);
      }
      this.state = STATES.COUNTDOWN;
      this.countdownRemaining = 3.0;
      this._lastCountdownTick = 3;

      this.dispatchAudio('COUNTDOWN_TICK', { count: 3 });
      this._notifyStateChange();
    }

    /**
     * Directly start active mashing (bypassing countdown if desired).
     */
    startActiveMashing() {
      this.state = STATES.ACTIVE_MASHING;
      this.countdownRemaining = 0.0;
      this.dispatchAudio('COUNTDOWN_GO', {});
      this._notifyStateChange();
    }

    /**
     * Select a difficulty tier (1, 2, 3 or 'standard', 'dust', 'titanium').
     */
    setTier(tierKeyOrNum) {
      let targetTier = null;
      if (typeof tierKeyOrNum === 'number') {
        if (tierKeyOrNum === 1) targetTier = DIFFICULTY_TIERS.standard;
        else if (tierKeyOrNum === 2) targetTier = DIFFICULTY_TIERS.dust;
        else if (tierKeyOrNum === 3) targetTier = DIFFICULTY_TIERS.titanium;
        else if (tierKeyOrNum === 4) targetTier = DIFFICULTY_TIERS.pixel;
        else if (tierKeyOrNum === 5) targetTier = DIFFICULTY_TIERS.trifold;
      } else if (typeof tierKeyOrNum === 'string') {
        const key = tierKeyOrNum.toLowerCase();
        if (key.includes('trifold') || key.includes('mate') || key.includes('huawei') || key.includes('boss') || key === '5') targetTier = DIFFICULTY_TIERS.trifold;
        else if (key.includes('pixel') || key.includes('google') || key.includes('expert') || key === '4') targetTier = DIFFICULTY_TIERS.pixel;
        else if (key.includes('standard') || key.includes('duo') || key.includes('easy') || key === '1') targetTier = DIFFICULTY_TIERS.standard;
        else if (key.includes('dust') || key.includes('medium') || key === '2') targetTier = DIFFICULTY_TIERS.dust;
        else if (key.includes('titanium') || key.includes('samsung') || key.includes('fold') || key.includes('hard') || key === '3') targetTier = DIFFICULTY_TIERS.titanium;
      }

      if (!targetTier) {
        targetTier = DIFFICULTY_TIERS.standard;
      }

      this.currentTier = Object.assign({}, targetTier);
      if (Number.isFinite(this.options.runDuration) && this.options.runDuration > 0) this.currentTier.runDuration = this.options.runDuration;
      // A new device starts a clean run, including during a round or report.
      this.resetGame();
      return this.currentTier;
    }

    /**
     * Switch engine to calibrated difficulty tier physics.
     */
    useCalibratedTiers(enable = true) {
      this._useCalibrated = !!enable;
      const tierId = this.currentTier ? this.currentTier.id : 'standard';
      if (enable) {
        this.currentTier = Object.assign({}, this.currentTier, CALIBRATED_TIERS[tierId] || CALIBRATED_TIERS.standard);
      } else {
        this.currentTier = Object.assign({}, this.currentTier, DIFFICULTY_TIERS[tierId] || DIFFICULTY_TIERS.standard);
      }
      if (Number.isFinite(this.options.runDuration) && this.options.runDuration > 0) this.currentTier.runDuration = this.options.runDuration;
      this.timeRemaining = this.currentTier.runDuration;
      this.totalDuration = this.currentTier.runDuration;
      return this.currentTier;
    }

    // =======================================================================
    // 4. ORIENTATION & MECHANICAL CONTROLS
    // =======================================================================

    /**
     * Flip between FRONT_BEND (resists) and REVERSE_BEND (catastrophic vulnerability).
     * Guards against flipping in terminal snapped states (returns false).
     * Supports flipOrientation(force) to allow immediate programmatic flipping.
     */
    flipOrientation(force = false) {
      if (this.isSnapped || this.state === STATES.SNAP_CELEBRATION || this.state === STATES.REPORT_CARD) {
        return false;
      }

      const now = this._getNow();
      if (!force && this._lastFlipTime > 0 && (now - this._lastFlipTime) < 0.20) {
        // 200ms debounce
        return this.orientation;
      }
      this._lastFlipTime = now;

      if (this.orientation === ORIENTATIONS.REVERSE_BEND) {
        this.orientation = ORIENTATIONS.FRONT_BEND;
        this.currentQuip = ZACK_QUIPS.frontBendWarning;
      } else {
        this.orientation = ORIENTATIONS.REVERSE_BEND;
        this.currentQuip = ZACK_QUIPS.reverseBendActive;
      }

      this.dispatchAudio('FLIP_ORIENT', { orientation: this.orientation });
      return this.orientation;
    }

    /**
     * Toggle open (unfolded) vs closed (folded sandwich).
     */
    toggleFold() {
      if (this.foldState === FOLD_STATES.UNFOLDED) {
        this.foldState = FOLD_STATES.FOLDED;
        this.currentQuip = ZACK_QUIPS.foldedWarning;
      } else {
        this.foldState = FOLD_STATES.UNFOLDED;
        this.currentQuip = ZACK_QUIPS.reverseBendActive;
      }
      this.dispatchAudio('FLIP_ORIENT', { foldState: this.foldState });
      return this.foldState;
    }

    // =======================================================================
    // 5. INPUT SUBSYSTEM & COMBOS
    // =======================================================================

    /**
     * Register a discrete mash impulse from a hand ('left' | 'right').
     * Handles alternating combo bonus, 40ms debounce, and resistance modulation.
     */
    registerTap(hand = 'left', source = 'manual', opts = {}) {
      const now = this._getNow();

      if (opts && opts.force) {
        if (this.state === STATES.IDLE_SELECT || this.state === STATES.COUNTDOWN) {
          this.startActiveMashing();
        }
      }

      // In IDLE_SELECT or REPORT_CARD, a tap can start the countdown
      if (this.state === STATES.IDLE_SELECT || this.state === STATES.REPORT_CARD) {
        this.startCountdown();
        return false;
      }

      // During COUNTDOWN, inputs are locked (or provide subtle pre-strain)
      if (this.state === STATES.COUNTDOWN) {
        if (hand === 'left') this.leftThumbStrain = 0.25;
        if (hand === 'right') this.rightThumbStrain = 0.25;
        return false;
      }

      // Only process during ACTIVE_MASHING
      if (this.state !== STATES.ACTIVE_MASHING) {
        return false;
      }

      // 40ms debounce for touch/pointer inputs to prevent synthetic multi-touch spam
      const isTouchOrPointer = (source === 'pointer' || source === 'touch');
      if (!opts?.force && isTouchOrPointer && this.lastTapHandTime[hand] > 0 && (now - this.lastTapHandTime[hand]) < 0.040) {
        return false;
      }
      this.lastTapHandTime[hand] = now;

      // Update tap counts and rolling CPS buffer
      this.totalTaps++;
      this.inputBuffer.push(now);
      this.activeHand = hand;

      // 1. Calculate Alternating Hand Combo Bonus
      // If current hand differs from last hand and occurred within 400ms:
      let isCombo = false;
      const timeSinceLast = (this.lastTapTime > 0) ? (now - this.lastTapTime) : -1;
      if (opts?.combo === true || (this.lastTapHand && this.lastTapHand !== hand && (opts?.force || (timeSinceLast >= 0 && timeSinceLast < 0.40)))) {
        this.currentComboMultiplier = this.currentTier.comboBonus;
        this.comboStreak = (this.comboStreak || 0) + 1;
        this.maxComboStreak = Math.max(this.maxComboStreak || 0, this.comboStreak);
        this.overdriveActive = this.comboStreak >= 6;
        isCombo = true;
      } else {
        this.currentComboMultiplier = 1.0;
        this.comboStreak = 0;
        this.overdriveActive = false;
      }

      this.lastTapHand = hand;
      this.lastTapTime = now;

      // 2. Orientation & Fold Multipliers
      // Front bend has 4.0x resistance multiplier (0.25x force transmission)
      const orientMultiplier = (this.orientation === ORIENTATIONS.FRONT_BEND) ? 0.25 : 1.0;
      // Folded mode has 0.15x transmission due to 8x moment of inertia
      const foldMultiplier = (this.foldState === FOLD_STATES.FOLDED) ? 0.15 : 1.0;

      // 3. Force Impulse Calculation (with human-friendly interactiveAssist in browser)
      const tierId = this.currentTier ? this.currentTier.id : 'standard';
      const assistForceMult = this.options.interactiveAssist
        ? (tierId === 'trifold' ? 2.85 : (tierId === 'titanium' ? 2.53 : (tierId === 'pixel' ? 1.68 : (tierId === 'dust' ? 0.95 : 1.0))))
        : 1.0;

      const deltaForce = this.currentTier.forcePerTap *
                         assistForceMult *
                         this.currentComboMultiplier *
                         orientMultiplier *
                         foldMultiplier;

      // Accumulate force, clamping to maxForce (100.0)
      this.force = Math.min(this.maxForce, this.force + deltaForce);
      this.peakForce = Math.max(this.peakForce, this.force);

      // 4. Update Knuckle Strain & Thumb Visual Feedback
      const normalizedForce = this.force / this.maxForce;
      if (hand === 'left') {
        this.leftThumbStrain = Math.min(1.0, (this.force / 60.0));
      } else {
        this.rightThumbStrain = Math.min(1.0, (this.force / 60.0));
      }

      // Add camera trauma impulse
      this.shakeTrauma = Math.min(1.0, this.shakeTrauma + 0.04 * (this.force / 100.0));

      // 5. Audio Dispatch & Haptics
      const audioPayload = {
        forceNormalized: normalizedForce,
        hand: hand,
        isCombo: isCombo,
        intensity: Math.min(1.0, this.force / 70.0)
      };

      if (isCombo) {
        this.dispatchAudio('TAP_ALTERNATE_COMBO', audioPayload);
      } else {
        this.dispatchAudio('TAP_MASH', audioPayload);
      }
      this.dispatchAudio('MASH_STRAIN', audioPayload);

      // Haptic feedback (12ms tick)
      this._triggerHaptic(12);

      return true;
    }

    /**
     * Universal keyboard input handler (filters OS auto-repeat).
     */
    handleKeyDown(event) {
      if (!event) return;

      // CRITICAL: Reject synthetic OS auto-repeat events
      if (event.repeat) {
        return;
      }

      const code = event.code || event.key;

      // Prevent scrolling on game keys
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(code)) {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
      }

      // Universal mash key: Space toggles left/right automatically
      if (code === 'Space') {
        const nextHand = (this.lastTapHand === 'left') ? 'right' : 'left';
        this.registerTap(nextHand, 'keyboard');
        return;
      }

      // Left hand keys: A, ArrowLeft, Numpad4
      if (code === 'KeyA' || code === 'ArrowLeft' || code === 'Numpad4' || code === 'a' || code === 'A') {
        this.registerTap('left', 'keyboard');
        return;
      }

      // Right hand keys: D, ArrowRight, Numpad6
      if (code === 'KeyD' || code === 'ArrowRight' || code === 'Numpad6' || code === 'd' || code === 'D') {
        this.registerTap('right', 'keyboard');
        return;
      }

      // Flip orientation keys: F or R
      if (code === 'KeyF' || code === 'KeyR' || code === 'f' || code === 'r') {
        this.flipOrientation();
        return;
      }

      // Fold state toggle keys: O or C
      if (code === 'KeyO' || code === 'KeyC' || code === 'o' || code === 'c') {
        this.toggleFold();
        return;
      }

      // Reset / Escape key
      if (code === 'Escape') {
        this.resetGame();
        return;
      }
    }

    /**
     * Attach DOM event listeners for keyboard and touch.
     */
    attachInputListeners(targetElement = null) {
      if (typeof window === 'undefined') return;

      this.detachInputListeners();

      this._boundKeyDown = (e) => this.handleKeyDown(e);
      window.addEventListener('keydown', this._boundKeyDown);

      // Pointer / touch handling
      const container = targetElement || window;
      this._boundPointerDown = (e) => {
        // Disregard non-primary or right-clicks
        if (e.button !== undefined && e.button !== 0) return;

        if (typeof e.preventDefault === 'function' && e.target && e.target.tagName === 'CANVAS') {
          e.preventDefault();
        }

        // Split screen: left 50% vs right 50%
        const rect = (targetElement && targetElement.getBoundingClientRect) ?
                     targetElement.getBoundingClientRect() :
                     { left: 0, width: window.innerWidth };
        const x = (e.clientX !== undefined) ? (e.clientX - rect.left) : (rect.width / 2);
        const hand = (x < rect.width / 2) ? 'left' : 'right';

        this.registerTap(hand, 'pointer');
      };

      container.addEventListener('pointerdown', this._boundPointerDown, { passive: false });
    }

    /**
     * Detach DOM event listeners.
     */
    detachInputListeners() {
      if (typeof window === 'undefined') return;

      if (this._boundKeyDown) {
        window.removeEventListener('keydown', this._boundKeyDown);
        this._boundKeyDown = null;
      }
      if (this._boundPointerDown) {
        window.removeEventListener('pointerdown', this._boundPointerDown);
        this._boundPointerDown = null;
      }
    }

    // =======================================================================
    // 6. CONTINUOUS DIFFERENTIAL PHYSICS INTEGRATION
    // =======================================================================

    /**
     * Advances the simulation by delta time dt (in seconds).
     * Must be called every animation frame (e.g. from requestAnimationFrame).
     */
    update(dt) {
      // 1. Non-positive dt guard (Requirement 4)
      if (typeof dt === 'number' && dt <= 0) {
        return this.getRenderSnapshot();
      }

      // Delta Time Clamping (Edge Case 3)
      // Clamps dt to max 0.10s (100ms) to prevent numerical instability or
      // complete force drainage when tab is blurred or frozen.
      if (typeof dt !== 'number' || isNaN(dt)) {
        dt = 0.0166;
      }
      dt = Math.min(0.10, dt);

      const now = this._getNow();

      // 2. Countdown State Update
      if (this.state === STATES.COUNTDOWN) {
        this.countdownRemaining = Math.max(0, this.countdownRemaining - dt);
        const currentIntTick = Math.ceil(this.countdownRemaining);

        if (currentIntTick > 0 && currentIntTick !== this._lastCountdownTick) {
          this._lastCountdownTick = currentIntTick;
          this.dispatchAudio('COUNTDOWN_TICK', { count: currentIntTick });
        }

        if (this.countdownRemaining <= 0) {
          this.startActiveMashing();
        }
        return this.getRenderSnapshot();
      }

      // 3. Post-Run Celebration / Failure State Update
      if (this.state === STATES.SNAP_CELEBRATION || this.state === STATES.SURVIVAL_FAIL) {
        if (this.isSnapped || this.state === STATES.SNAP_CELEBRATION) {
          this.bendAngle = Math.max(38.0, this.maxBendAngle);
        }
        this.celebrationTimer += dt;
        // Exponential screen shake dampening
        this.shakeTrauma = Math.max(0, this.shakeTrauma - 1.5 * dt);
        this.shakeAmplitude = Math.pow(this.shakeTrauma, 2) * 16.0;
        this.isShaking = this.shakeAmplitude > 0.5;

        // Transition to REPORT_CARD after 1.50 seconds
        if (this.celebrationTimer >= 1.50) {
          this.state = STATES.REPORT_CARD;
          this._notifyStateChange();
        }
        return this.getRenderSnapshot();
      }

      // Only update physics during ACTIVE_MASHING
      if (this.state !== STATES.ACTIVE_MASHING) {
        return this.getRenderSnapshot();
      }

      // 4. Timer Decrement
      this.timeRemaining = Math.max(0, this.timeRemaining - dt);
      this.elapsedTime += dt;

      // Sample telemetry curve every 0.25s for the Report Card oscillograph
      if (this.elapsedTime - (this._lastTelemetrySampleTime || 0) >= 0.25) {
        this._lastTelemetrySampleTime = this.elapsedTime;
        if (!Array.isArray(this.telemetryHistory)) this.telemetryHistory = [];
        this.telemetryHistory.push({
          t: Number(this.elapsedTime.toFixed(2)),
          force: Number(this.force.toFixed(1)),
          damage: Number(this.damage.toFixed(1)),
          angle: Number(this.bendAngle.toFixed(1))
        });
      }

      // 5. Rolling CPS Window Smoothing
      // Clean timestamps older than 1.0 second
      while (this.inputBuffer.length > 0 && (now - this.inputBuffer[0]) > 1.0) {
        this.inputBuffer.shift();
      }
      this.cpsRaw = this.inputBuffer.length;

      // Exponential Moving Average (EMA) for smoothed display CPS
      const beta = Math.min(1.0, 8.0 * dt);
      this.cpsSmoothed += beta * (this.cpsRaw - this.cpsSmoothed);
      this.peakCps = Math.max(this.peakCps, this.cpsSmoothed);

      // 6. Continuous Resistance Decay Equation:
      // dF/dt = -k_eff * F  =>  F(t + dt) = F(t) * exp(-k_eff * dt)
      // Chassis weakens as it deforms: k_eff = k_decay * (1.0 - 0.4 * (D / 100))
      const damageRatio = Math.max(0, Math.min(1.0, this.damage / 100.0));
      const assistDecayMult = this.options.interactiveAssist ? 0.85 : 1.0;
      const kEff = this.currentTier.decayRate * assistDecayMult * (1.0 - 0.4 * damageRatio);

      this.force = this.force * Math.exp(-kEff * dt);
      if (this.force < 0.001) this.force = 0.0;

      // 7. Dynamic Yield Threshold & Super-Linear Damage Integration
      // Dynamic yield threshold drops as damage accumulates:
      // F_yield(D) = F_yield_0 * (1.0 - 0.5 * (D / 100))
      const dynamicYield = this.getYieldThreshold();
      const excessForce = Math.max(0.0, this.force - dynamicYield);

      // Damage only accumulates if force exceeds yield threshold
      if (excessForce > 0) {
        // dD/dt = eta * (F_excess)^1.2
        let damageRate = this.currentTier.damageScale * Math.pow(excessForce, 1.2);
        // Limit the fastest runs while keeping damage continuous above yield.
        // The cap only affects browser-assisted play; headless physics is unchanged.
        if (this.options.interactiveAssist) damageRate = Math.min(12.5, damageRate * 0.15);

        // Front bend has heavy mechanical lockout (divided by 4.0x resistance)
        if (this.orientation === ORIENTATIONS.FRONT_BEND) {
          damageRate = damageRate * 0.25;
        }
        // Folded sandwich mode has 0.15x damage rate
        if (this.foldState === FOLD_STATES.FOLDED) {
          damageRate = damageRate * 0.15;
        }

        const damageLimit = this.orientation === ORIENTATIONS.FRONT_BEND
          ? Math.max(25.0, this.damage) : 100.0;
        this.damage = Math.min(damageLimit, this.damage + damageRate * dt);
      }

      // 8. Two-Component Bend Angle Synthesis
      // Most of the visible bend remains after deformation; a small part
      // relaxes with pressure. Angles describe the combined deflection.
      const thetaPerm = (this.damage / 100.0) * 32.0;
      const thetaElastic = Math.min(6.0, (this.force / this.maxForce) * 6.0);

      let totalAngle = thetaPerm + thetaElastic;
      // In Front Bend, elastic flex locks at 15.0° max
      if (this.orientation === ORIENTATIONS.FRONT_BEND) {
        totalAngle = Math.min(15.0, totalAngle);
      }
      this.bendAngle = Math.min(38.0, totalAngle);
      this.maxBendAngle = Math.max(this.maxBendAngle, this.bendAngle);

      // 9. Ergonomic Blanching Strain Decay
      // Thumbs smoothly relax toward base force level
      const targetStrain = this.force / this.maxForce;
      const strainLerp = Math.min(1.0, 6.0 * dt);
      this.leftThumbStrain += strainLerp * (targetStrain - this.leftThumbStrain);
      this.rightThumbStrain += strainLerp * (targetStrain - this.rightThumbStrain);

      // 10. Damage Stage Evaluation & Audio/Quip Triggers (evaluated BEFORE screen shake decay so that newly added trauma takes immediate effect)
      this._evaluateDamageStages();

      // 11. Screen Shake Decay & Amplitude Update
      this.shakeTrauma = Math.max(0, this.shakeTrauma - 1.2 * dt);
      this.shakeAmplitude = Math.pow(this.shakeTrauma, 2) * 16.0;
      this.isShaking = this.shakeAmplitude > 0.5;

      // 12. Check Victory / Failure Terminal Guards (Edge Case 4)
      // Prioritize Catastrophic Snap if damage hits 100%
      if (this.damage >= 100.0) {
        this._triggerCatastrophicSnap();
        return this.getRenderSnapshot();
      }

      // If timer expired and phone not snapped: Structural Survival Fail
      if (this.timeRemaining <= 0.00) {
        this._triggerSurvivalTimeout();
        return this.getRenderSnapshot();
      }

      return this.getRenderSnapshot();
    }

    /**
     * Evaluates current damage against stage thresholds (0-25%, 25-50%, 50-75%, 75-99%, 100%)
     * and dispatches appropriate audio events and commentary quips.
     */
    _evaluateDamageStages() {
      const prevStage = this.currentStage;
      let newStage = 1;

      if (this.damage >= 100.0) {
        newStage = 5;
      } else if (this.damage >= 75.0) {
        newStage = 4;
      } else if (this.damage >= 50.0) {
        newStage = 3;
      } else if (this.damage >= 25.0) {
        newStage = 2;
      } else {
        newStage = 1;
      }

      // Stage transition detection
      if (newStage > prevStage) {
        this.currentStage = newStage;
        this.shakeTrauma = Math.min(1.0, this.shakeTrauma + 0.35);

        // Stage-specific effects
        if (newStage === 2) {
          this.currentQuip = ZACK_QUIPS.stage2;
          this.dispatchAudio('FRAME_CREAK', { intensity: 0.6, stage: 2 });
          this.dispatchAudio('STAGE_TRANSITION', { newStage: 2, oldStage: 1 });
          this._triggerHaptic([40, 30, 40]);
        } else if (newStage === 3) {
          this.currentQuip = ZACK_QUIPS.stage3;
          this.dispatchAudio('OLED_BUZZ', { damagePct: this.damage });
          this.dispatchAudio('OLED_GLITCH', { damagePct: this.damage });
          this.dispatchAudio('FRAME_CREAK', { intensity: 0.8, stage: 3 });
          this.dispatchAudio('STAGE_TRANSITION', { newStage: 3, oldStage: 2 });
          this._triggerHaptic([60, 40, 60]);
        } else if (newStage === 4) {
          this.currentQuip = ZACK_QUIPS.stage4;
          this.dispatchAudio('GLASS_CRACK', { clusterSize: 3, damagePct: this.damage });
          this.dispatchAudio('FRAME_CREAK', { intensity: 1.0, stage: 4 });
          this.dispatchAudio('STAGE_TRANSITION', { newStage: 4, oldStage: 3 });
          this.sparkCount = 15;
          this._triggerHaptic([80, 50, 80]);
        }

        // Dispatch stage change to all registered observers
        this._notifyStageChange(newStage, prevStage);
      }

      // Spark particle generation during stage 4 buckling
      if (this.currentStage === 4 && this.force > 25) {
        this.sparkCount = Math.min(30, Math.floor(this.cpsSmoothed * 2));
      }
    }

    /**
     * Catastrophic Snap Victory Sequence.
     */
    _triggerCatastrophicSnap() {
      const prevStage = this.currentStage;
      this.state = STATES.SNAP_CELEBRATION;
      this.isSnapped = true;
      this.damage = 100.0;
      this.bendAngle = Math.max(38.0, this.maxBendAngle);
      this.maxBendAngle = Math.max(this.maxBendAngle, this.bendAngle);
      this.currentStage = 5;
      this.celebrationTimer = 0.0;
      this.survived = false;
      this.snapTime = (this.totalDuration - this.timeRemaining);

      // Hit-stop rumble and camera shake
      this.shakeTrauma = 1.0;
      this.shakeAmplitude = 16.0;
      this.isShaking = true;
      this.sparkCount = 45;

      this.currentQuip = ZACK_QUIPS.snap;

      // Audio and haptics
      this.dispatchAudio('SNAP', { snapTime: this.snapTime, maxAngle: this.bendAngle });
      this.dispatchAudio('CATASTROPHIC_SNAP', { snapTime: this.snapTime });
      this.dispatchAudio('STAGE_TRANSITION', { newStage: 5, oldStage: 4 });

      if (prevStage < 5) {
        this._notifyStageChange(5, prevStage);
      }

      this._triggerHaptic([100, 50, 200, 50, 400]);
      this._notifyStateChange();
    }

    /**
     * Structural Survival Failure Sequence (Timeout).
     */
    _triggerSurvivalTimeout() {
      this.state = STATES.SURVIVAL_FAIL;
      this.timeRemaining = 0.0;
      this.celebrationTimer = 0.0;
      this.survived = true;
      this.snapTime = null;

      this.currentQuip = `Remarkable. The ${this.currentTier.deviceModel || 'iPhone Duo'} survives the bend test... for now.`;

      this.dispatchAudio('SURVIVAL_BUZZER', { finalDamage: this.damage });
      this._triggerHaptic([150, 100, 150]);
      this._notifyStateChange();
    }

    // =======================================================================
    // 7. DOWNSTREAM SNAPSHOT & INTERFACE CONTRACTS
    // =======================================================================

    /**
     * Returns a pristine snapshot conforming to PROJECT.md GameRenderSnapshot
     * and explorer_survey_1 GameRenderSnapshot.
     */
    /**
     * Interactive Workbench Lab Pre-Tests (Scratch Test, Lighter Burn Test, Sand Pour).
     * Mirrors Zack Nelson's full durability gauntlet from 5laDGy4INB0.
     */
    triggerLabTool(toolType) {
      const key = String(toolType || '').toLowerCase();
      if (!['scratch', 'burn', 'sand'].includes(key)) return null;
      if (!this.labToolsUsed) this.labToolsUsed = { scratch: false, burn: false, sand: false };
      const firstUse = !this.labToolsUsed[key];
      this.labToolsUsed[key] = true;

      if (firstUse && (this.state === STATES.IDLE_SELECT || this.state === STATES.ACTIVE_MASHING)) {
        this.force = Math.min(this.maxForce, this.force + 14.0);
        this.peakForce = Math.max(this.peakForce, this.force);
        if (this.damage < 92.0) {
          this.damage = Math.min(95.0, this.damage + 3.5);
          this._evaluateDamageStages();
        }
      }

      if (key === 'scratch') {
        this.currentQuip = "Plastic inner nano-texture screen scratches at a level 2, with deeper grooves at a level 3.";
        this.dispatchAudio('GLASS_CRACK', { clusterSize: 2, damagePct: this.damage });
      } else if (key === 'burn') {
        this.currentQuip = "Ten seconds under the butane lighter flame... and the inner OLED pixels turn white and recover.";
        this.dispatchAudio('OLED_BUZZ', { damagePct: this.damage });
      } else if (key === 'sand') {
        this.currentQuip = "Let's pour a handful of coarse dirt and sand right onto the hinge and see if the magnets survive.";
        this.dispatchAudio('FRAME_CREAK', { intensity: 0.75, stage: this.currentStage });
      }
      return { applied: firstUse, firstUse, tool: key, quip: this.currentQuip, damage: this.damage, damagePct: this.damage };
    }

    /** Current force threshold for permanent damage, shared by physics and HUD. */
    getYieldThreshold() {
      const damageRatio = Math.max(0, Math.min(1, this.damage / 100));
      const assistYieldMult = this.options.interactiveAssist ? 0.72 : 1.0;
      return this.currentTier.yieldThreshold * assistYieldMult * (1.0 - 0.5 * damageRatio);
    }

    getRenderSnapshot() {
      const yieldThreshold = this.getYieldThreshold();
      const age = this.lastTapTime >= 0 ? this._getNow() - this.lastTapTime : Infinity;
      // A combo indicates a recent bonus-bearing alternating tap, not a stale
      // multiplier retained after the player stops or the round has ended.
      const comboActive = this.state === STATES.ACTIVE_MASHING &&
        this.currentComboMultiplier > 1 && age >= 0 && age < 0.40;
      const comboRemainingSec = comboActive ? Math.max(0, 0.40 - age) : 0;
      return {
        // Core state machine
        state: this.state,
        tier: {
          id: this.currentTier.id,
          name: this.currentTier.name,
          displayName: this.currentTier.displayName || this.currentTier.name,
          deviceBrand: this.currentTier.deviceBrand || 'Apple',
          deviceModel: this.currentTier.deviceModel || 'iPhone Duo',
          tierNumber: this.currentTier.tierNumber
        },
        orientation: this.orientation,
        foldState: this.foldState,

        // Damage & angle metrics
        damagePct: this.damage,
        damagePercent: this.damage,                     // surveyor alias
        damageStage: this.getDamageStageNumber(),       // 1 to 5
        damageStageIndex: this.getDamageStageIndex(),   // 0 to 4
        bendAngleDeg: this.bendAngle,
        bendAngle: this.bendAngle,                      // surveyor alias

        // Force & CPS metrics
        currentForce: this.force,
        force: this.force,                              // alias
        maxForce: this.maxForce,
        yieldThreshold: yieldThreshold,
        forceAboveYield: this.state === STATES.ACTIVE_MASHING && this.force > yieldThreshold,
        peakForce: this.peakForce,
        cps: this.cpsSmoothed,
        peakCps: this.peakCps,
        totalTaps: this.totalTaps,

        // Timers
        timeRemainingSec: this.timeRemaining,
        timeRemaining: this.timeRemaining,              // alias
        elapsedTimeSec: this.elapsedTime,
        countdownRemaining: this.countdownRemaining,

        // Ergonomic blanching strain & hands
        leftThumbStrain: Math.max(0, Math.min(1.0, this.leftThumbStrain)),
        leftHandStrain: Math.max(0, Math.min(1.0, this.leftThumbStrain)),
        rightThumbStrain: Math.max(0, Math.min(1.0, this.rightThumbStrain)),
        rightHandStrain: Math.max(0, Math.min(1.0, this.rightThumbStrain)),
        activeHand: this.activeHand,

        // Screen shake & visual FX
        isShaking: this.isShaking,
        shakeTrauma: this.shakeTrauma,
        screenShake: this.shakeAmplitude,
        sparkCount: this.sparkCount,

        // Thematic lore
        currentQuip: this.currentQuip,
        comboMultiplier: this.currentComboMultiplier,
        comboActive: comboActive,
        comboRemainingSec: comboRemainingSec,
        comboStreak: comboActive ? (this.comboStreak || 0) : 0,
        maxComboStreak: this.maxComboStreak || 0,
        overdriveActive: comboActive && (this.comboStreak || 0) >= 6,
        labToolsUsed: Object.assign({}, this.labToolsUsed || {}),
        survived: this.survived,
        snapTime: this.snapTime
      };
    }

    /**
     * Damage stage (1 to 5)
     */
    getDamageStageNumber() {
      if (this.damage >= 100.0) return 5;
      if (this.damage >= 75.0) return 4;
      if (this.damage >= 50.0) return 3;
      if (this.damage >= 25.0) return 2;
      return 1;
    }

    /**
     * Damage stage index (0 to 4)
     */
    getDamageStageIndex() {
      if (this.damage >= 100.0) return 4;
      if (this.damage >= 75.0) return 3;
      if (this.damage >= 50.0) return 2;
      if (this.damage >= 25.0) return 1;
      return 0;
    }

    // =======================================================================
    // 8. AUDIO & HAPTIC DISPATCH
    // =======================================================================

    /**
     * Attach a listener callback for audio events: (type, payload) => ...
     */
    onAudioEvent(callback) {
      if (typeof callback === 'function') {
        this._audioListeners.push(callback);
      }
    }

    /**
     * Remove an audio listener callback.
     */
    offAudioEvent(callback) {
      this._audioListeners = this._audioListeners.filter(cb => cb !== callback);
    }

    /**
     * Dispatches audio events to:
     * 1. Direct engine audio listeners
     * 2. Browser window.JRE.audio.playEvent(type, payload) (PROJECT.md contract)
     * 3. Named browser audio methods if present (e.g. audio.playSnap())
     */
    dispatchAudio(type, payload = {}) {
      if (!this.options.enableAudio) return;

      // 1. Notify internal subscribers
      for (let i = 0; i < this._audioListeners.length; i++) {
        try {
          this._audioListeners[i](type, payload);
        } catch (e) {
          // Prevent listener exceptions from breaking physics loop
        }
      }

      // 2. Dispatch to browser window.JRE.audio if available
      if (typeof window !== 'undefined' && window.JRE && window.JRE.audio) {
        const audio = window.JRE.audio;
        if (typeof audio.playEvent === 'function') {
          try {
            audio.playEvent(type, payload);
          } catch (e) {}
        }

        // Secondary fallback to legacy direct method names
        if (type === 'MASH_STRAIN' && typeof audio.playStrain === 'function') {
          audio.playStrain(payload.intensity || 0.5);
        } else if (type === 'SNAP' && typeof audio.playSnap === 'function') {
          audio.playSnap();
        } else if (type === 'GLASS_CRACK' && typeof audio.playGlassCrack === 'function') {
          audio.playGlassCrack(payload.clusterSize || 2);
        } else if (type === 'OLED_BUZZ' && typeof audio.playOledBuzz === 'function') {
          audio.playOledBuzz();
        } else if (type === 'FRAME_CREAK' && typeof audio.playCreak === 'function') {
          audio.playCreak(payload.intensity || 0.5);
        }
      }
    }

    /**
     * Triggers mobile haptic vibration if supported.
     */
    _triggerHaptic(pattern) {
      if (!this.options.enableHaptics) return;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(pattern);
        } catch (e) {}
      }
    }

    /**
     * Internal listener notification on state change.
     */
    _notifyStateChange() {
      for (let i = 0; i < this._stateChangeListeners.length; i++) {
        try {
          this._stateChangeListeners[i](this.state, this);
        } catch (e) {}
      }
    }

    onStateChange(callback) {
      if (typeof callback === 'function') {
        this._stateChangeListeners.push(callback);
      }
    }

    /**
     * Internal listener notification on damage stage transition.
     * @param {number} newStage - New damage stage (1 to 5)
     * @param {number} prevStage - Previous damage stage (1 to 5)
     */
    _notifyStageChange(newStage, prevStage) {
      for (let i = 0; i < this._stageChangeListeners.length; i++) {
        try {
          this._stageChangeListeners[i](newStage, prevStage);
        } catch (e) {
          // Prevent subscriber exceptions from interrupting engine physics loop
        }
      }
    }

    /**
     * Attach a listener callback for damage stage transitions: (newStage, prevStage) => ...
     * @param {Function} callback - Callback function receiving (newStage, prevStage)
     * @returns {Function} Unsubscribe function
     */
    onStageChange(callback) {
      if (typeof callback === 'function') {
        this._stageChangeListeners.push(callback);
      }
      return () => this.offStageChange(callback);
    }

    /**
     * Remove a damage stage transition listener callback.
     * @param {Function} callback - The callback function to detach
     */
    offStageChange(callback) {
      this._stageChangeListeners = this._stageChangeListeners.filter(cb => cb !== callback);
    }

    // =======================================================================
    // 9. VIRALITY & REPORT CARD METRICS
    // =======================================================================

    /**
     * Generates comprehensive report card data including repair bill
     * and Zack Nelson durability rating.
     */
    getReportCardData() {
      const snapTimeStr = (this.snapTime !== null) ? this.snapTime.toFixed(2) : null;
      const angleStr = this.maxBendAngle.toFixed(1);
      const peakCpsStr = this.peakCps.toFixed(1);
      const avgCps = (this.elapsedTime > 0) ? (this.totalTaps / this.elapsedTime) : 0;
      const avgCpsStr = avgCps.toFixed(1);

      // Durability grade calculation
      let grade = 'F';
      if (!this.survived) {
        // Browser rounds are paced for sustained effort over 25 seconds.
        const thresholds = this.options.interactiveAssist ? [9.5, 12.5, 19.5] : [5.0, 8.5, 12.0];
        if (this.snapTime < thresholds[0]) grade = 'S';
        else if (this.snapTime <= thresholds[1]) grade = 'A';
        else if (this.snapTime <= thresholds[2]) grade = 'B';
        else grade = 'C';
      } else {
        if (this.damage < 25.0) grade = 'A+';
        else if (this.damage < 50.0) grade = 'B';
        else if (this.damage < 75.0) grade = 'C';
        else grade = 'D';
      }

      // Out-of-warranty repair bill breakdown
      const bill = {
        innerDisplay: 0,
        screenCost: 0,
        hingeAssembly: 0,
        hingeCost: 0,
        frameAlignment: 0,
        frameCost: 0,
        batteryHazard: 0,
        batteryCost: 0,
        totalBill: 0
      };

      if (this.damage >= 25.0) {
        bill.frameAlignment = 199;
        bill.frameCost = 199;
      }
      if (this.damage >= 50.0) {
        bill.innerDisplay = 1499;
        bill.screenCost = 1499;
      }
      if (this.damage >= 75.0) {
        bill.hingeAssembly = 299;
        bill.hingeCost = 299;
      }
      if (this.damage >= 100.0) {
        bill.batteryHazard = 101;
        bill.batteryCost = 101;
      }
      bill.totalBill = (bill.innerDisplay || 0) + (bill.hingeAssembly || 0) + (bill.frameAlignment || 0) + (bill.batteryHazard || 0);

      // Expose both repairBill and billBreakdown per contract Requirement 2
      const repairBill = {
        totalBill: bill.totalBill,
        screenCost: bill.screenCost,
        hingeCost: bill.hingeCost,
        frameCost: bill.frameCost,
        batteryCost: bill.batteryCost,
        currency: '$',
        currencySymbol: '$',
        outOfWarranty: true
      };

      const verdict = (!this.survived) ?
        'INNER DISPLAY FAILURE' :
        'DISPLAY SURVIVED THE BEND TEST';

      return {
        survived: this.survived,
        snapTime: snapTimeStr,
        runDuration: this.totalDuration,
        maxBendAngle: parseFloat(angleStr),
        peakCps: peakCpsStr,
        avgCps: avgCpsStr,
        totalTaps: this.totalTaps,
        tierName: this.currentTier.name,
        displayName: this.currentTier.displayName || this.currentTier.name,
        deviceBrand: this.currentTier.deviceBrand || 'Apple',
        deviceModel: this.currentTier.deviceModel || 'iPhone Duo',
        tierId: this.currentTier.id,
        grade: grade,
        verdict: verdict,
        damagePct: this.damage,
        maxComboStreak: this.maxComboStreak || 0,
        labToolsUsed: Object.assign({}, this.labToolsUsed || {}),
        telemetryHistory: Array.isArray(this.telemetryHistory) ? this.telemetryHistory.slice() : [],
        repairBill: repairBill,
        billBreakdown: bill
      };
    }

    /**
     * Generates pre-populated Twitter Web Intent URL for viral sharing.
     */
    getShareUrl(targetUrlOverride = null) {
      const data = this.getReportCardData();
      let targetUrl = targetUrlOverride;

      if (!targetUrl) {
        if (typeof window !== 'undefined' && window.location && window.location.origin) {
          targetUrl = window.location.origin + window.location.pathname;
        } else {
          targetUrl = 'https://www.frankonedigital.com/bend-test';
        }
      }

      let tweetText = '';
      if (!data.survived) {
        tweetText = `I broke the ${data.deviceModel} display in ${data.snapTime}s on Tier ${this.currentTier.tierNumber} (${data.tierName}) with ${data.peakCps} CPS in the JerryRigEverything Bend Test! 📱💥\n\nOut-of-warranty repair bill: $${data.billBreakdown.totalBill} 💸\nCan you damage the display faster?\n\n#iPhoneDuo #JerryRigEverything #BendTest @ZacksJerryRig`;
      } else {
        tweetText = `The ${data.deviceModel} SURVIVED my bend test! 📱🛡️\nI only achieved a ${data.maxBendAngle}° bend (${data.damagePct.toFixed(0)}% damage) on Tier ${this.currentTier.tierNumber}. The hinge defeated me!\n\nThink you have faster fingers? Try it:\n\n#iPhoneDuo #JerryRigEverything #BendTest`;
      }

      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(targetUrl)}`;
    }

    // =======================================================================
    // 10. HEADLESS AUTOMATED TESTING BRIDGE
    // =======================================================================

    /**
     * Force damage to a specific percentage (for visual inspection & verification testing).
     */
    forceDamagePct(targetPct) {
      targetPct = Math.max(0.0, Math.min(100.0, targetPct));
      this.damage = targetPct;
      this._evaluateDamageStages();

      // Recalculate bend angle based on plastic permanent angle + current elastic flex
      const thetaPerm = (this.damage / 100.0) * 32.0;
      const thetaElastic = Math.min(6.0, (this.force / this.maxForce) * 6.0);
      let totalAngle = thetaPerm + thetaElastic;
      if (this.orientation === ORIENTATIONS.FRONT_BEND) {
        totalAngle = Math.min(15.0, totalAngle);
      }
      this.bendAngle = Math.min(38.0, totalAngle);
      this.maxBendAngle = Math.max(this.maxBendAngle, this.bendAngle);

      if (this.damage >= 100.0) {
        if (this.state === STATES.ACTIVE_MASHING || this.state === STATES.IDLE_SELECT) {
          this._triggerCatastrophicSnap();
        } else {
          this.isSnapped = true;
          this.bendAngle = Math.max(38.0, this.maxBendAngle);
          this.maxBendAngle = Math.max(this.maxBendAngle, this.bendAngle);
        }
      }
    }

    /**
     * Programmatically simulate a discrete tap from a hand.
     * Supports simulateTap(hand, opts) with force and combo overrides.
     */
    simulateTap(hand = 'left', opts = {}) {
      if (typeof opts === 'boolean') {
        opts = { force: opts };
      }
      return this.registerTap(hand, 'test', opts);
    }

    /**
     * Programmatically simulate mashing inputs.
     * Supports both simulateMash('left', opts) and simulateMash(count, intervalMs, opts).
     */
    simulateMash(param1 = 'left', param2 = 50, opts = {}) {
      if (typeof param2 === 'object' && param2 !== null) {
        opts = param2;
        param2 = 50;
      }
      if (typeof opts === 'boolean') {
        opts = { force: opts };
      }

      if (param1 === 'left' || param1 === 'right') {
        return this.registerTap(param1, 'test', opts);
      }

      const count = typeof param1 === 'number' ? param1 : 10;
      const intervalMs = typeof param2 === 'number' ? param2 : 50;
      return this.simulateMashAsync(count, intervalMs, opts);
    }

    /**
     * Simulates alternating mashing asynchronously.
     */
    simulateMashAsync(count = 10, intervalMs = 50, opts = {}) {
      return new Promise((resolve) => {
        let done = 0;
        let hand = 'left';

        // Auto-start active mashing if in idle
        if (this.state === STATES.IDLE_SELECT) {
          this.startActiveMashing();
        }

        const interval = setInterval(() => {
          hand = (hand === 'left') ? 'right' : 'left';
          this.registerTap(hand, 'test', opts);
          done++;

          // Advance physics if not in auto-tick mode
          if (!this.options.autoTick) {
            this.update(intervalMs / 1000.0);
          }

          if (done >= count || this.state !== STATES.ACTIVE_MASHING) {
            clearInterval(interval);
            resolve(this.getRenderSnapshot());
          }
        }, intervalMs);
      });
    }

    /**
     * Attach testing bridge to window.__BEND_TEST_GAME__
     */
    _setupTestingBridge() {
      const globalObj = (typeof window !== 'undefined') ? window :
                        (typeof global !== 'undefined' ? global : null);
      if (!globalObj) return;

      const self = this;
      globalObj.__BEND_TEST_GAME__ = {
        getState: () => self.getRenderSnapshot(),
        setTier: (tierId) => self.setTier(tierId),
        flipOrientation: (force) => self.flipOrientation(force),
        simulateTap: (hand, opts) => self.simulateTap(hand, opts),
        simulateMash: (p1, p2, opts) => self.simulateMash(p1, p2, opts),
        triggerDamagePct: (targetPct) => self.forceDamagePct(targetPct),
        forceDamage: (targetPct) => self.forceDamagePct(targetPct),
        onStageChange: (cb) => self.onStageChange(cb),
        offStageChange: (cb) => self.offStageChange(cb),
        getShareUrl: (url) => self.getShareUrl(url),
        getXShareUrl: (url) => self.getShareUrl(url),
        getAudioContextState: () => {
          if (globalObj.JRE && globalObj.JRE.audio && globalObj.JRE.audio.getContext) {
            const ctx = globalObj.JRE.audio.getContext();
            return ctx ? ctx.state : 'running';
          }
          return 'running';
        },
        isMuted: () => {
          if (globalObj.JRE && globalObj.JRE.audio && typeof globalObj.JRE.audio.isMuted === 'function') {
            return globalObj.JRE.audio.isMuted();
          }
          return false;
        },
        toggleMute: () => {
          if (globalObj.JRE && globalObj.JRE.audio && typeof globalObj.JRE.audio.toggleMute === 'function') {
            return globalObj.JRE.audio.toggleMute();
          }
          return false;
        },
        resetGame: () => self.resetGame(),
        reset: () => self.resetGame()
      };
    }

    _getNow() {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now() / 1000.0;
      }
      return Date.now() / 1000.0;
    }
  }

  // Expose Enums & Tiers on Engine class for external modules
  Engine.STATES = STATES;
  Engine.ORIENTATIONS = ORIENTATIONS;
  Engine.FOLD_STATES = FOLD_STATES;
  Engine.DIFFICULTY_TIERS = DIFFICULTY_TIERS;
  Engine.CALIBRATED_TIERS = CALIBRATED_TIERS;
  Engine.calibrateDifficultyTiers = function (enable = true) {
    if (enable) {
      DIFFICULTY_TIERS.standard.forcePerTap = 4.2;
      DIFFICULTY_TIERS.standard.yieldThreshold = 15.0;
      DIFFICULTY_TIERS.standard.decayRate = 1.6;
      DIFFICULTY_TIERS.standard.damageScale = 0.30;
      DIFFICULTY_TIERS.standard.comboBonus = 1.25;

      DIFFICULTY_TIERS.dust.forcePerTap = 3.8;
      DIFFICULTY_TIERS.dust.yieldThreshold = 20.0;
      DIFFICULTY_TIERS.dust.decayRate = 1.35;
      DIFFICULTY_TIERS.dust.damageScale = 0.32;
      DIFFICULTY_TIERS.dust.comboBonus = 1.25;

      DIFFICULTY_TIERS.titanium.forcePerTap = 3.8;
      DIFFICULTY_TIERS.titanium.yieldThreshold = 26.0;
      DIFFICULTY_TIERS.titanium.decayRate = 2.1;
      DIFFICULTY_TIERS.titanium.damageScale = 0.55;
      DIFFICULTY_TIERS.titanium.comboBonus = 1.35;
    } else {
      DIFFICULTY_TIERS.standard.forcePerTap = 4.5;
      DIFFICULTY_TIERS.standard.yieldThreshold = 18.0;
      DIFFICULTY_TIERS.standard.decayRate = 1.8;
      DIFFICULTY_TIERS.standard.damageScale = 1.2;
      DIFFICULTY_TIERS.standard.comboBonus = 1.25;

      DIFFICULTY_TIERS.dust.forcePerTap = 3.8;
      DIFFICULTY_TIERS.dust.yieldThreshold = 25.0;
      DIFFICULTY_TIERS.dust.decayRate = 1.2;
      DIFFICULTY_TIERS.dust.damageScale = 1.0;
      DIFFICULTY_TIERS.dust.comboBonus = 1.25;

      DIFFICULTY_TIERS.titanium.forcePerTap = 3.0;
      DIFFICULTY_TIERS.titanium.yieldThreshold = 38.0;
      DIFFICULTY_TIERS.titanium.decayRate = 3.2;
      DIFFICULTY_TIERS.titanium.damageScale = 0.75;
      DIFFICULTY_TIERS.titanium.comboBonus = 1.35;
    }
    return DIFFICULTY_TIERS;
  };
  Engine.resetDifficultyTiers = function () {
    return Engine.calibrateDifficultyTiers(false);
  };
  Engine.ZACK_QUIPS = ZACK_QUIPS;

  return Engine;
});
