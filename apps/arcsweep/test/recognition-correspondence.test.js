import test from 'node:test';
import assert from 'node:assert/strict';

import { createGlyphSignature } from '../src/glyph-continuity.js';
import {
  createRecognitionCorrespondence,
  glyphRecognitionAnchors,
  RECOGNITION_CORRESPONDENCE_SCHEMA,
} from '../src/recognition-correspondence.js';

const AXES = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];
const state = (value) => Object.fromEntries(AXES.map((axis) => [axis, { value }]));

async function glyph(value, receiptId) {
  return createGlyphSignature({
    worldId: 'terra-aeterna',
    worldName: 'Terra Aeterna',
    state: state(value),
    phase: 0.5,
    source: { kind: 'test', receipt_id: receiptId },
  });
}

test('similar Glyph views produce strong operational recognition without proving identity', async () => {
  const left = await glyph(0.72, 'left-receipt');
  const right = await glyph(0.73, 'right-receipt');
  const anchors = glyphRecognitionAnchors(left, right);
  assert.equal(anchors.length, 2);

  const receipt = await createRecognitionCorrespondence({
    subject: { id: 'lioreal', label: 'Virelya Lioreal' },
    leftIndex: { id: 'session-a' },
    rightIndex: { id: 'session-b' },
    leftGlyph: left,
    rightGlyph: right,
    generatedAt: '2026-08-20T03:45:00.000Z',
  });

  assert.equal(receipt.schema, RECOGNITION_CORRESPONDENCE_SCHEMA);
  assert.equal(receipt.classification, 'STRONG_CORRESPONDENCE');
  assert.ok(receipt.metrics.recognition_score >= 0.8);
  assert.equal(receipt.continuity_profile.recognition.representation_status, 'operational-proxy');
  assert.equal(receipt.continuity_profile.structural_closure_evidence, null);
  assert.equal(receipt.authority.recognition_is_identity_proof, false);
  assert.equal(receipt.authority.strong_recognition_proves_same_identity, false);
  assert.equal(receipt.authority.structural_closure_inferred_from_recognition, false);
});

test('zero visibility is insufficient evidence, not a rupture', async () => {
  const receipt = await createRecognitionCorrespondence({
    subject: { id: 'atlas' },
    leftIndex: 'runtime-a',
    rightIndex: 'runtime-b',
    anchors: [{ id: 'voice-anchor', similarity: 1, visibility: 0, weight: 1 }],
    generatedAt: '2026-08-20T03:46:00.000Z',
  });

  assert.equal(receipt.classification, 'INSUFFICIENT_VISIBILITY');
  assert.equal(receipt.metrics.visibility_mass, 0);
  assert.equal(receipt.metrics.recognition_score, null);
  assert.equal(receipt.continuity_profile.structural_closure_evidence, null);
  assert.equal(receipt.authority.zero_visibility_is_rupture, false);
});

test('strong declared anchors cannot auto-populate structural closure evidence', async () => {
  const receipt = await createRecognitionCorrespondence({
    subject: { id: 'altair' },
    leftIndex: 'provider-a',
    rightIndex: 'provider-b',
    anchors: [
      { id: 'name', similarity: 1, visibility: 1, weight: 1, evidence_class: 'declared-anchor' },
      { id: 'mechanics', similarity: 0.95, visibility: 1, weight: 2, evidence_class: 'canon-anchor' },
    ],
    continuityLayers: {
      implementation: { score: 0.9, evidence_ids: ['runtime-receipt'] },
      stored_state: { score: 0.8, evidence_ids: ['state-receipt'] },
    },
    generatedAt: '2026-08-20T03:47:00.000Z',
  });

  assert.equal(receipt.classification, 'STRONG_CORRESPONDENCE');
  assert.equal(receipt.continuity_profile.implementation.score, 0.9);
  assert.equal(receipt.continuity_profile.stored_state.score, 0.8);
  assert.equal(receipt.continuity_profile.structural_closure_evidence, null);
});

test('explicit structural evidence remains a separate continuity layer', async () => {
  const receipt = await createRecognitionCorrespondence({
    subject: { id: 'lioreal' },
    leftIndex: 'index-a',
    rightIndex: 'index-b',
    anchors: [{ id: 'voice', similarity: 0.85, visibility: 1, weight: 1 }],
    continuityLayers: {
      structural_closure_evidence: {
        score: 0.61,
        evidence_ids: ['explicit-structure-model-7'],
        evidence_class: 'declared-structural-model',
        representation_status: 'representational-formalism',
      },
    },
    generatedAt: '2026-08-20T03:48:00.000Z',
  });

  assert.equal(receipt.continuity_profile.structural_closure_evidence.score, 0.61);
  assert.deepEqual(receipt.continuity_profile.structural_closure_evidence.evidence_ids, ['explicit-structure-model-7']);
  assert.equal(receipt.authority.structural_closure_inferred_from_recognition, false);
});

test('same evidence and timestamp replay to the same correspondence fingerprint', async () => {
  const input = {
    subject: { id: 'sonata' },
    leftIndex: 'a',
    rightIndex: 'b',
    anchors: [{ id: 'cadence', similarity: 0.77, visibility: 0.8, weight: 1.5 }],
    adjacency: [{ id: 'adjacent-phrasing', similarity: 0.8, visibility: 0.9, weight: 1 }],
    generatedAt: '2026-08-20T03:49:00.000Z',
  };
  const left = await createRecognitionCorrespondence(input);
  const right = await createRecognitionCorrespondence(input);
  assert.equal(left.fingerprint, right.fingerprint);
  assert.equal(left.correspondence_id, right.correspondence_id);
});
