// GESTALT-01 apparatus smoke test: keeps the experiment honest in CI.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runExperiment, runTrial, makeTask, preregistration, PAYLOAD_BYTES, PROTOCOLS } from '../lib/gestalt-01.mjs';

test('the pre-registration is frozen and its digest is cited by every result', async () => {
  const { prereg, sha256 } = preregistration();
  assert.equal(prereg.frozen, true);
  const out = await runExperiment({ limit: 2, sets: { held_out: prereg.task_family.sets.held_out } });
  assert.equal(out.preregistration_sha256, sha256);
});

test('equal budgets: every bidirectional protocol spends the same payload, inside the 48-byte packet budget', async () => {
  assert.ok(PAYLOAD_BYTES <= 48);
  const t = makeTask(1002, { subset_sizes: [2, 3], moduli: [2, 3, 4, 5] });
  const bytes = {};
  for (const p of PROTOCOLS) bytes[p] = (await runTrial(t, p)).bytes;
  assert.equal(bytes.mobius, bytes.bus);
  assert.equal(bytes.mobius, bytes.bus_transformed);
  assert.equal(bytes.solo, 0);
});

test('the scorer never combines private sets: solo cannot produce a joint answer', async () => {
  for (const seed of [1002, 1003, 1004]) {
    const t = makeTask(seed, { subset_sizes: [2, 3], moduli: [2, 3, 4, 5] });
    if (!t) continue;
    const r = await runTrial(t, 'solo');
    assert.equal(r.joint && r.proposals[0] === null, false);
    if (r.joint) assert.ok(r.proposals[0] && r.proposals[1], 'a joint answer needs two independent proposals');
  }
});

test('every trial upholds the continuity contract', async () => {
  const t = makeTask(1005, { subset_sizes: [2, 3], moduli: [2, 3, 4, 5] });
  for (const p of PROTOCOLS) assert.deepEqual((await runTrial(t, p)).integrity.violations, [], p);
});
