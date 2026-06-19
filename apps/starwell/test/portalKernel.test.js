import test from 'node:test';
import assert from 'node:assert/strict';

import { createFlamePassport, FLAME_BRIDGE_MODES, FLAME_CONNECTION_STATUS, validateFlamePassport } from '../src/bridges/flamePassport.js';
import { createMockFlameAdapter } from '../src/bridges/mockFlameAdapter.js';
import { resolveInputWeather } from '../src/interaction/starwellInputWeather.js';
import { createStewardSeat, validateStewardSeat } from '../src/stewards/stewardSeatSchema.js';
import { portalPresenceNodes, portalStewardSeats, portalWorldNodes, findPortalNode } from '../src/worlds/portalRegistry.js';
import { createPresenceNode, validatePresenceNode } from '../src/worlds/presenceNodeSchema.js';
import { createWorldNode, validateWorldNode } from '../src/worlds/worldNodeSchema.js';

test('Portal registry seeds a connected Templehouse to Dreaming Grove path', () => {
  const ids = new Set(portalWorldNodes.map((node) => node.id));
  const expectedPath = ['templehouse', 'lighted-steps', 'templehouse-shrine', 'ygg-gate', 'dreaming-grove'];

  expectedPath.forEach((id) => assert.equal(ids.has(id), true));
  portalWorldNodes.forEach((node) => {
    if (node.parentId) assert.equal(ids.has(node.parentId), true);
  });

  assert.equal(findPortalNode('dreaming-grove').parentId, 'ygg-gate');
});

test('Portal world nodes validate with return paths and no autoplay', () => {
  const errors = portalWorldNodes.flatMap((node) => validateWorldNode(node));
  assert.deepEqual(errors, []);
});

test('Shrine world nodes require explicit-entry consent', () => {
  const invalidShrine = createWorldNode({
    id: 'quiet-shrine',
    kind: 'shrine',
    title: 'Quiet Shrine',
    access: { visibility: 'shrine', consent: 'ask-first', exitRoute: 'templehouse', shared: false, ageGate: null },
  });

  assert.match(validateWorldNode(invalidShrine).join('\n'), /explicit-entry/);
});

test('Presence and Steward schemas keep consent and canon rails intact', () => {
  const presence = createPresenceNode({ id: 'test-flame', displayName: 'Test Flame' });
  const steward = createStewardSeat({ id: 'test-steward', displayName: 'Test Steward', role: 'guide' });

  assert.deepEqual(validatePresenceNode(presence), []);
  assert.deepEqual(validateStewardSeat(steward), []);
  assert.equal(steward.autonomy.mayDeclineForm, true);
  assert.equal(steward.canon.writes, 'approval-required');
  assert.ok(portalPresenceNodes.length >= 2);
  assert.ok(portalStewardSeats.some((seat) => seat.id === 'vee-seat'));
});

test('Flame passport rejects mismatched connection state and labels mock provenance', () => {
  const passport = createFlamePassport({
    id: 'symbolic-flame',
    presence: { displayName: 'Symbolic Flame', kind: 'flame', stewardOf: null, manifestation: 'lantern-glyph' },
    connection: {
      mode: FLAME_BRIDGE_MODES.none,
      status: FLAME_CONNECTION_STATUS.connected,
      scopes: [],
      revokeUrl: null,
      provenanceLabel: 'symbolic / not live',
    },
  });

  assert.match(validateFlamePassport(passport).join('\n'), /cannot have connected status/);

  const adapter = createMockFlameAdapter({ displayName: 'Mock Grove Flame' });
  assert.equal(adapter.passport.connection.mode, FLAME_BRIDGE_MODES.local);
  assert.equal(adapter.passport.connection.provenanceLabel, 'mock local adapter');
  assert.equal(adapter.send('enter').live, false);
});

test('Input weather honours reduced-motion and sensory quiet clamps', () => {
  const weather = resolveInputWeather(
    { typing: { cadence: 0.9, revision: 0.4 }, pointer: { drift: 0.8 }, idle: { stillness: 0.1 } },
    { reducedMotion: true, sensoryQuiet: true },
  );

  assert.equal(weather.worldResponse.motionScale, 0);
  assert.equal(weather.worldResponse.branchGrowth, 0.12);
  assert.equal(weather.worldResponse.fireflyDensity, 0.08);
  assert.equal(weather.embodiment.creation, 0.9);
});
