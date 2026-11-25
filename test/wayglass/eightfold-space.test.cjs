'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inspectEightfoldSpace, runEightfoldSpace, ENGINES, CANONICAL_PHASES } = require('../../lib/wayglass-eightfold-space.cjs');
const { digest } = require('../../lib/wyrdrune/canonical.cjs');
const { traverseDoubleMobius, traverseWyrdruneDoubleMobius } = require('../../lib/wayglass-double-mobius.cjs');
const { createWaygateManifest } = require('../../lib/wayglass-waygate.cjs');
const { TABLES, runQuadEightfold, runWyrdruneQuadEightfold } = require('../../lib/wayglass-quad-eightfold.cjs');

const crossing = {
  world_id: 'wayglass:home', participant_id: 'participant:fixture', embodiment: { body_class: 'host-os' },
  explicit_consent: true, gateway_focus: 'unclassified',
  gateway_observation: { kind: 'firsthand', actor_id: 'participant:fixture', source_ref: 'fixture:ask', content: 'Run the Eightfold space.' },
  wayglass_observation: { kind: 'instrument', actor_id: 'instrument:fixture', source_ref: 'fixture:receipt', content: 'A recorded instrument result.' },
  identity_declarations: [{ participant_id: 'participant:fixture', declaration: 'self-declared participant' }],
  unresolved_wonder_questions: ['What persists after a full return?'], provenance_refs: ['fixture:space'],
  next_owner: 'participant:fixture', stop_point: 'Return with every engine receipt intact.',
  recorded_at: '2026-11-09T08:00:00.000Z',
};
const unavailable = at => ({ schema: 'wayglass.quad-sources/v1', observed_at: at,
  channels: TABLES.map(id => ({ id, status: 'unavailable', count: null, latest_at: null, provenance: 'fixture:no-live-source' })) });
const continuity = { participant_ref: 'wayglass', world_ref: 'wayglass:home', stop_point: 'review before promotion',
  next_owner: 'wayglass', unresolved_wonder_questions: ['What persists after a full return?'], revoked_refs: [] };

test('four distinct Eightfold engines share one space and the same eight phases in order', () => {
  const s = inspectEightfoldSpace();
  assert.deepEqual(s.engines.map(e => e.id), ['wyrdrune', 'double-mobius', 'mobius-octo', 'quad-eightfold']);
  assert.equal(s.aligned, true);
  assert.deepEqual(s.phases, CANONICAL_PHASES);
  assert.ok(s.engines.every(e => e.phases_aligned));
  // The shared word "quad" names two different things and the space says so.
  assert.match(ENGINES.find(e => e.id === 'mobius-octo').quad_means, /execution cores/);
  assert.match(ENGINES.find(e => e.id === 'quad-eightfold').quad_means, /Observer instruments/);
  assert.equal(s.model_invoked, false);
});

test('all four run in one process, each returning its own receipt', async () => {
  const r = await runEightfoldSpace({ crossing, quadSources: unavailable(crossing.recorded_at), quadContinuity: continuity });
  assert.equal(r.receipts.wyrdrune.status, 'committed');
  assert.deepEqual(r.receipts.wyrdrune.output, [1, 2]);
  assert.deepEqual(r.receipts.wyrdrune.checkpoints, ['outer', 'inner']);
  assert.deepEqual(r.receipts.wyrdrune.carry, { depth: 2 });
  assert.equal(r.receipts['double-mobius'].status, 'completed-in-memory');
  assert.equal(r.receipts['double-mobius'].return_verdict, 'accepted');
  assert.deepEqual(r.receipts['double-mobius'].orientation, { start: 1, after_gateway: -1, after_wayglass: 1 });
  assert.equal(r.receipts['mobius-octo'].cores, 8);
  assert.equal(r.receipts['mobius-octo'].lineages.length, 4);
  assert.ok(r.receipts['mobius-octo'].lineages.every(l => l.status === 'committed' && l.chain_ok));
  assert.ok(r.receipts['mobius-octo'].lineages.every(l => l.carry.n === 2 &&
    l.wtl.length === 2 && l.wtl.every(witness => witness.accepted)));
  assert.equal(r.receipts['double-mobius'].wtl.accepted, true);
  assert.equal(r.receipts['quad-eightfold'].wtl.accepted, true);
  assert.equal(r.receipts['double-mobius'].wtl.sourceHash, r.receipts['quad-eightfold'].wtl.sourceHash);
  assert.equal(r.receipts['quad-eightfold'].phase_records, 64);
  assert.equal(r.receipts['quad-eightfold'].model_weight_updates, false);
  assert.equal(r.receipts['quad-eightfold'].sound_auto_resume, false);
  assert.equal(r.model_invoked, false); assert.equal(r.persisted, false); assert.equal(r.canon_commit, false);
});

test('the double-Möbius still refuses a crossing without explicit consent', async () => {
  await assert.rejects(runEightfoldSpace({ crossing: { ...crossing, explicit_consent: false },
    quadSources: unavailable(crossing.recorded_at), quadContinuity: continuity }), /Explicit consent/);
});

test('WTL orientation drives both crossing records and preserves the host trace', async () => {
  const input = { ...crossing, waygate_manifest: createWaygateManifest({
    waygate_id: 'waygate:eightfold-space', world_id: crossing.world_id,
    provenance_refs: crossing.provenance_refs, allowed_body_classes: ['host-os'],
  }) };
  const wtl = await traverseWyrdruneDoubleMobius(input);
  const host = traverseDoubleMobius(input);
  assert.equal(wtl.trace_sha256, host.trace_sha256);
  assert.deepEqual(wtl.departure, host.departure);
  assert.equal(wtl.orientationWTL.outputDigest, digest(wtl.orientation));
  assert.equal(wtl.gateway.orientation_after, wtl.wayglass.orientation_before);
});

test('WTL compression preserves checkpoint hashes and permits cross-runtime Return', async () => {
  const sources = unavailable(crossing.recorded_at);
  Object.assign(sources.channels[0], { status: 'observed', count: 42 });
  Object.assign(sources.channels[1], { status: 'empty', count: 0 });
  Object.assign(sources.channels[2], { status: 'error' });
  const input = { sources, continuity, cycles: 1 };
  const host = runQuadEightfold(input);
  const first = await runWyrdruneQuadEightfold(input);
  assert.deepEqual(first.checkpoint, host);
  assert.equal(first.compressionWTL.outputDigest, digest({ observed: 1, empty: 1, unavailable: 4 }));
  const second = await runWyrdruneQuadEightfold({ ...input, previous: host });
  assert.deepEqual(second.checkpoint, runQuadEightfold({ ...input, previous: first.checkpoint }));
  assert.equal(second.checkpoint.completed_cycles, 2);
});

test('Observer Release uses status changes from the returned source packet', async () => {
  const prior = unavailable(crossing.recorded_at);
  Object.assign(prior.channels[0], { status: 'observed', count: 12 });
  const previous = runQuadEightfold({ sources: prior, continuity, cycles: 1 });
  const current = structuredClone(prior);
  Object.assign(current.channels[0], { status: 'empty', count: 0 });
  Object.assign(current.channels[1], { status: 'error' });
  Object.assign(current.channels[2], { status: 'observed', count: 7 });
  const result = await runWyrdruneQuadEightfold({ sources: current, continuity, cycles: 2, previous });
  const [first, second] = result.feedback;
  assert.deepEqual(result.checkpoint, runQuadEightfold({ sources: current, continuity, cycles: 2, previous }));
  assert.equal(first.perception.previousSource, digest(previous.source_packet));
  assert.equal(first.perception.source, digest(result.checkpoint.source_packet));
  assert.equal(first.compression.changedChannels, 3);
  assert.equal(first.compression.observedChannels, 1);
  assert.ok(first.compression.omitted.includes('record contents'));
  assert.equal(first.release.disposition, 'review-transitions');
  assert.deepEqual(first.release.proposals.slice(0, 4).map(proposal => proposal.action),
    ['inspect-transition', 'inspect-error', 'inspect-transition', 'restore-source']);
  assert.ok(first.release.proposals.every(proposal => proposal.decision === 'pending'));
  assert.equal(second.perception.previousSource, first.perception.source);
  assert.equal(second.compression.changedChannels, 0);
  assert.equal(second.release.proposals[0].action, 'hold-empty');
  assert.equal(result.feedbackDigest, digest(result.feedback));
});
