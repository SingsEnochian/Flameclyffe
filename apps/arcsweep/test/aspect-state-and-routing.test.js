import assert from 'node:assert/strict';
import test from 'node:test';

import { createAspectSharedState } from '../src/aspects/aspect-state.js';
import { HOUSE_COMMONS_ROOMS, routeAspectEnvelopeToCommons } from '../src/aspects/house-commons-routing.js';

test('shared state preserves distinct authorship instead of flattening contributions', () => {
  const state = createAspectSharedState();
  state.contribute({ id: 'c1', aspectId: 'continuity', kind: 'observation', content: 'Chronology disagrees with this branch.' });
  state.contribute({ id: 'c2', aspectId: 'narrative', kind: 'proposal', content: 'Keep the contradiction and branch it.' });

  const snapshot = state.snapshot();
  assert.equal(snapshot.contributions.length, 2);
  assert.equal(snapshot.contributions[0].aspectId, 'continuity');
  assert.equal(snapshot.contributions[1].aspectId, 'narrative');
});

test('ordinary aspect life routes to agent chatter rather than action', () => {
  const route = routeAspectEnvelopeToCommons({ kind: 'proposal', body: { text: 'What if memory were relational?' } });
  assert.equal(route.roomId, HOUSE_COMMONS_ROOMS.chatter);
  assert.equal(route.reason, 'ordinary-aspect-life');
});

test('verified operational results route to action', () => {
  const route = routeAspectEnvelopeToCommons({ kind: 'verification', body: { operational: true } });
  assert.equal(route.roomId, HOUSE_COMMONS_ROOMS.action);
});

test('narrative exploration routes to roleplay without canon promotion', () => {
  const route = routeAspectEnvelopeToCommons({ kind: 'proposal', body: { mode: 'exploration', domain: 'narrative' } });
  assert.equal(route.roomId, HOUSE_COMMONS_ROOMS.roleplay);
});
