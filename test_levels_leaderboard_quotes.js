'use strict';
const assert = require('assert');
const Engine = require('./js/engine');
const Renderer = require('./js/canvas');
const Audio = require('./js/audio');
const UI = require('./js/ui');

// 1. Verify all 5 foldable smartphone levels in Engine and Renderer
const expectedLevels = [
  { num: 1, id: 'standard', model: 'iPhone Duo' },
  { num: 2, id: 'dust', model: 'iPhone Duo (Dust-Jammed)' },
  { num: 3, id: 'titanium', model: 'Samsung Galaxy Z Fold 8' },
  { num: 4, id: 'pixel', model: 'Google Pixel 10 Pro Fold' },
  { num: 5, id: 'trifold', model: 'Huawei Mate XT Tri-Fold' }
];

const engine = new Engine({ interactiveAssist: true, runDuration: 25, enableAudio: false, enableHaptics: false });
const renderer = new Renderer(null, { enableParticles: true });

for (const lvl of expectedLevels) {
  engine.setTier(lvl.id);
  assert.strictEqual(engine.currentTier.id, lvl.id, `setTier(${lvl.id}) must select ${lvl.id}`);
  assert.strictEqual(engine.currentTier.deviceModel, lvl.model, `deviceModel for ${lvl.id} must be ${lvl.model}`);
  engine.setTier(lvl.num);
  assert.strictEqual(engine.currentTier.id, lvl.id, `setTier(${lvl.num}) must select ${lvl.id}`);
  const card = renderer.renderOffscreenCard({
    tier: engine.currentTier,
    damagePct: 80,
    bendAngleDeg: 28,
    survived: false
  });
  assert.strictEqual(card.width, 1200);
  assert.strictEqual(card.height, 630);
}

// 2. Verify 5-level progression & unlockAll support
const memStore = new Map();
const storage = {
  getItem: k => memStore.get(k) ?? null,
  setItem: (k, v) => memStore.set(k, v)
};
const prog5 = UI.createProgression(storage, ['standard', 'dust', 'titanium', 'pixel', 'trifold']);
assert.strictEqual(prog5.getTiers().length, 5, '5-tier progression must track all 5 foldable phones');
assert(prog5.isUnlocked('standard') && !prog5.isUnlocked('trifold'));
prog5.unlockAll();
assert(prog5.isUnlocked('pixel') && prog5.isUnlocked('trifold'), 'unlockAll must unlock all 5 foldable levels');

// 3. Verify Top 10 High Score Leaderboard
const lb = UI.createLeaderboard(storage);
const initialTop10 = lb.getTop10('all');
assert.strictEqual(initialTop10.length, 10, 'Leaderboard must provide 10 seeded high scores initially');
assert(initialTop10[0].snapTime <= initialTop10[1].snapTime, 'Top 10 must be sorted by fastest snap time');

const addedFast = lb.addScore({
  name: '@BendMasterX',
  tierId: 'trifold',
  deviceModel: 'Huawei Mate XT Tri-Fold',
  snapTime: 5.12,
  peakCps: 17.8,
  maxBendAngle: 38,
  grade: 'S'
});
assert(addedFast && addedFast.madeTop10, '5.12s snap time must make the Top 10');
assert.strictEqual(addedFast.rank, 1, '5.12s must rank #1 overall');
assert.strictEqual(lb.getTop10('trifold')[0].name, '@BendMasterX', 'Per-device filter must return the new #1 record');

// Reload leaderboard from storage and confirm persistence
const lbReloaded = UI.createLeaderboard(storage);
assert.strictEqual(lbReloaded.getTop10('all')[0].name, '@BendMasterX', 'Leaderboard must persist new #1 score across reloads');

// 4. Verify Expanded Quotes from 5laDGy4INB0 & Audible Speech Integration
const allIdleQuotes = UI.QUIPS.IDLE.join(' ');
assert(allIdleQuotes.includes('nano-texture') && allIdleQuotes.includes('7 years'), 'QUIPS.IDLE must include quotes from iPhone Duo Durability: Destroyed (5laDGy4INB0)');
assert.strictEqual(typeof Audio.speakQuote, 'function', 'Audio module must export speakQuote for audible Zack quotes');
assert.strictEqual(typeof Audio.stopSpeech, 'function', 'Audio module must export stopSpeech');

// 5. Verify Interactive Workbench Lab Pre-Tests (Scratch, Burn, Sand) & Overdrive Streak
engine.resetGame();
engine.setTier('standard');
const scratchRes = engine.triggerLabTool('scratch');
assert(scratchRes && scratchRes.applied, 'triggerLabTool("scratch") must apply pre-test damage');
assert(engine.labToolsUsed.scratch, 'labToolsUsed.scratch must be true');
assert(engine.damage >= 3.0 && scratchRes.damagePct >= 3.0, 'Scratch test must add pre-weakening damage');
const duplicateScratch = engine.triggerLabTool('scratch');
assert(!duplicateScratch.applied, 'Duplicate scratch test in same run must not double-stack');

const burnRes = engine.triggerLabTool('burn');
const sandRes = engine.triggerLabTool('sand');
assert(burnRes.applied && sandRes.applied, 'Burn and Sand lab tools must apply');
assert.strictEqual(typeof renderer.triggerLabToolVisual, 'function', 'Renderer must export triggerLabToolVisual');
renderer.triggerLabToolVisual('burn');
assert(renderer._burnFlameTimer > 0, 'triggerLabToolVisual("burn") must ignite lighter flame timer');

// 6. Verify Alternating Thumb Overdrive Streak & Telemetry History
engine.resetGame();
engine.startActiveMashing();
for (let i = 0; i < 8; i++) {
  engine.registerTap(i % 2 === 0 ? 'left' : 'right');
  engine.update(0.1);
}
assert(engine.comboStreak >= 6 && engine.overdriveActive, '6+ alternating thumb taps must activate Overdrive Streak');
assert(engine.telemetryHistory.length >= 2, 'Engine must record force/damage telemetry history during active mashing');
assert.strictEqual(UI.getMedalForTime(8.5), '🥇', 'Sub-10s snap time must award Gold Medal');
assert.strictEqual(UI.getMedalForTime(12.5), '🥈', 'Sub-15s snap time must award Silver Medal');
assert.strictEqual(UI.getMedalForTime(19.0), '🥉', 'Sub-25s snap time must award Bronze Medal');

// 7. Verify Dynamic Repair Bill Amounts Across Runs & Handsets, Name Saving, and Input Guard
engine.resetGame();
engine.setTier('standard');
engine.startActiveMashing();
for (let i = 0; i < 40; i++) {
  engine.registerTap(i % 2 === 0 ? 'left' : 'right');
  engine.update(0.05);
}
engine.damage = 100;
engine.survived = false;
engine.snapTime = 7.42;
const stdReport = engine.getReportCardData();

engine.resetGame();
engine.setTier('titanium');
engine.triggerLabTool('scratch');
engine.startActiveMashing();
for (let i = 0; i < 75; i++) {
  engine.registerTap(i % 2 === 0 ? 'left' : 'right');
  engine.update(0.05);
}
engine.damage = 100;
engine.survived = false;
engine.snapTime = 8.95;
const fold8Report = engine.getReportCardData();

engine.resetGame();
engine.setTier('trifold');
engine.triggerLabTool('burn');
engine.triggerLabTool('sand');
engine.startActiveMashing();
for (let i = 0; i < 110; i++) {
  engine.registerTap(i % 2 === 0 ? 'left' : 'right');
  engine.update(0.05);
}
engine.damage = 100;
engine.survived = false;
engine.snapTime = 11.20;
const trifoldReport = engine.getReportCardData();

assert.notStrictEqual(stdReport.billBreakdown.totalBill, fold8Report.billBreakdown.totalBill, 'Repair bill total must change dynamically across different runs and handsets');
assert(trifoldReport.billBreakdown.totalBill > stdReport.billBreakdown.totalBill, 'Huawei Mate XT Tri-Fold catastrophic repair bill must exceed Standard iPhone Duo');

// Verify player name persistence and in-place entry updates on Top 10 Leaderboard
lb.setPlayerName('ChrisF');
assert.strictEqual(lb.getPlayerName(), 'ChrisF', 'Leaderboard must persist player name in storage');
const updatedEntry = lb.updateEntryName(addedFast.entry.id, '@ChrisFrank');
assert(updatedEntry && updatedEntry.name === '@ChrisFrank', 'updateEntryName must update existing Top 10 entry in-place');
assert.strictEqual(lb.getTop10('all')[0].name, '@ChrisFrank', 'Top 10 row #1 must reflect updated player name immediately');
assert.strictEqual(lb.getPlayerName(), '@ChrisFrank', 'updateEntryName must also sync saved playerName');

// Verify keyboard input guard does not hijack keystrokes inside <input> elements
engine.resetGame();
engine.startActiveMashing();
const tapsBeforeInput = engine.totalTaps;
const handledInInput = engine.handleKeyDown({
  code: 'KeyA',
  repeat: false,
  target: { tagName: 'INPUT' },
  preventDefault: () => {}
});
assert.strictEqual(handledInInput, false, 'engine.handleKeyDown must ignore keystrokes inside <input> elements');
assert.strictEqual(engine.totalTaps, tapsBeforeInput, 'Typing inside <input> must not register game taps');

console.log('All 5 foldable levels, Top 10 High Score Leaderboard, audible 5laDGy4INB0 quotes, dynamic cards, and 10 gameplay/graphics improvements verified.');
