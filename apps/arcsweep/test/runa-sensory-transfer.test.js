import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RUNA_SENSORY_PLAN_SCHEMA,
  RUNA_SENSORY_RENDER_SCHEMA,
  RUNA_SENSORY_RESPONSE_SCHEMA,
  compileSensoryTransferPlan,
  createDefaultSensoryTransferProfile,
  createSensoryTransferRenderReceipt,
  createSensoryTransferResponse,
  profileWithCalibrationReceipt,
} from '../src/runa-sensory-transfer.js';

const WORLD = {
  id: 'terra-aeterna',
  name: 'Terra Aeterna',
  soundscape: { rootHz: 220 },
};

const STAMP = '2026-08-24T18:00:00.000Z';

function profile() {
  return createDefaultSensoryTransferProfile({ participantRef: 'Rowan', createdAt: STAMP });
}

test('AIR, BONE, and FIELD preserve one semantic key while changing carriers', async () => {
  const base = profile();
  const air = await compileSensoryTransferPlan({ world: WORLD, profile: base, semanticKey: 'presence', mode: 'air', generatedAt: STAMP });
  const bone = await compileSensoryTransferPlan({ world: WORLD, profile: base, semanticKey: 'presence', mode: 'bone', generatedAt: STAMP });
  const field = await compileSensoryTransferPlan({ world: WORLD, profile: base, semanticKey: 'presence', mode: 'field', generatedAt: STAMP });

  assert.equal(air.schema, RUNA_SENSORY_PLAN_SCHEMA);
  assert.equal(air.semantic.key, 'presence');
  assert.equal(bone.semantic.key, 'presence');
  assert.equal(field.semantic.key, 'presence');

  assert.deepEqual(air.transfer.carrier_plans.map((item) => item.carrier), ['air_audio']);
  assert.deepEqual(bone.transfer.carrier_plans.map((item) => item.carrier), ['surface_haptic']);
  assert.deepEqual(field.transfer.carrier_plans.map((item) => item.carrier), ['air_audio', 'surface_haptic']);
  assert.equal(field.transfer.coupling.semantic_invariant, 'presence');
  assert.equal(field.authority.semantic_invariant_preserved_across_carriers, true);
});

test('BONE surface haptics do not counterfeit a frequency-controllable bone-conduction path', async () => {
  const plan = await compileSensoryTransferPlan({ world: WORLD, profile: profile(), semanticKey: 'crossing', mode: 'bone', generatedAt: STAMP });
  const haptic = plan.transfer.carrier_plans[0];
  assert.equal(haptic.carrier, 'surface_haptic');
  assert.equal(haptic.frequency_hz, null);
  assert.match(haptic.note, /timing, not a guaranteed actuator frequency/i);
});

test('FIELD keeps world harmonic lineage on the AIR carrier', async () => {
  const plan = await compileSensoryTransferPlan({ world: WORLD, profile: profile(), semanticKey: 'call', mode: 'field', generatedAt: STAMP });
  const audio = plan.transfer.carrier_plans.find((item) => item.carrier === 'air_audio');
  assert.equal(audio.harmonic_lineage.root_hz, 220);
  assert.equal(audio.harmonic_lineage.ratio, 1.5);
  assert.equal(audio.frequency_hz, 330);
  assert.equal(plan.authority.persistent_world_root_mutable, false);
});

test('render receipts report unsupported haptics without pretending they rendered', async () => {
  const plan = await compileSensoryTransferPlan({ world: WORLD, profile: profile(), semanticKey: 'stability', mode: 'field', generatedAt: STAMP });
  const receipt = await createSensoryTransferRenderReceipt({
    plan,
    launchedBy: 'Rowan',
    launchedAt: STAMP,
    completedAt: '2026-08-24T18:00:02.800Z',
    runtime: {
      audio_requested: true,
      audio_rendered: true,
      haptic_requested: true,
      haptic_supported: false,
      haptic_rendered: false,
      rendered_carriers: ['air_audio'],
      actual_duration_ms: 2800,
      stopped_early: false,
    },
  });
  assert.equal(receipt.schema, RUNA_SENSORY_RENDER_SCHEMA);
  assert.equal(receipt.runtime.audio_rendered, true);
  assert.equal(receipt.runtime.haptic_supported, false);
  assert.equal(receipt.runtime.haptic_rendered, false);
  assert.deepEqual(receipt.runtime.rendered_carriers, ['air_audio']);
  assert.equal(receipt.authority.runtime_capability_reported_truthfully, true);
});

test('participant response is first-person evidence and never manufactures Qualia or PREMAQC', async () => {
  const plan = await compileSensoryTransferPlan({ world: WORLD, profile: profile(), semanticKey: 'release', mode: 'air', generatedAt: STAMP });
  const render = await createSensoryTransferRenderReceipt({
    plan,
    launchedBy: 'Rowan',
    runtime: {
      audio_requested: true,
      audio_rendered: true,
      haptic_requested: false,
      haptic_supported: false,
      haptic_rendered: false,
      rendered_carriers: ['air_audio'],
      actual_duration_ms: 2800,
    },
    launchedAt: STAMP,
    completedAt: '2026-08-24T18:00:02.800Z',
  });
  const response = await createSensoryTransferResponse({
    renderReceipt: render,
    noticed: true,
    identifiedSemanticKey: 'release',
    clarity: 5,
    comfort: 4,
    confidence: 5,
    participantReport: 'The decay was distinct.',
    recordedAt: '2026-08-24T18:00:03.000Z',
  });
  assert.equal(response.schema, RUNA_SENSORY_RESPONSE_SCHEMA);
  assert.equal(response.participant_report.clarity, 5);
  assert.equal(response.authority.firsthand_report_only, true);
  assert.equal(response.authority.qualia_inferred, false);
  assert.equal(response.authority.premaqc_inferred, false);
  assert.equal('Q' in response, false);
});

test('calibration advances the profile by version instead of silently mutating it', async () => {
  const original = profile();
  const plan = await compileSensoryTransferPlan({ world: WORLD, profile: original, semanticKey: 'response', mode: 'field', generatedAt: STAMP });
  const render = await createSensoryTransferRenderReceipt({
    plan,
    launchedBy: 'Rowan',
    runtime: {
      audio_requested: true,
      audio_rendered: true,
      haptic_requested: true,
      haptic_supported: true,
      haptic_rendered: true,
      rendered_carriers: ['air_audio', 'surface_haptic'],
      actual_duration_ms: 2800,
    },
    launchedAt: STAMP,
    completedAt: '2026-08-24T18:00:02.800Z',
  });
  const response = await createSensoryTransferResponse({
    renderReceipt: render,
    noticed: true,
    clarity: 4,
    comfort: 5,
    confidence: 4,
    recordedAt: '2026-08-24T18:00:03.000Z',
  });
  const next = profileWithCalibrationReceipt(original, response, { updatedAt: '2026-08-24T18:00:04.000Z' });
  assert.equal(original.version, 1);
  assert.equal(next.version, 2);
  assert.notEqual(next.profile_id, original.profile_id);
  assert.deepEqual(original.calibration_receipt_refs, []);
  assert.deepEqual(next.calibration_receipt_refs, [response.response_id]);
  assert.equal(next.authority.qualia_inferred, false);
});
