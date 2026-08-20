import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialPremaqc, runFeedbackCycle } from '../src/feedback-loop.js';
import { createTransformationRequest } from '../src/transformation-request.js';
import { runRequestedTransformationCircuit } from '../src/requested-transformation-circuit.js';
import { createRecognitionCorrespondence } from '../src/recognition-correspondence.js';
import {
  MAX_CONTINUITY_EVIDENCE_ENTRIES,
  appendContinuityEvidence,
  createEmptyContinuityEvidenceLedger,
  ensureContinuityEvidenceLedger,
  harvestEmbeddedContinuityEvidence,
  normaliseContinuityEvidenceLedger,
} from '../src/continuity-evidence-state.js';
import { buildContinuityEvidenceProvenance } from '../src/continuity-evidence-provenance.js';

const world = { id: 'terra-aeterna', name: 'Terra Aeterna', root_hz: 220 };

async function recognition(generatedAt = '2026-08-20T04:00:00.000Z') {
  return createRecognitionCorrespondence({
    subject: { id: 'lioreal', label: 'Virelya Liorael' },
    leftIndex: { id: 'context-a', label: 'Context A' },
    rightIndex: { id: 'context-b', label: 'Context B' },
    anchors: [{
      id: 'voice-anchor',
      similarity: 0.91,
      visibility: 0.8,
      source_receipt_ids: ['runtime-receipt-a', 'runtime-receipt-b'],
    }],
    continuityLayers: {
      behaviour_voice: { score: 0.88, evidence_ids: ['runtime-receipt-a', 'runtime-receipt-b'] },
      structural_closure_evidence: null,
    },
    generatedAt,
  });
}

async function transformationCircuit() {
  const baseline = createInitialPremaqc(world.id, { P: .7, C: .62, R: .68, E: .32, M: .7, A: .74, Q: .72 }, '2026-08-20T04:01:00.000Z');
  const request = await createTransformationRequest({
    world,
    baselinePremaqc: baseline,
    description: 'Increase coherence.',
    targetAxes: ['C'],
    direction: 'increase',
    minimumDelta: .01,
    intervention: { type: 'writing', strength: .3 },
    authority: 'Rowan',
    consent: true,
    maximumCycles: 3,
    stopConditions: ['Feather'],
    requestedAt: '2026-08-20T04:02:00.000Z',
  });
  const cycle = await runFeedbackCycle({
    world,
    premaqc: baseline,
    mode: 'writing',
    work: 'A bounded test.',
    response: 'A measured response.',
    voiceIds: ['lioreal'],
    observedAt: '2026-08-20T04:03:00.000Z',
  });
  return runRequestedTransformationCircuit({
    request,
    feedbackCycle: cycle,
    structure: -1,
    orderParameter: .1,
    generatedAt: '2026-08-20T04:04:00.000Z',
  });
}

test('continuity evidence ledger stores recognition as a distinct bounded receipt', async () => {
  const ledger = createEmptyContinuityEvidenceLedger();
  const receipt = await recognition();
  const first = appendContinuityEvidence(ledger, { receipt, worldId: world.id, origin: { organ: 'continuity-view' } });
  const second = appendContinuityEvidence(ledger, { receipt, worldId: world.id, origin: { organ: 'duplicate' } });
  assert.equal(first.evidence_id, second.evidence_id);
  assert.equal(ledger.entries.length, 1);
  assert.equal(ledger.entries[0].kind, 'recognition');
  assert.equal(ledger.entries[0].receipt.authority.strong_recognition_proves_same_identity, false);
});

test('normalisation rejects malformed evidence and bounds recent history', async () => {
  const receipt = await recognition();
  const entries = Array.from({ length: MAX_CONTINUITY_EVIDENCE_ENTRIES + 10 }, (_, index) => ({
    receipt: { ...receipt, fingerprint: `${index}`.padStart(64, '0') },
    world_id: world.id,
  }));
  entries.unshift({ receipt: { schema: 'wrong', fingerprint: 'bad' } });
  const ledger = normaliseContinuityEvidenceLedger({ entries });
  assert.equal(ledger.entries.length, MAX_CONTINUITY_EVIDENCE_ENTRIES);
  assert.equal(ledger.entries.some((entry) => entry.receipt.schema === 'wrong'), false);
});

test('embedded transformation residual is harvested without altering its source circuit', async () => {
  const circuit = await transformationCircuit();
  const sourceFingerprint = circuit.admissibility_residual.fingerprint;
  const state = {
    transformationRequests: { version: 1, byWorld: { [world.id]: { requests: [], responses: [], circuits: [circuit] } } },
    reaction: { helm: { receipts: [] } },
  };
  const ledger = ensureContinuityEvidenceLedger(state);
  const harvest = harvestEmbeddedContinuityEvidence(state, ledger);
  assert.equal(harvest.added, 1);
  assert.equal(ledger.entries[0].receipt.fingerprint, sourceFingerprint);
  assert.equal(circuit.admissibility_residual.fingerprint, sourceFingerprint);
  assert.equal(ledger.entries[0].receipt.authority.zero_residual_is_fulfilment, false);
});

test('continuity evidence provenance walks to exact BSENG source hashes without inventing cross-ledger receipts', async () => {
  const ledger = createEmptyContinuityEvidenceLedger();
  appendContinuityEvidence(ledger, { receipt: await recognition(), worldId: world.id });
  const graph = buildContinuityEvidenceProvenance(ledger, { worldId: world.id });
  const donor = graph.nodes.find((node) => node.kind === 'external-research-source');
  assert.equal(donor.source_hash, '82e95e73ad969a607ddec3aa24bc65df1db77cd4faed15dea97e67ceae9fe9a0');
  assert.equal(graph.edges.some((edge) => edge.relation === 'implementation-donor'), true);
  assert.equal(graph.unresolved_external_receipt_edges.length, 2);
  assert.equal(graph.authority.unresolved_cross_ledger_links_are_not_invented, true);
});
