import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSonicCue, SONIC_CUES, OPERATIONAL_STATES, worldAcousticDescriptor } from '../src/wayglass-sonic-score.js';

const validated = (state) => ({ source: 'wayglass-continuity-kernel', validated: true, operational_state: state });

test('every operational state has a mono-compatible defined cue', () => {
  for (const state of OPERATIONAL_STATES) {
    assert.equal(SONIC_CUES[state].mono_safe, true);
    assert.equal(selectSonicCue(validated(state), 'enabled').cue.id, state);
  }
});
test('intentional silence is distinct from playback error and unavailable audio', () => {
  for (const audio of ['silent', 'unavailable', 'error']) {
    const result = selectSonicCue(validated('full'), audio);
    assert.equal(result.kind, audio);
    assert.equal(result.cue, null);
  }
});
test('validation failed never plays the success motif', () => {
  assert.equal(selectSonicCue(validated('validation-failed'), 'enabled').cue.id, 'validation-failed');
  assert.notDeepEqual(SONIC_CUES['validation-failed'], SONIC_CUES.full);
});
test('unverified or untrusted results cannot become sound cues', () => {
  assert.equal(selectSonicCue({ ...validated('full'), validated: false }, 'enabled').kind, 'error');
  assert.equal(selectSonicCue({ ...validated('full'), source: 'model-output' }, 'enabled').kind, 'error');
  assert.equal(selectSonicCue({ operational_state: 'full' }, 'enabled').kind, 'error');
});
test('unknown operational and audio states fail closed', () => {
  assert.equal(selectSonicCue(validated('invented'), 'enabled').kind, 'error');
  assert.throws(() => selectSonicCue(validated('full'), 'dubious'), TypeError);
});
test('Worldseed descriptor is immutable rendering data, not presence', () => {
  const w = worldAcousticDescriptor({ world_id: 'moonroot', layers: [{ id: 'canopy', generator: 'noise', seed: 23 }] });
  assert.equal(w.render_only, true);
  assert.equal(w.layers[0].seed, 23);
  assert.equal(Object.isFrozen(w.layers[0]), true);
  assert.throws(() => worldAcousticDescriptor(null), TypeError);
});
