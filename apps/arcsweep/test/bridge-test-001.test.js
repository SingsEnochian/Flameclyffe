import assert from 'node:assert/strict';
import test from 'node:test';
import { createStateSnapshot } from '../src/bifrost-crossing-envelope.js';
import { createEndpointInstrument, createTerraAeternaEndpoint } from '../src/bifrost-endpoints.js';
import { runBridgeTest001 } from '../src/bridge-test-001.js';

const PREMAQC = Object.freeze({ schema: 'premaqc/v1', P: .88, C: .9, R: .86, E: .25, M: .8, A: .91, Q: .84 });
const SPIRAL = Object.freeze({ schema: 'spiral-state/v1', phase: 'release', direction: 'ascending', confidence: .93 });

function primeEndpoint() {
  const snapshot = createStateSnapshot({
    worldIdentity: 'Terra Prime', frameworkLabel: 'Terra Prime', worldRevision: 1,
    stateId: 'prime:bridge001', stateHash: 'sha256:prime:bridge001', effectiveAt: '2026-08-23T04:15:00Z',
    premaqcVersion: PREMAQC.schema, spiralSchemaVersion: SPIRAL.schema, state: { premaqc: PREMAQC, spiral: SPIRAL },
  });
  return createEndpointInstrument({
    worldIdentity: 'Earth Prime', frameworkLabel: 'Terra Prime', shore: 'reference',
    clock: { mode: '1:1', utc: '2026-08-23T04:15:00Z', time_ratio: 1 }, observerFreshness: 'fresh',
    premaqc: PREMAQC, spiral: SPIRAL, worldProfile: { temporal_contract: '1:1' },
    canonContext: { register: 'observed-current-reality' }, receipts: ['prime:receipt:bridge001'], snapshot,
  });
}

function terraAeternaEndpoint() {
  return createTerraAeternaEndpoint({
    worldRevision: 12, stateId: 'ta:bridge001', stateHash: 'sha256:ta:bridge001', effectiveAt: '2026-08-23T04:15:00Z',
    premaqc: PREMAQC, spiral: SPIRAL, receipts: ['ta:receipt:bridge001'],
    canonContext: { world: 'Terra Aeterna', register: 'project-canon' },
    worldProfile: { material_language: ['Stonewood', 'black-diamond sand'] },
  });
}

test('Bridge Test 001 crosses from Prime to Terra Aeterna and receives an answer', () => {
  const result = runBridgeTest001({
    sourceEndpoint: primeEndpoint(), destinationEndpoint: terraAeternaEndpoint(), createdAt: '2026-08-23T04:15:05Z',
  });
  assert.equal(result.source_lit, true);
  assert.equal(result.destination_lit, true);
  assert.equal(result.crossing_complete, true);
  assert.equal(result.envelope.source.world_identity, 'earth_prime');
  assert.equal(result.envelope.destination.world_identity, 'terra-aeterna');
  assert.equal(result.envelope.translation.status, 'TRANSLATED');
  assert.equal(result.envelope.destination_response.authority.register, 'WORLD_PROFILE');
  assert.equal(result.envelope.destination_response.message, 'Terra Aeterna received and answered the crossing.');
});

test('Bridge Test 001 emits shared projection receipts against one destination state', () => {
  const result = runBridgeTest001({ sourceEndpoint: primeEndpoint(), destinationEndpoint: terraAeternaEndpoint() });
  assert.deepEqual(result.envelope.projections.map((receipt) => receipt.projection_type), ['glyph', 'runa', 'storywork', 'ui']);
  assert.equal(new Set(result.envelope.projections.map((receipt) => receipt.input_state_id)).size, 1);
  assert.equal(result.envelope.projections[0].input_state_id, 'ta:bridge001');
});

test('Bridge Test 001 refuses to depart from a dark shore', () => {
  const source = primeEndpoint();
  const dark = { ...source, lit: false };
  assert.throws(() => runBridgeTest001({ sourceEndpoint: dark, destinationEndpoint: terraAeternaEndpoint() }), /source shore must be fully lit/);
});
