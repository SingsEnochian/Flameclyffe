import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveAsh } from '../src/bone-ash-intention.js';
import { ashHistoryFromDeepTimeRecords } from '../src/deep-time-ash.js';

const AXES = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];

function record(id, worldId, lambda, values, dataQuality = .9) {
  return {
    dataset_kind: 'deep_time',
    world_id: worldId,
    sequence_id: `arcsweep:${worldId}:accepted-feedback`,
    sequence_revision: 1,
    lambda,
    id,
    record_fingerprint: id.padEnd(64, '0').slice(0, 64),
    premaqc: {
      state: Object.fromEntries(AXES.map((axis) => [axis, { value: values[axis] }])),
    },
    quality: { data_quality: dataQuality },
  };
}

test('DEEPTime Ash uses accepted trajectory displacement, data quality and receipt history', () => {
  const records = [
    record('dt-1', 'terra-aeterna', 1, { P: .70, C: .60, R: .65, E: .34, M: .68, A: .74, Q: .71 }, .95),
    record('dt-2', 'terra-aeterna', 2, { P: .72, C: .66, R: .71, E: .31, M: .71, A: .75, Q: .75 }, .90),
    record('dt-3', 'terra-aeterna', 3, { P: .76, C: .70, R: .78, E: .27, M: .76, A: .79, Q: .80 }, .85),
  ];
  const history = ashHistoryFromDeepTimeRecords(records, { worldId: 'terra-aeterna', halfLifeRecords: 8 });
  assert.equal(history.length, 2);
  assert.equal(history[0].receipt_id, 'dt-2');
  assert.equal(history[1].receipt_id, 'dt-3');
  assert.equal(history[0].source, 'accepted-deep-time-trajectory');
  assert.equal(history[0].receipt_confidence, .9);
  assert.ok(history[1].direction.R > 0);
  assert.ok(history[1].direction.E < 0);

  const ash = deriveAsh(history);
  assert.equal(ash.receipt_count, 2);
  assert.ok(ash.magnitude > 0);
  assert.ok(ash.direction.R > 0);
  assert.ok(ash.direction.E < 0);
});

test('DEEPTime Ash stays inside the requested world and needs a trajectory, not a lone coordinate', () => {
  const terra = record('terra-1', 'terra-aeterna', 1, { P: .7, C: .7, R: .7, E: .3, M: .7, A: .7, Q: .7 });
  const luna = record('luna-1', 'luna', 1, { P: .4, C: .4, R: .4, E: .6, M: .4, A: .4, Q: .4 });
  assert.deepEqual(ashHistoryFromDeepTimeRecords([terra, luna], { worldId: 'terra-aeterna' }), []);
});

test('older accepted transformations decay in Ash contribution without deleting provenance', () => {
  const records = [
    record('dt-1', 'terra-aeterna', 1, { P: .50, C: .50, R: .50, E: .50, M: .50, A: .50, Q: .50 }),
    record('dt-2', 'terra-aeterna', 2, { P: .60, C: .60, R: .60, E: .40, M: .60, A: .60, Q: .60 }),
    record('dt-3', 'terra-aeterna', 3, { P: .70, C: .70, R: .70, E: .30, M: .70, A: .70, Q: .70 }),
    record('dt-4', 'terra-aeterna', 4, { P: .80, C: .80, R: .80, E: .20, M: .80, A: .80, Q: .80 }),
  ];
  const history = ashHistoryFromDeepTimeRecords(records, { worldId: 'terra-aeterna', halfLifeRecords: 1 });
  assert.equal(history.length, 3);
  assert.ok(history[0].persistence < history[1].persistence);
  assert.ok(history[1].persistence < history[2].persistence);
  assert.equal(history[2].persistence, 1);
  assert.deepEqual(history.map((item) => item.receipt_id), ['dt-2', 'dt-3', 'dt-4']);
});
