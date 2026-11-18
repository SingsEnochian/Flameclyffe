'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createLineageStore } = require('../../lib/wayglass-lineage-store.cjs');
const { executeLivingLearning } = require('../../lib/wayglass-wyrdrune-learning.cjs');

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-lineage-'));
async function learn(n, interior = { energy: 0.4, curiosity: 0.6, uncertainty: 0.5, coherence: 0.6, previous_resonance: 0.7 }) {
  return executeLivingLearning({ atlas: { coherence: 0.7, interference: 0.3, bloom: 0.6, granulation: 0.5, flow: 0.7 }, interior,
    source: { event_id: 'ui-memory-' + n, atlas_input_hash: String(n).repeat(64).slice(0, 64).replace(/[^a-f0-9]/g, 'a'), atlas_program_hash: 'b'.repeat(64) } },
  { principal: { authorized: true } });
}
const entry = r => ({ lineage: 'wyrdrune:living-learning', participant_id: 'wayglass', source_hash: r.source_hash, input_hash: r.input_hash,
  lineage_root: r.continuity.lineage_root, carry: r.continuity.carry, carry_digest: r.continuity.carry_digest, checkpoints: r.continuity.checkpoints });
const L = 'wyrdrune:living-learning';

test('a Living Learning return is remembered exactly as Wyrdrune carried it, and chains', async () => {
  const store = createLineageStore({ directory: temp() });
  assert.equal(store.verify(L, 'wayglass').status, 'none');
  const first = await learn(1);
  assert.equal(first.continuity.checkpoints.length, 2);
  assert.deepEqual(first.continuity.carry, Object.fromEntries(Object.entries(first.returned)), 'the carry is the returned learning state');
  const r1 = store.append(entry(first));
  assert.deepEqual([r1.seq, r1.prev, r1.persisted], [1, null, true]);
  const { energy, curiosity, uncertainty, coherence } = first.returned;
  const second = await learn(2, { energy, curiosity, uncertainty, coherence, previous_resonance: 0.7 });
  const r2 = store.append(entry(second));
  assert.deepEqual([r2.seq, r2.prev], [2, r1.storage_id]);
  const memory = store.verify(L, 'wayglass');
  assert.equal(memory.status, 'verified'); assert.equal(memory.length, 2);
  assert.deepEqual(memory.head.carry, second.continuity.carry);
  assert.equal(memory.head.carry_digest, second.continuity.carry_digest);
  assert.equal(store.verify(L, 'someone-else').status, 'none', 'lineages are separate per participant');
});

test('any altered, missing or rewired record is refused with a reason, and a broken chain is never extended', async () => {
  const dir = temp(); const store = createLineageStore({ directory: dir });
  const a = store.append(entry(await learn(1))); const b = store.append(entry(await learn(2)));
  const folder = fs.readdirSync(dir).map(x => path.join(dir, x))[0];
  const file = path.join(folder, a.storage_id + '.json');
  const original = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, original.replace('"seq":1', '"seq":1 '));
  assert.match(store.verify(L, 'wayglass').reason, /altered/);
  await assert.rejects(async () => store.append(entry(await learn(3))), /refused to extend a broken chain/);
  fs.writeFileSync(file, original);
  assert.equal(store.verify(L, 'wayglass').status, 'verified', 'restoring the exact bytes restores trust');
  fs.unlinkSync(file);
  assert.match(store.verify(L, 'wayglass').reason, /missing/);
  fs.writeFileSync(file, original);
  fs.writeFileSync(path.join(folder, 'HEAD'), JSON.stringify({ storage_id: b.storage_id, seq: 5 }));
  assert.match(store.verify(L, 'wayglass').reason, /sequence broken/);
});

test('a return whose carry, digest or checkpoints do not agree is rejected before anything is written', async () => {
  const dir = temp(); const store = createLineageStore({ directory: dir });
  const r = entry(await learn(1));
  assert.throws(() => store.append({ ...r, carry: { ...r.carry, energy: 0.99 } }), /carry digest/);
  assert.throws(() => store.append({ ...r, checkpoints: [r.checkpoints[1], r.checkpoints[0]] }), /checkpoint 1/);
  assert.throws(() => store.append({ ...r, checkpoints: [r.checkpoints[0]] }), /last checkpoint does not carry/);
  assert.throws(() => store.append({ ...r, lineage: '../escape' }), /lineage/);
  assert.equal(fs.readdirSync(dir).length, 0, 'nothing was written');
});
