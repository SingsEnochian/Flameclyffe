import test from 'node:test';
import assert from 'node:assert/strict';
import { makeTask, runTrial, stratum, PROTOCOLS, PROTOCOLS_D3, HALVES, PAIRS, partBytes, PAYLOAD_BYTES, preregistration } from '../lib/gestalt-01.mjs';

const spec = { subset_sizes: [2, 3], moduli: [2, 3, 4, 5], k: 7 };
const firstTask = (from = 6001) => { for (let s = from; ; s++) { const t = makeTask(s, spec); if (t) return t; } };

test('D3 is frozen, and the D2-era protocol list is unchanged so earlier digests reproduce', () => {
  assert.equal(preregistration('PREREGISTRATION-D3.json').prereg.frozen, true);
  assert.deepEqual([...PROTOCOLS], ['mobius', 'bus', 'bus_transformed', 'mobius_noflip', 'solo']);
  assert.deepEqual([...PROTOCOLS_D3], [...PROTOCOLS, 'mobius_half']);
});

test('the halves partition the pair mask, and two-way halves equal one-way full bytes per round', () => {
  assert.deepEqual([...HALVES[0], ...HALVES[1]], PAIRS.map((_, i) => i));
  assert.equal(partBytes(HALVES[0].length) + partBytes(HALVES[1].length), PAYLOAD_BYTES);
});

test('mobius_half: alternating halves, 47 bytes a round, valid under the continuity contract', async () => {
  const t = firstTask();
  const half = await runTrial(t, 'mobius_half', { rounds: 4 });
  const noflip = await runTrial(t, 'mobius_noflip', { rounds: 4 });
  assert.equal(half.integrity.valid, true, JSON.stringify(half.integrity));
  assert.equal(half.bytes, 4 * 47);
  assert.equal(half.bytes, noflip.bytes, 'equal bytes to one-way');
  assert.equal(half.errors_introduced, 0);
});

test('the stratum is a property of the task alone: deterministic, and blind to protocol runs', async () => {
  const t = firstTask();
  const before = stratum(t);
  await runTrial(t, 'mobius', { rounds: 4 });
  assert.deepEqual(stratum(t), before);
  assert.deepEqual(stratum(makeTask(t.seed, spec)), before);
  assert.equal(typeof before.S, 'boolean');
  assert.equal(before.ambiguity.length, 2);
});
