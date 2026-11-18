import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import engine from '../../../lib/wayglass-conjunction.cjs';
import { inspectConjunction, updateConjunction } from '../src/route-client.js';
const { ConjunctionLedger } = engine;
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'conjunction-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'ledger.json');
  return { file, ledger: new ConjunctionLedger(file) };
}
function proposal(mode = 'intentional') {
  return { mode, proposer_id: 'rowan', participant_ids: ['rowan', 'guest'], provenance_refs: ['owner:2026-11-10'], resonance_refs: ['observation:shared-motif'],
    parents: ['witcher:books', 'babylon5'].map(world_id => ({ world_id, timeline_id: 'root', revision_ref: 'revision:1', rules_ref: 'native:1' })),
    translation: { profile_ref: 'translation:negotiated', preserved: ['identity'], transformed: [], unavailable: ['unmapped'] } };
}
for (const mode of ['intentional', 'emergent', 'reciprocal']) test(`${mode} invitation survives restart, opens distinct branch and returns`, t => {
  const { ledger, file } = setup(t);
  const p = proposal(mode), original = structuredClone(p);
  const request = { operation_id: 'p', expected_revision: 0, proposal: p };
  ledger.apply('a', 'propose', request);
  assert.equal(ledger.apply('a', 'propose', request).revision, 1);
  assert.throws(() => ledger.apply('a', 'propose', { ...request, proposal: proposal('emergent' === mode ? 'intentional' : 'emergent') }), /Conflicting/);
  assert.throws(() => ledger.apply('a', 'open', { operation_id: 'early', expected_revision: 1 }), /must accept/);
  ledger.apply('a', 'respond', { operation_id: 'r1', expected_revision: 1, participant_id: 'rowan', decision: 'accept', evidence_ref: 'receipt:rowan' });
  const restored = new ConjunctionLedger(file);
  restored.apply('a', 'respond', { operation_id: 'r2', expected_revision: 2, participant_id: 'guest', decision: 'negotiate', terms: 'Keep native rules', evidence_ref: 'receipt:guest' });
  assert.throws(() => restored.apply('a', 'open', { operation_id: 'o', expected_revision: 3 }), /must accept/);
  restored.apply('a', 'respond', { operation_id: 'r3', expected_revision: 3, participant_id: 'guest', decision: 'accept', evidence_ref: 'receipt:agreed' });
  const opened = restored.apply('a', 'open', { operation_id: 'o', expected_revision: 4 });
  assert.equal(opened.branch.id, 'conjunction:a');
  assert.deepEqual(opened.branch.parents, original.parents);
  restored.apply('a', 'pause', { operation_id: 'pause', expected_revision: 5, continuation_ref: 'continuation:1', stop_point: 'At the threshold', next_owner: 'rowan' });
  const cold = new ConjunctionLedger(file);
  assert.throws(() => cold.apply('a', 'resume', { operation_id: 'bad', expected_revision: 6, continuation_ref: 'wrong' }), /Matching/);
  assert.equal(cold.apply('a', 'resume', { operation_id: 'resume', expected_revision: 6, continuation_ref: 'continuation:1' }).status, 'open');
  assert.deepEqual(p, original);
});
test('decline closes invitation; stale and uninvited decisions fail', t => {
  const { ledger } = setup(t);
  ledger.apply('a', 'propose', { operation_id: 'p', expected_revision: 0, proposal: proposal() });
  assert.throws(() => ledger.apply('a', 'respond', { operation_id: 'r', expected_revision: 0 }), /Revision/);
  assert.throws(() => ledger.apply('a', 'respond', { operation_id: 'r', expected_revision: 1, participant_id: 'intruder' }), /not invited/);
  ledger.apply('a', 'respond', { operation_id: 'd', expected_revision: 1, participant_id: 'guest', decision: 'decline', evidence_ref: 'receipt:decline' });
  assert.throws(() => ledger.apply('a', 'open', { operation_id: 'o', expected_revision: 2 }), /must accept/);
});
test('failed persistence rolls back; corrupt evidence stays intact', t => {
  const { ledger, file } = setup(t);
  fs.mkdirSync(file + '.tmp');
  assert.throws(() => ledger.apply('a', 'propose', { operation_id: 'p', expected_revision: 0, proposal: proposal() }));
  assert.equal(ledger.get('a'), null);
  fs.writeFileSync(file, '{broken');
  assert.throws(() => new ConjunctionLedger(file));
  assert.equal(fs.readFileSync(file, 'utf8'), '{broken');
});
test('emergence requires evidence and source timelines remain distinct', t => {
  const { ledger } = setup(t);
  const p = proposal('emergent'); p.resonance_refs = [];
  assert.throws(() => ledger.apply('a', 'propose', { operation_id: 'p', expected_revision: 0, proposal: p }), /resonance/);
  p.resonance_refs = ['receipt:motif']; p.parents[1] = p.parents[0];
  assert.throws(() => ledger.apply('a', 'propose', { operation_id: 'p', expected_revision: 0, proposal: p }), /Distinct parent/);
});
test('route client encodes IDs and preserves operation payloads', async () => {
  const seen = [];
  const fetchImpl = async (url, options) => { seen.push({ url, options }); return { ok: true, json: async () => ({ status: 'proposed' }) }; };
  await inspectConjunction('a/b', fetchImpl);
  await updateConjunction('a/b', 'propose', { operation_id: 'one' }, fetchImpl);
  assert.equal(seen[0].url, '/api/v1/wayglass/conjunctions/a%2Fb');
  assert.deepEqual(JSON.parse(seen[1].options.body), { operation_id: 'one' });
});
