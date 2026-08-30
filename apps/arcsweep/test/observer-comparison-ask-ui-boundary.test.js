import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../src/observer-comparison-ask-ui.js', import.meta.url), 'utf8');

test('comparison Ask UI makes the pre-model boundary visible', () => {
  assert.match(source, /This step does not call a model/);
  assert.match(source, /continuity_effect: none/);
  assert.match(source, /No model has seen it and no relation or continuity state has changed/);
  assert.match(source, /Select for comparison Ask/);
});

test('comparison Ask UI has no model, relation, continuity, or canon mutation hooks', () => {
  assert.doesNotMatch(source, /invokeConstellationVoices/);
  assert.doesNotMatch(source, /appendHouseCommons/);
  assert.doesNotMatch(source, /reviewHouseObservation/);
  assert.doesNotMatch(source, /admitHouseObservationToDeepTime/);
  assert.doesNotMatch(source, /applyCanonPromotion/);
  assert.doesNotMatch(source, /deep_observer_event_relations/);
  assert.doesNotMatch(source, /candidate_correspondence/);
});
