import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CODEX_MOTION_TIERS,
  createCaptureRecord,
  createCommitRevealPair,
  createObservationRecord,
  latentRevealStrength,
  normaliseWorkingPage,
  resolveCodexMotionTier,
} from '../src/universal-codex-reference-patterns.js';

test('motion hierarchy keeps idle effects subordinate to meaningful events', () => {
  assert.equal(resolveCodexMotionTier({ kind: 'idle' }).intensity, CODEX_MOTION_TIERS.idle);
  assert.equal(resolveCodexMotionTier({ kind: 'glyph-stroke' }).tier, 'interaction');
  assert.equal(resolveCodexMotionTier({ kind: 'agent-arrival' }).tier, 'event');
  assert.equal(resolveCodexMotionTier({ kind: 'first-contact' }).tier, 'revelation');
  assert.ok(CODEX_MOTION_TIERS.idle < CODEX_MOTION_TIERS.interaction);
  assert.ok(CODEX_MOTION_TIERS.event < CODEX_MOTION_TIERS.revelation);
});

test('latent reveal strength responds to multiple independent cues', () => {
  assert.equal(latentRevealStrength({}), 0);
  assert.ok(latentRevealStrength({ proximity: 1, signal: 1 }) > 0.6);
  assert.equal(latentRevealStrength({ proximity: 9, signal: 9, confidence: 9, intent: 9 }), 1);
});

test('observation receipts keep raw signal, observation, and interpretation separate', () => {
  const record = createObservationRecord({
    event: 'field-shift',
    instrument: 'magnetometer',
    raw_signal: { delta_uT: 18 },
    observation: 'needle moved',
    interpretation: 'possible environmental correlation',
    witness: 'observer-a',
  });
  assert.deepEqual(record.raw_signal, { delta_uT: 18 });
  assert.equal(record.observation, 'needle moved');
  assert.equal(record.interpretation, 'possible environmental correlation');
  assert.notEqual(record.observation, record.interpretation);
});

test('capture defaults to the local realm and preserves multimodal input', () => {
  const record = createCaptureRecord({
    id: 'capture:test',
    kind: 'Dream',
    modalities: ['voice', 'text', 'voice'],
  });
  assert.equal(record.realm, 'local');
  assert.deepEqual(record.modalities, ['voice', 'text']);
});

test('working pages preserve transformable artefacts plus provenance', () => {
  const page = normaliseWorkingPage({
    id: 'page:altar-1',
    source_intent: 'compose a working',
    method: 'direct-manipulation',
    items: [
      { id: 'glyph:1', type: 'glyph', x: 1.4, y: -1, scale: 2, rotation: 35, zIndex: 4 },
      { id: 'sound:1', type: 'sound-node', x: 0.2, y: 0.8 },
    ],
  });
  assert.equal(page.items.length, 2);
  assert.equal(page.items[0].x, 1);
  assert.equal(page.items[0].y, 0);
  assert.equal(page.items[0].rotation_deg, 35);
  assert.equal(page.provenance.method, 'direct-manipulation');
});

test('paired observer records remain sealed until reveal', () => {
  const sealed = createCommitRevealPair({
    session_id: 'pair:1',
    left_commitment: 'hash-a',
    right_commitment: 'hash-b',
    left: { impression: 'tower' },
    right: { target: 'lighthouse' },
  });
  assert.equal(sealed.revealed, false);
  assert.equal(sealed.left, null);
  assert.equal(sealed.right, null);

  const revealed = createCommitRevealPair({
    session_id: 'pair:1',
    revealed: true,
    left: { impression: 'tower' },
    right: { target: 'lighthouse' },
    comparison: { semantic_overlap: ['tower-like structure'] },
  });
  assert.deepEqual(revealed.left, { impression: 'tower' });
  assert.equal(revealed.causal_conclusion, null);
});
