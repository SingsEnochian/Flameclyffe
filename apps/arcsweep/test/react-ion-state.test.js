import test from 'node:test';
import assert from 'node:assert/strict';

import { createDefaultState, normaliseState } from '../src/storage.js';
import {
  LEGACY_REACTION_HELM_KEY,
  LEGACY_REACTION_REGISTRY_KEY,
  REACTION_STATE_SCHEMA,
  appendReactionHelmReceipt,
  createEmptyReactionState,
  ensureReactionState,
  migrateLegacyReactionSidecars,
  setReactionRegistry,
} from '../src/react-ion-state.js';

function fakeStorage(entries = {}) {
  const data = new Map(Object.entries(entries));
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    has: (key) => data.has(key),
  };
}

test('React-ion state is typed and can be attached to current Hearthfire state without replacing storage', () => {
  const state = createDefaultState();
  const reaction = ensureReactionState(state);
  assert.equal(reaction.schema, REACTION_STATE_SCHEMA);
  assert.deepEqual(reaction.registry.destinations, []);
  assert.deepEqual(reaction.helm.receipts, []);

  setReactionRegistry(state, {
    version: 1,
    destinations: [{ id: 'dest-1' }],
    corridors: [],
  });
  appendReactionHelmReceipt(state, { receipt_id: 'helm-1', status: 'planned' });

  assert.equal(state.reaction.registry.destinations[0].id, 'dest-1');
  assert.equal(state.reaction.helm.receipts[0].receipt_id, 'helm-1');
});

test('current Arcsweep normalisation preserves React-ion extension state through save-shaped JSON', () => {
  const state = createDefaultState();
  state.reaction = createEmptyReactionState();
  state.reaction.registry.destinations.push({ id: 'terra', state: 'approved' });
  state.reaction.helm.receipts.push({ receipt_id: 'helm-a' });

  const roundTrip = normaliseState(JSON.parse(JSON.stringify(state)));
  assert.equal(roundTrip.reaction.schema, REACTION_STATE_SCHEMA);
  assert.equal(roundTrip.reaction.registry.destinations[0].id, 'terra');
  assert.equal(roundTrip.reaction.helm.receipts[0].receipt_id, 'helm-a');
});

test('legacy donor sidecars import once into Hearthfire state and remain preserved as historical keys', () => {
  const storage = fakeStorage({
    [LEGACY_REACTION_REGISTRY_KEY]: JSON.stringify({
      version: 1,
      destinations: [{ id: 'legacy-terra' }],
      corridors: [{ id: 'legacy-corridor' }],
    }),
    [LEGACY_REACTION_HELM_KEY]: JSON.stringify({
      version: 1,
      receipts: [{ receipt_id: 'legacy-helm' }],
    }),
  });
  const state = createDefaultState();

  const migrated = migrateLegacyReactionSidecars(state, {
    storage,
    migratedAt: '2026-08-19T05:50:00.000Z',
  });

  assert.equal(migrated.changed, true);
  assert.equal(state.reaction.registry.destinations[0].id, 'legacy-terra');
  assert.equal(state.reaction.helm.receipts[0].receipt_id, 'legacy-helm');
  assert.equal(migrated.receipt.destination, 'arcsweep-state.reaction');
  assert.equal(migrated.receipt.authority.legacy_sidecars_are_not_live_truth_stores, true);
  assert.equal(storage.has(LEGACY_REACTION_REGISTRY_KEY), true);
  assert.equal(storage.has(LEGACY_REACTION_HELM_KEY), true);

  const second = migrateLegacyReactionSidecars(state, {
    storage,
    migratedAt: '2026-08-19T05:51:00.000Z',
  });
  assert.equal(second.changed, false);
  assert.equal(second.receipt, null);
});
