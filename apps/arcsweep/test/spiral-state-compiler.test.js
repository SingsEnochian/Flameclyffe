import assert from 'node:assert/strict';
import test from 'node:test';
import { compileSpiralStateFromDeepTime } from '../src/spiral-state-compiler.js';
import { validateSpiralState } from '../../starwell/src/runa/harmonic-spiral-contract.js';

const axes = (values) => Object.fromEntries(['P','C','R','E','M','A','Q'].map((axis) => [axis, {
  value: values[axis], uncertainty: .1, confidence: .8, derivative: 0, contributors: [],
}]));

function record(id, values, { quality = .84, worldId = 'terra-prime', fold = false } = {}) {
  return {
    schema_version: '0.1.0', dataset_kind: 'deep_time', id,
    record_fingerprint: `fp-${id}`, world_id: worldId,
    quality: { data_quality: quality },
    premaqc: {
      receipt_id: `premaq-${id}`,
      state: axes(values),
      math_spine: { fold_active: fold },
    },
  };
}

const baseline = { P:.72,C:.75,R:.7,E:.36,M:.68,A:.76,Q:.74 };

test('first accepted DEEPTime coordinate compiles a valid receiving Spiral State without inventing direction', async () => {
  const spiral = await compileSpiralStateFromDeepTime({ record: record('one', baseline) });
  assert.equal(validateSpiralState(spiral), true);
  assert.equal(spiral.phase, 'receive');
  assert.equal(spiral.direction, 'indeterminate');
  assert.equal(spiral.confidence, .84);
  assert.deepEqual(spiral.supporting_receipts.time, ['one']);
  assert.equal(spiral.authority.automatic_action, false);
  assert.equal(spiral.authority.physical_claim, false);
});

test('later accepted coordinates derive direction from support-axis movement while handling E separately', async () => {
  const previous = record('one', baseline);
  const current = record('two', { P:.76,C:.78,R:.74,E:.31,M:.71,A:.8,Q:.78 });
  const spiral = await compileSpiralStateFromDeepTime({ record: current, previousRecord: previous });
  assert.equal(spiral.phase, 'integrate');
  assert.equal(spiral.direction, 'ascending');
  assert.ok(spiral.source.trajectory_delta > 0);
});

test('fold-active accepted state compiles compress phase without granting automatic Runa action', async () => {
  const previous = record('one', baseline);
  const current = record('fold', baseline, { fold: true });
  const spiral = await compileSpiralStateFromDeepTime({ record: current, previousRecord: previous });
  assert.equal(spiral.phase, 'compress');
  assert.equal(spiral.direction, 'holding');
  assert.deepEqual(spiral.suggested_actions, []);
  assert.equal(spiral.subsystem_contexts.audio.automatic, false);
});

test('Spiral compiler refuses cross-world trajectories and non-DEEPTime inputs', async () => {
  await assert.rejects(() => compileSpiralStateFromDeepTime({ record: { dataset_kind: 'story' } }), /DEEPTime record/);
  await assert.rejects(() => compileSpiralStateFromDeepTime({
    record: record('two', baseline), previousRecord: record('one', baseline, { worldId: 'terra-aeterna' }),
  }), /cannot cross worlds/);
});
