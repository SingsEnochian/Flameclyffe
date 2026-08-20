import test from 'node:test';
import assert from 'node:assert/strict';

import { compileHelmReceipt, parseHelmJacobian, REACTION_HELM_SCHEMA } from '../src/react-ion-helm.js';
import { createEmptyReactionState } from '../src/react-ion-state.js';

const world = { id: 'terra-aeterna', name: 'Terra Aeterna' };

function input(overrides = {}) {
  return {
    sourceName: 'earth.anchor',
    targetName: 'terra.templehouse',
    sourceAddress: '1.2.3.4@220',
    targetAddress: '137.42.219.88@220',
    targetWorldId: 'terra-aeterna',
    targetWorldName: 'Terra Aeterna',
    ask: 'May this route be compiled and observed?',
    transformation: 'Compile the requested projection route without declaring an outcome.',
    preserve: ['identity', 'continuity', 'agency', 'causal-history'],
    identityScore: 0.96,
    continuityScore: 0.95,
    agencyScore: 0.97,
    jacobian: '1,0;0,1',
    allowDirect: true,
    authorised: true,
    sender: 'Rowan',
    ttl: 8,
    ...overrides,
  };
}

test('Helm Jacobian parser accepts rectangular matrices and rejects malformed input', () => {
  assert.deepEqual(parseHelmJacobian('1,0;0,1'), [[1, 0], [0, 1]]);
  assert.throws(() => parseHelmJacobian('1,0;0'), /rectangular/);
});

test('authorised Helm compilation receipts route, graph snapshot and transport without claiming fulfilment', async () => {
  const receipt = await compileHelmReceipt({
    reaction: createEmptyReactionState(),
    world,
    input: input(),
    now: new Date('2026-08-19T06:10:00.000Z'),
  });

  assert.equal(receipt.schema, REACTION_HELM_SCHEMA);
  assert.equal(receipt.created_at, '2026-08-19T06:10:00.000Z');
  assert.equal(receipt.authority.ask_authorised, true);
  assert.equal(receipt.authority.route_compiled, true);
  assert.equal(receipt.authority.transport_delivery_is_fulfilment, false);
  assert.equal(receipt.authority.ask_acceptance_is_observed_transformation, false);
  assert.equal(receipt.authority.physical_travel_claimed, false);
  assert.ok(receipt.route?.route_id);
  assert.equal(receipt.transport?.delivered, true);
  assert.ok(receipt.graph_snapshot?.snapshot_id);
  assert.equal(receipt.ask.authority.ask_is_success, false);
});

test('unauthorised Helm compilation keeps the Ask receipted but compiles no route', async () => {
  const receipt = await compileHelmReceipt({
    reaction: createEmptyReactionState(),
    world,
    input: input({ authorised: false }),
    now: new Date('2026-08-19T06:11:00.000Z'),
  });

  assert.equal(receipt.authority.ask_authorised, false);
  assert.equal(receipt.authority.route_gate_admitted, false);
  assert.equal(receipt.authority.route_compiled, false);
  assert.equal(receipt.route, null);
  assert.equal(receipt.transport, null);
  assert.match(receipt.route_error, /ask-not-authorised/);
  assert.equal(receipt.ask.consent.granted, false);
});
