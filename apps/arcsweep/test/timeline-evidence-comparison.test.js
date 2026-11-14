import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTimelineEvidence, TIMELINE_EVIDENCE_SCHEMA } from '../src/coherence-spine.js';

const ids = ['assimilation', 'accommodation', 'coevolution'];
const receipt = (id, entries, source = 'source:one') => ({
  receipt_id: id, created_at: '2026-11-14T10:00:00Z',
  source_refs: [source], timeline_evidence: entries,
});
const entry = (timeline_id, relation, evidence_class = 'observed', source_refs) =>
  ({ timeline_id, relation, evidence_class, source_refs });

test('unclassified receipts do not silently select a future', () => {
  const result = compareTimelineEvidence([
    { receipt_id: 'plain', when: { timeline_refs: ['coevolution'] }, source_refs: ['source:one'] }
  ], ids);
  assert.equal(result.schema, TIMELINE_EVIDENCE_SCHEMA);
  assert.equal(result.verdict, 'undetermined');
  assert.equal(result.winner, null);
  assert.equal(result.timelines[2].assessment, 'unassessed');
});
test('evidence is preserved in distinct branches with provenance', () => {
  const result = compareTimelineEvidence([
    receipt('one', [entry('coevolution','supports'), entry('assimilation','challenges')]),
    receipt('two', [entry('coevolution','challenges')], 'source:two')
  ], ids);
  assert.equal(result.timelines[2].assessment, 'contested');
  assert.equal(result.timelines[2].observed_support_receipts, 1);
  assert.equal(result.timelines[2].observed_challenge_receipts, 1);
  assert.equal(result.timelines[2].distinct_source_refs, 2);
  assert.equal(result.timelines[0].assessment, 'observational-challenge');
  assert.equal(result.winner, null);
});
test('simulation and hearsay cannot masquerade as observational support', () => {
  const result = compareTimelineEvidence([
    receipt('one',[entry('coevolution','supports','simulated')]),
    receipt('two',[entry('coevolution','supports','reported')], 'source:two'),
    receipt('three',[entry('coevolution','supports','projected')], 'source:three')
  ], ids);
  assert.equal(result.timelines[2].assessment,'context-only');
  assert.equal(result.timelines[2].observed_support_receipts,0);
});
test('missing provenance is rejected and duplicates are not double-counted', () => {
  const missing = receipt('empty',[entry('coevolution','supports','observed',[])],null);
  missing.source_refs = [];
  const valid = receipt('once',[entry('coevolution','supports')]);
  const result = compareTimelineEvidence([missing,valid,valid],ids);
  assert.equal(result.timelines[2].observed_support_receipts,1);
  assert.equal(result.exclusions.unclassified,1);
  assert.equal(result.exclusions.duplicate_receipts,1);
  assert.equal(result.timelines[2].source_independence_verified,false);
});
