import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CURRENT_REALITY_ANCHOR_URL,
  ensureTerraPrimeWakingWorld,
  isWakingWorld,
  wakingWorldLiveEntries,
} from '../src/waking-world.js';

const T0 = '2026-08-20T20:00:00.000Z';

test('creates Terra Prime only when no Waking World already exists', () => {
  const state = { worlds: [] };
  const result = ensureTerraPrimeWakingWorld(state, T0);
  assert.equal(result.created, true);
  assert.equal(result.world.id, 'terra-prime');
  assert.equal(result.world.name, 'Terra Prime');
  assert.equal(result.world.kind, 'Waking World');
  assert.equal(result.world.wakingWorld.stable_anchor.source_url, CURRENT_REALITY_ANCHOR_URL);
});

test('adopts an existing Waking World without changing its world id', () => {
  const state = { worlds: [{ id: 'world-old-waking-id', name: 'Waking World', kind: 'Desired Reality', updatedAt: T0 }] };
  const result = ensureTerraPrimeWakingWorld(state, '2026-08-20T20:01:00.000Z');
  assert.equal(result.created, false);
  assert.equal(result.world.id, 'world-old-waking-id');
  assert.equal(result.world.name, 'Terra Prime');
  assert.equal(isWakingWorld(result.world), true);
});

test('Waking Thread live entries are newest-first and bounded', () => {
  const state = { continuity: [
    { id: '1', title: 'Older', details: 'old', source: 'Self-entered', createdAt: '2026-08-20T18:00:00.000Z' },
    { id: '2', title: 'Newest', details: 'new', source: 'Self-entered', createdAt: '2026-08-20T19:00:00.000Z' },
  ] };
  const entries = wakingWorldLiveEntries(state, { limit: 1 });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].title, 'Newest');
  assert.equal(entries[0].observed_at, '2026-08-20T19:00:00.000Z');
});
