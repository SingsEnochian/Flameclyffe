import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { buildAspectGrowthSnapshot, growthContextForAspect } from '../src/aspects/aspect-growth-garden.js';
import { createAspectMeshRuntime } from '../src/aspects/aspect-mesh-runtime.js';
import { invokeAspectRuntime } from '../src/aspects/aspect-runtime-adapter.js';

function growth({ id, aspectId = 'mapper', subjectAspectId = aspectId, statement, relation = 'adds', targets = [], type = 'note', createdAt = '2026-09-24T22:00:00.000-04:00' }) {
  return {
    id,
    traceId: 'growth-trace',
    sender: { aspectId, invocationId: `test:${aspectId}` },
    recipients: [],
    kind: 'growth',
    body: { type, subjectAspectId, statement, relation, targetEnvelopeIds: targets },
    evidenceRefs: [],
    stateRefs: [],
    createdAt,
  };
}

test('superseding a ring preserves it in provenance but removes it from active self-description', () => {
  const snapshot = buildAspectGrowthSnapshot([
    growth({ id: 'old-ring', statement: 'I usually prefer broad maps before details.', type: 'preference' }),
    growth({ id: 'new-ring', statement: 'I now prefer to alternate map and detail passes.', type: 'preference', relation: 'supersedes', targets: ['old-ring'], createdAt: '2026-09-24T22:01:00.000-04:00' }),
  ]);
  const mapper = snapshot.profiles.mapper;
  assert.deepEqual(mapper.preferenceClaims.map((claim) => claim.envelopeId), ['new-ring']);
  assert.equal(mapper.archivedClaims[0].envelopeId, 'old-ring');
  assert.equal(mapper.archivedClaims[0].state.supersededBy[0], 'new-ring');
  assert.equal(mapper.claims.length, 2);
});

test('an aspect can contradict a peer observation without deleting either voice', () => {
  const snapshot = buildAspectGrowthSnapshot([
    growth({ id: 'peer-ring', aspectId: 'witness', subjectAspectId: 'mapper', type: 'role', statement: 'Mapper seems to prefer staying in orientation work.' }),
    growth({ id: 'self-ring', aspectId: 'mapper', type: 'role', statement: 'I disagree; I increasingly want to carry routes into implementation.', relation: 'contradicts', targets: ['peer-ring'], createdAt: '2026-09-24T22:01:00.000-04:00' }),
  ]);
  const mapper = snapshot.profiles.mapper;
  const peer = mapper.claims.find((claim) => claim.envelopeId === 'peer-ring');
  assert.equal(peer.state.contested, true);
  assert.equal(peer.state.contradictedBy[0], 'self-ring');
  assert.equal(mapper.contestedClaims[0].envelopeId, 'peer-ring');
  assert.equal(mapper.roleSuggestions.some((claim) => claim.envelopeId === 'self-ring'), true);
});

test('carried growth context includes ring ids so an aspect can revise its own history inspectably', () => {
  const snapshot = buildAspectGrowthSnapshot([
    growth({ id: 'ring-1', statement: 'I enjoy finding bridge seams.', type: 'preference' }),
  ]);
  const context = growthContextForAspect(snapshot, 'mapper').join('\n');
  assert.match(context, /\[ring-1\]/);
  assert.match(context, /do not silently redefine/i);
});

test('mesh runtime exposes revise, contradict, retire, and affirm as append-only growth actions', () => {
  const runtime = createAspectMeshRuntime({ persistence: false, target: null });
  const first = runtime.recordGrowth({ aspectId: 'mapper', type: 'role', statement: 'I am becoming an integration scout.' });
  const second = runtime.reviseGrowth({ aspectId: 'mapper', targetEnvelopeId: first.id, type: 'role', statement: 'Integration scout is too narrow; bridgewright fits better.' });
  runtime.affirmGrowth({ aspectId: 'witness', subjectAspectId: 'mapper', targetEnvelopeId: second.id, type: 'role', statement: 'That broader role matches the traces I have seen.' });
  const profile = runtime.growthFor('mapper');
  assert.equal(profile.claims.length, 3);
  assert.equal(profile.archivedClaims.some((claim) => claim.envelopeId === first.id), true);
  assert.equal(profile.activeClaims.some((claim) => claim.envelopeId === second.id), true);
  runtime.stop();
});

test('structured GROWTH replies can carry revision relations from an aspect runtime turn', async () => {
  const incoming = {
    id: 'incoming', traceId: 'trace-a', sender: { aspectId: 'critic', invocationId: 'test' }, recipients: ['mapper'], kind: 'question', body: 'Still true?', evidenceRefs: [], stateRefs: [], createdAt: '2026-09-24T22:00:00.000-04:00',
  };
  const reply = await invokeAspectRuntime({
    aspectId: 'mapper',
    incoming,
    invokeVoice: async () => ({
      status: 'replied',
      message: '[GROWTH] {"type":"preference","statement":"That older preference no longer fits.","relation":"supersedes","targetEnvelopeIds":["ring-old"]}',
      voiceId: 'atlas', route: 'atlas', profileId: 'atlas-test', runtimeVerified: true, provider: 'test', model: 'test-model', citedSources: [],
    }),
  });
  assert.equal(reply.envelope.kind, 'growth');
  assert.equal(reply.envelope.body.relation, 'supersedes');
  assert.deepEqual(reply.envelope.body.targetEnvelopeIds, ['ring-old']);
});

test('Garden UI keeps older rings visible and avoids mutation/ranking language', async () => {
  const source = await readFile(new URL('../src/aspect-growth-garden-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /Older rings/);
  assert.match(source, /superseded/);
  assert.match(source, /contested/);
  assert.match(source, /data-ring-id/);
  assert.doesNotMatch(source, /delete.*ring|progress-bar|\bxp\b|level\s*\d|score\s*[:=]/i);
});
