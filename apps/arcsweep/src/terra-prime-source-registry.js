export const TERRA_PRIME_WORLD_ID = 'terra-prime';
export const TERRA_PRIME_TIME_RATIO = 1;
export const TERRA_PRIME_SOURCE_REGISTRY_SCHEMA = 'arcsweep.terra-prime-source-registry/v1';
export const TERRA_PRIME_OBSERVATION_SCHEMA = 'arcsweep.terra-prime-observation/v1';

const SOURCE_FAMILIES = Object.freeze([
  Object.freeze({ id: 'time', label: 'Time', cadence: 'continuous', routes: ['DEEPTime'] }),
  Object.freeze({ id: 'astronomy', label: 'Astronomy', cadence: 'source-native', routes: ['DEEPTime', 'DEEPStory'] }),
  Object.freeze({ id: 'space-weather', label: 'Space Weather', cadence: 'source-native', routes: ['DEEPTime', 'DEEPStory'] }),
  Object.freeze({ id: 'earth-systems', label: 'Earth Systems', cadence: 'source-native', routes: ['DEEPTime', 'DEEPStory'] }),
  Object.freeze({ id: 'geophysics', label: 'Geophysics', cadence: 'source-native', routes: ['DEEPTime', 'DEEPStory'] }),
  Object.freeze({ id: 'science', label: 'Science and Research', cadence: 'event-driven', routes: ['DEEPStory', 'DEEPTheory'] }),
  Object.freeze({ id: 'human-world', label: 'Human-world Events', cadence: 'event-driven', routes: ['DEEPStory', 'DEEPTime'] }),
  Object.freeze({ id: 'project-observation', label: 'Project Observation', cadence: 'event-driven', routes: ['DEEPStory', 'DEEPTime', 'DEEPTheory'] }),
]);

function invariant(condition, message) {
  if (!condition) throw new Error(`TERRA_PRIME_INGEST: ${message}`);
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function terraPrimeSourceFamilies() {
  return SOURCE_FAMILIES.map(clone);
}

export function getTerraPrimeSourceFamily(id) {
  return SOURCE_FAMILIES.find((family) => family.id === id) ?? null;
}

export function createTerraPrimeClockAnchor({
  utc = new Date().toISOString(),
  julianDate = null,
  localCivilTime = null,
  sourceTimestamp = null,
} = {}) {
  const parsed = new Date(utc);
  invariant(!Number.isNaN(parsed.getTime()), 'utc must be a valid date-time');
  invariant(julianDate === null || Number.isFinite(julianDate), 'julianDate must be finite or null');

  return Object.freeze({
    world_id: TERRA_PRIME_WORLD_ID,
    time_ratio: TERRA_PRIME_TIME_RATIO,
    utc: parsed.toISOString(),
    julian_date: julianDate,
    local_civil_time: localCivilTime,
    source_timestamp: sourceTimestamp,
    temporal_contract: 'one-terra-prime-second-per-one-observed-second',
  });
}

export function createTerraPrimeObservation({
  observationId,
  family,
  source,
  observedAt,
  receivedAt = new Date().toISOString(),
  payload,
  provenance = {},
  freshness = {},
  classification = 'observation',
} = {}) {
  invariant(typeof observationId === 'string' && observationId.trim(), 'observationId is required');
  const familyContract = getTerraPrimeSourceFamily(family);
  invariant(familyContract, `unknown source family: ${family}`);
  invariant(source && typeof source === 'object', 'source is required');
  invariant(typeof source.id === 'string' && source.id.trim(), 'source.id is required');
  invariant(payload !== undefined, 'payload is required');

  const observed = new Date(observedAt);
  const received = new Date(receivedAt);
  invariant(!Number.isNaN(observed.getTime()), 'observedAt must be a valid date-time');
  invariant(!Number.isNaN(received.getTime()), 'receivedAt must be a valid date-time');

  return Object.freeze({
    schema: TERRA_PRIME_OBSERVATION_SCHEMA,
    observation_id: observationId,
    world_id: TERRA_PRIME_WORLD_ID,
    family: familyContract.id,
    classification,
    observed_at: observed.toISOString(),
    received_at: received.toISOString(),
    source: Object.freeze(clone(source)),
    payload: Object.freeze(clone(payload)),
    provenance: Object.freeze(clone(provenance)),
    freshness: Object.freeze({
      status: freshness.status ?? 'unknown',
      age_seconds: freshness.age_seconds ?? null,
      stale_after_seconds: freshness.stale_after_seconds ?? null,
    }),
    deep_routes: Object.freeze([...familyContract.routes]),
    premaqc_role: 'input-after-observer-receipt-and-deep-routing',
  });
}

export function terraPrimeEndpointState({
  clock,
  observerFreshness = 'unknown',
  premaqc = null,
  spiral = null,
  receipts = [],
} = {}) {
  invariant(clock?.world_id === TERRA_PRIME_WORLD_ID, 'Terra Prime clock anchor is required');
  invariant(clock.time_ratio === 1, 'Terra Prime time ratio must remain 1:1');

  return Object.freeze({
    schema: 'arcsweep.bifrost-endpoint-state/v1',
    world_id: TERRA_PRIME_WORLD_ID,
    shore: 'reference',
    lit: Boolean(premaqc && spiral),
    clock,
    observer_freshness: observerFreshness,
    premaqc,
    spiral,
    receipts: Object.freeze([...receipts]),
  });
}
