import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BIFROST_BRIDGE_PACKET_SCHEMA,
  BIFROST_TEMPORAL_STATE_SCHEMA,
  collapseRelease,
  createBifrostBridgePacket,
  evolveTemporalState,
  premaqToTemporalState,
  projectWorldState,
  validatePremaqPacket,
} from '../src/arcsweep-temporal-quantum/engine.js';

function component(value, derivative = 0, confidence = 0.9) {
  return {
    value,
    derivative,
    uncertainty: 0.05,
    confidence,
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
      E: component(0.34, 0.03),
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

test('maps PREMAQ v2 into a normalised temporal quantum state', () => {
  const packet = validatePremaqPacket(premaq());
  const state = premaqToTemporalState(packet, {
    clock: () => new Date('2026-08-02T04:38:00.000Z'),
    idFactory: () => 'initial',
  });

  assert.equal(state.schema, BIFROST_TEMPORAL_STATE_SCHEMA);
  assert.equal(state.state_id, 'bifrost-state-initial');
  assert.equal(state.premaq.id, packet.id);
  assert.equal(state.interpretation.physical_claim, false);
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

test('compression-release advances the outward spiral rather than resetting it', () => {
  const initial = premaqToTemporalState(premaq(), { idFactory: () => 'initial' });
  const first = collapseRelease(initial, {
    focus: 'Q',
    idFactory: () => 'cycle-one',
  });
  const second = collapseRelease(first, {
    focus: 'P',
    idFactory: () => 'cycle-two',
  });

  assert.equal(first.spiral.cycle, 1);
  assert.equal(second.spiral.cycle, 2);
  assert.ok(first.spiral.radius > initial.spiral.radius);
  assert.ok(second.spiral.radius > first.spiral.radius);
  assert.ok(second.spiral.outward_distance > first.spiral.outward_distance);
  assert.ok(Math.abs(sumProbabilities(second) - 1) < 1e-12);
});

test('builds a dual-anchor Bifrost packet with separate authorities', () => {
  const packet = premaq();
  const hearthside = premaqToTemporalState(packet, { idFactory: () => 'hearth' });
  const targetside = collapseRelease(
    evolveTemporalState(hearthside, { delta: 1, idFactory: () => 'target-evolution' }),
    { focus: 'R', idFactory: () => 'target-cycle' },
  );

  const bridge = createBifrostBridgePacket({
    premaq: packet,
    hearthside,
    targetside,
    worldId: 'terra-aeterna',
    canonGraphVersion: 'terra-canon/0.1',
    transferFunctionVersion: 'terra-transfer/0.1',
    anchors: {
      hearthside: 'current-reality://hearthside',
      targetside: 'terra-aeterna://hearthweave',
    },
    idFactory: () => 'bridge',
  });

  assert.equal(bridge.schema, BIFROST_BRIDGE_PACKET_SCHEMA);
  assert.equal(bridge.bridge_packet_id, 'bifrost-bridge-bridge');
  assert.equal(bridge.hearthside.authority, 'evidence-grounded-observational');
  assert.equal(bridge.targetside.authority, 'canon-grounded-projected');
  assert.equal(bridge.bridge_metrics.anchor_integrity, true);
  assert.ok(bridge.bridge_metrics.state_fidelity >= 0 && bridge.bridge_metrics.state_fidelity <= 1);
});

test('projects a target state through a versioned calibrated transfer matrix', () => {
  const packet = premaq();
  const hearthside = premaqToTemporalState(packet, { idFactory: () => 'hearth' });
  const targetside = collapseRelease(hearthside, { focus: 'A', idFactory: () => 'target' });
  const bridge = createBifrostBridgePacket({
    premaq: packet,
    hearthside,
    targetside,
    worldId: 'terra-aeterna',
    canonGraphVersion: 'terra-canon/0.1',
    transferFunctionVersion: 'terra-transfer/0.1',
    anchors: {
      hearthside: 'current-reality://hearthside',
      targetside: 'terra-aeterna://hearthweave',
    },
  });

  const projection = projectWorldState(bridge, {
    matrix: {
      veil_luminosity: { A: 0.7, Q: 0.3 },
      temporal_pressure: { P: 0.4, E: 0.6 },
    },
    labels: {
      veil_luminosity: 'Veil luminosity',
      temporal_pressure: 'Temporal pressure',
    },
  });

  assert.equal(projection.world_id, 'terra-aeterna');
  assert.equal(projection.projection.veil_luminosity.source_class, 'projected');
  assert.ok(Number.isFinite(projection.projection.temporal_pressure.value));
  assert.equal(projection.provenance.premaq_ref.id, packet.id);
});
