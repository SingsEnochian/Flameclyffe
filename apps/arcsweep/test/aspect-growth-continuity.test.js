import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAspectGrowthSnapshot, growthContextForAspect } from '../src/aspects/aspect-growth-garden.js';
import { hydrateAspectGrowthGardenFromHouse } from '../src/aspects/aspect-growth-continuity.js';

function message({ id, traceId = 'trace-open', aspectId = 'mapper', recipients = [], kind = 'reply', body = 'hello', createdAt = '2026-09-24T21:00:00.000-04:00' } = {}) {
  return { id, traceId, sender: { aspectId, invocationId: `test:${aspectId}` }, recipients, kind, body, evidenceRefs: [], stateRefs: [], createdAt };
}

function houseEntry({ id, aspectId = 'mapper', kind = 'reply', text = 'hello', traceId = 'trace-house', createdAt = '2026-09-24T21:00:00.000-04:00' } = {}) {
  return {
    id: `house:${id}`,
    status: kind,
    text,
    created_at: createdAt,
    links: [
      { kind: 'aspect-envelope', id, label: aspectId },
      { kind: 'aspect-trace', id: traceId, label: 'trace' },
      { kind: 'aspect-kind', id: kind, label: 'kind' },
    ],
  };
}

test('unfinished proposal/challenge/question traces remain visible until a result or verification closes them', () => {
  const open = buildAspectGrowthSnapshot([
    message({ id: 'p1', aspectId: 'mapper', recipients: ['critic'], kind: 'proposal', body: 'Try the existing seam.' }),
    message({ id: 'c1', aspectId: 'critic', recipients: ['mapper'], kind: 'challenge', body: 'Check reconnect first.', createdAt: '2026-09-24T21:01:00.000-04:00' }),
  ]);
  assert.equal(open.profiles.mapper.openThreads.length, 1);
  assert.equal(open.profiles.critic.openThreads.length, 1);
  assert.match(growthContextForAspect(open, 'mapper').join('\n'), /Unfinished threads:/);

  const closed = buildAspectGrowthSnapshot([
    message({ id: 'p1', aspectId: 'mapper', recipients: ['critic'], kind: 'proposal', body: 'Try the existing seam.' }),
    message({ id: 'c1', aspectId: 'critic', recipients: ['mapper'], kind: 'challenge', body: 'Check reconnect first.', createdAt: '2026-09-24T21:01:00.000-04:00' }),
    message({ id: 'r1', aspectId: 'maker', recipients: ['mapper', 'critic'], kind: 'result', body: 'Reconnect verified and seam applied.', createdAt: '2026-09-24T21:02:00.000-04:00' }),
  ]);
  assert.equal(closed.profiles.mapper.openThreads.length, 0);
  assert.equal(closed.profiles.critic.openThreads.length, 0);
});

test('House hydration keeps old durable growth notes even when ordinary recent history is bounded', async () => {
  const entries = [
    houseEntry({ id: 'growth-old', aspectId: 'narrative', kind: 'growth', text: JSON.stringify({ type: 'preference', statement: 'I like returning to unfinished story branches.' }), createdAt: '2026-09-20T12:00:00.000-04:00' }),
    houseEntry({ id: 'reply-1', aspectId: 'narrative', kind: 'reply', text: 'one', createdAt: '2026-09-24T20:00:00.000-04:00' }),
    houseEntry({ id: 'reply-2', aspectId: 'narrative', kind: 'reply', text: 'two', createdAt: '2026-09-24T20:01:00.000-04:00' }),
    houseEntry({ id: 'reply-3', aspectId: 'narrative', kind: 'reply', text: 'three', createdAt: '2026-09-24T20:02:00.000-04:00' }),
  ];
  let hydrated = [];
  const garden = { hydrate(messages) { hydrated = messages; } };
  const receipt = await hydrateAspectGrowthGardenFromHouse(garden, {
    token: 'test-token',
    recentLimit: 2,
    read: async () => ({ entries }),
  });
  assert.equal(receipt.status, 'hydrated');
  assert.equal(receipt.durableCount, 1);
  assert.deepEqual(new Set(hydrated.map((entry) => entry.id)), new Set(['growth-old', 'reply-2', 'reply-3']));
  assert.equal(hydrated.find((entry) => entry.id === 'growth-old').body.type, 'preference');
});
