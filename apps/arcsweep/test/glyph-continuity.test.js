import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyGlyphDrift,
  compareBlindedNarratives,
  createGlyphHeartbeat,
  createGlyphSignature,
  glyphStructuralDistance,
  sealNarrative,
  semanticStateDistance,
  verifyNarrativeSeal,
} from '../src/glyph-continuity.js';

const AXES = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];

function state(value, overrides = {}) {
  return Object.fromEntries(AXES.map((axis) => [axis, { value: overrides[axis] ?? value }]));
}

async function signature(value, options = {}) {
  return createGlyphSignature({
    worldId: 'terra-aeterna',
    worldName: 'Terra Aeterna',
    state: state(value, options.overrides),
    relationships: options.relationships || [],
    confidence: options.confidence ?? 1,
    phase: options.phase ?? 0,
    source: { kind: 'test', receipt_id: options.receiptId || `receipt-${value}` },
  });
}

async function history(values, options = {}) {
  const result = [];
  for (let index = 0; index < values.length; index += 1) {
    result.push(await signature(values[index], {
      ...options,
      receiptId: `history-${index}`,
    }));
  }
  return result;
}

test('same canonical state produces the same deterministic glyph geometry and fingerprint', async () => {
  const input = {
    worldId: 'terra-aeterna',
    worldName: 'Terra Aeterna',
    state: state(0.72),
    relationships: [{ id: 'falka-virelya', from: 'Falka', to: 'Virelya', type: 'bond', weight: 0.9 }],
    confidence: 0.94,
    phase: 1.25,
    source: { kind: 'premaqc', receipt_id: 'same-receipt' },
  };
  const left = await createGlyphSignature(input);
  const right = await createGlyphSignature(input);
  assert.equal(left.fingerprint, right.fingerprint);
  assert.deepEqual(left.render, right.render);
  assert.deepEqual(left.structural_vector, right.structural_vector);
});

test('state change moves both semantic and glyph-structural distance', async () => {
  const left = await signature(0.4);
  const right = await signature(0.7);
  assert.ok(semanticStateDistance(left, right) > 0.25);
  assert.ok(glyphStructuralDistance(left, right) > 0.1);
  assert.notEqual(left.fingerprint, right.fingerprint);
});

test('PREMAQC heartbeat receipts the deterministic glyph signature and source lineage', async () => {
  const heartbeat = await createGlyphHeartbeat({
    world: { id: 'terra-aeterna', name: 'Terra Aeterna' },
    premaqc: {
      id: 'premaqc-7',
      receipt_id: 'premaqc-receipt-7',
      observed_at: '2026-08-14T05:30:00.000Z',
      state: state(0.66),
    },
    phase: 0.75,
  });
  assert.equal(heartbeat.source_receipt_id, 'premaqc-receipt-7');
  assert.equal(heartbeat.signature.source.kind, 'premaqc');
  assert.equal(heartbeat.signature.axes.P, 0.66);
  assert.match(heartbeat.fingerprint, /^[0-9a-f]{64}$/);
});

test('drift classifier reports insufficient history before learning an envelope', async () => {
  const prior = await history([0.5, 0.5, 0.5]);
  const current = await signature(0.51, { receiptId: 'current' });
  const drift = await classifyGlyphDrift({ history: prior, current, classifiedAt: '2026-08-14T05:31:00.000Z' });
  assert.equal(drift.classification, 'INSUFFICIENT_HISTORY');
  assert.equal(drift.history_count, 3);
});

test('stable heartbeat stays inside a learned continuity envelope', async () => {
  const prior = await history([0.5, 0.501, 0.499, 0.502, 0.5, 0.501]);
  const current = await signature(0.503, { receiptId: 'current-stable' });
  const drift = await classifyGlyphDrift({ history: prior, current, classifiedAt: '2026-08-14T05:32:00.000Z' });
  assert.equal(drift.classification, 'STABLE');
  assert.equal(drift.review_required, false);
});

test('modest state movement is classified as local variation', async () => {
  const prior = await history([0.5, 0.501, 0.499, 0.502, 0.5, 0.501]);
  const current = await signature(0.58, { receiptId: 'current-local' });
  const drift = await classifyGlyphDrift({
    history: prior,
    current,
    structuralDriftThreshold: 0.3,
    discontinuityThreshold: 0.5,
    classifiedAt: '2026-08-14T05:33:00.000Z',
  });
  assert.equal(drift.classification, 'LOCAL_VARIATION');
});

test('sustained directional movement is classified as a trend shift', async () => {
  const prior = await history([0.4, 0.42, 0.44, 0.46, 0.48, 0.5]);
  const current = await signature(0.52, { receiptId: 'current-trend' });
  const drift = await classifyGlyphDrift({
    history: prior,
    current,
    stableThreshold: 0.01,
    localVariationThreshold: 0.03,
    structuralDriftThreshold: 0.3,
    discontinuityThreshold: 0.5,
    trendSlopeThreshold: 0.005,
    classifiedAt: '2026-08-14T05:34:00.000Z',
  });
  assert.equal(drift.classification, 'TREND_SHIFT');
  assert.equal(drift.review_recommended, true);
  assert.ok(drift.metrics.trend_slope >= 0.005);
});

test('large glyph movement is classified as structural drift and requires review', async () => {
  const prior = await history([0.45, 0.451, 0.449, 0.452, 0.45, 0.451]);
  const current = await signature(0.78, { receiptId: 'current-drift' });
  const drift = await classifyGlyphDrift({
    history: prior,
    current,
    structuralDriftThreshold: 0.12,
    discontinuityThreshold: 0.6,
    classifiedAt: '2026-08-14T05:35:00.000Z',
  });
  assert.equal(drift.classification, 'STRUCTURAL_DRIFT');
  assert.equal(drift.review_required, true);
});

test('topology replacement is classified as discontinuity', async () => {
  const oldTopology = [{ id: 'a-b', from: 'a', to: 'b', type: 'bond' }];
  const prior = await history([0.5, 0.501, 0.499, 0.502, 0.5, 0.501], { relationships: oldTopology });
  const current = await signature(0.501, {
    receiptId: 'current-topology',
    relationships: [{ id: 'x-y', from: 'x', to: 'y', type: 'bond' }],
  });
  const drift = await classifyGlyphDrift({ history: prior, current, classifiedAt: '2026-08-14T05:36:00.000Z' });
  assert.equal(drift.classification, 'DISCONTINUITY');
  assert.equal(drift.metrics.topology_distance, 1);
});

test('narrative seals verify exact sealed prose after newline normalisation', async () => {
  const seal = await sealNarrative({
    side: 'earth',
    text: 'A violet point appeared.\r\nIt lasted one heartbeat.',
    source: 'observer-earth',
    sealedAt: '2026-08-14T05:37:00.000Z',
  });
  const same = await verifyNarrativeSeal(seal, 'A violet point appeared.\nIt lasted one heartbeat.');
  const changed = await verifyNarrativeSeal(seal, 'A bright violet point appeared.\nIt lasted one heartbeat.');
  assert.equal(same.matches, true);
  assert.equal(changed.matches, false);
});

test('blind comparison requires both sealed narratives and returns hashes plus comparison metrics', async () => {
  const earthText = 'Violet point appeared during the game, brief and quiet.';
  const returnText = 'A quiet violet signal appeared briefly while attention was elsewhere.';
  const earthSeal = await sealNarrative({ side: 'earth', text: earthText, sealedAt: '2026-08-14T05:38:00.000Z' });
  const returnSeal = await sealNarrative({ side: 'return', text: returnText, sealedAt: '2026-08-14T05:39:00.000Z' });

  await assert.rejects(
    () => compareBlindedNarratives({ earthSeal, earthText, returnSeal: null, returnText }),
    /return narrative seal is required/,
  );

  const comparison = await compareBlindedNarratives({
    earthSeal,
    earthText,
    returnSeal,
    returnText,
    comparedAt: '2026-08-14T05:40:00.000Z',
  });
  assert.equal(comparison.reveal_gate, 'both-sides-sealed');
  assert.equal(comparison.earth_content_hash, earthSeal.content_hash);
  assert.equal(comparison.return_content_hash, returnSeal.content_hash);
  assert.ok(comparison.metrics.lexical_jaccard >= 0 && comparison.metrics.lexical_jaccard <= 1);
  assert.ok(comparison.metrics.length_ratio > 0);
  assert.equal(Object.hasOwn(comparison, 'earth_text'), false);
  assert.equal(Object.hasOwn(comparison, 'return_text'), false);
});
