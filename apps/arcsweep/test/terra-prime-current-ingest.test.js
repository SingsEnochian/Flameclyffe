import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateFreshness,
  ingestTerraPrimeCurrent,
  lightTerraPrimeShore,
} from '../src/terra-prime-current-ingest.js';

test('freshness is derived from observed and received timestamps', () => {
  assert.deepEqual(calculateFreshness({
    observedAt: '2026-08-22T10:30:00.000Z',
    receivedAt: '2026-08-22T10:30:05.000Z',
    staleAfterSeconds: 60,
  }), { status: 'fresh', age_seconds: 5, stale_after_seconds: 60 });
});

test('stale source data is labelled rather than silently treated as current', () => {
  const freshness = calculateFreshness({
    observedAt: '2026-08-22T10:00:00.000Z',
    receivedAt: '2026-08-22T10:30:00.000Z',
    staleAfterSeconds: 900,
  });
  assert.equal(freshness.status, 'stale');
  assert.equal(freshness.age_seconds, 1800);
});

test('current ingest emits an Observer receipt with DEEP routes', () => {
  const { observation, receipt } = ingestTerraPrimeCurrent({
    observationId: 'swpc-001',
    family: 'space-weather',
    source: { id: 'noaa-swpc', authority: 'external-source' },
    observedAt: '2026-08-22T10:30:00.000Z',
    receivedAt: '2026-08-22T10:30:08.000Z',
    payload: { kp: 4 },
    provenance: { source_url: 'https://www.swpc.noaa.gov/' },
    staleAfterSeconds: 900,
  });
  assert.equal(observation.freshness.status, 'fresh');
  assert.equal(receipt.observer_status, 'received');
  assert.deepEqual(receipt.deep_routes, ['DEEPTime', 'DEEPStory']);
  assert.equal(receipt.downstream.premaqc, 'eligible-after-deep-write');
});

test('Terra Prime shore burns bright only after PREMAQC and Spiral arrive', () => {
  const dark = lightTerraPrimeShore({ utc: '2026-08-22T10:30:00.000Z' });
  assert.equal(dark.lit, false);

  const lit = lightTerraPrimeShore({
    utc: '2026-08-22T10:30:00.000Z',
    observerFreshness: 'fresh',
    premaqc: { schema: 'premaqc/current', P: 0.88, C: 0.9, R: 0.86, E: 0.25, M: 0.8, A: 0.91, Q: 0.84 },
    spiral: { phase: 'release', direction: 'ascending', confidence: 0.93 },
    receipts: ['terra-prime:swpc-001'],
  });
  assert.equal(lit.lit, true);
  assert.equal(lit.world_id, 'terra-prime');
  assert.equal(lit.clock.time_ratio, 1);
  assert.equal(lit.observer_freshness, 'fresh');
});
