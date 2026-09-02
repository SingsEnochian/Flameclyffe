import { DEFAULT_DEEP_STATE, projectDeepState } from './deepState.js';
import {
  DEEP_MODES,
  fingerprint,
  validateDeepSnapshot,
} from '../hearthweave-kernel/dual-aspect.js';
import { readActiveDualAspectPacket } from '../hearthweave-kernel/activation.js';

export const DEEP_FIELD_CACHE_CONTRACT = 'deep-observer-backend-v1';
export const BRIDGE_PULSE_CONTRACT = 'hearthweave.bridge-pulse/v1';

export function resolveDeepCacheUrl({
  baseUrl = import.meta.env?.BASE_URL,
  moduleUrl = import.meta.url,
  location = globalThis.location,
} = {}) {
  const base = String(baseUrl || '/');
  if (base.startsWith('/')) {
    const page = typeof location === 'string'
      ? new URL(location)
      : location?.href
        ? new URL(location.href)
        : null;
    const cachePath = `${base.replace(/\/+$/, '')}/data/deep-current.json`;
    return page ? new URL(cachePath, page.origin).href : cachePath;
  }

  // Relative-base bundles run from an assets/ directory, including the
  // downloadable static bundle. The cache is published beside that directory.
  const cacheFromAsset = '../data/deep-current.json';
  return new URL(cacheFromAsset, moduleUrl).href;
}

export const BRIDGE_PULSE_URL = resolveDeepCacheUrl();

const NUMERIC_DEEP_FIELDS = Object.freeze([
  'P', 'C', 'R', 'E', 'M', 'A', 'dpdt', 'moonIllum', 'kp', 'bz', 'charge', 'dphi',
]);
const REQUIRED_DEEP_FIELDS = Object.freeze([...NUMERIC_DEEP_FIELDS, 'sky']);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function validDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function deepFieldIsValid(field, value) {
  if (value == null) return false;
  if (field === 'sky') return typeof value === 'string' && value.trim() !== '';
  return NUMERIC_DEEP_FIELDS.includes(field) && Number.isFinite(Number(value));
}

export function parseBridgePulsePayload(payload, {
  capturedAt = new Date(),
  url = BRIDGE_PULSE_URL,
  idFactory,
} = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Bridge pulse payload must be an object');
  }

  const fieldCacheDeep = payload.field && typeof payload.field === 'object' && !Array.isArray(payload.field)
    ? {
        ...payload.field,
        moonIllum: payload.moon?.illumination,
        kp: payload.space_weather?.kp?.value,
        bz: payload.space_weather?.solar_wind?.bz,
        sky: payload.weather?.sky,
        charge: payload.field.H,
        dphi: 0,
      }
    : null;
  const candidates = [
    ['deep', payload.deep],
    ['DEEP', payload.DEEP],
    ['state', payload.state],
    ['observer', payload.observer],
    ['field-cache', fieldCacheDeep],
  ].filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value));

  if (candidates.length === 0) {
    throw new Error('Bridge pulse did not include a DEEP state');
  }
  if (candidates.length > 1) {
    throw new Error(`Bridge pulse is ambiguous; found DEEP state at ${candidates.map(([key]) => key).join(', ')}`);
  }

  const [contractKey, rawDeep] = candidates[0];
  const projection = projectDeepState(rawDeep);
  const capturedAtIso = capturedAt.toISOString();
  const sourceTimestamp = validDateTime(
    payload.observed_at ?? payload.timestamp ?? payload.updated_at ?? payload.generated_at,
  );
  const observedAt = sourceTimestamp ?? capturedAtIso;
  const warnings = [];
  const substitutions = [];

  if (contractKey === 'field-cache') {
    warnings.push('STATIC_FIELD_CACHE_ADAPTER');
    substitutions.push(
      {
        field: 'state.charge',
        reason: 'FIELD_CACHE_HARMONIC_CHARGE_ADAPTER',
        source: 'field.H',
        source_value: payload.field.H ?? null,
        substituted_value: rawDeep.charge,
      },
      {
        field: 'state.dphi',
        reason: 'SOURCE_FIELD_UNAVAILABLE',
        source: 'static-field-cache-default',
        source_value: null,
        substituted_value: 0,
      },
    );
  } else if (contractKey !== 'deep') {
    warnings.push(`LEGACY_DEEP_KEY:${contractKey}`);
  }
  if (!sourceTimestamp) {
    substitutions.push({
      field: 'observed_at',
      reason: 'SOURCE_TIMESTAMP_MISSING',
      source: 'captured_at',
      substituted_value: capturedAtIso,
    });
  }
  for (const field of REQUIRED_DEEP_FIELDS) {
    if (!deepFieldIsValid(field, rawDeep[field])) {
      substitutions.push({
        field: `state.${field}`,
        reason: 'SOURCE_FIELD_MISSING_OR_INVALID',
        source: 'DEFAULT_DEEP_STATE',
        source_value: rawDeep[field] ?? null,
        substituted_value: DEFAULT_DEEP_STATE[field],
      });
    }
  }

  const snapshotId = typeof idFactory === 'function'
    ? `deep-snapshot-${idFactory()}`
    : `deep-snapshot-${fingerprint({ url, observedAt, contractKey, rawDeep, substitutions }).split(':').at(-1)}`;

  return validateDeepSnapshot({
    snapshot_id: snapshotId,
    mode: substitutions.length ? DEEP_MODES.DEGRADED : DEEP_MODES.LIVE,
    observed_at: observedAt,
    captured_at: capturedAtIso,
    source: {
      kind: contractKey === 'field-cache' ? 'deep-field-cache-http' : 'bridge-pulse-http',
      locator: url,
      contract: contractKey === 'field-cache'
        ? (payload.version || DEEP_FIELD_CACHE_CONTRACT)
        : BRIDGE_PULSE_CONTRACT,
      contract_key: contractKey,
    },
    raw_state: projection.raw,
    state: projection.state,
    transformations: projection.transformations,
    substitutions,
    errors: [],
    warnings,
  });
}

export function readPacketBoundDeepSnapshot({ storage } = {}) {
  const packet = readActiveDualAspectPacket({ storage });
  if (!packet) return null;
  return validateDeepSnapshot(packet.observable.deep_snapshot);
}

export async function fetchBridgeDeepSnapshot({
  fetchImpl = globalThis.fetch,
  url = BRIDGE_PULSE_URL,
  storage,
  preferActivePacket = true,
  clock = () => new Date(),
  idFactory,
} = {}) {
  if (preferActivePacket) {
    const bound = readPacketBoundDeepSnapshot({ storage });
    if (bound) return bound;
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('Bridge pulse fetch is unavailable in this runtime');
  }

  const response = await fetchImpl(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Bridge pulse returned ${response.status}`);
  }

  return parseBridgePulsePayload(await response.json(), {
    capturedAt: clock(),
    url,
    idFactory,
  });
}

export async function fetchBridgeDeepPulse(options = {}) {
  const snapshot = await fetchBridgeDeepSnapshot(options);
  return clone(snapshot.state);
}
