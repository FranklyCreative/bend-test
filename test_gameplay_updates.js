const assert = require('assert');
const Engine = require('./js/engine');
const UI = require('./js/ui');
const engine = new Engine({runDuration:25,interactiveAssist:true,enableAudio:false,enableHaptics:false});
assert.strictEqual(engine.timeRemaining,25);
engine.startActiveMashing();
engine.registerTap('left','keyboard');
engine.forceDamagePct(60);
engine.setTier('titanium');
assert.strictEqual(engine.state,Engine.STATES.IDLE_SELECT);
assert.strictEqual(engine.currentTier.deviceModel,'Samsung Galaxy Z Fold 8');
assert.strictEqual(engine.damage,0);
assert.strictEqual(engine.force,0);
assert.strictEqual(engine.timeRemaining,25);
const metrics=engine.getReportCardData();
assert.strictEqual(metrics.runDuration,25);
const tweet=decodeURIComponent(UI.generateTwitterShareUrl({...metrics,survived:false,snapTime:'8.0'}));
assert(tweet.includes('Samsung Galaxy Z Fold 8') && !tweet.includes('iPhone Duo'));
// Browser-configured rounds must survive just before 25 seconds and end at 25.
const timed = new Engine({runDuration:25,interactiveAssist:true,enableAudio:false,enableHaptics:false});
timed.startActiveMashing();
for (let i=0; i<249; i++) timed.update(0.1);
assert.strictEqual(timed.state, Engine.STATES.ACTIVE_MASHING, 'round ended before 25 seconds');
assert(timed.timeRemaining > 0 && timed.timeRemaining <= 0.101);
timed.update(0.1);
timed.update(0.001); // Floating-point rounding may leave a sub-microsecond remainder.
assert.strictEqual(timed.state, Engine.STATES.SURVIVAL_FAIL, 'round did not end at 25 seconds');
assert.strictEqual(timed.getReportCardData().runDuration, 25);
const untouched = new Engine({enableAudio:false,enableHaptics:false});
assert.strictEqual(untouched.currentTier.runDuration, 15, 'interactive override must not mutate shared tier data');
console.log('25-second rounds, exact timeout, tier reset and Samsung share text verified.');

