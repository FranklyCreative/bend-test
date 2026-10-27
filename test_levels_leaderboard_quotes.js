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

console.log('All 5 foldable levels, Top 10 High Score Leaderboard, and audible 5laDGy4INB0 quotes verified.');
