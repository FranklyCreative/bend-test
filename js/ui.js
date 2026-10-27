/**
 * JerryRigEverything iPhone Duo Bend Test Arcade Game
 * UI, Deadpan Captions, Durability Report Card & Virality Engine (js/ui.js)
 * 
 * Features:
 *   1. Zack Nelson Commentary Caption Engine:
 *      - Sleek YouTube-style dark subtitle pill with amber #F5A623 accents.
 *      - Priority-queued quips triggered on damage stages, orientation flips, countdown, and terminal events.
 *      - Includes iconic lines:
 *        * "Glass is glass, and glass breaks."
 *        * "Scratches at a level 2 with deeper grooves at a level 3."
 *        * "And the inner display gives us the green line of death."
 *        * "$1,499 out-of-warranty inner display repair."
 *   2. Post-Run Durability Report Card:
 *      - Metrics breakdown: Snap/survival time, max bend angle (°), peak CPS, total taps.
 *      - Out-of-warranty itemized Apple repair invoice ($1,499 inner display, $299 hinge, $199 frame, $101 battery hazard = $1,899+).
 *      - Durability grade badge (S, A+, B, C, D, F) with clinical verdict.
 *   3. 1-Click High-Resolution 1200x630px Summary Card Canvas Generator & PNG Download.
 *   4. 1-Click "Share on X" (Twitter) Intent Flow with Dynamic URL Detection:
 *      - Dynamically resolves window.location.href with clean fallback to https://www.frankonedigital.com/bend-test.
 *   5. Universal Module Definition (UMD) conforming to window.JRE.UI, window.JRE.Captions, and window.JRE.Report.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js CommonJS
    const ui = factory();
    module.exports = ui;
    module.exports.UI = ui;
    module.exports.Captions = ui.Captions;
    module.exports.Report = ui.Report;
  } else {
    // Browser global
    root.JRE = root.JRE || {};
    const ui = factory();
    root.JRE.UI = ui;
    root.JRE.ui = ui; // alias
    root.JRE.Captions = ui.Captions;
    root.JRE.Report = ui.Report;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this), function () {
  'use strict';

  // =========================================================================
  // 1. ZACK NELSON AUTHENTIC COMMENTARY DATABASE
  // =========================================================================

  const QUIPS = {
    // Idle / Pre-run / Tier Select
    IDLE: [
      "Today we have the folding iPhone Duo on the channel.",
      "Thumbs firmly placed on the back glass. Don't try this at home.",
      "Let's see if the hinge will survive.",
      "Standard folding hinge... let's give it the bend test.",
      "A little sand in the hinge never hurt anyone... or did it?",
      "Reinforced titanium. Apple claims it's their strongest yet. We'll see about that.",
      "Now we have the Samsung Galaxy Z Fold 8. Seven generations of Armor FlexHinge refinement... let's see if it survives."
    ],

    // Countdown phase
    COUNTDOWN: [
      "Let's bend it backwards and see what happens.",
      "Three, two, one... maximum thumb pressure.",
      "Remember: thumbs in the center, fingers wrapping the frame."
    ],

    // Stage 1: Initial Elastic Flex (1% - 24% damage)
    STAGE_1: [
      "There's a little bit of flex in the chassis, but it's holding together.",
      "You can hear the internal adhesive creaking already.",
      "A normal phone shouldn't flex this much in your pocket.",
      "Initial resistance is stiff, but the aluminum is yielding."
    ],

    // Stage 2: Plastic Deformation (25% - 49% damage)
    STAGE_2: [
      "Scratches at a level 2 with deeper grooves at a level 3.",
      "The aluminum frame is starting to permanently warp.",
      "The back glass is slightly separating from the midframe.",
      "That creaking sound is definitely not covered under AppleCare."
    ],

    // Stage 3: OLED Glitch / Green Line (50% - 74% damage)
    STAGE_3: [
      "And the inner display gives us the green line of death.",
      "A bright vertical magenta line just appeared straight down the crease.",
      "The touch digitizer has stopped responding on the right panel.",
      "OLED pixels are bleeding out like a cheap pen."
    ],

    // Stage 4: Structural Buckling & Glass Cracking (75% - 99% damage)
    STAGE_4: [
      "Glass is glass, and glass breaks.",
      "The back glass has completely spiderwebbed under my thumbs.",
      "The structural integrity has officially left the chat.",
      "I can see the lithium battery pouch through the seam. No smoke yet."
    ],

    // Stage 5: Catastrophic Snap (100% damage failure)
    STAGE_5: [
      "$1,499 out-of-warranty inner display repair.",
      "The display has failed, but the chassis is still holding together.",
      "The folding display has failed under the strain.",
      "The display needs replacing, even though the frame is still connected."
    ],

    // Survival / Timeout (< 100% damage when timer runs out)
    SURVIVAL: [
      "Surprisingly, the iPhone Duo survives to bend another day.",
      "It's bowed like a banana, but the display still turns on.",
      "Not today, gravity. The hinge lives to see tomorrow.",
      "A little flex in the chassis, but it's holding together."
    ],

    // Orientation warnings
    FRONT_BEND: [
      "Front bend: The hinge locks out in this direction. Turn it around to test the spine.",
      "Inward bend: The hinge mechanism resists with mechanical stops."
    ],
    REVERSE_BEND: [
      "Reverse bend: Bending backwards against the hinge... maximum vulnerability.",
      "Let's bend it backwards against the hinge and see what happens."
    ]
  };

  // =========================================================================
  // 2. DYNAMIC URL DETECTION & X SHARE HELPERS
  // =========================================================================

  const FALLBACK_PRODUCTION_URL = 'https://www.frankonedigital.com/bend-test';

  /**
   * Resolves the canonical share URL:
   * Uses window.location.href when live on a valid public domain,
   * falling back to https://www.frankonedigital.com/bend-test for localhost/file://.
   */
  function getResolvedShareUrl() {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const origin = window.location.origin;
      if (origin.startsWith('http://') || origin.startsWith('https://')) {
        if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
          const cleanUrl = window.location.href.split('?')[0].split('#')[0];
          if (cleanUrl && cleanUrl.length > 5) {
            return cleanUrl;
          }
        }
      }
    }
    return FALLBACK_PRODUCTION_URL;
  }

  // =========================================================================
  // 3. REPAIR BILL & DURABILITY METRICS CALCULATOR
  // =========================================================================

  /**
   * Calculates itemized Apple out-of-warranty repair bill based on damage thresholds.
   * Matches survey and engine specification:
   *   - Inner folding OLED screen: $1,499 (at >= 50% damage or snap)
   *   - Dual-cam micro-gear Hinge: $299 (at >= 75% damage or snap)
   *   - Precision Frame chassis: $199 (at >= 25% damage or snap)
   *   - Hazardous Lithium Battery: $101 (at >= 100% snap or catastrophic rupture)
   *   Total on snap: $1,499 + $299 + $199 + $101 = $2,098 ($1,899+ benchmark)
   */
  function calculateRepairBill(damagePct = 0, survived = true) {
    const damage = Math.max(0, Math.min(100, Number(damagePct) || 0));
    const isSnapped = !survived || damage >= 100.0;

    let frameAlignment = (damage >= 25.0 || isSnapped) ? 199 : 0;
    let innerDisplay = (damage >= 50.0 || isSnapped) ? 1499 : 0;
    let hingeAssembly = (damage >= 75.0 || isSnapped) ? 299 : 0;
    let batteryHazard = (damage >= 100.0 || isSnapped) ? 101 : 0;

    if (damage <= 0 && survived) {
      innerDisplay = 0;
      hingeAssembly = 0;
      frameAlignment = 0;
      batteryHazard = 0;
    }

    const totalBill = innerDisplay + hingeAssembly + frameAlignment + batteryHazard;

    return {
      innerDisplay,
      screenCost: innerDisplay,
      hingeAssembly,
      hingeCost: hingeAssembly,
      frameAlignment,
      frameCost: frameAlignment,
      batteryHazard,
      batteryCost: batteryHazard,
      totalBill,
      currency: '$',
      currencySymbol: '$',
      outOfWarranty: true,
      formattedTotal: `$${totalBill.toLocaleString('en-US')}`
    };
  }

  /**
   * Evaluates durability letter grade and clinical verdict.
   */
  function calculateDurabilityGrade(data = {}) {
    const survived = data.survived !== undefined ? Boolean(data.survived) : true;
    const snapTime = data.snapTime !== null && data.snapTime !== undefined ? parseFloat(data.snapTime) : null;
    const maxBendAngle = Number(data.maxBendAngle) || 0;
    const damagePct = Number(data.damagePct) || 0;

    let grade = 'A+';
    let verdict = 'ZACK-PROOF CHASSIS';
    let description = 'Chassis held together with zero catastrophic structural failure.';

    if (!survived) {
      if (snapTime !== null && snapTime < 4.0) {
        grade = 'F';
        verdict = 'RAPID DISPLAY FAILURE';
        description = 'The display failed in under 4 seconds; the chassis stayed connected.';
      } else if (snapTime !== null && snapTime < 8.0) {
        grade = 'D-';
        verdict = 'DISPLAY FAILURE';
        description = 'The display failed under sustained bending; the chassis stayed connected.';
      } else {
        grade = 'D';
        verdict = 'DISPLAY FAILURE';
        description = 'The folding display failed while the chassis stayed connected.';
      }
    } else {
      if (maxBendAngle > 30 || damagePct >= 75) {
        grade = 'C';
        verdict = 'PERMANENTLY BOWED BANANA';
        description = 'Chassis severely bowed; display flickers but survived.';
      } else if (maxBendAngle > 20 || damagePct >= 25) {
        grade = 'B';
        verdict = 'CREAKED & BRUISED';
        description = 'Frame permanently creased; internal adhesive fractured.';
      } else {
        grade = 'A+';
        verdict = 'TITANIUM SURVIVOR';
        description = 'Uncompromising rigidity. The folding hinge defeated the bend test.';
      }
    }

    return { grade, verdict, description };
  }

  // =========================================================================
  // 4. CAPTION ENGINE (YOUTUBE-STYLE SUBTITLE PILL)
  // =========================================================================

  class CaptionEngine {
    constructor(elementOrSelector = null) {
      this.el = null;
      this.selector = elementOrSelector || '#caption-container';
      this.currentQuip = null;
      this.currentPriority = 0;
      this.dismissTimer = null;
      this.recentHistory = [];
      this.historyCapacity = 8;

      if (typeof document !== 'undefined') {
        this._resolveElement();
      }
    }

    _resolveElement() {
      if (typeof document === 'undefined') return null;

      if (typeof this.selector === 'string') {
        this.el = document.querySelector(this.selector);
        if (!this.el) {
          // Check common alternate selectors
          this.el = document.getElementById('caption-container') ||
                    document.getElementById('caption-pill') ||
                    document.getElementById('subtitles') ||
                    document.querySelector('.caption-pill');
        }
      } else if (this.selector && typeof this.selector === 'object') {
        this.el = this.selector;
      }
      return this.el;
    }

    /**
     * Triggers a quip from a category or explicit text.
     * Priorities:
     *   0 = Ambient / Idle
     *   1 = Stage progression (Stages 1-2)
     *   2 = Milestone damage (Stage 3 OLED line, Stage 4 Glass cracks)
     *   3 = Terminal events (Snap, Survival, Orientation Flip)
     */
    trigger(categoryOrStage, priority = 1, explicitText = null) {
      let text = explicitText;

      if (!text) {
        let pool = [];
        if (typeof categoryOrStage === 'number') {
          const stageMap = {
            1: QUIPS.STAGE_1,
            2: QUIPS.STAGE_2,
            3: QUIPS.STAGE_3,
            4: QUIPS.STAGE_4,
            5: QUIPS.STAGE_5
          };
          pool = stageMap[categoryOrStage] || QUIPS.STAGE_1;
        } else if (typeof categoryOrStage === 'string') {
          const catKey = categoryOrStage.toUpperCase();
          pool = QUIPS[catKey] || QUIPS[categoryOrStage] || [];
        }

        if (pool && pool.length > 0) {
          // Filter recently displayed to prevent repetition
          const unplayed = pool.filter(q => !this.recentHistory.includes(q));
          const candidates = unplayed.length > 0 ? unplayed : pool;
          text = candidates[Math.floor(Math.random() * candidates.length)];
        }
      }

      if (!text) return;

      this.recentHistory.push(text);
      if (this.recentHistory.length > this.historyCapacity) {
        this.recentHistory.shift();
      }

      this.display(text, priority);
    }

    /**
     * Directly displays text in the caption subtitle pill.
     */
    display(text, priority = 1, durationMs = null) {
      if (!text) return;
      if (this.currentPriority > priority && this.currentQuip) {
        return; // Higher priority quip is currently active
      }

      this.currentQuip = text;
      this.currentPriority = priority;

      if (this.dismissTimer) {
        clearTimeout(this.dismissTimer);
        this.dismissTimer = null;
      }

      const el = this._resolveElement();
      if (el) {
        // Construct authentic YouTube-style subtitle pill HTML with amber #F5A623 accent
        const speakerHtml = '<span class="speaker-tag" style="color: #F5A623; font-weight: 700; margin-right: 6px;">[JerryRigEverything]:</span>';
        const quoteHtml = `<span class="quip-text" style="color: #FFFFFF; font-weight: 500;">&ldquo;${text}&rdquo;</span>`;

        if (el.innerHTML !== undefined) {
          el.innerHTML = `${speakerHtml} ${quoteHtml}`;
        } else if (el.textContent !== undefined) {
          el.textContent = `[JerryRigEverything]: "${text}"`;
        }

        if (el.classList && el.classList.add) {
          el.classList.add('active');
        }

        const visibleDuration = durationMs || Math.max(2800, text.length * 65);
        this.dismissTimer = setTimeout(() => {
          if (el.classList && el.classList.remove) {
            el.classList.remove('active');
          }
          this.currentQuip = null;
          this.currentPriority = 0;
        }, visibleDuration);
      }
    }

    /**
     * Clears any active caption immediately.
     */
    clear() {
      if (this.dismissTimer) {
        clearTimeout(this.dismissTimer);
        this.dismissTimer = null;
      }
      this.currentQuip = null;
      this.currentPriority = 0;
      const el = this._resolveElement();
      if (el && el.classList && el.classList.remove) {
        el.classList.remove('active');
      }
    }
  }

  // Singleton caption engine instance
  const captionEngine = new CaptionEngine();

  // =========================================================================
  // 5. HIGH-RESOLUTION SUMMARY CARD CANVAS GENERATOR (1200 x 630 px)
  // =========================================================================

  /**
   * Renders the complete 1200x630 high-resolution Durability Report Card to an offscreen Canvas.
   * Tailored for OpenGraph and Twitter summary_large_image preview standards.
   */
  function renderReportCardCanvas(metrics = {}) {
    const canvas = (typeof document !== 'undefined' && document.createElement) ?
                   document.createElement('canvas') :
                   { width: 1200, height: 630, getContext: () => null };

    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return canvas;

    const survived = metrics.survived !== undefined ? Boolean(metrics.survived) : false;
    const snapTimeStr = metrics.snapTime ? `${metrics.snapTime}s` : 'Survived (15.0s)';
    const maxBendAngle = metrics.maxBendAngle !== undefined ? metrics.maxBendAngle : 90;
    const peakCps = metrics.peakCps !== undefined ? metrics.peakCps : '0.0';
    const totalTaps = metrics.totalTaps !== undefined ? metrics.totalTaps : 0;
    const tierName = metrics.tierName || 'Standard iPhone Duo';
    const bill = metrics.billBreakdown || calculateRepairBill(metrics.damagePct || (survived ? 40 : 100), survived);
    const gradeObj = calculateDurabilityGrade({
      survived,
      snapTime: metrics.snapTime,
      maxBendAngle,
      damagePct: metrics.damagePct
    });
    const grade = metrics.grade || gradeObj.grade;
    const verdict = metrics.verdict || gradeObj.verdict;

    // 1. Dark Cutting-Mat Background (#0B1219)
    ctx.fillStyle = '#0B1219';
    ctx.fillRect(0, 0, 1200, 630);

    // 2. Self-Healing Cutting Mat 40px Grid Pattern
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 1200; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 630);
      ctx.stroke();
    }
    for (let y = 0; y <= 630; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }

    // Centered workbench crosshair markers
    ctx.strokeStyle = 'rgba(245, 166, 35, 0.25)';
    ctx.lineWidth = 1.5;
    for (let cx = 200; cx <= 1000; cx += 200) {
      for (let cy = 150; cy <= 450; cy += 150) {
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy);
        ctx.lineTo(cx + 10, cy);
        ctx.moveTo(cx, cy - 10);
        ctx.lineTo(cx, cy + 10);
        ctx.stroke();
      }
    }

    // 3. Iconic Top Amber Accent Bar (#F5A623)
    ctx.fillStyle = '#F5A623';
    ctx.fillRect(0, 0, 1200, 8);

    // 4. Header Bar
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#F5A623';
    ctx.textAlign = 'left';
    ctx.fillText('JERRYRIGEVERYTHING // DURABILITY REPORT CARD', 50, 52);

    ctx.font = '600 18px monospace, monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'right';
    const isSamsungCard = (metrics.tierId === 'titanium') || (tierName && tierName.toLowerCase().includes('fold')) || (metrics.deviceBrand === 'Samsung');
    const cardDeviceLabel = isSamsungCard ? 'SAMSUNG GALAXY Z FOLD 8 [HARD]' : `iPHONE DUO [${tierName.toUpperCase()}]`;
    ctx.fillText(`DEVICE: ${cardDeviceLabel}`, 1150, 52);
    ctx.textAlign = 'left';

    // Header divider
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(50, 72);
    ctx.lineTo(1150, 72);
    ctx.stroke();

    // 5. Left Column: Schematic of the connected folding phone
    ctx.save();
    const phoneX = 80;
    const phoneY = 105;
    const phoneW = 440;
    const phoneH = 340;

    // Phone container backing
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    if (ctx.roundRect) ctx.roundRect(phoneX, phoneY, phoneW, phoneH, 16);
    else ctx.fillRect(phoneX, phoneY, phoneW, phoneH);
    ctx.fill();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.stroke();

    // A connected chassis with a visible central folding crease.
    const centerX = phoneX + phoneW / 2;
    const centerY = phoneY + phoneH / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-150, -110, 300, 220, 16);
    else ctx.rect(-150, -110, 300, 220);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(245, 166, 35, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -110);
    ctx.lineTo(0, 110);
    ctx.stroke();
    ctx.restore();

    // OLED Green line of death down crease if damaged >= 50%
    if (!survived || metrics.damagePct >= 50) {
      ctx.save();
      ctx.strokeStyle = '#00FF66';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00FF66';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(centerX - 3, phoneY + 40);
      ctx.lineTo(centerX - 3, phoneY + phoneH - 40);
      ctx.stroke();

      // Magenta companion artifact
      ctx.strokeStyle = '#FF0099';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#FF0099';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(centerX + 4, phoneY + 50);
      ctx.lineTo(centerX + 4, phoneY + phoneH - 50);
      ctx.stroke();
      ctx.restore();
    }

    // Spiderweb glass cracks if damage >= 75%
    if (!survived || metrics.damagePct >= 75) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      const crackCenterY = centerY + 10;
      ctx.beginPath();
      ctx.moveTo(centerX, crackCenterY);
      ctx.lineTo(centerX - 60, crackCenterY - 45);
      ctx.moveTo(centerX, crackCenterY);
      ctx.lineTo(centerX + 70, crackCenterY - 30);
      ctx.moveTo(centerX, crackCenterY);
      ctx.lineTo(centerX - 50, crackCenterY + 55);
      ctx.moveTo(centerX, crackCenterY);
      ctx.lineTo(centerX + 65, crackCenterY + 40);
      ctx.stroke();
    }

    // Zack Nelson quote box below phone schematic
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.strokeStyle = '#F5A623';
    ctx.lineWidth = 1.5;
    if (ctx.roundRect) ctx.roundRect(phoneX, 465, phoneW, 85, 12);
    else ctx.fillRect(phoneX, 465, phoneW, 85);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#F5A623';
    ctx.fillText('[JerryRigEverything]:', phoneX + 20, 495);

    ctx.font = 'italic 17px system-ui, sans-serif';
    ctx.fillStyle = '#F8FAFC';
    const quoteText = !survived ? '"Glass is glass, and glass breaks."' : '"A little flex in the chassis, but it held together."';
    ctx.fillText(quoteText, phoneX + 20, 525);
    ctx.restore();

    // 6. Right Column: Metrics & Itemized Repair Bill
    const rightX = 570;

    // Durability Grade Badge
    const badgeColor = survived ? '#10B981' : '#EF4444';
    ctx.fillStyle = badgeColor;
    if (ctx.roundRect) ctx.roundRect(rightX, 105, 115, 100, 16);
    else ctx.fillRect(rightX, 105, 115, 100);
    ctx.fill();

    ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(grade, rightX + 57, 180);
    ctx.textAlign = 'left';

    // Verdict Headline & Subtitle
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(verdict, rightX + 135, 142);

    ctx.font = '500 17px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(survived ? 'Survived bend test with structural resistance' : 'Display failed; chassis remains connected', rightX + 135, 178);

    // Metrics Table Rows
    const metricsData = [
      { label: 'Time to Failure / Duration:', val: snapTimeStr },
      { label: 'Maximum Bend Angle:', val: `${Math.round(maxBendAngle)}°` },
      { label: 'Peak Mash Speed:', val: `${peakCps} CPS` },
      { label: 'Total Mash Inputs:', val: `${totalTaps} taps` }
    ];

    let rowY = 245;
    metricsData.forEach(row => {
      ctx.font = '17px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(row.label, rightX, rowY);

      ctx.font = 'bold 20px monospace, monospace';
      ctx.fillStyle = '#F8FAFC';
      ctx.textAlign = 'right';
      ctx.fillText(row.val, 1150, rowY);
      ctx.textAlign = 'left';

      rowY += 34;
    });

    // Itemized Apple Repair Bill Box
    const billBoxY = 385;
    const billBoxH = 165;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.10)';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 1.5;
    if (ctx.roundRect) ctx.roundRect(rightX, billBoxY, 580, billBoxH, 14);
    else ctx.fillRect(rightX, billBoxY, 580, billBoxH);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FCA5A5';
    ctx.fillText('ESTIMATED APPLE OUT-OF-WARRANTY REPAIR INVOICE:', rightX + 24, billBoxY + 32);

    ctx.font = 'bold 44px monospace, monospace';
    ctx.fillStyle = '#EF4444';
    ctx.fillText(`$${bill.totalBill.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, rightX + 24, billBoxY + 84);

    // Itemized breakdown line items
    ctx.font = '13px monospace, monospace';
    ctx.fillStyle = '#CBD5E1';
    const breakdownText = `$1,499 Inner OLED • $299 Hinge • $199 Frame • $101 Battery Hazard`;
    ctx.fillText(breakdownText, rightX + 24, billBoxY + 118);

    ctx.font = 'italic 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('* AppleCare+ does not cover intentional JerryRigEverything bend tests.', rightX + 24, billBoxY + 144);

    // 7. Footer Bar
    ctx.fillStyle = '#080E14';
    ctx.fillRect(0, 585, 1200, 45);

    ctx.font = '600 15px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('TESTED AT: www.frankonedigital.com/bend-test   •   #iPhoneDuoBendTest', 50, 613);

    ctx.textAlign = 'right';
    ctx.fillText('JERRYRIGEVERYTHING DURABILITY ARCADE', 1150, 613);
    ctx.textAlign = 'left';

    return canvas;
  }

  // =========================================================================
  // 6. 1-CLICK PNG DOWNLOAD PIPELINE
  // =========================================================================

  /**
   * Converts the report card canvas into a high-res PNG file and initiates browser download.
   */
  function downloadReportPng(canvas, metrics = {}) {
    if (!canvas) return;

    const tierClean = (metrics.tierName || 'iPhone-Duo').replace(/\s+/g, '-');
    const grade = metrics.grade || 'Result';
    const filename = `iPhone-Duo-Durability-Report-${tierClean}-${grade}.png`;

    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(blob => {
        if (!blob) return;
        let url = null;
        try {
          if (typeof URL !== 'undefined' && URL.createObjectURL) {
            url = URL.createObjectURL(blob);
          }
        } catch (e) {
          if (typeof canvas.toDataURL === 'function') {
            url = canvas.toDataURL('image/png');
          }
        }
        if (!url && typeof canvas.toDataURL === 'function') {
          url = canvas.toDataURL('image/png');
        }
        if (url && typeof document !== 'undefined') {
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          if (document.body && document.body.appendChild) {
            document.body.appendChild(link);
            if (link.click) link.click();
            document.body.removeChild(link);
            if (typeof URL !== 'undefined' && URL.revokeObjectURL && url.startsWith('blob:')) {
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
          }
        }
      }, 'image/png');
    } else if (typeof canvas.toDataURL === 'function') {
      const dataUrl = canvas.toDataURL('image/png');
      if (typeof document !== 'undefined') {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        if (document.body && document.body.appendChild) {
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    }
  }

  // =========================================================================
  // 7. 1-CLICK SHARE ON X (TWITTER) INTENT FLOW
  // =========================================================================

  /**
   * Constructs pre-populated X Web Intent URL with formatted score, metrics, quote, and URL.
   */
  function generateTwitterShareUrl(metrics = {}, targetUrlOverride = null) {
    const shareUrl = targetUrlOverride || getResolvedShareUrl();
    const survived = metrics.survived !== undefined ? Boolean(metrics.survived) : false;
    const snapTimeStr = metrics.snapTime ? `${metrics.snapTime}s` : '15.0s';
    const maxBendAngleStr = `${Math.round(metrics.maxBendAngle || 0)}°`;
    const peakCpsStr = `${metrics.peakCps || '0.0'} CPS`;
    const bill = metrics.billBreakdown || calculateRepairBill(metrics.damagePct || 100, survived);
    const grade = metrics.grade || (survived ? 'A+' : 'F');
    const verdict = metrics.verdict || (survived ? 'TITANIUM SURVIVOR' : 'DISPLAY FAILURE');

    let tweetText = '';
    if (!survived) {
      tweetText = `I caused the folding iPhone Duo display to fail in ${snapTimeStr} (${peakCpsStr}) in the JerryRigEverything Bend Test! 📱💥\n\n` +
        `📐 Max Bend: ${maxBendAngleStr}\n` +
        `💸 Apple Repair Bill: $${bill.totalBill.toLocaleString('en-US')}\n` +
        `🏆 Grade: ${grade} - ${verdict}\n\n` +
        `"Glass is glass, and glass breaks."\n\n` +
        `Can you make the display fail faster? Test here:`;
    } else {
      tweetText = `The folding iPhone Duo SURVIVED my bend test! 🛡️📱\n\n` +
        `📐 Max Bend: ${maxBendAngleStr}\n` +
        `⚡ Peak Speed: ${peakCpsStr}\n` +
        `🏆 Grade: ${grade} - ${verdict}\n\n` +
        `"A little flex in the chassis, but it's holding together."\n\n` +
        `Can you make the display fail? Try it:`;
    }

    return `https://twitter.com/intent/tweet?` +
      `text=${encodeURIComponent(tweetText)}` +
      `&url=${encodeURIComponent(shareUrl)}` +
      `&hashtags=${encodeURIComponent('iPhoneDuo,JerryRigEverything,BendTest')}`;
  }

  /**
   * Opens the X sharing modal window centered on screen.
   */
  function openTwitterShare(metrics = {}, targetUrlOverride = null) {
    const intentUrl = generateTwitterShareUrl(metrics, targetUrlOverride);

    if (typeof window !== 'undefined' && window.open) {
      const popupWidth = 580;
      const popupHeight = 480;
      const left = typeof window.screenX !== 'undefined' ?
                   Math.max(0, (window.innerWidth - popupWidth) / 2 + window.screenX) : 100;
      const top = typeof window.screenY !== 'undefined' ?
                  Math.max(0, (window.innerHeight - popupHeight) / 2 + window.screenY) : 100;

      window.open(
        intentUrl,
        'share_x',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );
    }

    return intentUrl;
  }

  // =========================================================================
  // 8. DURABILITY REPORT CARD MODAL DOM CONTROLLER
  // =========================================================================

  /**
   * Updates and displays the HTML Durability Report Card modal.
   */
  function showReportCard(metrics = {}, options = {}) {
    if (typeof document === 'undefined') return;

    const modal = document.getElementById('report-card-modal') ||
                  document.querySelector('.report-card-modal') ||
                  document.getElementById('report-modal');

    const survived = metrics.survived !== undefined ? Boolean(metrics.survived) : false;
    const bill = metrics.billBreakdown || calculateRepairBill(metrics.damagePct || 100, survived);
    const gradeObj = calculateDurabilityGrade({
      survived,
      snapTime: metrics.snapTime,
      maxBendAngle: metrics.maxBendAngle,
      damagePct: metrics.damagePct
    });

    const grade = metrics.grade || gradeObj.grade;
    const verdict = metrics.verdict || gradeObj.verdict;

    // Helper to safely populate textContent
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };

    setText('report-grade', grade);
    setText('report-verdict', verdict);
    setText('report-snap-time', metrics.snapTime ? `${metrics.snapTime}s` : 'Survived (15.0s)');
    setText('report-bend-angle', `${Math.round(metrics.maxBendAngle || 0)}°`);
    setText('report-peak-cps', `${metrics.peakCps || '0.0'} CPS`);
    setText('report-total-taps', `${metrics.totalTaps || 0}`);
    setText('report-total-bill', `$${bill.totalBill.toLocaleString('en-US')}`);

    // Dynamically tailor repair invoice labels for AppleCare+ (iPhone Duo) vs Samsung Care+ (Galaxy Z Fold 8)
    const isSamsung = (metrics.tierId === 'titanium') || (metrics.deviceBrand === 'Samsung') || (metrics.displayName && metrics.displayName.includes('Samsung'));
    if (isSamsung) {
      setText('report-invoice-title', 'Samsung Care+ Out-of-Warranty Repair Invoice');
      setText('report-label-screen', 'Dynamic AMOLED 2X Inner Folding Display');
      setText('report-label-hinge', 'Dual-Rail Armor FlexHinge Assembly');
      setText('report-label-frame', 'Armor Aluminum & Titanium Frame Alignment');
      setText('report-label-battery', 'Dual-Cell Lithium Battery Hazard Disposal');
    } else {
      setText('report-invoice-title', 'AppleCare+ Out-of-Warranty Repair Invoice');
      setText('report-label-screen', 'Inner Folding OLED Display Assembly');
      setText('report-label-hinge', 'Dual-Axis Micro-Gear Hinge Mechanism');
      setText('report-label-frame', 'Titanium Midframe Realignment');
      setText('report-label-battery', 'Lithium Battery Pouch Hazard Disposal');
    }

    // Populate itemized invoice fields
    setText('report-bill-screen', `$${bill.innerDisplay.toLocaleString('en-US')}`);
    setText('report-bill-hinge', `$${bill.hingeAssembly.toLocaleString('en-US')}`);
    setText('report-bill-frame', `$${bill.frameAlignment.toLocaleString('en-US')}`);
    setText('report-bill-battery', `$${bill.batteryHazard.toLocaleString('en-US')}`);

    // Generate high-res canvas card
    const offscreenCanvas = renderReportCardCanvas(metrics);

    // Wire Download PNG button
    const downloadBtn = document.getElementById('btn-download-png') ||
                        document.getElementById('btn-report-download') ||
                        document.querySelector('.btn-download-png');
    if (downloadBtn) {
      downloadBtn.onclick = () => downloadReportPng(offscreenCanvas, metrics);
    }

    // Wire Share on X button
    const shareBtn = document.getElementById('btn-share-x') ||
                     document.getElementById('btn-report-share') ||
                     document.querySelector('.btn-share-x');
    if (shareBtn) {
      shareBtn.onclick = () => openTwitterShare(metrics);
    }

    // Wire Retry / Test Again button
    const retryBtn = document.getElementById('btn-retry') ||
                     document.getElementById('btn-report-retry') ||
                     document.querySelector('.btn-retry');
    if (retryBtn && typeof options.onRetry === 'function') {
      retryBtn.onclick = () => {
        hideReportCard();
        options.onRetry();
      };
    }

    if (modal) {
      if (modal.classList && modal.classList.remove) modal.classList.remove('hidden');
      if (modal.classList && modal.classList.add) modal.classList.add('active');
      modal.style = modal.style || {};
      modal.style.display = 'flex';
    }
  }

  /**
   * Hides the Durability Report Card modal.
   */
  function hideReportCard() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('report-card-modal') ||
                  document.querySelector('.report-card-modal') ||
                  document.getElementById('report-modal');
    if (modal) {
      if (modal.classList && modal.classList.add) modal.classList.add('hidden');
      if (modal.classList && modal.classList.remove) modal.classList.remove('active');
      modal.style = modal.style || {};
      modal.style.display = 'none';
    }
  }

  // =========================================================================
  // 9. PUBLIC API EXPORT & UMD NAMESPACE MAPPING
  // =========================================================================

  const api = {
    // Quip database
    QUIPS,

    // Subtitle & Caption Engine
    Captions: captionEngine,
    captionEngine,
    showCaption: (text, priority, duration) => captionEngine.display(text, priority, duration),
    triggerQuip: (cat, priority, explicitText) => captionEngine.trigger(cat, priority, explicitText),
    clearCaption: () => captionEngine.clear(),

    // Durability Report & Virality Subsystem
    Report: {
      calculateRepairBill,
      calculateDurabilityGrade,
      renderReportCardCanvas,
      renderCanvas: renderReportCardCanvas,
      downloadReportPng,
      downloadPng: downloadReportPng,
      generateTwitterShareUrl,
      getShareUrl: generateTwitterShareUrl,
      openTwitterShare,
      shareOnX: openTwitterShare,
      showReportCard,
      hideReportCard,
      getResolvedShareUrl
    },

    // Top-Level Convenience Aliases
    calculateRepairBill,
    calculateDurabilityGrade,
    renderReportCardCanvas,
    downloadReportPng,
    generateTwitterShareUrl,
    openTwitterShare,
    showReportCard,
    hideReportCard,
    getResolvedShareUrl
  };

  return api;
});
