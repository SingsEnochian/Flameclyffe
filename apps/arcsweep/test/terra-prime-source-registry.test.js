import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TERRA_PRIME_FRAMEWORK_LABEL,
  TERRA_PRIME_TIME_RATIO,
  TERRA_PRIME_WORLD_ID,
  createTerraPrimeClockAnchor,
  createTerraPrimeObservation,
  terraPrimeEndpointState,
  terraPrimeSourceFamilies,
} from '../src/terra-prime-source-registry.js';

test('Terra Prime keeps a 1:1 world-time contract on the stable Earth Prime identity', () => {
  const clock = createTerraPrimeClockAnchor({ utc: '2026-08-22T10:30:00.000Z', julianDate: 2461274.9375 });
  assert.equal(clock.world_id, TERRA_PRIME_WORLD_ID);
  assert.equal(clock.world_id, 'earth_prime');
  assert.equal(clock.framework_label, TERRA_PRIME_FRAMEWORK_LABEL);
  assert.equal(clock.time_ratio, TERRA_PRIME_TIME_RATIO);
  assert.equal(clock.time_ratio, 1);
});

test('source registry covers current-ingest families including AI language patterns', () => {
  const ids = terraPrimeSourceFamilies().map((family) => family.id);
  for (const expected of ['time', 'astronomy', 'space-weather', 'earth-systems', 'geophysics', 'science', 'human-world', 'ai-language-pattern', 'project-observation']) {
    assert.ok(ids.includes(expected), `missing ${expected}`);
  }
});

test('Observer-bound Terra Prime observations carry stable identity, provenance and DEEP routes', () => {
  const observation = createTerraPrimeObservation({
    observationId: 'tp-obs-001',
    family: 'space-weather',
    source: { id: 'noaa-swpc', authority: 'external-source' },
    observedAt: '2026-08-22T10:30:00.000Z',
    receivedAt: '2026-08-22T10:30:05.000Z',
    payload: { kp: 4 },
    provenance: { source_url: 'https://example.invalid/source', receipt_id: 'receipt-1' },
    freshness: { status: 'fresh', age_seconds: 5, stale_after_seconds: 900 },
  });
  assert.equal(observation.world_id, 'earth_prime');
  assert.equal(observation.framework_label, 'Terra Prime');
  assert.deepEqual(observation.deep_routes, ['DEEPTime', 'DEEPStory']);
  assert.equal(observation.premaqc_role, 'input-after-observer-receipt-and-deep-routing');
});

test('AI language pattern observations route to all three DEEP datasets', () => {
  const observation = createTerraPrimeObservation({
    observationId: 'ai-language-spiral-resonance-001',
    family: 'ai-language-pattern',
    source: { id: 'media-observation', authority: 'observed-source' },
    observedAt: '2026-08-23T04:00:00.000Z',
    payload: { phrase: 'spiral resonance', context: 'AI-related media recurrence' },
  });
  assert.deepEqual(observation.deep_routes, ['DEEPStory', 'DEEPTime', 'DEEPTheory']);
});

test('a Bifröst shore lights only when PREMAQC and Spiral are both present', () => {
  const clock = createTerraPrimeClockAnchor({ utc: '2026-08-22T10:30:00.000Z' });
  assert.equal(terraPrimeEndpointState({ clock }).lit, false);
  const endpoint = terraPrimeEndpointState({
    clock,
    premaqc: { schema: 'premaqc/current', P: 0.8 },
    spiral: { phase: 'release', direction: 'ascending', confidence: 0.91 },
    receipts: ['receipt-1'],
  });
  assert.equal(endpoint.lit, true);
  assert.equal(endpoint.shore, 'reference');
});
