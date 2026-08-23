import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EARTH_PRIME_WORLD_ID,
  createCrossingEnvelope,
  createProjectionReceipt,
  createResponseAuthority,
  createStateSnapshot,
  resolveWorldIdentity,
} from '../src/bifrost-crossing-envelope.js';

test('Earth Prime and Terra Prime resolve to one stable source identity', () => {
  assert.equal(resolveWorldIdentity('Earth Prime'), EARTH_PRIME_WORLD_ID);
  assert.equal(resolveWorldIdentity('Terra Prime'), EARTH_PRIME_WORLD_ID);
  assert.equal(resolveWorldIdentity('terra-prime'), EARTH_PRIME_WORLD_ID);
});

test('state snapshots preserve local labels while resolving stable identity', () => {
  const snapshot = createStateSnapshot({
    worldIdentity: 'Terra Prime',
    frameworkLabel: 'Terra Prime',
    worldRevision: 1,
    stateId: 'tp-state-001',
    stateHash: 'sha256:abc',
    effectiveAt: '2026-08-23T04:00:00.000Z',
    premaqcVersion: 'premaqc/v1',
    spiralSchemaVersion: 'spiral-state/v1',
  });
  assert.equal(snapshot.world_identity, EARTH_PRIME_WORLD_ID);
  assert.equal(snapshot.framework_label, 'Terra Prime');
  assert.equal(snapshot.state_id, 'tp-state-001');
});

test('projections declare one sealed input state and response authority', () => {
  const authority = createResponseAuthority({ register: 'DETERMINISTIC_ENGINE', producer: 'runa' });
  const receipt = createProjectionReceipt({
    projectionType: 'runa',
    inputStateId: 'crossing-state-001',
    implementation: 'runa-harmonic-state-projector',
    artifactId: 'runa:001',
    authority,
  });
  assert.equal(receipt.input_state_id, 'crossing-state-001');
  assert.equal(receipt.authority.register, 'DETERMINISTIC_ENGINE');
});

test('crossing envelope binds both shores, translation residue, and replay lineage', () => {
  const source = createStateSnapshot({
    worldIdentity: 'Earth Prime', worldRevision: 1, stateId: 'earth:001', stateHash: 'sha256:earth', effectiveAt: '2026-08-23T04:00:00.000Z',
  });
  const destination = createStateSnapshot({
    worldIdentity: 'terra-aeterna', worldRevision: 12, stateId: 'ta:pre:001', stateHash: 'sha256:ta', effectiveAt: '2026-08-23T04:00:00.000Z',
  });
  const envelope = createCrossingEnvelope({
    crossingId: 'bridge-test-001:outbound',
    source,
    destination,
    translation: {
      profile_id: 'earth-prime-to-terra-aeterna',
      profile_version: 'v1',
      declared_intention: 'bridge-test-001',
      candidate_invariants: ['identity_lineage', 'provenance', 'agency', 'declared_intention'],
      transformed_fields: ['tone', 'glyph_geometry', 'sound_palette'],
      untranslatable: ['world_local_example'],
      status: 'PARTIALLY_TRANSLATED',
    },
    lineage: { receipt_id: 'crossing:001', previous_receipt: null },
  });
  assert.equal(envelope.source.world_identity, EARTH_PRIME_WORLD_ID);
  assert.equal(envelope.destination.world_identity, 'terra-aeterna');
  assert.deepEqual(envelope.translation.untranslatable, ['world_local_example']);
  assert.equal(Object.isFrozen(envelope), true);
});
