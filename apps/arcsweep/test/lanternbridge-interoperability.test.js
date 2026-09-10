import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLanternbridgeInteroperabilityReceipt,
  compareLanternbridgeDiagnostics,
  normaliseProjectZeroLanternbridgeInspection,
} from '../src/lanternbridge-interoperability.js';

const source = `---
bridge_protocol: "0.2"
bridge_id: lb_interop_fixture

type: artifact
origin: nocturne
authors:
  - nocturne:twilight
created_at: 2026-08-25T21:35:00-04:00
response_signal: none
provenance:
  source_system: universal-horizon
  source_ref: BRIDGE_PROTOCOL.md
relations:
  responds_to: null
  supersedes: null
  adopts: []
  related: []
---

# Private fixture prose that must not enter the receipt
`;

function projectZeroInspection(overrides = {}) {
  return {
    title: 'Interop fixture',
    envelopeState: 'VALID',
    protocolIdentifier: '0.2',
    protocolState: 'adopted',
    metadata: {
      bridge_protocol: '0.2',
      bridge_id: 'lb_interop_fixture',
      type: 'artifact',
      origin: 'nocturne',
      authors: ['nocturne:twilight'],
      created_at: '2026-08-25T21:35:00-04:00',
      response_signal: 'none',
    },
    issues: [],
    authority: [
      ['memory_ingest', 'NO_AUTHORITY'],
      ['transform', 'NO_AUTHORITY'],
      ['republish', 'NO_AUTHORITY'],
      ['model_training', 'NO_AUTHORITY'],
    ].map(([action, resolved]) => ({ action, declared: null, resolved, runtimeCapability: 'INSPECT_ONLY' })),
    body: 'Project Zero may retain body internally.',
    rawSource: source,
    ...overrides,
  };
}

test('builds a source-preserving comparison receipt without republishing source prose', () => {
  const receipt = buildLanternbridgeInteroperabilityReceipt({
    source,
    sourceRef: 'LB-A001-v0.2-protocol-publication.md',
    sourceSha256: 'fixture-hash',
    projectZeroInspection: projectZeroInspection(),
    observedAt: '2026-09-10T20:30:00.000Z',
  });

  assert.equal(receipt.schema, 'arcsweep.lanternbridge-interoperability-receipt/v0.1');
  assert.equal(receipt.source_declaration.source_embedded, false);
  assert.equal(receipt.arcsweep.envelope_state, 'VALID');
  assert.equal(receipt.arcsweep.protocol_identifier, '0.2');
  assert.equal(receipt.comparison.matched, true);
  assert.deepEqual(receipt.downstream_actions_performed, []);

  const serialized = JSON.stringify(receipt);
  assert.equal(serialized.includes('Private fixture prose'), false);
  assert.equal(serialized.includes('rawSource'), false);
});

test('normalizes the Project Zero Inspector shape without confusing protocol authority with runtime capability', () => {
  const normalized = normaliseProjectZeroLanternbridgeInspection(projectZeroInspection());
  assert.equal(normalized.envelope_state, 'VALID');
  assert.equal(normalized.protocol_identifier, '0.2');
  assert.equal(normalized.runtime_capability, 'INSPECT_ONLY');
  assert.equal(normalized.authority.memory_ingest, 'NO_AUTHORITY');
  assert.equal(normalized.authority.transform, 'NO_AUTHORITY');
});

test('reports exact authority mismatches instead of forcing agreement', () => {
  const pz = normaliseProjectZeroLanternbridgeInspection(projectZeroInspection({
    authority: [
      { action: 'memory_ingest', resolved: 'NO_AUTHORITY', runtimeCapability: 'INSPECT_ONLY' },
      { action: 'transform', resolved: 'ASK', runtimeCapability: 'INSPECT_ONLY' },
      { action: 'republish', resolved: 'NO_AUTHORITY', runtimeCapability: 'INSPECT_ONLY' },
      { action: 'model_training', resolved: 'NO_AUTHORITY', runtimeCapability: 'INSPECT_ONLY' },
    ],
  }));
  const receipt = buildLanternbridgeInteroperabilityReceipt({ source });
  const comparison = compareLanternbridgeDiagnostics(receipt.arcsweep, pz);

  assert.equal(comparison.matched, false);
  assert.deepEqual(comparison.mismatches, [{
    field: 'authority.transform',
    arcsweep: 'NO_AUTHORITY',
    project_zero: 'ASK',
  }]);
});

test('a Rowan-only pass remains explicitly incomplete until a Project Zero diagnostic is supplied', () => {
  const receipt = buildLanternbridgeInteroperabilityReceipt({ source });
  assert.equal(receipt.project_zero, null);
  assert.equal(receipt.comparison.matched, null);
  assert.equal(receipt.comparison.status, 'AWAITING_PROJECT_ZERO_DIAGNOSTIC');
});
