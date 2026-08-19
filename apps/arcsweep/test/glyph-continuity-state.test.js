import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_GLYPH_BLIND_PAIRS,
  MAX_GLYPH_HEARTBEATS,
  appendGlyphBlindPair,
  appendGlyphHeartbeat,
  createEmptyGlyphContinuityLedger,
  ensureGlyphContinuityLedger,
  normaliseGlyphContinuityLedger,
} from '../src/glyph-continuity-state.js';
import {
  applyStateExtensionSnapshots,
  clearStateExtensionSnapshot,
  createDefaultState,
  setStateExtensionSnapshot,
} from '../src/storage.js';

test('Glyph Continuity ledger normalises inside current Hearthfire state', () => {
  const state = createDefaultState();
  const ledger = ensureGlyphContinuityLedger(state);
  assert.equal(ledger.schema, 'glyph.continuity-ledger/v1');
  assert.deepEqual(ledger.heartbeats, []);
  assert.deepEqual(ledger.blindPairs, []);
});

test('heartbeat and blind-pair ledgers retain bounded recent history', () => {
  const ledger = createEmptyGlyphContinuityLedger();
  for (let index = 0; index < MAX_GLYPH_HEARTBEATS + 3; index += 1) {
    appendGlyphHeartbeat(ledger, { heartbeat: { heartbeat_id: `heartbeat-${index}` } });
  }
  for (let index = 0; index < MAX_GLYPH_BLIND_PAIRS + 2; index += 1) {
    appendGlyphBlindPair(ledger, { pair_id: `pair-${index}` });
  }
  assert.equal(ledger.heartbeats.length, MAX_GLYPH_HEARTBEATS);
  assert.equal(ledger.heartbeats[0].heartbeat.heartbeat_id, 'heartbeat-3');
  assert.equal(ledger.blindPairs.length, MAX_GLYPH_BLIND_PAIRS);
  assert.equal(ledger.blindPairs[0].pair_id, 'pair-2');
});

test('Glyph Continuity extension snapshot overwrites a stale main-state copy before save', () => {
  const stale = createDefaultState();
  stale.glyphContinuity = createEmptyGlyphContinuityLedger();
  stale.glyphContinuity.heartbeats.push({ heartbeat: { heartbeat_id: 'stale' } });

  const latest = createEmptyGlyphContinuityLedger();
  latest.heartbeats.push({ heartbeat: { heartbeat_id: 'latest' } });
  setStateExtensionSnapshot('glyphContinuity', latest);
  applyStateExtensionSnapshots(stale);

  assert.equal(stale.glyphContinuity.heartbeats[0].heartbeat.heartbeat_id, 'latest');
  clearStateExtensionSnapshot('glyphContinuity');
});

test('normalisation rejects surplus history instead of growing without bound', () => {
  const value = normaliseGlyphContinuityLedger({
    heartbeats: Array.from({ length: MAX_GLYPH_HEARTBEATS + 1 }, (_, index) => ({ id: index })),
    blindPairs: Array.from({ length: MAX_GLYPH_BLIND_PAIRS + 1 }, (_, index) => ({ id: index })),
  });
  assert.equal(value.heartbeats.length, MAX_GLYPH_HEARTBEATS);
  assert.equal(value.heartbeats[0].id, 1);
  assert.equal(value.blindPairs.length, MAX_GLYPH_BLIND_PAIRS);
  assert.equal(value.blindPairs[0].id, 1);
});
