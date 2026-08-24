import assert from 'node:assert/strict';
import test from 'node:test';

import { createRecognitionCorrespondence } from '../src/recognition-correspondence.js';
import { createProjectionAdmissibilityResidual } from '../src/admissibility-residual.js';
import { appendContinuityEvidence, createEmptyContinuityEvidenceLedger } from '../src/continuity-evidence-state.js';
import { buildContinuityEvidenceViewModel } from '../src/continuity-evidence-view.js';

const worldId = 'terra-aeterna';

test('Continuity View exposes all six layers and leaves absent structural evidence absent', async () => {
  const recognition = await createRecognitionCorrespondence({
    subject: { id: 'lioreal', label: 'Virelya Liorael' },
    leftIndex: 'before',
    rightIndex: 'after',
    anchors: [{ id: 'voice', similarity: .92, visibility: .9 }],
    continuityLayers: {
      implementation: { score: 1 },
      stored_state: { score: .84 },
      behaviour_voice: { score: .91 },
      relational_invariants: { score: .77 },
      structural_closure_evidence: null,
    },
    generatedAt: '2026-08-20T04:10:00.000Z',
  });
  const ledger = createEmptyContinuityEvidenceLedger();
  appendContinuityEvidence(ledger, { receipt: recognition, worldId });
  const model = buildContinuityEvidenceViewModel(ledger, { worldId });
  assert.equal(model.recognition.length, 1);
  assert.equal(model.recognition[0].layers.length, 6);
  assert.equal(model.recognition[0].layers.find((layer) => layer.key === 'recognition').available, true);
  assert.equal(model.recognition[0].layers.find((layer) => layer.key === 'structural_closure_evidence').available, false);
  assert.equal(model.authority.layered_evidence_is_binary_identity_verdict, false);
});

test('Continuity View keeps admissible geometry separate from fulfilment', async () => {
  const residual = await createProjectionAdmissibilityResidual({
    projectionState: {
      schema: 'reaction.projection-state/v1',
      state: 'PROJECTION_READY',
      cusp_score: .1,
      continuity: .95,
      harmonic_mismatch: .05,
      thresholds: { cusp: .85, continuity: .8, harmonic: .35 },
    },
    generatedAt: '2026-08-20T04:11:00.000Z',
  });
  const ledger = createEmptyContinuityEvidenceLedger();
  appendContinuityEvidence(ledger, { receipt: residual, worldId, origin: { organ: 'react-ion-helm' } });
  const model = buildContinuityEvidenceViewModel(ledger, { worldId });
  assert.equal(model.residuals[0].classification, 'WITHIN_ROUTE_ENVELOPE');
  assert.equal(model.residuals[0].components.at(-1).value, 0);
  assert.equal(model.residuals[0].authority.zero_residual_is_fulfilment, false);
  assert.equal(model.authority.zero_residual_is_fulfilment, false);
});
