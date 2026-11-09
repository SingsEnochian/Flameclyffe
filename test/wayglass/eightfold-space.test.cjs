'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inspectEightfoldSpace, runEightfoldSpace, ENGINES, CANONICAL_PHASES } = require('../../lib/wayglass-eightfold-space.cjs');
const { TABLES } = require('../../lib/wayglass-quad-eightfold.cjs');

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
  assert.equal(r.receipts['quad-eightfold'].phase_records, 64);
  assert.equal(r.receipts['quad-eightfold'].model_weight_updates, false);
  assert.equal(r.receipts['quad-eightfold'].sound_auto_resume, false);
  assert.equal(r.model_invoked, false); assert.equal(r.persisted, false); assert.equal(r.canon_commit, false);
});

test('the double-Möbius still refuses a crossing without explicit consent', async () => {
  await assert.rejects(runEightfoldSpace({ crossing: { ...crossing, explicit_consent: false },
    quadSources: unavailable(crossing.recorded_at), quadContinuity: continuity }), /Explicit consent/);
});
