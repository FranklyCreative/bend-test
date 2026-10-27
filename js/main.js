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
    const btnQuote = document.getElementById('btnQuote');
    const btnLeaderboard = document.getElementById('btnLeaderboard');
    const btnFlip = document.getElementById('btnFlip');
    const btnMute = document.getElementById('btnMute');
    const btnStart = document.getElementById('btnStart');
    const btnReset = document.getElementById('btnReset');
    const captionPill = document.getElementById('caption-pill');

    // Tier Selector Buttons (5 Foldable Smartphone Levels)
    const tierButtons = {
      standard: document.getElementById('tierStandard'),
      dust: document.getElementById('tierDust'),
      titanium: document.getElementById('tierTitanium'),
      pixel: document.getElementById('tierPixel'),
      trifold: document.getElementById('tierTrifold')
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
    const tierOrder = ['standard', 'dust', 'titanium', 'pixel', 'trifold'];
    const tierNames = ['Easy: iPhone Duo', 'Med: Dust-Jammed', 'Hard: Samsung Fold 8', 'Expert: Pixel 10 Fold', 'Boss: Mate XT Tri-Fold'];
    const progression = ui.createProgression(progressStorage, tierOrder);
    const leaderboard = (ui && typeof ui.createLeaderboard === 'function')
      ? ui.createLeaderboard(progressStorage)
      : null;
    let lastProgressText = '';
    let nextUnlockedTier = null;
    let lastAddedScoreId = null;
    let activeLeaderboardFilter = 'all';

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
    function updateTierButtonsUI(activeTierId) {
      const activeIndex = Math.max(0, tierOrder.indexOf(activeTierId));
      Object.keys(tierButtons).forEach(tierId => {
        const btn = tierButtons[tierId];
        if (!btn) return;
        const unlocked = progression.isUnlocked(tierId);
        const cleared = progression.getBest(tierId) !== null;
        // Keep all 5 level buttons clickable so players can jump directly to any foldable phone or play sequentially
        btn.disabled = false;
        btn.classList.toggle('active', tierId === activeTierId);
        if (typeof btn.setAttribute === 'function') {
          btn.setAttribute('aria-pressed', tierId === activeTierId ? 'true' : 'false');
          btn.setAttribute('aria-label', tierNames[tierOrder.indexOf(tierId)] + (unlocked ? ' level' : ' level (click to unlock & play)'));
        }
        btn.title = 'Select ' + tierNames[tierOrder.indexOf(tierId)];
        const lock = btn.querySelector('.tier-lock');
        if (lock) {
          const bestVal = progression.getBest(tierId);
          const medal = (cleared && ui && typeof ui.getMedalForTime === 'function') ? ui.getMedalForTime(bestVal) : '';
          lock.textContent = cleared ? (medal ? `${medal}✓` : '✓') : (unlocked ? '' : '🔒');
          lock.style.display = (cleared || !unlocked) ? '' : 'none';
        }
      });
      if (brandDeviceName) {
        const modelMap = {
          standard: 'iPhone Duo',
          dust: 'iPhone Duo (Dust)',
          titanium: 'Samsung Fold 8',
          pixel: 'Pixel 10 Pro Fold',
          trifold: 'Mate XT Tri-Fold'
        };
        brandDeviceName.textContent = modelMap[activeTierId] || 'iPhone Duo';
      }
      if (progressStatus) {
        const best = progression.getBest(activeTierId);
        const bestText = best === null ? '—' : best.toFixed(2) + 's';
        const next = progression.getUnlockedCount();
        const topRecord = leaderboard ? leaderboard.getTop10(activeTierId)[0] : null;
        const recordText = topRecord ? ` · #1 Record: ${topRecord.snapTime.toFixed(2)}s (${topRecord.name})` : '';
        const goal = next < tierOrder.length ? ' · Win to advance to ' + tierNames[next]
          : ' · All 5 Foldable Levels Unlocked!';
        const saveNote = previewMode ? ' · Preview mode' : (!progression.isPersistent() ? ' · Session only' : '');
        progressStatus.textContent = 'Level ' + (activeIndex + 1) + ' / ' + tierOrder.length + ' · Personal Best: ' + bestText + recordText + goal + saveNote;
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
        if (!progression.isUnlocked(engine.currentTier.id) && typeof progression.unlockAll === 'function') {
          progression.unlockAll();
        }
        const result = previewMode ? null : progression.recordWin(engine.currentTier.id, engine.snapTime);
        const curIdx = tierOrder.indexOf(engine.currentTier.id);
        nextUnlockedTier = (result && result.nextTier) ? result.nextTier : (curIdx >= 0 && curIdx + 1 < tierOrder.length ? tierOrder[curIdx + 1] : null);
        if (result) {
          const best = progression.getBest(engine.currentTier.id);
          const nextName = nextUnlockedTier ? tierNames[tierOrder.indexOf(nextUnlockedTier)] : '';
          lastProgressText = (result.newBest ? 'New personal best: ' : 'Personal best: ') + best.toFixed(2) + 's' +
            (nextName ? ' · Next up: ' + nextName + '!' : ' · 5-Level Foldable Gauntlet Complete!') + (result.saved ? '' : ' · Saved for this session only');
          updateTierButtonsUI(engine.currentTier.id);
        } else lastProgressText = previewMode ? 'Preview mode — scores and unlocks are not saved.' : '';
        if (ui && ui.Captions) {
          ui.Captions.trigger('STAGE_5', 3);
        }
      } else if (newState === EngineClass.STATES.SURVIVAL_FAIL) {
        nextUnlockedTier = null;
        lastProgressText = 'Phone survived! Mash faster or alternate A/D keys to snap the spine.';
        if (ui && ui.Captions) {
          ui.Captions.display(`The ${engine.currentTier.deviceModel || 'iPhone Duo'} survives this bend test.`, 3);
        }
      } else if (newState === EngineClass.STATES.REPORT_CARD) {
        const reportData = engine.getReportCardData();
        const scoreSection = document.getElementById('scoreSubmitSection');
        const scoreFeedback = document.getElementById('scoreSubmitFeedback');
        const btnSaveScore = document.getElementById('btnSaveScore');
        if (scoreSection) {
          scoreSection.style.display = (!reportData.survived && !previewMode) ? '' : 'none';
        }
        if (scoreFeedback) {
          scoreFeedback.textContent = (!reportData.survived && !previewMode)
            ? `Snapped ${reportData.deviceModel} in ${reportData.snapTime}s (${reportData.peakCps} CPS) — enter your name or @X_handle for the Top 10!`
            : '';
        }
        if (btnSaveScore) {
          btnSaveScore.disabled = false;
          btnSaveScore.textContent = 'Save to Top 10';
        }
        if (ui && typeof ui.showReportCard === 'function') {
          ui.showReportCard(reportData, {
            progressText: lastProgressText,
            nextLevelLabel: nextUnlockedTier ? 'Next Level: ' + tierNames[tierOrder.indexOf(nextUnlockedTier)] : '',
            onNextLevel: nextUnlockedTier ? () => {
              const next = nextUnlockedTier;
              nextUnlockedTier = null;
              if (!progression.isUnlocked(next) && typeof progression.unlockAll === 'function') {
                progression.unlockAll();
              }
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

    // Interactive Workbench Lab Pre-Test Tools (Scratch, Burn, Sand)
    const btnToolScratch = document.getElementById('btnToolScratch');
    const btnToolBurn = document.getElementById('btnToolBurn');
    const btnToolSand = document.getElementById('btnToolSand');

    function syncLabToolButtonsUI() {
      const used = engine.labToolsUsed || { scratch: false, burn: false, sand: false };
      if (btnToolScratch) btnToolScratch.classList.toggle('used', Boolean(used.scratch));
      if (btnToolBurn) btnToolBurn.classList.toggle('used', Boolean(used.burn));
      if (btnToolSand) btnToolSand.classList.toggle('used', Boolean(used.sand));
    }

    function executeLabTool(toolType) {
      unlockAudio();
      if (typeof engine.triggerLabTool !== 'function') return false;
      const res = engine.triggerLabTool(toolType);
      if (renderer && typeof renderer.triggerLabToolVisual === 'function') {
        renderer.triggerLabToolVisual(toolType);
      }
      syncLabToolButtonsUI();
      if (res && res.quip && ui && ui.Captions) {
        ui.Captions.display(res.quip, 3);
      }
      return Boolean(res && res.applied);
    }

    if (btnToolScratch) {
      btnToolScratch.addEventListener('click', (e) => {
        e.preventDefault();
        executeLabTool('scratch');
      });
    }
    if (btnToolBurn) {
      btnToolBurn.addEventListener('click', (e) => {
        e.preventDefault();
        executeLabTool('burn');
      });
    }
    if (btnToolSand) {
      btnToolSand.addEventListener('click', (e) => {
        e.preventDefault();
        executeLabTool('sand');
      });
    }

    // Canvas Click Fallback: Check Workbench Props (Box Cutter / Lighter) first, then auto-alternate hands
    if (canvas) {
      canvas.addEventListener('pointerdown', (e) => {
        unlockAudio();
        if (canvas.getBoundingClientRect && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
          const rect = canvas.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const nx = (e.clientX - rect.left) / rect.width;
            const ny = (e.clientY - rect.top) / rect.height;
            // Left Box Cutter hit-box (~x: 0.04..0.19, y: 0.25..0.52)
            if (nx >= 0.03 && nx <= 0.19 && ny >= 0.24 && ny <= 0.52 && !(engine.labToolsUsed && engine.labToolsUsed.scratch)) {
              executeLabTool('scratch');
              return;
            }
            // Right Lighter hit-box (~x: 0.82..0.97, y: 0.30..0.55)
            if (nx >= 0.82 && nx <= 0.97 && ny >= 0.28 && ny <= 0.56 && !(engine.labToolsUsed && engine.labToolsUsed.burn)) {
              executeLabTool('burn');
              return;
            }
          }
        }
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

    // Difficulty Tier Selection (5 Foldable Levels)
    Object.keys(tierButtons).forEach(tierId => {
      const btn = tierButtons[tierId];
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          unlockAudio();
          if (!progression.isUnlocked(tierId) && typeof progression.unlockAll === 'function') {
            progression.unlockAll();
          }
          previewMode = false;
          lastProgressText = '';
          engine.setTier(tierId);
          updateTierButtonsUI(tierId);
          updateOrientationButtonUI(engine.orientation);
          if (ui && typeof ui.hideReportCard === 'function') ui.hideReportCard();
          if (ui && ui.Captions) {
            if (tierId === 'standard') ui.Captions.display("Level 1 (Easy): The new Apple iPhone Duo is here—and it's time for an iPhone Duo Durability Test.", 2);
            if (tierId === 'dust') ui.Captions.display("Level 2 (Medium): Let's pour a handful of coarse dirt and sand onto the iPhone Duo hinge and see if the magnets survive.", 2);
            if (tierId === 'titanium') ui.Captions.display("Level 3 (Hard): Samsung Galaxy Z Fold 8. Seven generations of Armor FlexHinge refinement... let's see if it survives.", 2);
            if (tierId === 'pixel') ui.Captions.display("Level 4 (Expert): Google Pixel 10 Pro Fold. Google left the antenna seam right beside the hinge again.", 2);
            if (tierId === 'trifold') ui.Captions.display("Level 5 (Boss): Huawei Mate XT Tri-Fold. A 3.6mm phone with two opposing hinges—twice the places to snap backwards.", 2);
          }
        });
      }
    });

    // Hear Quote Button & Subtitle Pill Click-to-Speak
    function triggerSpokenZackQuote() {
      unlockAudio();
      if (audio && typeof audio.isMuted === 'function' && audio.isMuted() && typeof audio.setMuted === 'function') {
        audio.setMuted(false);
        updateMuteButtonUI();
      }
      if (ui && ui.Captions) {
        const stageCat = (engine.state === EngineClass.STATES.ACTIVE_MASHING)
          ? (engine.currentStage || 1)
          : 'IDLE';
        ui.Captions.trigger(stageCat, 3);
      }
    }
    if (btnQuote) {
      btnQuote.addEventListener('click', (e) => {
        e.preventDefault();
        triggerSpokenZackQuote();
      });
    }
    if (captionPill) {
      captionPill.addEventListener('click', (e) => {
        e.preventDefault();
        unlockAudio();
        const currentText = (ui && ui.Captions && ui.Captions.currentQuip)
          ? ui.Captions.currentQuip
          : "The new Apple iPhone Duo is here—and it's time for an iPhone Duo Durability Test.";
        if (audio && typeof audio.speakQuote === 'function') {
          audio.speakQuote(currentText, true);
        }
      });
    }

    // Top 10 High Score Leaderboard UI & Modal Wiring
    const leaderboardModal = document.getElementById('leaderboardModal');
    const leaderboardTableBody = document.getElementById('leaderboardTableBody');
    const btnCloseLeaderboard = document.getElementById('btnCloseLeaderboard');
    const btnCloseLeaderboardFooter = document.getElementById('btnCloseLeaderboardFooter');
    const btnOpenLeaderboardFromReport = document.getElementById('btnOpenLeaderboardFromReport');
    const btnSaveScore = document.getElementById('btnSaveScore');
    const playerNameInput = document.getElementById('playerNameInput');
    const scoreSubmitFeedback = document.getElementById('scoreSubmitFeedback');

    function renderLeaderboardModal(tierFilter = activeLeaderboardFilter) {
      activeLeaderboardFilter = tierFilter || 'all';
      if (!leaderboard || !leaderboardTableBody) return;
      const rows = leaderboard.getTop10(activeLeaderboardFilter);
      leaderboardTableBody.innerHTML = rows.map((row, idx) => {
        const isHighlighted = (row.id === lastAddedScoreId) || row.isPlayer;
        const medal = idx === 0 ? '🥇 #1' : (idx === 1 ? '🥈 #2' : (idx === 2 ? '🥉 #3' : `#${idx + 1}`));
        return `<tr class="${isHighlighted ? 'lb-player-row' : ''}">
          <td><span class="lb-rank-badge">${medal}</span></td>
          <td>${String(row.name).replace(/[<>&]/g, '')}</td>
          <td>${String(row.deviceModel).replace(/[<>&]/g, '')}</td>
          <td><strong>${Number(row.snapTime).toFixed(2)}s</strong></td>
          <td>${Number(row.peakCps || 0).toFixed(1)} CPS</td>
          <td><strong>${String(row.grade || 'A')}</strong></td>
        </tr>`;
      }).join('');
      const filterBtns = document.querySelectorAll ? document.querySelectorAll('.lb-filter-btn') : [];
      Array.from(filterBtns).forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-lb-tier') === activeLeaderboardFilter);
      });
    }

    function openLeaderboardModal(tierFilter = 'all') {
      renderLeaderboardModal(tierFilter);
      if (leaderboardModal) {
        if (leaderboardModal.classList) {
          leaderboardModal.classList.remove('hidden');
          leaderboardModal.classList.add('active');
        }
        leaderboardModal.style.display = 'flex';
      }
    }

    function closeLeaderboardModal() {
      if (leaderboardModal) {
        if (leaderboardModal.classList) {
          leaderboardModal.classList.add('hidden');
          leaderboardModal.classList.remove('active');
        }
        leaderboardModal.style.display = 'none';
      }
    }

    if (btnLeaderboard) {
      btnLeaderboard.addEventListener('click', (e) => {
        e.preventDefault();
        openLeaderboardModal('all');
      });
    }
    if (btnOpenLeaderboardFromReport) {
      btnOpenLeaderboardFromReport.addEventListener('click', (e) => {
        e.preventDefault();
        openLeaderboardModal('all');
      });
    }
    if (btnCloseLeaderboard) {
      btnCloseLeaderboard.addEventListener('click', (e) => {
        e.preventDefault();
        closeLeaderboardModal();
      });
    }
    if (btnCloseLeaderboardFooter) {
      btnCloseLeaderboardFooter.addEventListener('click', (e) => {
        e.preventDefault();
        closeLeaderboardModal();
      });
    }
    const btnShareLeaderboardX = document.getElementById('btnShareLeaderboardX');
    if (btnShareLeaderboardX && leaderboard && ui && typeof ui.openTwitterShare === 'function') {
      btnShareLeaderboardX.addEventListener('click', (e) => {
        e.preventDefault();
        const topList = leaderboard.getTop10(activeLeaderboardFilter);
        const topRow = topList[0] || { deviceModel: 'iPhone Duo', snapTime: 6.42, peakCps: 15.4, maxBendAngle: 38, grade: 'S' };
        ui.openTwitterShare({
          survived: false,
          deviceModel: topRow.deviceModel,
          deviceBrand: topRow.tierId === 'titanium' ? 'Samsung' : (topRow.tierId === 'pixel' ? 'Google' : (topRow.tierId === 'trifold' ? 'Huawei' : 'Apple')),
          snapTime: Number(topRow.snapTime).toFixed(2),
          peakCps: Number(topRow.peakCps || 14.0).toFixed(1),
          maxBendAngle: topRow.maxBendAngle || 38,
          damagePct: 100,
          grade: topRow.grade || 'S',
          verdict: 'TOP 10 LEADERBOARD RECORD'
        });
      });
    }
    if (document.querySelectorAll) {
      Array.from(document.querySelectorAll('.lb-filter-btn')).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const tierFilter = btn.getAttribute('data-lb-tier') || 'all';
          renderLeaderboardModal(tierFilter);
        });
      });
    }
    if (btnSaveScore && leaderboard) {
      btnSaveScore.addEventListener('click', (e) => {
        e.preventDefault();
        const reportData = engine.getReportCardData();
        if (reportData.survived || !reportData.snapTime) return;
        const playerName = (playerNameInput && playerNameInput.value) ? playerNameInput.value : 'Lab Tester';
        const res = leaderboard.addScore({
          name: playerName,
          tierId: reportData.tierId,
          deviceModel: reportData.deviceModel,
          snapTime: parseFloat(reportData.snapTime),
          peakCps: parseFloat(reportData.peakCps),
          maxBendAngle: reportData.maxBendAngle,
          grade: reportData.grade
        });
        if (res && res.entry) {
          lastAddedScoreId = res.entry.id;
          btnSaveScore.disabled = true;
          btnSaveScore.textContent = 'Saved ✓';
          if (scoreSubmitFeedback) {
            scoreSubmitFeedback.textContent = res.madeTop10
              ? `🎉 Ranked #${res.rank} Overall (#${res.tierRank || 1} on ${reportData.deviceModel}) in the Top 10 High Scores!`
              : `Score logged (#${res.tierRank || 1} on ${reportData.deviceModel})! Click "Top 10 High Scores" to view.`;
          }
          updateTierButtonsUI(engine.currentTier.id);
        }
      });
    }

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
        syncLabToolButtonsUI();
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
      leaderboard,
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
      if (qTier) {
        if (!progression.isUnlocked(qTier.toLowerCase()) && typeof progression.unlockAll === 'function') {
          progression.unlockAll();
        }
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
