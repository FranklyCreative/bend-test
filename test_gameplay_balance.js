'use strict';
// Repeatable live-configuration simulations at realistic and very fast tap rates.
const assert = require('assert');
const Engine = require('./js/engine.js');
function run(tier, cps, alternating = true, duration = 25, horizon = duration) {
  const game = new Engine({ interactiveAssist: true, runDuration: duration, enableAudio: false, enableHaptics: false });
  game.setTier(tier);
  game.startActiveMashing();
  let time = 0, nextTap = 0, taps = 0;
  game._getNow = () => time + 10;
  while (time < horizon && game.state === Engine.STATES.ACTIVE_MASHING) {
    if (time >= nextTap) {
      game.registerTap(alternating && taps % 2 ? 'right' : 'left', 'touch');
      taps++;
      nextTap += 1 / cps;
    }
    game.update(1 / 120);
    time += 1 / 120;
  }
  return game;
}
const moderate = run('standard', 6);
assert(moderate.isSnapped && moderate.snapTime > 20 && moderate.snapTime < 25, 'moderate, sustained play should have a chance within 25 seconds');
const fast = run('standard', 10);
assert(fast.isSnapped && fast.snapTime >= 8 && fast.snapTime <= 12, `10 CPS should win in 8–12 seconds, got ${fast.snapTime}`);
for (const cps of [14, 16, 18, 20]) {
  const veryFast = run('standard', cps);
  assert(veryFast.isSnapped && veryFast.snapTime >= 8, `${cps} CPS should still require sustained effort`);
}
assert(!run('standard', 5).isSnapped, 'casual play should not guarantee a win');
const progress15 = run('standard', 6, true, 25, 15);
const progress20 = run('standard', 6, true, 25, 20);
assert(!progress15.isSnapped && !progress20.isSnapped && progress20.damage > progress15.damage && moderate.isSnapped, '6 CPS should progress over 15 and 20 seconds before winning within 25');
const standard7 = run('standard', 7), dust7 = run('dust', 7);
assert(dust7.isSnapped && dust7.snapTime > standard7.snapTime, 'dust tier should be slower than standard');
assert(!run('titanium', 9).isSnapped && run('titanium', 12).isSnapped, 'titanium should be challenging but winnable');
assert(run('standard', 6).damage > run('standard', 6, false).damage, 'alternating hands should provide a real bonus');
assert(run('standard', 8, false).isSnapped, 'one-hand play should remain winnable');
// A single Space key alternates hands and retains the combo mechanic.
const spaceGame = new Engine({interactiveAssist:true,runDuration:25,enableAudio:false,enableHaptics:false});
let spaceTime = 10; spaceGame._getNow = () => spaceTime; spaceGame.startActiveMashing();
spaceGame.handleKeyDown({code:'Space',repeat:false}); spaceTime += 0.1;
spaceGame.handleKeyDown({code:'Space',repeat:false});
assert.strictEqual(spaceGame.lastTapHand, 'right');
assert(spaceGame.currentComboMultiplier > 1, 'single-key alternating combo must work');
// At the capped force level, resistant orientations must still reduce damage.
function damageAtMaxForce(orientation) {
  const g = new Engine({interactiveAssist:true,runDuration:25,enableAudio:false,enableHaptics:false});
  g.startActiveMashing();
  if (orientation === 'front') g.flipOrientation(true);
  if (orientation === 'folded') g.toggleFold();
  g.force = 100; g.update(0.1); return g.damage;
}
const reverseDamage = damageAtMaxForce('reverse');
assert(damageAtMaxForce('front') < reverseDamage && damageAtMaxForce('folded') < reverseDamage, 'cap must not defeat orientation and fold resistance');
assert.strictEqual(run('standard', 14).getReportCardData().grade, 'S');
assert.strictEqual(fast.getReportCardData().grade, 'A');
assert.strictEqual(moderate.getReportCardData().grade, 'C');
const game = new Engine({ interactiveAssist: true, enableAudio: false, enableHaptics: false });
game.startActiveMashing();
game.forceDamagePct(60);
game.flipOrientation(true);
game.update(0.05);
assert(game.damage >= 60, 'turning the phone over must not heal existing damage');
assert(game.bendAngle <= 38, 'bend angle must remain within the visual range');
// HUD feedback derives from the same yield calculation as damage integration.
const hud = new Engine({interactiveAssist:true,runDuration:25,enableAudio:false,enableHaptics:false});
let hudNow = 10; hud._getNow = () => hudNow;
let snap = hud.getRenderSnapshot();
assert.strictEqual(snap.yieldThreshold, hud.currentTier.yieldThreshold * 0.72);
assert.strictEqual(snap.forceAboveYield, false);
assert.strictEqual(snap.comboActive, false);
hud.startActiveMashing();
hud.force = snap.yieldThreshold + 1;
assert.strictEqual(hud.getRenderSnapshot().forceAboveYield, true);
hud.force = snap.yieldThreshold - 1;
assert.strictEqual(hud.getRenderSnapshot().forceAboveYield, false);
hud.damage = 50;
assert.strictEqual(hud.getRenderSnapshot().yieldThreshold, hud.currentTier.yieldThreshold * 0.72 * 0.75);
hud.registerTap('left', 'keyboard'); hudNow += 0.1;
hud.registerTap('right', 'keyboard');
snap = hud.getRenderSnapshot();
assert(snap.comboActive && snap.comboMultiplier === hud.currentTier.comboBonus);
assert(snap.comboRemainingSec > 0 && snap.comboRemainingSec <= 0.4);
hudNow += 0.41;
assert.strictEqual(hud.getRenderSnapshot().comboActive, false, 'combo feedback expires after the combo window');
hud.registerTap('right', 'keyboard');
assert.strictEqual(hud.getRenderSnapshot().comboActive, false, 'repeated same hand has no bonus');
hud.setTier('titanium');
assert.strictEqual(hud.getRenderSnapshot().yieldThreshold, hud.currentTier.yieldThreshold * 0.72);
assert.strictEqual(hud.getRenderSnapshot().comboActive, false, 'switching tier clears combo feedback');
console.log('25-second pace, 15/20-second progress, fast-tap cap, tier balance, grading and damage persistence checks passed.');
