import { createStateSnapshot, resolveWorldIdentity } from './bifrost-crossing-envelope.js';

export const BIFROST_ENDPOINT_SCHEMA = 'arcsweep.bifrost-endpoint-instrument/v1';
export const TERRA_AETERNA_WORLD_ID = 'terra-aeterna';

function invariant(condition, message) {
  if (!condition) throw new Error(`BIFROST_ENDPOINT: ${message}`);
}

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === 'object') return Object.freeze(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, freeze(v)])));
  return value;
}

export function createEndpointInstrument({
  worldIdentity,
  frameworkLabel,
  shore,
  clock,
  observerFreshness = 'unknown',
  premaqc,
  spiral,
  worldProfile,
  canonContext = null,
  receipts = [],
  projections = {},
  snapshot,
} = {}) {
  const world_identity = resolveWorldIdentity(worldIdentity);
  invariant(['reference', 'destination'].includes(shore), 'shore must be reference or destination');
  invariant(clock && typeof clock === 'object', 'clock is required');
  invariant(premaqc && typeof premaqc === 'object', 'PREMAQC is required');
  invariant(spiral && typeof spiral === 'object', 'Spiral State is required');
  invariant(worldProfile && typeof worldProfile === 'object', 'world profile is required');
  invariant(snapshot?.world_identity === world_identity, 'snapshot must belong to endpoint world');

  const lanterns = freeze({
    identity: true,
    clock: true,
    observer: observerFreshness !== 'unknown',
    premaqc: true,
    spiral: true,
    world_profile: true,
    snapshot: true,
    canon_context: canonContext !== null,
    receipts: receipts.length > 0,
  });

  return freeze({
    schema: BIFROST_ENDPOINT_SCHEMA,
    world_identity,
    framework_label: frameworkLabel,
    shore,
    lit: Object.values(lanterns).every(Boolean),
    lanterns,
    clock,
    observer_freshness: observerFreshness,
    premaqc,
    spiral,
    world_profile: worldProfile,
    canon_context: canonContext,
    receipts,
    projections,
    snapshot,
  });
}

export function createTerraAeternaEndpoint({
  worldRevision,
  stateId,
  stateHash,
  effectiveAt,
  observationWatermark = null,
  premaqc,
  spiral,
  receipts,
  canonContext,
  projections = {},
  worldProfile = {},
  clock = null,
} = {}) {
  const snapshot = createStateSnapshot({
    worldIdentity: TERRA_AETERNA_WORLD_ID,
    frameworkLabel: 'Terra Aeterna',
    worldRevision,
    stateId,
    stateHash,
    effectiveAt,
    observationWatermark,
    premaqcVersion: premaqc?.schema ?? 'premaqc/current',
    spiralSchemaVersion: spiral?.schema ?? 'spiral-state/current',
    state: { premaqc, spiral },
  });

  return createEndpointInstrument({
    worldIdentity: TERRA_AETERNA_WORLD_ID,
    frameworkLabel: 'Terra Aeterna',
    shore: 'destination',
    clock: clock ?? { mode: 'world-native', effective_at: new Date(effectiveAt).toISOString() },
    observerFreshness: 'receipted',
    premaqc,
    spiral,
    worldProfile: {
      root_hz: 220,
      acoustic_identity: 'World Hum',
      ...worldProfile,
    },
    canonContext,
    receipts,
    projections,
    snapshot,
  });
}
