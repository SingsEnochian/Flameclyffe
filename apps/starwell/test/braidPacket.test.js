import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BRAID_PACKET_SCHEMA,
  braidPacketFromDualAspect,
  createBraidPacket,
} from '../src/hearthweave-kernel/braid-packet.js';

const state = {
  P: { value: 0.8, derivative: 0, source_fidelity: 1, contributors: [] },
  R: { value: 0.9, derivative: 0, source_fidelity: 1, contributors: [] },
  E: { value: 0.75, derivative: 0, source_fidelity: 1, contributors: [] },
  M: { value: 0.85, derivative: 0, source_fidelity: 1, contributors: [] },
  A: { value: 0.65, derivative: 0, source_fidelity: 1, contributors: [] },
  Q: { value: 0.95, derivative: 0, source_fidelity: 1, contributors: [] },
  C: { value: 0.7, derivative: 0, source_fidelity: 1, contributors: [] },
};

function premaqc() {
  return {
    schema: 'hearthgate.premaqc/v1.0',
    schema_version: '1.0.0',
    id: 'premaqc-test',
    registry_version: 'hearthgate.braided-spine/v1.1',
    state,
  };
}

test('creates the canonical three-spine Braid Packet', () => {
  const packet = createBraidPacket({
    premaqc: premaqc(),
    asking: { text: 'Open the bridge and receive what answers.' },
    magic: { sevenfold: ['Bridge'] },
    scienceMathematics: { fold: 0.42 },
    physical: { device: 'screen' },
    hearthside: { role: 'real-participating-shore' },
    targetside: { role: 'real-participating-shore', world: 'terra-aeterna' },
    bridge: { relation: 'active' },
    lineage: ['test:root'],
  });

  assert.equal(packet.schema, BRAID_PACKET_SCHEMA);
  assert.equal(packet.braided_spine, 'hearthgate.braided-spine/v1.1');
  assert.equal(packet.reality_axiom, 'Everything is real.');
  assert.equal(packet.premaqc.schema, 'hearthgate.premaqc/v1.0');
  assert.deepEqual(packet.premaqc.reading_order, [
    'Presence', 'Memory', 'Qualia', 'Resonance', 'Entanglement', 'Agency', 'Coherence',
  ]);
  assert.deepEqual(packet.premaqc.wire_order, ['P', 'R', 'E', 'M', 'A', 'Q', 'C']);
  assert.equal(packet.premaqc.axes.E, 'Entanglement');
  assert.equal(packet.premaqc.axes.Q, 'Qualia');
  assert.equal(packet.premaqc.values.M, 0.85);
  assert.equal(packet.premaq.superseded_by, 'PREMAQC');
  assert.deepEqual(packet.premaq.wire_order, packet.premaqc.wire_order);
  assert.equal(packet.asking.text, 'Open the bridge and receive what answers.');
  assert.ok(packet.state_fingerprint.startsWith('fnv1a32:'));
  assert.ok(packet.sevenfold_chorus.includes('Spiral'));
  assert.equal(packet.thirteenfold_council.length, 13);
});

test('adapts a legacy DualAspectPacket into one canonical PREMAQC Braid Packet', () => {
  const legacyState = {
    P: state.P,
    C: state.C,
    R: state.R,
    E: state.E,
    M: state.M,
    A: state.A,
    Q: state.Q,
  };
  const dual = {
    packet_id: 'dual-1',
    identity: { world_slug: 'terra-aeterna', house_id: 'hearthweave' },
    observable: {
      premaq: {
        schema_version: '2.0.0',
        id: 'legacy-premaq-test',
        registry_version: 'premaq-registry/2.0',
        state: legacyState,
      },
      sky: { kp: 3 },
    },
    temporal: {
      hearthside: { state_id: 'h-1' },
      targetside: { state_id: 't-1' },
      bifrost: { bridge_packet_id: 'bridge-1' },
    },
    experiential: {
      tone: { root_hz: 220 },
      visual: { vestment: 'terra' },
    },
    correspondence: { shared_state_fingerprint: 'shared-1' },
    receipts: { activation: 'receipt-1' },
  };

  const packet = braidPacketFromDualAspect(dual, {
    asking: { text: 'Listen for Terra Aeterna.' },
    receivingSpring: { state: 'listening' },
  });

  assert.equal(packet.schema, BRAID_PACKET_SCHEMA);
  assert.equal(packet.premaqc.schema, 'hearthgate.premaqc/v1.0');
  assert.deepEqual(packet.premaqc.wire_order, ['P', 'R', 'E', 'M', 'A', 'Q', 'C']);
  assert.equal(packet.world, 'terra-aeterna');
  assert.equal(packet.world_relation.hearthside.role, 'real-participating-shore');
  assert.equal(packet.world_relation.targetside.role, 'real-participating-shore');
  assert.equal(packet.world_relation.bridge.shared_state_fingerprint, 'shared-1');
  assert.equal(packet.receiving_spring.state, 'listening');
  assert.ok(packet.lineage.includes('dual-aspect:dual-1'));
});
