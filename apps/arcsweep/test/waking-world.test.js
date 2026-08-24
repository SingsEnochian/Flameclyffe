import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CURRENT_REALITY_ANCHOR_URL,
  ensureTerraPrimeWakingWorld,
  isWakingWorld,
  wakingWorldLiveEntries,
} from '../src/waking-world.js';

const T0 = '2026-08-20T20:00:00.000Z';

test('creates Terra Prime only when no Waking World already exists and receipts its birth', () => {
  const state = { worlds: [] };
  const result = ensureTerraPrimeWakingWorld(state, T0);
  assert.equal(result.created, true);
  assert.equal(result.world.id, 'terra-prime');
  assert.equal(result.world.name, 'Terra Prime');
  assert.equal(result.world.kind, 'Waking World');
  assert.equal(result.world.wakingWorld.stable_anchor.source_url, CURRENT_REALITY_ANCHOR_URL);
  assert.deepEqual(result.world.wakingWorld.live_sources, ['arcsweep:waking-thread']);
  assert.deepEqual(result.world.wakingWorld.eligible_live_sources, ['house-runtime:observations', 'deep-time']);
  assert.equal(result.receipt.event, 'WORLD_BORN');
  assert.equal(result.receipt.worldId, 'terra-prime');
  assert.equal(result.receipt.bornAt, T0);
  assert.equal(result.receipt.source, 'waking-world-migration');
  assert.equal(result.receipt.sourceRef, 'terra-prime:create');
});

test('adopts an existing Waking World without changing its world id or inventing an unknown birth time', () => {
  const state = { worlds: [{ id: 'world-old-waking-id', name: 'Waking World', kind: 'Desired Reality', updatedAt: T0 }] };
  const result = ensureTerraPrimeWakingWorld(state, '2026-08-20T20:01:00.000Z');
  assert.equal(result.created, false);
  assert.equal(result.world.id, 'world-old-waking-id');
  assert.equal(result.world.name, 'Terra Prime');
  assert.equal(isWakingWorld(result.world), true);
  assert.equal(result.receipt.event, 'WORLD_BORN');
  assert.equal(result.receipt.bornAt, null);
  assert.equal(result.receipt.sourceRef, 'terra-prime:adopt-birth-time-unknown');
});

test('an adopted Waking World preserves its recorded createdAt as birth evidence', () => {
  const state = { worlds: [{ id: 'world-recorded-waking', name: 'Current Reality', kind: 'Waking World', createdAt: '2026-06-01T12:00:00.000Z', updatedAt: T0 }] };
  const result = ensureTerraPrimeWakingWorld(state, '2026-08-20T20:01:00.000Z');
  assert.equal(result.receipt.bornAt, '2026-06-01T12:00:00.000Z');
  assert.equal(result.receipt.sourceRef, 'terra-prime:adopt-recorded-createdAt');
});

test('an existing WORLD_BORN receipt remains singular when Terra Prime metadata is refreshed', () => {
  const receipt = { schema: 'arcsweep.world-birth-receipt/v1', event: 'WORLD_BORN', id: 'world-born:terra-prime:old', worldId: 'terra-prime', bornAt: null };
  const state = { worlds: [{ id: 'terra-prime', name: 'Terra Prime', kind: 'Waking World' }], worldBirthReceipts: [receipt] };
  const result = ensureTerraPrimeWakingWorld(state, T0);
  assert.equal(result.receipt.id, receipt.id);
  assert.equal(result.state.worldBirthReceipts.length, 1);
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
