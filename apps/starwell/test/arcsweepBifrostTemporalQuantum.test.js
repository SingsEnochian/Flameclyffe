import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BIFROST_BRIDGE_PACKET_SCHEMA,
  BIFROST_RECEIVING_SPRING_SCHEMA,
  BIFROST_TEMPORAL_STATE_SCHEMA,
  compressRelease,
  createBifrostBridgePacket,
  createReturnCrossing,
  evolveTemporalState,
  expressWorldState,
  integrateBridgeAnswer,
  premaqToTemporalState,
  receiveTargetside,
  validatePremaqPacket,
} from '../src/arcsweep-temporal-quantum/engine.js';

function component(value, derivative = 0, sourceFidelity = 0.9) {
  return {
    value,
    derivative,
    measured_spread: 0.05,
    source_fidelity: sourceFidelity,
    uncertainty: 0.05,
    confidence: sourceFidelity,
    contributors: [],
  };
}

function premaq() {
  return {
    schema_version: '2.0.0',
    id: 'premaq-test-1',
    observed_at: '2026-08-02T04:37:00.000Z',
    registry_version: 'premaq-registry/2.0',
    state: {
      P: component(0.89, 0.01),
      C: component(0.92, 0.02),
      R: component(0.88, -0.01),
      E: component(0.74, 0.03),
      M: component(0.76, 0.01),
      A: component(0.85, 0.02),
      Q: component(0.84, 0.01),
    },
    receipt_id: 'receipt-test-1',
    sequence: 42,
    prior_state_ref: null,
    model_version: 'observer-test/1.0',
    provenance_refs: ['witness:test'],
  };
}

function sumProbabilities(state) {
  return Object.values(state.probabilities).reduce((sum, value) => sum + value, 0);
}

test('maps canonical PREMAQ into a normalised braided temporal state', () => {
  const packet = validatePremaqPacket(premaq());
  const state = premaqToTemporalState(packet, {
    clock: () => new Date('2026-08-02T04:38:00.000Z'),
    idFactory: () => 'initial',
  });

  assert.equal(state.schema, BIFROST_TEMPORAL_STATE_SCHEMA);
  assert.equal(state.state_id, 'bifrost-state-initial');
  assert.equal(state.premaq.id, packet.id);
  assert.equal(state.premaq.axes.E, 'Entanglement');
  assert.equal(state.premaq.axes.Q, 'Qualia');
  assert.equal(state.interpretation.quantum_state, true);
  assert.match(state.interpretation.formalism, /braided-temporal-quantum/);
  assert.ok(Math.abs(sumProbabilities(state) - 1) < 1e-12);
});

test('evolves with norm-preserving phase and pair rotations', () => {
  const initial = premaqToTemporalState(premaq(), { idFactory: () => 'initial' });
  const evolved = evolveTemporalState(initial, {
    delta: 0.5,
    bridgeCoupling: 0.1,
    idFactory: () => 'evolved',
  });

  assert.equal(evolved.state_id, 'bifrost-state-evolved');
  assert.equal(evolved.temporal_coordinate, 0.5);
  assert.equal(evolved.receipts.at(-1).action, 'unitary-evolution');
  assert.ok(Math.abs(sumProbabilities(evolved) - 1) < 1e-12);
  assert.notDeepEqual(evolved.probabilities, initial.probabilities);
});

test('compression and release advance the outward spiral and feed continuation', () => {
  const initial = premaqToTemporalState(premaq(), { idFactory: () => 'initial' });
  const first = compressRelease(initial, {
    focus: 'Q',
    idFactory: () => 'cycle-one',
  });
  const second = compressRelease(first, {
    focus: 'P',
    idFactory: () => 'cycle-two',
  });

  assert.equal(first.spiral.cycle, 1);
  assert.equal(second.spiral.cycle, 2);
  assert.ok(first.spiral.radius > initial.spiral.radius);
  assert.ok(second.spiral.radius > first.spiral.radius);
  assert.ok(second.spiral.outward_distance > first.spiral.outward_distance);
  assert.equal(second.receipts.at(-1).next_operation, 'compression-of-release');
  assert.ok(Math.abs(sumProbabilities(second) - 1) < 1e-12);
});

test('builds a two-shore Bifröst packet with both shores participating', () => {
  const packet = premaq();
  const hearthside = premaqToTemporalState(packet, { idFactory: () => 'hearth' });
  const targetside = compressRelease(
    evolveTemporalState(hearthside, { delta: 1, idFactory: () => 'target-evolution' }),
    { focus: 'R', idFactory: () => 'target-cycle' },
  );

  const bridge = createBifrostBridgePacket({
    premaq: packet,
    hearthside,
    targetside,
    worldId: 'terra-aeterna',
    canonGraphVersion: 'terra-canon/0.1',
    transferFunctionVersion: 'terra-expression/0.2',
    asking: { text: 'Enter Terra Aeterna in living relation.' },
    lineage: ['test-lineage'],
    anchors: {
      hearthside: 'hearthside://current',
      targetside: 'terra-aeterna://hearthweave',
    },
    idFactory: () => 'bridge',
  });

  assert.equal(bridge.schema, BIFROST_BRIDGE_PACKET_SCHEMA);
  assert.equal(bridge.bridge_packet_id, 'bifrost-bridge-bridge');
  assert.equal(bridge.hearthside.role, 'participating-shore');
  assert.equal(bridge.targetside.role, 'participating-shore');
  assert.equal(bridge.premaq_ref.axes.E, 'Entanglement');
  assert.equal(bridge.premaq_ref.axes.Q, 'Qualia');
  assert.equal(bridge.bridge_metrics.anchor_integrity, true);
  assert.ok(bridge.laws.includes('Both shores remain lit.'));
});

test('expresses a world state through a versioned world expression matrix', () => {
  const packet = premaq();
  const hearthside = premaqToTemporalState(packet, { idFactory: () => 'hearth' });
  const targetside = compressRelease(hearthside, { focus: 'A', idFactory: () => 'target' });
  const bridge = createBifrostBridgePacket({
    premaq: packet,
    hearthside,
    targetside,
    worldId: 'terra-aeterna',
    canonGraphVersion: 'terra-canon/0.1',
    transferFunctionVersion: 'terra-expression/0.2',
    anchors: {
      hearthside: 'hearthside://current',
      targetside: 'terra-aeterna://hearthweave',
    },
  });

  const expression = expressWorldState(bridge, {
    matrix: {
      veil_luminosity: { A: 0.5, Q: 0.3, E: 0.2 },
      temporal_pressure: { P: 0.4, M: 0.6 },
    },
    labels: {
      veil_luminosity: 'Veil luminosity',
      temporal_pressure: 'Temporal pressure',
    },
  });

  assert.equal(expression.world_id, 'terra-aeterna');
  assert.equal(expression.expression.veil_luminosity.source_class, 'expressed');
  assert.ok(Number.isFinite(expression.expression.temporal_pressure.value));
  assert.equal(expression.provenance.premaq_ref.id, packet.id);
});

test('Receiving Spring carries Targetside answer into return and integration', () => {
  const packet = premaq();
  const hearthside = premaqToTemporalState(packet, { idFactory: () => 'hearth' });
  const targetside = compressRelease(hearthside, { focus: 'E', idFactory: () => 'target' });
  const bridge = createBifrostBridgePacket({
    premaq: packet,
    hearthside,
    targetside,
    worldId: 'terra-aeterna',
    canonGraphVersion: 'terra-canon/0.1',
    transferFunctionVersion: 'terra-expression/0.2',
    anchors: {
      hearthside: 'hearthside://current',
      targetside: 'terra-aeterna://hearthweave',
    },
    lineage: ['crossing:test'],
  });

  const spring = receiveTargetside({
    bridgePacket: bridge,
    targetState: targetside,
    worldField: { location: 'Hearthweave' },
    worldGraph: { version: 'terra-canon/0.1' },
    answer: { kind: 'arrival', text: 'The shore answers.' },
    idFactory: () => 'spring',
  });

  assert.equal(spring.schema, BIFROST_RECEIVING_SPRING_SCHEMA);
  assert.equal(spring.answer.kind, 'arrival');

  const returned = createReturnCrossing(spring, { idFactory: () => 'return' });
  const integrated = integrateBridgeAnswer({
    hearthside,
    targetside,
    returnCrossing: returned,
    idFactory: () => 'integrated',
  });

  assert.equal(returned.next_movement, 'integration');
  assert.equal(integrated.receipts.at(-1).action, 'receiving-spring-integration');
  assert.equal(integrated.receipts.at(-1).next_operation, 'renewal');
  assert.ok(integrated.spiral.cycle > hearthside.spiral.cycle);
});
