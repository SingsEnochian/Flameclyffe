import assert from 'node:assert/strict';
import test from 'node:test';
import { createDestinationRegistration } from '../src/react-ion-registry.js';
import {
  currentApprovedWorldTones,
  syncApprovedWorldTonesToRegistry,
} from '../src/react-ion-world-tone-sync.js';

function receipt({ candidate, world = 'world-terra', decision, root = 220, createdAt, hash = null }) {
  return {
    schema: 'hearthgate.world-tone-approval-receipt.v1',
    candidate_hash: candidate,
    world_id: world,
    world_name: world === 'world-terra' ? 'Terra Aeterna' : 'Other',
    profile_version: 'v1',
    tone_layer_id: 'world-hum',
    root_hz: root,
    decision,
    receipt_hash: hash,
    created_at: createdAt,
  };
}

test('uses the latest decision per candidate and then the newest still-approved candidate per world', () => {
  const tones = currentApprovedWorldTones([
    receipt({ candidate: 'a', decision: 'approved', root: 220, createdAt: '2026-08-13T05:30:00.000Z' }),
    receipt({ candidate: 'a', decision: 'rejected', root: 220, createdAt: '2026-08-13T05:31:00.000Z' }),
    receipt({ candidate: 'b', decision: 'approved', root: 221, createdAt: '2026-08-13T05:32:00.000Z' }),
    receipt({ candidate: 'c', decision: 'approved', root: 222, createdAt: '2026-08-13T05:29:00.000Z' }),
  ]);

  assert.equal(tones['world-terra'].candidate_hash, 'b');
  assert.equal(tones['world-terra'].root_hz, 221);
});

test('hydrates an existing world-level destination without inventing its dimensional address from frequency', async () => {
  const destination = await createDestinationRegistration({
    id: 'dest-terra',
    name: 'terra',
    kind: 'world',
    worldId: 'world-terra',
    worldName: 'Terra Aeterna',
    address: '1.2.3.4',
    state: 'approved',
    updatedAt: '2026-08-13T05:30:00.000Z',
  });
  const result = await syncApprovedWorldTonesToRegistry({
    store: { destinations: [destination], corridors: [] },
    approvalReceipts: [receipt({
      candidate: 'candidate-terra',
      decision: 'approved',
      root: 220,
      createdAt: '2026-08-13T05:31:00.000Z',
      hash: 'a'.repeat(64),
    })],
    syncedAt: '2026-08-13T05:32:00.000Z',
  });

  const refreshed = result.store.destinations[0];
  assert.equal(refreshed.address, '1.2.3.4');
  assert.equal(refreshed.harmonic.root_hz, 220);
  assert.equal(refreshed.harmonic.profile_version, 'v1');
  assert.equal(refreshed.harmonic.evidence_class, 'symbolic');
  assert.match(refreshed.harmonic.source_ref, /^hearthgate\.world-tone-approval:/);
  assert.equal(result.authority.dimensional_address_is_never_created_from_frequency_alone, true);
});

test('reports an approved tone that has no world-level dimensional destination instead of fabricating one', async () => {
  const result = await syncApprovedWorldTonesToRegistry({
    store: { destinations: [], corridors: [] },
    approvalReceipts: [receipt({
      candidate: 'candidate-missing',
      world: 'world-missing',
      decision: 'approved',
      root: 333,
      createdAt: '2026-08-13T05:33:00.000Z',
    })],
    syncedAt: '2026-08-13T05:34:00.000Z',
  });

  assert.equal(result.store.destinations.length, 0);
  assert.equal(result.report.missing_destination.length, 1);
  assert.equal(result.report.missing_destination[0].world_id, 'world-missing');
});
