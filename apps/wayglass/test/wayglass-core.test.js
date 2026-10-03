import test from 'node:test';
import assert from 'node:assert/strict';

import { createInteractionState } from '../src/interaction-state.js';
import { normaliseMaterialSignal } from '../src/material-state.js';
import { pointerMaterialState } from '../src/motion-choreography.js';
import { publicWayglassRoutes, resolveWayglassRoute } from '../../../lib/wayglass-route-registry.js';

test('Wayglass interaction state keeps IC/OOC, turn owner, and ownership separate', () => {
  const state = createInteractionState({ channel: 'IC', turn_owner: 'Rowan' });
  state.setOwnership({ character: 'Eilidh', owner: 'Rowan', permission: 'owned' });
  state.setOwnership({ character: 'Izar', owner: 'Crow', permission: 'owned' });
  state.setChannel('OOC');
  state.setTurnOwner('Crow');

  assert.deepEqual(state.snapshot(), {
    channel: 'OOC',
    turn_owner: 'Crow',
    character_ownership: [
      { character: 'Eilidh', owner: 'Rowan', permission: 'owned' },
      { character: 'Izar', owner: 'Crow', permission: 'owned' },
    ],
  });
});

test('Wayglass route catalogue exposes safe metadata but not API credentials', () => {
  const routes = publicWayglassRoutes();
  assert.ok(routes.some((route) => route.route_id === 'openai:gpt'));
  const json = JSON.stringify(routes);
  assert.doesNotMatch(json, /api_key/i);
  assert.doesNotMatch(json, /OPENAI_API_KEY/);
  assert.equal(resolveWayglassRoute('missing'), null);
});

test('registered GPT route is server resolved and extensible', () => {
  const route = resolveWayglassRoute('openai:gpt');
  assert.equal(route.provider, 'openai');
  assert.equal(route.capabilities.text, true);
  assert.equal(typeof route.model, 'function');
});


test('Wayglass material signals preserve semantics without letting visual state become canon', () => {
  assert.deepEqual(normaliseMaterialSignal({
    strength: 1.4,
    intent: 0.83,
    channel: 'OOC',
    ownership: 1,
    handoff_progress: 0.64,
    canon_state: 'unresolved',
    mode: 'handoff',
  }), {
    strength: 1,
    intent: 0.83,
    channel: 'OOC',
    ownership: 1,
    handoff_progress: 0.64,
    canon_state: 'unresolved',
    mode: 'handoff',
  });

  assert.deepEqual(normaliseMaterialSignal({
    channel: 'invented-channel',
    canon_state: 'definitely-canon',
    handoff_progress: -4,
  }), {
    strength: 0.72,
    intent: 0,
    channel: 'IC',
    ownership: 0,
    handoff_progress: 0,
    canon_state: 'candidate',
    mode: 'wake',
  });
});


test('Wayglass pointer choreography clamps optical motion inputs', () => {
  assert.deepEqual(pointerMaterialState({
    x: 500,
    y: 250,
    width: 1000,
    height: 500,
    velocity: 0.8,
  }), {
    x: 0.5,
    y: 0.5,
    velocity: 0.5,
  });

  assert.deepEqual(pointerMaterialState({
    x: -10,
    y: 900,
    width: 0,
    height: 100,
    velocity: 99,
  }), {
    x: 0,
    y: 1,
    velocity: 1,
  });
});
