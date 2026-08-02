import { DEFAULT_DEEP_STATE, normaliseDeepState } from './deepState.js';
import {
  DEEP_MODES,
  fingerprint,
  validateDeepSnapshot,
} from '../hearthweave-kernel/dual-aspect.js';
import { readActiveDualAspectPacket } from '../hearthweave-kernel/activation.js';

export const BRIDGE_PULSE_URL = 'https://singsenochian.github.io/-bridge-pulse/pulse.json';
export const BRIDGE_PULSE_CONTRACT = 'hearthweave.bridge-pulse/v1';

const REQUIRED_DEEP_FIELDS = Object.freeze([
  'P', 'C', 'R', 'E', 'M', 'A', 'dpdt', 'moonIllum', 'sky', 'kp', 'bz', 'charge', 'dphi',
]);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function validDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseBridgePulsePayload(payload, {
  capturedAt = new Date(),
  url = BRIDGE_PULSE_URL,
  idFactory,
} = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Bridge pulse payload must be an object');
  }

  const candidates = [
    ['deep', payload.deep],
    ['DEEP', payload.DEEP],
    ['state', payload.state],
    ['observer', payload.observer],
  ].filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value));

  if (candidates.length === 0) {
    throw new Error('Bridge pulse did not include a DEEP state');
  }
  if (candidates.length > 1) {
    throw new Error(`Bridge pulse is ambiguous; found DEEP state at ${candidates.map(([key]) => key).join(', ')}`);
  }

  const [contractKey, rawDeep] = candidates[0];
  const capturedAtIso = capturedAt.toISOString();
  const sourceTimestamp = validDateTime(payload.observed_at ?? payload.timestamp ?? payload.updated_at);
  const observedAt = sourceTimestamp ?? capturedAtIso;
  const warnings = [];
  const substitutions = [];

  if (contractKey !== 'deep') warnings.push(`LEGACY_DEEP_KEY:${contractKey}`);
  if (!sourceTimestamp) {
    substitutions.push({
      field: 'observed_at',
      reason: 'SOURCE_TIMESTAMP_MISSING',
      source: 'captured_at',
      substituted_value: capturedAtIso,
    });
  }
  for (const field of REQUIRED_DEEP_FIELDS) {
    if (rawDeep[field] == null || (typeof rawDeep[field] === 'number' && !Number.isFinite(rawDeep[field]))) {
      substitutions.push({
        field: `state.${field}`,
        reason: 'SOURCE_FIELD_MISSING_OR_INVALID',
        source: 'DEFAULT_DEEP_STATE',
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
      kind: 'bridge-pulse-http',
      locator: url,
      contract: BRIDGE_PULSE_CONTRACT,
      contract_key: contractKey,
    },
    state: normaliseDeepState(rawDeep),
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
