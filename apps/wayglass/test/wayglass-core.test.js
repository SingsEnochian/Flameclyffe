import test from 'node:test';
import assert from 'node:assert/strict';

import { createInteractionState } from '../src/interaction-state.js';
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
