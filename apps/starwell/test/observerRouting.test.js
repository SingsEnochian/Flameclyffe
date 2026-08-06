import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RESULT_BLOCKED,
  RESULT_DECOMPOSE,
  RESULT_HELD,
  RESULT_ROUTED,
  routeObservation,
} from '../../../starwell/deep-observer/observer-routing.js';

function envelope(overrides = {}) {
  return {
    schema: 'hearthgate/observation-envelope/v1',
    envelope_id: 'test-envelope-001',
    received_at: '2026-08-05T18:00:00Z',
    source_id: 'test/v1',
    source_kind: 'canon_event',
    evidence_class: 'established',
    content_kind: 'event',
    temporal_extent: { utc_start: '2026-08-05T18:00:00Z', utc_end: null, ongoing: false },
    canon_effect: 'additive',
    consent_scope: 'shared',
    confidence: 0.9,
    payload: { text: 'Falka crossed the bridge.' },
    ...overrides,
  };
}

test('canon event routes to DEEPStory', () => {
  const result = routeObservation(envelope({ source_kind: 'canon_event', canon_effect: 'additive' }));
  assert.equal(result.result, RESULT_ROUTED);
  assert.ok(result.destinations.includes('DEEPStory'));
});

test('canon event with utc_start also routes to DEEPTime', () => {
  const result = routeObservation(envelope({
    source_kind: 'canon_event',
    canon_effect: 'additive',
    temporal_extent: { utc_start: '2026-08-05T18:00:00Z', utc_end: null, ongoing: false },
  }));
  assert.equal(result.result, RESULT_ROUTED);
  assert.ok(result.destinations.includes('DEEPStory'));
  assert.ok(result.destinations.includes('DEEPTime'));
});

test('temporal reading routes to DEEPTime only', () => {
  const result = routeObservation(envelope({
    source_kind: 'temporal_reading',
    content_kind: 'trajectory',
    canon_effect: 'none',
  }));
  assert.equal(result.result, RESULT_ROUTED);
  assert.ok(result.destinations.includes('DEEPTime'));
  assert.ok(!result.destinations.includes('DEEPStory'));
});

test('arcsweep temporal routes to DEEPTime', () => {
  const result = routeObservation(envelope({
    source_kind: 'arcsweep_temporal',
    content_kind: 'trajectory',
    canon_effect: 'none',
  }));
  assert.equal(result.result, RESULT_ROUTED);
  assert.ok(result.destinations.includes('DEEPTime'));
});

test('pattern analysis routes to DEEPTheory', () => {
  const result = routeObservation(envelope({
    source_kind: 'pattern_analysis',
    content_kind: 'analysis',
    canon_effect: 'none',
  }));
  assert.equal(result.result, RESULT_ROUTED);
  assert.ok(result.destinations.includes('DEEPTheory'));
  assert.ok(!result.destinations.includes('DEEPStory'));
  assert.ok(!result.destinations.includes('DEEPTime'));
});

test('canon contradiction routes to both DEEPStory and DEEPTheory', () => {
  const result = routeObservation(envelope({
    source_kind: 'canon_event',
    content_kind: 'contradiction',
    canon_effect: 'contradictory',
  }));
  assert.equal(result.result, RESULT_ROUTED);
  assert.ok(result.destinations.includes('DEEPStory'));
  assert.ok(result.destinations.includes('DEEPTheory'));
});

test('news digest triggers decompose, not routing', () => {
  const result = routeObservation(envelope({ source_kind: 'news_digest', content_kind: 'digest' }));
  assert.equal(result.result, RESULT_DECOMPOSE);
  assert.deepEqual(result.destinations, []);
});

test('excluded consent scope blocks routing', () => {
  const result = routeObservation(envelope({ consent_scope: 'excluded' }));
  assert.equal(result.result, RESULT_BLOCKED);
  assert.deepEqual(result.destinations, []);
});

test('review_required consent scope holds routing', () => {
  const result = routeObservation(envelope({ consent_scope: 'review_required' }));
  assert.equal(result.result, RESULT_HELD);
  assert.deepEqual(result.destinations, []);
});

test('low-confidence unknown observation is held', () => {
  const result = routeObservation(envelope({ confidence: 0.2, evidence_class: 'unknown' }));
  assert.equal(result.result, RESULT_HELD);
});

test('source cannot specify destination_datasets', () => {
  const result = routeObservation({ ...envelope(), destination_datasets: ['DEEPStory'] });
  assert.equal(result.result, RESULT_BLOCKED);
  assert.ok(result.notes.includes('destination_datasets'));
});

test('daily event with ongoing flag routes to DEEPStory and DEEPTime', () => {
  const result = routeObservation(envelope({
    source_kind: 'daily_event',
    content_kind: 'event',
    canon_effect: 'additive',
    temporal_extent: { utc_start: '2026-08-05T00:00:00Z', utc_end: null, ongoing: true },
  }));
  assert.equal(result.result, RESULT_ROUTED);
  assert.ok(result.destinations.includes('DEEPStory'));
  assert.ok(result.destinations.includes('DEEPTime'));
});

test('glyph cast with additive effect routes to DEEPStory and DEEPTime', () => {
  const result = routeObservation(envelope({
    source_kind: 'glyph_cast',
    content_kind: 'cast',
    canon_effect: 'additive',
  }));
  assert.equal(result.result, RESULT_ROUTED);
  assert.ok(result.destinations.includes('DEEPStory'));
  assert.ok(result.destinations.includes('DEEPTime'));
});
