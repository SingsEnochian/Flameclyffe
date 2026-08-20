import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSceneCognitionPrompt,
  createSceneObservationCell,
  normaliseSceneCognitionObservations,
  parseSceneCognitionResponse,
  sceneEvidenceMatches,
} from '../src/scene-cognition.js';

const packet = {
  contract: 'arcsweep.writer-context-packet/v2',
  mode: 'writing',
  requestId: 'writer-test-1',
  fieldContext: {
    field: {
      key: 'script-form:content',
      label: 'Reference script',
      type: 'rich-text',
      value: "Rain darkened the road. Kestrelle looked up. ‘Don’t move it yet,’ she said. She reached for the splinting board.",
    },
    page: {
      worldId: 'taaveren-vaen',
      worldIdAliases: ['taaveren-vaen', 'taveren-vaen'],
      documentId: 'scene-12',
      sceneId: 'roadside-care',
      storyAt: 'Restoration · roadside care',
      storyOrder: 12,
      povCharacterId: 'kestrelle',
      narrativeVoiceId: 'taaveren-vaen-narrator',
      writingStyleId: 'taaveren-vaen-longform',
    },
  },
  voices: [
    { voiceId: 'uial', displayName: 'Uial', cells: [] },
    { voiceId: 'lioreal', displayName: 'Lioreal', cells: [] },
  ],
  subjects: [
    { kind: 'character', id: 'kestrelle', label: 'Kestrelle al’Var', cells: [] },
    { kind: 'narrative_voice', id: 'taaveren-vaen-narrator', label: 'Ta’veren Vaen Narrative Voice', cells: [] },
    { kind: 'writing_style', id: 'taaveren-vaen-longform', label: 'Ta’veren Vaen Longform', cells: [] },
  ],
};

const uialReceipt = {
  voiceId: 'uial',
  voiceLabel: 'Uial',
  receiptId: 'scene-cognition-pass-1:uial',
  profileId: 'uial:fablevibes-v1',
  runtimeVerified: true,
  provider: 'ollama',
  model: 'uial:fablevibes-v1',
  sourceModel: 'tvall43/Qwen3.6-14B-A3B-FableVibes',
};

const liorealReceipt = {
  voiceId: 'lioreal',
  voiceLabel: 'Lioreal',
  receiptId: 'scene-cognition-pass-2:lioreal',
  profileId: 'lioreal:qwen3-14b-abliterated-v1',
  runtimeVerified: true,
  provider: 'ollama',
  model: 'lioreal:starwell-v1',
  sourceModel: 'mlabonne/Qwen3-14B-abliterated',
};

test('scene evidence verification tolerates typography quote variants while requiring scene presence', () => {
  assert.equal(sceneEvidenceMatches(packet.fieldContext.field.value, "'Don’t move it yet,' she said."), true);
  assert.equal(sceneEvidenceMatches(packet.fieldContext.field.value, 'She crossed the river at dawn.'), false);
});

test('scene cognition observation is keepable only with an active target and verified evidence', () => {
  const result = normaliseSceneCognitionObservations({ observations: [
    { target: { kind: 'character', id: 'kestrelle' }, observationKind: 'dialogue', claim: 'Kestrelle gives immediate practical instructions before explanation in this scene.', evidence: 'Don’t move it yet', confidence: 0.8 },
    { target: { kind: 'character', id: 'meriene' }, observationKind: 'dialogue', claim: 'Meriene speaks first.', evidence: 'Don’t move it yet', confidence: 0.2 },
    { target: { kind: 'narrative_voice', id: 'taaveren-vaen-narrator' }, observationKind: 'narrative', claim: 'The narrator opens from weather into embodied action.', evidence: 'The moon burned green above the road.', confidence: 0.9 },
  ] }, packet);
  assert.equal(result.observations[0].keepable, true);
  assert.equal(result.observations[1].keepable, false);
  assert.deepEqual(result.observations[1].reasons, ['target-not-active']);
  assert.equal(result.observations[2].keepable, false);
  assert.deepEqual(result.observations[2].reasons, ['evidence-not-found-in-scene']);
});

test('parsed cognition response preserves contribution and evidence receipts without storing anything', () => {
  const parsed = parseSceneCognitionResponse(JSON.stringify({
    contribution: 'The practical command lands before interpretation, which suits the scene.',
    observations: [{ target: { kind: 'character', id: 'kestrelle' }, observationKind: 'dialogue', claim: 'Kestrelle uses direct practical imperatives under immediate care pressure in this sample.', evidence: 'Don’t move it yet', confidence: 0.75 }],
  }), packet);
  assert.match(parsed.contribution, /practical command/);
  assert.equal(parsed.observations[0].keepable, true);
});

test('kept scene observation retains verified evidence, fictional story gate and vessel attestation', () => {
  const observation = normaliseSceneCognitionObservations({ observations: [{
    target: { kind: 'character', id: 'kestrelle' }, observationKind: 'dialogue', claim: 'Kestrelle uses direct practical imperatives under immediate care pressure in this sample.', evidence: 'Don’t move it yet', confidence: 0.75,
  }] }, packet).observations[0];
  const cell = createSceneObservationCell({ passId: 'scene-cognition-pass-1', voiceResult: uialReceipt, packet, observation });
  assert.equal(cell.subject.id, 'kestrelle');
  assert.equal(cell.authority.kind, 'model_inference');
  assert.equal(cell.source.excerpt, 'Don’t move it yet');
  assert.equal(cell.source.evidenceVerified, true);
  assert.equal(cell.source.modelProfileId, 'uial:fablevibes-v1');
  assert.equal(cell.source.sourceModel, 'tvall43/Qwen3.6-14B-A3B-FableVibes');
  assert.equal(cell.source.runtimeVerified, true);
  assert.equal(cell.temporal.storyOrderFrom, 12);
  assert.ok(cell.tags.includes('runtime-attested'));
});

test('unattested scene observations cannot become learned cells', () => {
  const observation = normaliseSceneCognitionObservations({ observations: [{
    target: { kind: 'character', id: 'kestrelle' }, observationKind: 'dialogue', claim: 'A claim.', evidence: 'Don’t move it yet', confidence: 0.5,
  }] }, packet).observations[0];
  assert.throws(() => createSceneObservationCell({ passId: 'bad', voiceResult: { voiceId: 'uial' }, packet, observation }), /attested runtime vessel receipt/);
});

test('narrator evidence does not inherit character story-order validity', () => {
  const observation = normaliseSceneCognitionObservations({ observations: [{
    target: { kind: 'narrative_voice', id: 'taaveren-vaen-narrator' }, observationKind: 'narrative', claim: 'The narrator moves from weather into concrete bodily action in this sample.', evidence: 'Rain darkened the road.', confidence: 0.7,
  }] }, packet).observations[0];
  const cell = createSceneObservationCell({ passId: 'scene-cognition-pass-2', voiceResult: liorealReceipt, packet, observation });
  assert.equal(cell.subject.kind, 'narrative_voice');
  assert.equal(cell.temporal.storyOrderFrom, null);
  assert.equal(cell.source.modelProfileId, 'lioreal:qwen3-14b-abliterated-v1');
});

test('scene cognition prompt names active targets and treats quiet as a valid response', () => {
  const prompt = buildSceneCognitionPrompt(packet, packet.voices[0]);
  assert.match(prompt, /character:kestrelle/);
  assert.match(prompt, /narrative_voice:taaveren-vaen-narrator/);
  assert.match(prompt, /writing_style:taaveren-vaen-longform/);
  assert.match(prompt, /Quiet is a valid response/);
  assert.match(prompt, /Evidence must be a short excerpt copied from the current scene prose/);
});
