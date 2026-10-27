/**
 * JerryRigEverything iPhone Duo Bend Test Arcade Game
 * Master Bootstrap Controller & Game Loop (js/main.js)
 * 
 * Target: https://www.frankonedigital.com/bend-test
 * 
 * Coordinates:
 *   - Engine (js/engine.js): State machine, continuous differential physics, tiers
 *   - CanvasRenderer (js/canvas.js): 2D/2.5D cutting-mat workbench & phone projection
 *   - Audio (js/audio.js): Procedural Web Audio API sound synthesis
 *   - UI (js/ui.js): Zack commentary, HUD updates, report card modal, and viral X share
 */

(function () {
  'use strict';

  // Guard against non-browser environments
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // =========================================================================
  // 1. DOM INITIALIZATION & ELEMENT REFERENCES
  // =========================================================================

  let isInitialized = false;

  function initGame() {
    if (isInitialized) return;

    const JRE = window.JRE || {};
    const EngineClass = JRE.Engine || window.JRE_Engine;
    const CanvasRendererClass = JRE.CanvasRenderer || window.JRE_CanvasRenderer;
    const audio = JRE.audio || JRE.Audio;
    const ui = JRE.UI || JRE.ui;

    if (!EngineClass || !CanvasRendererClass) {
      console.warn('JRE Core modules not yet ready. Retrying in 50ms...');
      setTimeout(initGame, 50);
      return;
    }

    isInitialized = true;

    // DOM Elements
    const canvas = document.getElementById('gameCanvas') || document.querySelector('canvas');
    const hudTimer = document.getElementById('hudTimer');
    const hudCps = document.getElementById('hudCps');
    const hudBendAngle = document.getElementById('hudBendAngle');
    const hudDamageBar = document.getElementById('hudDamageBar');
    const hudDamagePct = document.getElementById('hudDamagePct');
    const damageFill = hudDamageBar ? hudDamageBar.querySelector('.damage-fill') : null;

    // Control Buttons
    const btnFlip = document.getElementById('btnFlip');
    const btnMute = document.getElementById('btnMute');
    const btnStart = document.getElementById('btnStart');
    const btnReset = document.getElementById('btnReset');

    // Tier Selector Buttons
    const tierButtons = {
      standard: document.getElementById('tierStandard'),
      dust: document.getElementById('tierDust'),
      titanium: document.getElementById('tierTitanium')
    };

    // Mobile Touch Zones
    const leftTouchZone = document.getElementById('leftTouchZone');
    const rightTouchZone = document.getElementById('rightTouchZone');

    // Report Card Modal Elements
    const reportModal = document.getElementById('reportCardModal') || document.querySelector('.report-card-modal');
    const btnDownloadCard = document.getElementById('btnDownloadCard') || document.getElementById('btn-download-png');
    const btnShareX = document.getElementById('btnShareX') || document.getElementById('btn-share-x');
    const btnRetry = document.getElementById('btnRetry') || document.getElementById('btn-retry');

    // =======================================================================
    // 2. SUBSYSTEM INSTANTIATION
    // =======================================================================

    const engine = new EngineClass({
      defaultTier: 'standard',
      autoTick: false,
      interactiveAssist: true,
      runDuration: 25.0
    });

    // Restrict progress to genuine, unmodified rounds. The visual inspection
    // ?damage=... option is a preview and cannot unlock a level or save a score.
    let previewMode = false;
    try {
      const query = new URLSearchParams(window.location.search || '');
      const damage = query.get('damage');
      previewMode = damage !== null && Number.isFinite(Number(damage));
    } catch (_) {}
    let progressStorage = null;
    try { progressStorage = window.localStorage; } catch (_) {}
    const progression = ui.createProgression(progressStorage);
    let lastProgressText = '';
    let nextUnlockedTier = null;

    const renderer = new CanvasRendererClass(canvas, {
      enableHiDPI: true,
      enableShake: true,
      enableParticles: true,
      showProps: true,
      showHud: true
    });

    // Wire Engine Audio Events to Procedural Web Audio API
    if (audio && typeof audio.playEvent === 'function') {
      engine.onAudioEvent((type, payload) => {
        audio.playEvent(type, payload);
      });
    }

    // User Gesture Audio Unlock
    function unlockAudio() {
      if (audio && typeof audio.unlock === 'function') {
        audio.unlock();
      }
    }
    window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
    window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

    // =======================================================================
    // 3. UI STATE & COMMENTARY BINDINGS
    // =======================================================================

    // Update Mute Button State
    function updateMuteButtonUI() {
      if (!btnMute || !audio) return;
      const muted = typeof audio.isMuted === 'function' ? audio.isMuted() : false;
      const iconSpan = btnMute.querySelector('.icon');
      const textSpan = btnMute.querySelector('.text');
      if (iconSpan) iconSpan.textContent = muted ? '🔇' : '🔊';
      if (textSpan) textSpan.textContent = muted ? 'Audio: MUTED' : 'Audio: ON';
      btnMute.classList.toggle('active', muted);
    }
    updateMuteButtonUI();

    // Update tier locks, selected device, and the selected tier's local best.
    const brandDeviceName = document.getElementById('brandDeviceName');
    const progressStatus = document.getElementById('progressStatus');
    const tierOrder = ['standard', 'dust', 'titanium'];
    const tierNames = ['Easy', 'Medium', 'Hard'];
    function updateTierButtonsUI(activeTierId) {
      const activeIndex = Math.max(0, tierOrder.indexOf(activeTierId));
      Object.keys(tierButtons).forEach(tierId => {
        const btn = tierButtons[tierId];
        if (!btn) return;
        const unlocked = progression.isUnlocked(tierId);
        btn.disabled = !unlocked;
        btn.classList.toggle('active', tierId === activeTierId);
        if (typeof btn.setAttribute === 'function') {
          btn.setAttribute('aria-pressed', tierId === activeTierId ? 'true' : 'false');
          btn.setAttribute('aria-label', tierNames[tierOrder.indexOf(tierId)] + (unlocked ? ' level' : ' level, locked'));
        }
        btn.title = unlocked ? 'Select ' + tierNames[tierOrder.indexOf(tierId)] : 'Win the previous level to unlock';
        const lock = btn.querySelector('.tier-lock');
        if (lock) lock.style.display = unlocked ? 'none' : '';
      });
      if (brandDeviceName) brandDeviceName.textContent = (activeTierId === 'titanium') ? 'Samsung Fold 8' : 'iPhone Duo';
      if (progressStatus) {
        const best = progression.getBest(activeTierId);
        const bestText = best === null ? '—' : best.toFixed(2) + 's';
        const next = progression.getUnlockedCount();
        const goal = next < 3 ? ' · Win ' + tierNames[next - 1] + ' to unlock ' + tierNames[next]
          : (progression.getBest('titanium') !== null ? ' · All levels cleared!' : ' · Beat Hard to complete the campaign');
        const saveNote = previewMode ? ' · Preview: no scores' : (!progression.isPersistent() ? ' · Session only' : '');
        progressStatus.textContent = 'Level ' + (activeIndex + 1) + ' / 3 · Best: ' + bestText + goal + saveNote;
      }
    }
    updateTierButtonsUI(engine.currentTier.id);

    // Update Orientation Button UI
    function updateOrientationButtonUI(orientation) {
      if (!btnFlip) return;
      const isReverse = orientation === EngineClass.ORIENTATIONS.REVERSE_BEND;
      const textSpan = btnFlip.querySelector('.text');
      if (textSpan) {
        textSpan.textContent = isReverse ? 'Reverse Bend' : 'Front Bend (Resists)';
      }
      btnFlip.classList.toggle('active', !isReverse);
      btnFlip.title = isReverse
        ? 'Reverse Bend: Vulnerable hyperextension against hinge'
        : 'Front Bend: Mechanical stop limits damage to < 25%';
    }
    updateOrientationButtonUI(engine.orientation);

    // Zack Nelson Commentary on Stage Transitions
    if (typeof engine.onStageChange === 'function') {
      engine.onStageChange((newStage, oldStage) => {
        if (ui && ui.Captions && typeof ui.Captions.trigger === 'function') {
          ui.Captions.trigger(newStage, 2);
        }
      });
    } else if (typeof engine.onAudioEvent === 'function') {
      engine.onAudioEvent((type, payload) => {
        if (type === 'STAGE_TRANSITION' && payload && payload.newStage) {
          if (ui && ui.Captions && typeof ui.Captions.trigger === 'function') {
            ui.Captions.trigger(payload.newStage, 2);
          }
        }
      });
    }

    // State Change Handler
    engine.onStateChange((newState, oldState) => {
      if (btnStart) {
        if (newState === EngineClass.STATES.ACTIVE_MASHING) {
          btnStart.textContent = 'MASH RAPIDLY!';
          btnStart.classList.add('active');
        } else if (newState === EngineClass.STATES.COUNTDOWN) {
          btnStart.textContent = 'READY...';
        } else {
          btnStart.textContent = 'Start Bend Test';
          btnStart.classList.remove('active');
        }
      }

      if (newState === EngineClass.STATES.SNAP_CELEBRATION) {
        const result = previewMode ? null : progression.recordWin(engine.currentTier.id, engine.snapTime);
        nextUnlockedTier = result ? result.nextTier : null;
        if (result) {
          const best = progression.getBest(engine.currentTier.id);
          const nextName = result.nextTier ? tierNames[tierOrder.indexOf(result.nextTier)] : '';
          lastProgressText = (result.newBest ? 'New personal best: ' : 'Personal best: ') + best.toFixed(2) + 's' +
            (result.unlockedNext ? ' · ' + nextName + ' unlocked!' : (engine.currentTier.id === 'titanium' ? ' · Campaign complete!' : '')) + (result.saved ? '' : ' · Saved for this session only');
          updateTierButtonsUI(engine.currentTier.id);
        } else lastProgressText = previewMode ? 'Preview mode — scores and unlocks are not saved.' : '';
        if (ui && ui.Captions) {
          ui.Captions.trigger('STAGE_5', 3);
        }
      } else if (newState === EngineClass.STATES.SURVIVAL_FAIL) {
        nextUnlockedTier = null;
        lastProgressText = 'No new unlock this round. Try again!';
        if (ui && ui.Captions) {
          ui.Captions.display(`The ${engine.currentTier.deviceModel || 'iPhone Duo'} survives this bend test.`, 3);
        }
      } else if (newState === EngineClass.STATES.REPORT_CARD) {
        if (ui && typeof ui.showReportCard === 'function') {
          ui.showReportCard(engine.getReportCardData(), {
            progressText: lastProgressText,
            nextLevelLabel: nextUnlockedTier ? 'Continue to ' + tierNames[tierOrder.indexOf(nextUnlockedTier)] : '',
            onNextLevel: nextUnlockedTier ? () => {
              const next = nextUnlockedTier;
              nextUnlockedTier = null;
              engine.setTier(next);
              updateTierButtonsUI(next);
              updateOrientationButtonUI(engine.orientation);
            } : null,
            onRetry: () => engine.resetGame()
          });
        }
      } else if (newState === EngineClass.STATES.IDLE_SELECT) {
        if (ui && typeof ui.hideReportCard === 'function') {
          ui.hideReportCard();
        }
      }
    });

    // =======================================================================
    // 4. INPUT HANDLING: KEYBOARD & MULTI-TOUCH
    // =======================================================================

    // Keyboard controls with auto-repeat rejection
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return; // Discard OS repeat events

      // Universal audio unlock
      unlockAudio();

      if (e.code === 'Space') {
        e.preventDefault();
        if (engine.state === EngineClass.STATES.IDLE_SELECT || engine.state === EngineClass.STATES.COUNTDOWN) {
          engine.startActiveMashing();
        }
        if (engine.state === EngineClass.STATES.ACTIVE_MASHING) {
          engine.handleKeyDown(e);
          // Visual feedback on touch zones
          if (engine.activeHand === 'left' && leftTouchZone) {
            triggerKnucklePulse(leftTouchZone);
          } else if (engine.activeHand === 'right' && rightTouchZone) {
            triggerKnucklePulse(rightTouchZone);
          }
        }
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        e.preventDefault();
        if (engine.state === EngineClass.STATES.IDLE_SELECT || engine.state === EngineClass.STATES.COUNTDOWN) {
          engine.startActiveMashing();
        }
        engine.registerTap('left', 'keyboard');
        if (leftTouchZone) triggerKnucklePulse(leftTouchZone);
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        e.preventDefault();
        if (engine.state === EngineClass.STATES.IDLE_SELECT || engine.state === EngineClass.STATES.COUNTDOWN) {
          engine.startActiveMashing();
        }
        engine.registerTap('right', 'keyboard');
        if (rightTouchZone) triggerKnucklePulse(rightTouchZone);
      } else if (e.code === 'KeyF' || e.code === 'KeyR') {
        e.preventDefault();
        engine.flipOrientation();
        updateOrientationButtonUI(engine.orientation);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        if (audio && typeof audio.toggleMute === 'function') {
          audio.toggleMute();
          updateMuteButtonUI();
        }
      } else if (e.code === 'Escape') {
        e.preventDefault();
        engine.resetGame();
        if (ui && typeof ui.hideReportCard === 'function') {
          ui.hideReportCard();
        }
      }
    });

    // Keyboard keyup handling to release visual active states
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        if (leftTouchZone) leftTouchZone.classList.remove('active');
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        if (rightTouchZone) rightTouchZone.classList.remove('active');
      }
    });

    // Visual pulse helper for tactile strain feedback
    function triggerKnucklePulse(el) {
      if (!el) return;
      el.classList.remove('mash-pulse-left', 'mash-pulse-right');
      void el.offsetWidth; // Force reflow
      el.classList.add('mash-pulse-left');
    }

    // Touch Zone Inputs (Split Dual-Thumb Mashing)
    function bindTouchZone(zoneEl, hand) {
      if (!zoneEl) return;

      const handlePress = (e) => {
        e.preventDefault();
        unlockAudio();

        if (engine.state === EngineClass.STATES.IDLE_SELECT || engine.state === EngineClass.STATES.COUNTDOWN) {
          engine.startActiveMashing();
        }

        // Each zone represents its own thumb. Pointer events arrive separately
        // for simultaneous touches, so the engine can score real alternation.
        if (engine.registerTap(hand, 'touch')) {
          triggerKnucklePulse(zoneEl);
        }
      };

      zoneEl.addEventListener('pointerdown', handlePress, { passive: false });
    }

    bindTouchZone(leftTouchZone, 'left');
    bindTouchZone(rightTouchZone, 'right');

    // Canvas Click Fallback: Auto-alternates hands so mouse clicking pumps both hands!
    if (canvas) {
      canvas.addEventListener('pointerdown', (e) => {
        unlockAudio();
        const hand = (engine.lastTapHand === 'left') ? 'right' : 'left';

        if (engine.state === EngineClass.STATES.IDLE_SELECT || engine.state === EngineClass.STATES.COUNTDOWN) {
          engine.startActiveMashing();
        }

        if (engine.registerTap(hand, 'pointer')) {
          const targetZone = (hand === 'left') ? leftTouchZone : rightTouchZone;
          if (targetZone) triggerKnucklePulse(targetZone);
        }
      });
    }

    // =======================================================================
    // 5. TOOLBAR BUTTON EVENT LISTENERS
    // =======================================================================

    // Difficulty Tier Selection
    Object.keys(tierButtons).forEach(tierId => {
      const btn = tierButtons[tierId];
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (!progression.isUnlocked(tierId)) return;
          unlockAudio();
          previewMode = false;
          lastProgressText = '';
          engine.setTier(tierId);
          updateTierButtonsUI(tierId);
          updateOrientationButtonUI(engine.orientation);
          if (ui && typeof ui.hideReportCard === 'function') ui.hideReportCard();
          if (ui && ui.Captions) {
            if (tierId === 'standard') ui.Captions.display("Easy Level: iPhone Duo folding hinge... let's give it the bend test.", 1);
            if (tierId === 'dust') ui.Captions.display("Medium Level: A little desert sand in the iPhone Duo hinge never hurt anyone... or did it?", 1);
            if (tierId === 'titanium') ui.Captions.display("Hard Level: Samsung Galaxy Z Fold 8. Seven generations of Armor FlexHinge refinement... let's see if it survives.", 1);
          }
        });
      }
    });

    // Flip Orientation Toggle
    if (btnFlip) {
      btnFlip.addEventListener('click', (e) => {
        e.preventDefault();
        unlockAudio();
        engine.flipOrientation();
        updateOrientationButtonUI(engine.orientation);
        if (ui && ui.Captions) {
          if (engine.orientation === EngineClass.ORIENTATIONS.FRONT_BEND) {
            ui.Captions.trigger('FRONT_BEND', 3);
          } else {
            ui.Captions.trigger('REVERSE_BEND', 3);
          }
        }
      });
    }

    // Audio Mute Toggle
    if (btnMute) {
      btnMute.addEventListener('click', (e) => {
        e.preventDefault();
        unlockAudio();
        if (audio && typeof audio.toggleMute === 'function') {
          audio.toggleMute();
          updateMuteButtonUI();
        }
      });
    }

    // Start Bend Test Button
    if (btnStart) {
      btnStart.addEventListener('click', (e) => {
        e.preventDefault();
        unlockAudio();
        if (engine.state === EngineClass.STATES.IDLE_SELECT || engine.state === EngineClass.STATES.COUNTDOWN) {
          engine.startActiveMashing();
          engine.handleKeyDown({ code: 'Space', repeat: false, preventDefault: () => {} });
        } else if (engine.state === EngineClass.STATES.ACTIVE_MASHING) {
          // Button mash via click
          engine.handleKeyDown({ code: 'Space', repeat: false, preventDefault: () => {} });
        } else {
          engine.resetGame();
        }
      });
    }

    // Reset Button
    if (btnReset) {
      btnReset.addEventListener('click', (e) => {
        e.preventDefault();
        engine.resetGame();
        if (ui && typeof ui.hideReportCard === 'function') {
          ui.hideReportCard();
        }
      });
    }

    // Report Card Action Buttons
    if (btnDownloadCard) {
      btnDownloadCard.addEventListener('click', (e) => {
        e.preventDefault();
        if (ui && typeof ui.renderReportCardCanvas === 'function' && typeof ui.downloadReportPng === 'function') {
          const metrics = engine.getReportCardData();
          const offscreenCanvas = ui.renderReportCardCanvas(metrics);
          ui.downloadReportPng(offscreenCanvas, metrics);
        }
      });
    }

    if (btnShareX) {
      btnShareX.addEventListener('click', (e) => {
        e.preventDefault();
        if (ui && typeof ui.openTwitterShare === 'function') {
          ui.openTwitterShare(engine.getReportCardData());
        } else {
          const shareUrl = engine.getShareUrl();
          window.open(shareUrl, '_blank', 'noopener,noreferrer');
        }
      });
    }

    if (btnRetry) {
      btnRetry.addEventListener('click', (e) => {
        e.preventDefault();
        if (ui && typeof ui.hideReportCard === 'function') {
          ui.hideReportCard();
        }
        engine.resetGame();
      });
    }

    // =======================================================================
    // 6. MASTER 60 FPS GAME LOOP
    // =======================================================================

    let lastTimestamp = (typeof performance !== 'undefined' && typeof performance.now === 'function')
      ? (performance.now() / 1000.0)
      : (Date.now() / 1000.0);

    function gameLoop(currentMs) {
      try {
        const validMs = (typeof currentMs === 'number' && !isNaN(currentMs))
          ? currentMs
          : ((typeof performance !== 'undefined' && typeof performance.now === 'function')
              ? performance.now()
              : Date.now());

        const currentSeconds = validMs / 1000.0;
        let dt = currentSeconds - lastTimestamp;
        if (dt <= 0 || isNaN(dt)) dt = 0.0166;
        if (dt > 0.10) dt = 0.10;
        lastTimestamp = currentSeconds;

        // 1. Advance differential physics engine
        if (typeof engine.update === 'function') {
          engine.update(dt);
        }

        // 2. Extract immutable render snapshot
        const snapshot = (typeof engine.getRenderSnapshot === 'function')
          ? engine.getRenderSnapshot()
          : null;

        // 3. Render 9-pass canvas scene
        if (renderer && typeof renderer.render === 'function' && snapshot) {
          renderer.render(snapshot, dt);
        }

        // 4. Update HUD DOM display elements
        if (snapshot) {
          if (hudTimer) {
            const isCountdown = EngineClass && EngineClass.STATES && (snapshot.state === EngineClass.STATES.COUNTDOWN);
            if (isCountdown) {
              hudTimer.textContent = `${Math.ceil(engine.countdownRemaining || 0)}...`;
              hudTimer.style.color = 'var(--mat-highlight)';
            } else {
              const timeSec = (typeof snapshot.timeRemainingSec === 'number') ? snapshot.timeRemainingSec : 0;
              hudTimer.textContent = `${Math.max(0, timeSec).toFixed(1)}s`;
              hudTimer.style.color = (timeSec < 5.0) ? 'var(--red-alert)' : 'var(--amber-accent)';
            }
          }

          if (hudCps) {
            const cpsVal = (typeof snapshot.cps === 'number') ? snapshot.cps : 0;
            hudCps.textContent = cpsVal.toFixed(1);
          }

          if (hudBendAngle) {
            const angleVal = (typeof snapshot.bendAngleDeg === 'number') ? snapshot.bendAngleDeg : 0;
            hudBendAngle.textContent = `${Math.round(angleVal)}°`;
          }

          if (damageFill) {
            const dmgVal = (typeof snapshot.damagePct === 'number') ? snapshot.damagePct : 0;
            damageFill.style.width = `${Math.min(100, Math.max(0, dmgVal)).toFixed(1)}%`;
          }

          if (hudDamagePct) {
            const dmgVal = (typeof snapshot.damagePct === 'number') ? snapshot.damagePct : 0;
            hudDamagePct.textContent = `${Math.round(dmgVal)}%`;
          }
        }
      } catch (err) {
        console.error('Error during gameLoop frame:', err);
      } finally {
        requestAnimationFrame(gameLoop);
      }
    }

    // Expose controller for verification harness & automated integration testing
    const controller = {
      engine,
      renderer,
      audio,
      ui,
      isLoopRunning: () => true,
      progression,
      initGame
    };
    window.__BEND_TEST_CONTROLLER__ = controller;
    if (window.JRE) {
      window.JRE.engine = engine;
      window.JRE.renderer = renderer;
    }

    // Support optional URL query params for instant preview/social card states (?tier=titanium&damage=55)
    try {
      const params = new URLSearchParams(window.location.search || '');
      const qTier = params.get('tier');
      const qDamage = params.get('damage');
      const qFlip = params.get('flip');
      if (qTier && progression.isUnlocked(qTier.toLowerCase())) {
        engine.setTier(qTier);
        updateTierButtonsUI(engine.currentTier.id);
      }
      if (qFlip === '1' || qFlip === 'front') {
        engine.flipOrientation(true);
        updateOrientationButtonUI(engine.orientation);
      }
      if (qDamage !== null && !isNaN(parseFloat(qDamage))) {
        engine.startActiveMashing();
        engine.force = 78.0;
        engine.forceDamagePct(parseFloat(qDamage));
      }
    } catch (e) {}

    // Start loop
    requestAnimationFrame(gameLoop);
    return controller;
  }

  // Auto-boot when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }
})();
