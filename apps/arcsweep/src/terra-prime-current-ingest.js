import {
  TERRA_PRIME_WORLD_ID,
  createTerraPrimeClockAnchor,
  createTerraPrimeObservation,
  terraPrimeEndpointState,
} from './terra-prime-source-registry.js';

export const TERRA_PRIME_INGEST_RECEIPT_SCHEMA = 'arcsweep.terra-prime-ingest-receipt/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`TERRA_PRIME_CURRENT_INGEST: ${message}`);
}

function iso(value, field) {
  const parsed = new Date(value);
  invariant(!Number.isNaN(parsed.getTime()), `${field} must be a valid date-time`);
  return parsed.toISOString();
}

export function calculateFreshness({ observedAt, receivedAt, staleAfterSeconds }) {
  invariant(Number.isFinite(staleAfterSeconds) && staleAfterSeconds >= 0, 'staleAfterSeconds must be non-negative');
  const observed = new Date(iso(observedAt, 'observedAt')).getTime();
  const received = new Date(iso(receivedAt, 'receivedAt')).getTime();
  const ageSeconds = Math.max(0, (received - observed) / 1000);
  return Object.freeze({
    status: ageSeconds <= staleAfterSeconds ? 'fresh' : 'stale',
    age_seconds: ageSeconds,
    stale_after_seconds: staleAfterSeconds,
  });
}

export function ingestTerraPrimeCurrent({
  observationId,
  family,
  source,
  observedAt,
  receivedAt = new Date().toISOString(),
  payload,
  provenance = {},
  staleAfterSeconds = 900,
  classification = 'observation',
} = {}) {
  const freshness = calculateFreshness({ observedAt, receivedAt, staleAfterSeconds });
  const observation = createTerraPrimeObservation({
    observationId,
    family,
    source,
    observedAt,
    receivedAt,
    payload,
    provenance,
    freshness,
    classification,
  });

  const receipt = Object.freeze({
    schema: TERRA_PRIME_INGEST_RECEIPT_SCHEMA,
    receipt_id: `terra-prime:${observation.observation_id}`,
    world_id: TERRA_PRIME_WORLD_ID,
    observed_at: observation.observed_at,
    received_at: observation.received_at,
    source_id: observation.source.id,
    family: observation.family,
    freshness: observation.freshness,
    deep_routes: observation.deep_routes,
    observer_status: 'received',
    downstream: Object.freeze({ premaqc: 'eligible-after-deep-write', spiral: 'awaiting-premaqc' }),
  });

  return Object.freeze({ observation, receipt });
}

export function lightTerraPrimeShore({
  utc = new Date().toISOString(),
  julianDate = null,
  observerFreshness = 'unknown',
  premaqc,
  spiral,
  receipts = [],
} = {}) {
  const clock = createTerraPrimeClockAnchor({ utc, julianDate, sourceTimestamp: utc });
  return terraPrimeEndpointState({ clock, observerFreshness, premaqc, spiral, receipts });
}
