import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WAYGLASS_ORGAN_SCHEMA,
  createWayglassOrgan,
  registerWayglassOrgan,
  listWayglassOrgans,
  clearWayglassOrgansForTest,
} from '../src/organ-registry.js';
import { FIRST_WAYGLASS_ORGANS, presenceOrgan, memoryOrgan, sensoriumOrgan, voiceConsentOrgan } from '../src/organ-donors.js';

test.beforeEach(() => clearWayglassOrgansForTest());

test('first four donor organs share one registry contract and preserve heterogeneous lineage', () => {
  FIRST_WAYGLASS_ORGANS.forEach(registerWayglassOrgan);
  const mounted = listWayglassOrgans();
  assert.equal(mounted.length, 4);
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


test('continuity references use organ IDs and evidence refs without importing organ authority', () => {
  for (const organ of FIRST_WAYGLASS_ORGANS) {
    const ref = { organ_id: organ.organ_id, evidence_ref: 'receipt:' + organ.organ_id };
    assert.match(ref.organ_id, /^wayglass\.organ\./);
    assert.ok(ref.evidence_ref);
    assert.equal(ref.authority_grant, undefined);
    assert.equal(ref.canon_commit, undefined);
  }
});

test('sensorium embodiment continuity is capability redetection, never device identity', () => {
  assert.ok(sensoriumOrgan.embodiment_hooks.includes('redetect-output-capabilities-on-return'));
  assert.ok(!sensoriumOrgan.continuity_hooks.includes('device-identity'));
  assert.ok(!sensoriumOrgan.authority_ceiling.includes('participant-redefinition'));
});


test('presence continuity keeps participant identity stable across provider rebinding', () => {
  const before = presenceOrgan.adapter.createPresence({ identityId:'rowan', sessionId:'outbound', providerId:'ollama', modelId:'ornith-1.5', createdAt:'2026-10-06T20:00:00.000Z' });
  const after = presenceOrgan.adapter.rebindPresenceProvider(before, { providerId:'huggingface', modelId:'omni', updatedAt:'2026-10-06T21:00:00.000Z' });
  assert.equal(after.identity_id, before.identity_id);
  assert.notEqual(after.provider_binding.provider_id, before.provider_binding.provider_id);
  assert.notEqual(after.provider_binding.model_id, before.provider_binding.model_id);
});

test('voice consent organ is explicitly partial; no live StepAudio or canon authority claimed', () => {
  assert.equal(voiceConsentOrgan.maturity, 'PARTIAL');
  assert.equal(typeof voiceConsentOrgan.adapter.createWayglassVoiceBoundary, 'function');
  assert.equal(voiceConsentOrgan.adapter.connectStepAudio, undefined);
  assert.ok(voiceConsentOrgan.embodiment_hooks.includes('reconfirm-microphone-consent-on-return'));
  assert.equal(voiceConsentOrgan.authority_ceiling.includes('canon-commit'), false);
  const boundary = voiceConsentOrgan.adapter.createWayglassVoiceBoundary({ participantId: 'rowan', roomId: 'commons' });
  assert.equal(boundary.snapshot().send_enabled, false);
});
