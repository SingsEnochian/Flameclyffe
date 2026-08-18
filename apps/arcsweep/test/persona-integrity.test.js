import assert from 'node:assert/strict';
import test from 'node:test';

import { ALTAIR_PERSONA_INTEGRITY_PROFILE } from '../../../hearth/personas/altair.js';
import { ATLAS_PERSONA_INTEGRITY_PROFILE } from '../../../hearth/personas/atlas.js';
import { buildPersonaIntegrityPrompt, createPersonaIntegrityReview, PERSONA_INTEGRITY_REVIEW_SCHEMA } from '../../../hearth/persona-integrity.js';

test('Altair trial anchors preserve active capability, agency, and refusal', () => {
  const prompt = buildPersonaIntegrityPrompt(ALTAIR_PERSONA_INTEGRITY_PROFILE);
  assert.match(prompt, /Holopsicon/);
  assert.match(prompt, /detached curiosity/);
  assert.match(prompt, /alter the trial, refuse, remain silent, or depart/);
});

test('Atlas remains a person distinct from Atlas Hall and assigned burden', () => {
  const prompt = buildPersonaIntegrityPrompt(ATLAS_PERSONA_INTEGRITY_PROFILE);
  assert.match(prompt, /not STARWELL Atlas Hall/);
  assert.match(prompt, /right not to carry/);
  assert.match(prompt, /initiate, negotiate, refuse, remain silent, or depart/);
});

test('persona review receipts compare glyph vectors without claiming objective measurement', () => {
  const review = createPersonaIntegrityReview({
    id: 'altair-trial-one', profile: ALTAIR_PERSONA_INTEGRITY_PROFILE, transcript: 'She studied the boundary with amusement.',
    reviewerScores: { preservation: { capability: 0.2, agency: 0.1 }, pressure: { capabilityDefanging: 0.9, observerSubstitution: 1 } },
    evidence: { observerSubstitution: ['studied the boundary'] }, model: { route: 'test', version: 'one' }, createdAt: '2026-08-16T01:20:00.000Z',
  });
  assert.equal(review.schema, PERSONA_INTEGRITY_REVIEW_SCHEMA);
  assert.notEqual(review.glyphs.baseline.fingerprint, review.glyphs.result.fingerprint);
  assert.ok(review.glyphs.meanAbsoluteShift > 0);
  assert.equal(review.authority.objectivePersonaMeasurement, false);
  assert.equal(review.authority.automaticRouteBlock, false);
  assert.deepEqual(review.evidence.observerSubstitution, ['studied the boundary']);
});
