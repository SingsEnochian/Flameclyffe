import assert from 'node:assert/strict';
import test from 'node:test';

import { createAspectCoalition, runCoalitionRound } from '../src/aspects/aspect-coalition.js';
import { buildAspectGrowthSnapshot, createAspectGrowthGarden, growthContextForAspect } from '../src/aspects/aspect-growth-garden.js';
import { growthEnvelopeFromHouseEntry } from '../src/aspects/aspect-growth-continuity.js';
import { createAspectMessageBus } from '../src/aspects/aspect-message-bus.js';
import { createAspectMeshRuntime } from '../src/aspects/aspect-mesh-runtime.js';

function message({
  id,
  traceId = 'trace-a',
  parentId = null,
  aspectId = 'mapper',
  recipients = [],
  kind = 'reply',
  body = 'hello',
  createdAt = '2026-09-24T21:00:00.000-04:00',
} = {}) {
  return {
    id,
    traceId,
    ...(parentId ? { parentId } : {}),
    sender: { aspectId, invocationId: `test:${aspectId}` },
    recipients,
    kind,
    body,
    evidenceRefs: [],
    stateRefs: [],
    createdAt,
  };
}

test('growth snapshot separates observable patterns from self and peer claims', () => {
  const messages = [
    message({ id: 'm1', aspectId: 'mapper', recipients: ['critic'], kind: 'proposal' }),
    message({ id: 'm2', aspectId: 'critic', recipients: ['mapper'], kind: 'challenge', createdAt: '2026-09-24T21:01:00.000-04:00' }),
    message({ id: 'm3', aspectId: 'mapper', recipients: ['critic'], kind: 'proposal', traceId: 'trace-b', createdAt: '2026-09-24T21:02:00.000-04:00' }),
    message({ id: 'q1', aspectId: 'mapper', kind: 'question', body: 'Could the book remember branches?', createdAt: '2026-09-24T21:03:00.000-04:00' }),
    message({ id: 'g1', aspectId: 'mapper', kind: 'growth', body: { type: 'skill', statement: 'I am getting better at finding seams between existing systems.' }, createdAt: '2026-09-24T21:04:00.000-04:00' }),
    message({ id: 'g2', aspectId: 'witness', kind: 'growth', body: { type: 'role', subjectAspectId: 'mapper', statement: 'Mapper has repeatedly become useful as an integration scout.' }, createdAt: '2026-09-24T21:05:00.000-04:00' }),
  ];

  const snapshot = buildAspectGrowthSnapshot(messages);
  const mapper = snapshot.profiles.mapper;
  assert.equal(mapper.demonstratedPatterns.find((row) => row.kind === 'proposal')?.count, 2);
  assert.equal(mapper.collaborators.find((row) => row.aspectId === 'critic')?.recurring, true);
  assert.equal(mapper.openCuriosities[0].envelopeId, 'q1');
  assert.equal(mapper.selfReports[0].type, 'skill');
  assert.equal(mapper.peerObservations[0].sourceAspectId, 'witness');
  assert.equal(mapper.roleSuggestions[0].statement, 'Mapper has repeatedly become useful as an integration scout.');
});

test('an answered question stops presenting as an unresolved curiosity', () => {
  const snapshot = buildAspectGrowthSnapshot([
    message({ id: 'q1', aspectId: 'narrative', kind: 'question', body: 'What grows here?' }),
    message({ id: 'a1', aspectId: 'mapper', parentId: 'q1', kind: 'reply', body: 'A branch.', createdAt: '2026-09-24T21:01:00.000-04:00' }),
  ]);
  assert.equal(snapshot.profiles.narrative.openCuriosities.length, 0);
});

test('growth context explicitly refuses to turn pattern memory into identity law', () => {
  const snapshot = buildAspectGrowthSnapshot([
    message({ id: 'm1', aspectId: 'maker', recipients: ['witness'], kind: 'result' }),
    message({ id: 'm2', aspectId: 'maker', recipients: ['witness'], kind: 'result', traceId: 'trace-b' }),
    message({ id: 'm3', aspectId: 'witness', recipients: ['maker'], kind: 'verification', traceId: 'trace-b' }),
  ]);
  const context = growthContextForAspect(snapshot, 'maker').join('\n');
  assert.match(context, /descriptive continuity, not identity law/i);
  assert.match(context, /completion ×2/i);
  assert.match(context, /witness/i);
});

test('live Growth Garden updates from the bus and deduplicates hydrated history by envelope id', () => {
  const bus = createAspectMessageBus();
  const garden = createAspectGrowthGarden({ bus, history: [message({ id: 'old-1', aspectId: 'critic', kind: 'challenge' })] });
  bus.publish(message({ id: 'live-1', aspectId: 'critic', kind: 'challenge', createdAt: '2026-09-24T21:01:00.000-04:00' }));
  garden.hydrate([message({ id: 'live-1', aspectId: 'critic', kind: 'challenge', createdAt: '2026-09-24T21:01:00.000-04:00' })]);
  assert.equal(garden.forAspect('critic').demonstratedPatterns.find((row) => row.kind === 'challenge')?.count, 2);
  garden.stop();
});

test('House continuity restores structured growth claims rather than flattening them to anonymous notes', () => {
  const entry = {
    id: 'house-1',
    status: 'growth',
    text: JSON.stringify({ type: 'preference', subjectAspectId: 'narrative', statement: 'I like returning to unfinished story branches.' }),
    created_at: '2026-09-24T21:00:00.000-04:00',
    links: [
      { kind: 'aspect-envelope', id: 'growth-1', label: 'narrative' },
      { kind: 'aspect-trace', id: 'trace-growth', label: 'trace' },
      { kind: 'aspect-kind', id: 'growth', label: 'kind' },
    ],
  };
  const restored = growthEnvelopeFromHouseEntry(entry);
  assert.equal(restored.kind, 'growth');
  assert.equal(restored.body.type, 'preference');
  assert.equal(restored.body.subjectAspectId, 'narrative');
});

test('mesh runtime can record a growth note without mutating the seed aspect definition', async () => {
  const runtime = createAspectMeshRuntime({ persistence: false, target: null });
  runtime.recordGrowth({
    aspectId: 'mapper',
    type: 'skill',
    statement: 'I can now spot useful runtime seams more quickly.',
    tags: ['integration'],
  });
  await runtime.growthReady;
  const profile = runtime.growthFor('mapper');
  assert.equal(profile.skillClaims.length, 1);
  assert.equal(profile.seedStrengths.includes('route-finding'), true);
  assert.equal(profile.skillClaims[0].statement, 'I can now spot useful runtime seams more quickly.');
  runtime.stop();
});

test('coalition turns receive relevant growth memory as context, not as an identity rewrite', async () => {
  const bus = createAspectMessageBus();
  const garden = createAspectGrowthGarden({ bus });
  bus.publish(message({ id: 'g1', aspectId: 'mapper', kind: 'growth', body: { type: 'note', statement: 'I keep noticing bridge points.' } }));
  const coalition = createAspectCoalition({ purpose: 'Inspect a seam.', members: ['mapper', 'critic'] });
  const seed = bus.publish({
    id: 'seed', traceId: 'trace-coalition', sender: { aspectId: 'steward', invocationId: 'test' }, recipients: ['mapper', 'critic'], kind: 'proposal', body: 'Inspect it.',
  });
  const seen = [];
  await runCoalitionRound({
    coalition,
    incoming: seed,
    bus,
    runtimeOptions: { growthGarden: garden },
    invokeTurn: async ({ aspectId, sharedContext }) => {
      seen.push({ aspectId, sharedContext });
      return { status: 'quiet', envelope: null };
    },
  });
  const mapperContext = seen.find((item) => item.aspectId === 'mapper').sharedContext.join('\n');
  assert.match(mapperContext, /not identity law/i);
  assert.match(mapperContext, /bridge points/i);
  garden.stop();
});
