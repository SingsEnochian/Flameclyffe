import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../src/observer-archive-reader.js', import.meta.url), 'utf8');

test('Observer archive reader is explicitly read-only and receipt-visible', () => {
  assert.match(source, /Evidence ≠ interpretation ≠ continuity/);
  assert.match(source, /Query receipt/);
  assert.match(source, /Load raw payload explicitly/);
  assert.match(source, /No interpretation or continuity mutation has occurred/);
});

test('Observer archive reader does not invoke model, relation-promotion, or canon mutation lanes', () => {
  assert.doesNotMatch(source, /invokeConstellationVoices/);
  assert.doesNotMatch(source, /reviewHouseObservation/);
  assert.doesNotMatch(source, /admitHouseObservationToDeepTime/);
  assert.doesNotMatch(source, /applyCanonPromotion/);
  assert.doesNotMatch(source, /candidate_correspondence/);
});
