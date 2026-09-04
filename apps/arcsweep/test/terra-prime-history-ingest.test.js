import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TERRA_PRIME_HISTORY_INGEST,
  TERRA_PRIME_HISTORY_SCHEMA,
  completeWorldAppletFields,
  enrichAllWorldKnowledge,
  terraPrimeHistoryText,
} from '../src/terra-prime-history-ingest.js';

test('Terra Prime ingest spans cosmic, planetary, geological, human, House and multiverse lanes', () => {
  assert.equal(TERRA_PRIME_HISTORY_INGEST.schema, TERRA_PRIME_HISTORY_SCHEMA);
  assert.ok(TERRA_PRIME_HISTORY_INGEST.cosmologicalHistory.length >= 5);
  assert.ok(TERRA_PRIME_HISTORY_INGEST.solarAndPlanetaryHistory.length >= 6);
  assert.ok(TERRA_PRIME_HISTORY_INGEST.geologicalHistory.length >= 8);
  assert.ok(TERRA_PRIME_HISTORY_INGEST.biologicalAndHumanHistory.length >= 10);
  assert.ok(TERRA_PRIME_HISTORY_INGEST.houseWorkHistory.length >= 5);
  assert.ok(TERRA_PRIME_HISTORY_INGEST.multiverseHistory.length >= 5);
  assert.match(terraPrimeHistoryText(), /MULTIVERSE STATUS & HYPOTHESES/);
});

test('Terra Prime completion fills blank applet-backed fields and sets a 1:1 Waking World clock', () => {
  const world = {
    id: 'terra-prime', name: 'Terra Prime', kind: 'Waking World', description: '', history: '', rules: '',
    wakingWorld: { schema: 'arcsweep.waking-world/v1' },
    surface: {}, time: { wakingMinutes: 60, worldMinutes: 10080 }, arrival: {}, identity: {}, competencies: {},
    safetyWeave: {}, recall: {}, companion: {},
  };
  assert.equal(completeWorldAppletFields(world, { terraPrime: true, now: '2026-09-03T00:00:00.000Z' }), true);
  assert.match(world.history, /COSMIC HISTORY/);
  assert.match(world.history, /HOUSE \/ PROJECT HISTORY/);
  assert.equal(world.time.worldMinutes, 60);
  assert.equal(world.knowledgeAtlas.ingest.schema, TERRA_PRIME_HISTORY_SCHEMA);
  assert.match(world.identity.notes, /Waking World records/);
});

test('world completion is additive and never overwrites authored canon', () => {
  const world = {
    id: 'luna', name: 'Luna', kind: 'Desired Reality', description: 'Authored description',
    history: 'AUTHORED HISTORY', rules: 'AUTHORED RULES',
    surface: { appearance: 'Authored silver mirror' }, time: {}, arrival: {},
    identity: { name: 'AUTHORED PROTAGONIST' }, competencies: {}, safetyWeave: {}, recall: {}, companion: {},
  };
  completeWorldAppletFields(world, { terraPrime: false, now: '2026-09-03T00:00:00.000Z' });
  assert.equal(world.history, 'AUTHORED HISTORY');
  assert.equal(world.rules, 'AUTHORED RULES');
  assert.equal(world.surface.appearance, 'Authored silver mirror');
  assert.equal(world.identity.name, 'AUTHORED PROTAGONIST');
  assert.equal(world.knowledgeAtlas.canonHistory, 'AUTHORED HISTORY');
  assert.equal(world.knowledgeAtlas.unknownsRemainUnknown, true);
});

test('all-world enrichment identifies Waking World without importing Earth history into authored worlds', () => {
  const state = { worlds: [
    { id: 'terra-prime', name: 'Terra Prime', kind: 'Waking World', wakingWorld: { schema: 'arcsweep.waking-world/v1' }, surface: {}, time: {}, arrival: {}, identity: {}, competencies: {}, safetyWeave: {}, recall: {}, companion: {} },
    { id: 'terra-aeterna', name: 'Terra Aeterna', history: 'Colonists arrived after Starfall.', rules: 'World canon.', surface: {}, time: {}, arrival: {}, identity: {}, competencies: {}, safetyWeave: {}, recall: {}, companion: {} },
  ] };
  const result = enrichAllWorldKnowledge(state, '2026-09-03T00:00:00.000Z');
  assert.equal(result.changed, true);
  assert.match(state.worlds[0].history, /SOLAR, LUNAR & PLANETARY HISTORY/);
  assert.equal(state.worlds[1].history, 'Colonists arrived after Starfall.');
  assert.equal(state.worlds[1].knowledgeAtlas.sharedCosmologyRef, `terra-prime-history:${TERRA_PRIME_HISTORY_SCHEMA}`);
});
