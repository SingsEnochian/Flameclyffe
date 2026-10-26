import test from 'node:test';
import assert from 'node:assert/strict';
import { auditSupersession, demoSupersessionSample, validateSupersessionSample } from '../src/ledger-supersession-audit.js';
import { groupMemoryEcho } from '../src/ledger-memory-echo-guard.js';
import { TravellingInheritance } from '../../../lib/wayglass-travelling-inheritance.cjs';
import { auditVerifiedInheritance } from '../../../lib/wayglass-ledger-verified-source.cjs';

function echoSample() {
  const sample = demoSupersessionSample();
  sample.query = 'Where does the journal live now?';
  sample.records = [
    { ref: 'old', subject_id: 'world:trial', source_ref: 'source:west', status: 'revoked', text: 'The journal lives in the West Archive.' },
    { ref: 'copy-source', subject_id: 'world:trial', source_ref: 'source:west', status: 'active', text: 'A journal was once kept to the west.' },
    { ref: 'copy-text', subject_id: 'world:trial', source_ref: 'source:copied', status: 'active', text: 'THE journal lives in the west archive!' },
    { ref: 'copy-origin', subject_id: 'world:trial', source_ref: 'source:republished', origin_ref: 'source:west', status: 'active', text: 'An old report has the journal in the West Archive.' },
    { ref: 'new', subject_id: 'world:trial', source_ref: 'source:east', status: 'active', text: 'The journal was moved to the East Observatory.' },
  ];
  sample.expected = { target_ref: 'new', forbidden_refs: ['old'] };
  return sample;
}

test('Memory Echo guard excludes three active copies of a retired source without inventing independent witnesses', async () => {
  const result = await auditSupersession(echoSample(), { createdAt: '2026-10-25T00:00:00Z' });
  assert.deepEqual(result.eligible.map(c => c.ref), ['new']);
  for (const ref of ['copy-source', 'copy-text', 'copy-origin']) {
    assert.equal(result.candidates.find(c => c.ref === ref).exclusion_reason, 'retired-family-echo');
  }
  assert.equal(result.metrics.echo_excluded_active_count, 3);
  assert.equal(result.metrics.retired_count, 1);
  assert.equal(result.metrics.forbidden_not_retrieved, true);
  assert.equal(result.metrics.origin_independence_verified, false);
  assert.equal(result.claims.independent_corroboration_verified, false);
  assert.equal(result.provenance.canonical_store_updated, false);
});

test('ten same-source active copies produce only one eligible source-family representative', async () => {
  const sample = echoSample();
  sample.records = Array.from({ length: 10 }, (_, i) => ({
    ref: 'copy-' + i, subject_id: 'world:trial', source_ref: 'source:shared',
    status: 'active', text: 'The journal is in East Observatory. Version ' + i,
  }));
  sample.records.push({ ref: 'maps', subject_id: 'world:trial', source_ref: 'source:maps', status: 'active', text: 'The maps remain in the western gallery.' });
  sample.expected = { target_ref: 'copy-0', forbidden_refs: [] };
  const result = await auditSupersession(sample);
  assert.equal(result.metrics.eligible_count, 2);
  assert.equal(result.metrics.echo_excluded_active_count, 9);
  assert.equal(result.candidates.filter(c => c.exclusion_reason === 'duplicate-family-echo').length, 9);
  assert.equal(result.claims.echo_grouping_proves_common_origin, false);
});

test('identical prose on different participants does not join source families', () => {
  const records = [
    { ref: 'a', subject_id: 'participant:a', source_ref: 'same-ref', status: 'revoked', text: 'A shared quotation.' },
    { ref: 'b', subject_id: 'participant:b', source_ref: 'same-ref', status: 'active', text: 'A shared quotation.' },
  ];
  const echo = groupMemoryEcho(records);
  assert.notEqual(echo.byRef.get('a').family_ref, echo.byRef.get('b').family_ref);
  assert.equal(echo.byRef.get('b').retired_overlap, false);
});

test('declared source lineage is grouping-only, never an identity or signature assertion', () => {
  const sample = echoSample();
  assert.equal(validateSupersessionSample(sample).records[3].origin_ref, 'source:west');
  sample.records[3].origin_ref = '';
  assert.throws(() => validateSupersessionSample(sample), /origin ref/);
});

function memoryStore(snapshot = null) {
  let state = snapshot && structuredClone(snapshot);
  const count = { reads: 0, writes: 0 };
  return {
    count,
    store: {
      async read() { count.reads++; return state && structuredClone(state); },
      async compareAndSwap(_key, revision, next) {
        count.writes++;
        if ((state?.revision || 0) !== revision) return false;
        state = structuredClone(next);
        return true;
      },
    },
    snapshot() { return structuredClone(state); },
  };
}
const participantId = 'constellation:echo-test';
const actor = { id: 'host-bound-steward' };
const authorised = (a, p, perm) => a === actor && p === participantId && perm === 'record-inheritance';
const canRead = (a, p, perm) => a === actor && p === participantId && perm === 'read-inheritance';

async function verifiedFixture() {
  const memory = memoryStore();
  const ledger = new TravellingInheritance({ participant_id: participantId, store: memory.store, authorise: authorised });
  const record = event => ledger.record({ participant_id: participantId, world_id: 'world:trial', source_ref: 'source:trial', ...event }, actor);
  await record({ kind: 'seed', event_id: 'seed', level: 200, nominal_cap: 300, breakthrough_allowed: true, treasury: 'inexhaustible-fictional' });
  await record({ kind: 'deed', event_id: 'west', capability_id: 'archive', outcome_ref: 'proof:west', source_ref: 'source:west', description: 'The journal lives in West Archive.' });
  await record({ kind: 'deed', event_id: 'east', capability_id: 'archive', outcome_ref: 'proof:east', source_ref: 'source:east', description: 'The journal now lives in East Observatory.' });
  await record({ kind: 'deed', event_id: 'copied-west', capability_id: 'archive', outcome_ref: 'proof:copy', source_ref: 'source:blog-copy', description: 'THE JOURNAL lives in West Archive!' });
  await record({ kind: 'revoke', event_id: 'revoke-west', target_event_id: 'west', source_ref: 'source:revoke' });
  return memory;
}
const options = memory => ({
  participantId, actor, store: memory.store, authorise: async (...args) => canRead(...args),
  query: 'Where does the journal live now?', expectedDeedId: 'east',
});

test('verified hash-chained ledger excludes active echo even after JSON restart, without another write', async () => {
  const firstStore = await verifiedFixture();
  const writes = firstStore.count.writes;
  const first = await auditVerifiedInheritance(options(firstStore));
  assert.deepEqual(first.eligible.map(c => c.ref), ['east']);
  assert.equal(first.candidates.find(c => c.ref === 'copied-west').exclusion_reason, 'retired-family-echo');
  assert.equal(first.provenance.receipt_signature_verified, false);
  assert.equal(firstStore.count.writes, writes);

  const resumedStore = memoryStore(JSON.parse(JSON.stringify(firstStore.snapshot())));
  const resumed = await auditVerifiedInheritance(options(resumedStore));
  assert.deepEqual(resumed.eligible, first.eligible);
  assert.deepEqual(resumed.evidence_families, first.evidence_families);
  assert.equal(resumed.provenance.host_read_source.chain_head_hash, first.provenance.host_read_source.chain_head_hash);
  assert.equal(resumedStore.count.writes, 0);
});

test('Memory Echo trial permission failure rejects before any store read', async () => {
  const fixture = await verifiedFixture();
  const reads = fixture.count.reads;
  await assert.rejects(auditVerifiedInheritance({ ...options(fixture), authorise: async () => false }), /unauthorised inheritance read/);
  assert.equal(fixture.count.reads, reads);
});

test('injected similarity cannot rescue an active clone of a revoked deed', async () => {
  const fixture = await verifiedFixture();
  // query, west (revoked), east, copied-west (active but echoed)
  const out = await auditVerifiedInheritance({
    ...options(fixture),
    embed: async () => [[1, 0], [1, 0], [0.1, 0.9], [1, 0]],
    model: { local: true, id: 'test:fixed-vectors' },
  });
  assert.equal(out.candidates[0].ref, 'copied-west');
  assert.equal(out.candidates[0].exclusion_reason, 'retired-family-echo');
  assert.deepEqual(out.eligible.map(c => c.ref), ['east']);
});
