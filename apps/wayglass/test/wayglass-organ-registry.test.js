import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WAYGLASS_ORGAN_SCHEMA,
  createWayglassOrgan,
  registerWayglassOrgan,
  listWayglassOrgans,
  clearWayglassOrgansForTest,
} from '../src/organ-registry.js';
import { FIRST_WAYGLASS_ORGANS, presenceOrgan, memoryOrgan, sensoriumOrgan } from '../src/organ-donors.js';

test.beforeEach(() => clearWayglassOrgansForTest());

test('first three donor organs share one registry contract and preserve heterogeneous lineage', () => {
  FIRST_WAYGLASS_ORGANS.forEach(registerWayglassOrgan);
  const mounted = listWayglassOrgans();
  assert.equal(mounted.length, 3);
  assert.ok(mounted.every((organ) => organ.schema === WAYGLASS_ORGAN_SCHEMA));
  assert.notDeepEqual(presenceOrgan.capabilities, memoryOrgan.capabilities);
  assert.notDeepEqual(memoryOrgan.capabilities, sensoriumOrgan.capabilities);
  assert.ok(presenceOrgan.lineage.includes('arcsweep:presence-fabric'));
  assert.ok(memoryOrgan.lineage.includes('arcsweep:worldseed-braid'));
  assert.deepEqual(sensoriumOrgan.lineage, ['arcsweep:somatic-runtime']);
});

test('duplicate organ IDs fail closed', () => {
  registerWayglassOrgan(presenceOrgan);
  assert.throws(() => registerWayglassOrgan(presenceOrgan), /duplicate organ_id/);
});

test('organ declarations cannot grant vessel-level identity, canon, relationship or authority powers', () => {
  for (const authority of ['identity-mutation', 'relationship-mutation', 'canon-commit', 'authority-grant', 'participant-redefinition']) {
    assert.throws(() => createWayglassOrgan({
      organ_id: 'wayglass.organ.bad-' + authority,
      lineage: ['test:fixture'],
      maturity: 'SPECIFIED',
      authority_ceiling: [authority],
    }), /cannot grant vessel authority/);
  }
});

test('presence provider rebinding changes substrate without redefining identity', () => {
  const presence = presenceOrgan.adapter.createPresence({
    identityId: 'rowan',
    sessionId: 'session-a',
    providerId: 'provider-a',
    modelId: 'model-a',
    createdAt: '2026-10-06T20:00:00.000Z',
  });
  const rebound = presenceOrgan.adapter.rebindPresenceProvider(presence, {
    providerId: 'provider-b',
    modelId: 'model-b',
    updatedAt: '2026-10-06T20:01:00.000Z',
  });
  assert.equal(rebound.identity_id, 'rowan');
  assert.equal(rebound.provider_binding.provider_id, 'provider-b');
  assert.equal(rebound.provider_binding.model_id, 'model-b');
});

test('memory mount exposes snapshot/replay inspection but not canon mutation', () => {
  assert.equal(typeof memoryOrgan.adapter.worldseedBraidSnapshot, 'function');
  assert.equal(memoryOrgan.adapter.carryRecordToCanon, undefined);
  assert.ok(memoryOrgan.authority_ceiling.includes('propose-canon-carry'));
  assert.ok(!memoryOrgan.authority_ceiling.includes('canon-commit'));
});

test('sensorium mount is inert until explicitly invoked and retains Feather stop', () => {
  assert.equal(typeof sensoriumOrgan.adapter.emitSomaticCue, 'function');
  assert.equal(typeof sensoriumOrgan.adapter.stopSomaticCue, 'function');
  assert.equal(sensoriumOrgan.adapter.stopSomaticCue('Feather'), false);
});
