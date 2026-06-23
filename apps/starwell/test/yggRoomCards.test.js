import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveInputWeather } from '../src/interaction/starwellInputWeather.js';
import { createYggRoomBuilderProposal, yggRoomTemplates } from '../src/interfaces/yggInterfaceRegistry.js';
import {
  createYggRoomCardDeck,
  createYggRoomSeedCard,
  createYggTemplateCard,
  createYggWeatherSceneCard,
  validateYggRoomCardDeck,
} from '../src/interfaces/yggRoomCards.js';
import { createWeatherSoundProposal } from '../src/sound/weatherSoundConductor.js';

test('template cards expose preview-safe room metadata', () => {
  const card = createYggTemplateCard(yggRoomTemplates[0]);

  assert.equal(card.type, 'template-card');
  assert.equal(card.guardrails.requiresReviewForCanon, true);
  assert.equal(card.guardrails.autoplay, false);
  assert.equal(card.fields.some((field) => field.label === 'Sound'), true);
});

test('room seed card handles empty and drafted states', () => {
  const empty = createYggRoomSeedCard();
  const proposal = createYggRoomBuilderProposal({ templateId: 'tone-lab' });
  const card = createYggRoomSeedCard(proposal);

  assert.equal(empty.status, 'waiting');
  assert.equal(card.type, 'room-seed-card');
  assert.equal(card.status, 'local-preview');
  assert.equal(card.guardrails.noCanonWrites, true);
  assert.equal(card.guardrails.autoplay, false);
});

test('weather scene card summarizes crossfade plan without activating output', () => {
  const proposal = createWeatherSoundProposal({
    text: 'Grow a quiet room from Ygg Gate.',
    node: { id: 'ygg-gate', kind: 'instrument', theme: { biome: 'threshold-root', palette: 'north-star-gold-green' } },
    inputWeather: resolveInputWeather({ typing: { cadence: 0.7 }, pointer: { drift: 0.3 } }),
  });
  const card = createYggWeatherSceneCard(proposal);

  assert.equal(card.type, 'weather-scene-card');
  assert.equal(card.status, 'preview only');
  assert.equal(card.guardrails.noAutoplay, true);
  assert.equal(card.guardrails.appliedToPlayback, false);
  assert.equal(card.fields.some((field) => field.label === 'Crossfade'), true);
});

test('room card deck validates all cards together', () => {
  const roomProposal = createYggRoomBuilderProposal({ templateId: 'hearth-nook' });
  const weatherSoundProposal = createWeatherSoundProposal({
    text: 'Soft hearth room.',
    node: roomProposal.node,
    inputWeather: resolveInputWeather({ typing: { cadence: 0.2 }, pointer: { drift: 0.1 } }),
  });
  const deck = createYggRoomCardDeck({ templates: yggRoomTemplates, roomProposal, weatherSoundProposal });

  assert.equal(deck.templates.length, yggRoomTemplates.length);
  assert.equal(deck.roomSeed.type, 'room-seed-card');
  assert.equal(deck.weatherScene.type, 'weather-scene-card');
  assert.deepEqual(validateYggRoomCardDeck(deck), []);
});
