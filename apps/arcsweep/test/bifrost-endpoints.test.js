import assert from 'node:assert/strict';
import test from 'node:test';
import { createStateSnapshot } from '../src/bifrost-crossing-envelope.js';
import { createEndpointInstrument, createTerraAeternaEndpoint } from '../src/bifrost-endpoints.js';

const PREMAQC = Object.freeze({ schema: 'premaqc/v1', P: .88, C: .9, R: .86, E: .25, M: .8, A: .91, Q: .84 });
const SPIRAL = Object.freeze({ schema: 'spiral-state/v1', phase: 'release', direction: 'ascending', confidence: .93 });

test('Prime reference shore exposes every required lantern', () => {
  const snapshot = createStateSnapshot({
    worldIdentity: 'Terra Prime', worldRevision: 1, stateId: 'prime:001', stateHash: 'sha256:prime', effectiveAt: '2026-08-23T04:00:00Z', state: { premaqc: PREMAQC, spiral: SPIRAL },
  });
  const endpoint = createEndpointInstrument({
    worldIdentity: 'Earth Prime', frameworkLabel: 'Terra Prime', shore: 'reference',
    clock: { mode: '1:1', utc: '2026-08-23T04:00:00Z', time_ratio: 1 }, observerFreshness: 'fresh',
    premaqc: PREMAQC, spiral: SPIRAL, worldProfile: { temporal_contract: '1:1' },
    canonContext: { register: 'observed-current-reality' }, receipts: ['prime:receipt:001'], snapshot,
  });
  assert.equal(endpoint.world_identity, 'earth_prime');
  assert.equal(endpoint.lit, true);
  assert.equal(Object.values(endpoint.lanterns).every(Boolean), true);
});

test('Terra Aeterna destination shore carries its World Hum and canon context', () => {
  const endpoint = createTerraAeternaEndpoint({
    worldRevision: 12, stateId: 'ta:001', stateHash: 'sha256:ta', effectiveAt: '2026-08-23T04:00:00Z',
    premaqc: PREMAQC, spiral: SPIRAL, receipts: ['ta:receipt:001'],
    canonContext: { world: 'Terra Aeterna', register: 'project-canon' },
    worldProfile: { material_language: ['Stonewood', 'black-diamond sand'] },
  });
  assert.equal(endpoint.world_identity, 'terra-aeterna');
  assert.equal(endpoint.world_profile.root_hz, 220);
  assert.equal(endpoint.lit, true);
});

test('a dark lantern remains visible instead of being flattened into a generic failure', () => {
  const snapshot = createStateSnapshot({
    worldIdentity: 'Terra Prime', worldRevision: 1, stateId: 'prime:002', stateHash: 'sha256:prime2', effectiveAt: '2026-08-23T04:00:00Z',
  });
  const endpoint = createEndpointInstrument({
    worldIdentity: 'Terra Prime', frameworkLabel: 'Terra Prime', shore: 'reference',
    clock: { mode: '1:1', time_ratio: 1 }, premaqc: PREMAQC, spiral: SPIRAL,
    worldProfile: { temporal_contract: '1:1' }, canonContext: { register: 'observed-current-reality' }, receipts: [], snapshot,
  });
  assert.equal(endpoint.lit, false);
  assert.equal(endpoint.lanterns.receipts, false);
  assert.equal(endpoint.lanterns.observer, false);
});
