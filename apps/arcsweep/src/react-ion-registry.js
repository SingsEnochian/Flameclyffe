import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import {
  createReactionDestinationRegistry,
  createReactionEndpoint,
  createRunaHarmonicSignature,
  evaluateContinuityGate,
  buildProjectionEdge,
} from './react-ion-bridge.js';

export const REACTION_REGISTRY_SCHEMA = 'reaction.destination-registry-store/v1';
export const REACTION_DESTINATION_REGISTRATION_SCHEMA = 'reaction.destination-registration/v1';
export const REACTION_CORRIDOR_SCHEMA = 'reaction.corridor-registration/v1';
export const REACTION_REGISTRY_RUNTIME_SCHEMA = 'reaction.registry-runtime/v1';

export const REGISTRATION_STATES = Object.freeze(['draft', 'approved', 'deprecated']);
export const DESTINATION_KINDS = Object.freeze(['world', 'place', 'anchor', 'gate', 'manual']);

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_REGISTRY: ${message}`);
}

function text(value, field) {
  const normalised = String(value ?? '').trim();
  invariant(normalised, `${field} is required`);
  return normalised;
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function unit(value, field) {
  const number = finite(value, field);
  invariant(number >= 0 && number <= 1, `${field} must lie within 0..1`);
  return number;
}

function uniqueStrings(values = []) {
  const source = Array.isArray(values) ? values : String(values ?? '').split(',');
  return [...new Set(source.map(String).map((value) => value.trim()).filter(Boolean))];
}

function normaliseState(value, field) {
  const state = String(value ?? 'draft').trim().toLowerCase();
  invariant(REGISTRATION_STATES.includes(state), `${field} must be one of ${REGISTRATION_STATES.join(', ')}`);
  return state;
}

function normaliseKind(value) {
  const kind = String(value ?? 'manual').trim().toLowerCase();
  invariant(DESTINATION_KINDS.includes(kind), `kind must be one of ${DESTINATION_KINDS.join(', ')}`);
  return kind;
}

function parseMatrix(value, field = 'jacobian') {
  if (Array.isArray(value)) {
    invariant(value.length > 0 && value.every(Array.isArray), `${field} must contain matrix rows`);
    const width = value[0].length;
    invariant(width > 0, `${field} rows must contain values`);
    const matrix = value.map((row) => row.map(Number));
    invariant(matrix.every((row) => row.length === width && row.every(Number.isFinite)), `${field} must be rectangular and finite`);
    return matrix;
  }
  const rows = String(value ?? '').trim().split(';').map((row) => row.trim()).filter(Boolean);
  invariant(rows.length > 0, `${field} is required`);
  return parseMatrix(rows.map((row) => row.split(',').map((part) => part.trim())), field);
}

function transpose(matrix) {
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

export function createEmptyReactionRegistryStore() {
  return {
    schema: REACTION_REGISTRY_SCHEMA,
    version: 1,
    destinations: [],
    corridors: [],
  };
}

export function normaliseReactionRegistryStore(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    schema: REACTION_REGISTRY_SCHEMA,
    version: 1,
    destinations: Array.isArray(source.destinations) ? source.destinations : [],
    corridors: Array.isArray(source.corridors) ? source.corridors : [],
  };
}

export async function createDestinationRegistration({
  id,
  name,
  aliases = [],
  kind = 'manual',
  worldId,
  worldName,
  locationId = null,
  locationName = null,
  anchorId = null,
  anchorName = null,
  address,
  rootHz = null,
  phase = null,
  profileVersion = 'v0.1',
  evidenceClass = 'symbolic',
  sourceRef = 'react-ion-registry',
  state = 'draft',
  notes = '',
  updatedAt = new Date().toISOString(),
} = {}) {
  const core = {
    schema: REACTION_DESTINATION_REGISTRATION_SCHEMA,
    schema_version: 1,
    registration_id: text(id, 'id'),
    name: text(name, 'name').toLowerCase(),
    aliases: Object.freeze(uniqueStrings(aliases).map((value) => value.toLowerCase())),
    kind: normaliseKind(kind),
    world: Object.freeze({ id: text(worldId, 'worldId'), name: text(worldName, 'worldName') }),
    location: locationId || locationName ? Object.freeze({
      id: String(locationId ?? '').trim() || null,
      name: String(locationName ?? '').trim() || null,
    }) : null,
    anchor: anchorId || anchorName ? Object.freeze({
      id: String(anchorId ?? '').trim() || null,
      name: String(anchorName ?? '').trim() || null,
    }) : null,
    address: text(address, 'address'),
    harmonic: rootHz == null || String(rootHz).trim() === '' ? null : Object.freeze({
      root_hz: finite(rootHz, 'rootHz'),
      phase: phase == null || String(phase).trim() === '' ? null : finite(phase, 'phase'),
      profile_version: text(profileVersion, 'profileVersion'),
      evidence_class: text(evidenceClass, 'evidenceClass'),
      source_ref: text(sourceRef, 'sourceRef'),
    }),
    state: normaliseState(state, 'state'),
    notes: String(notes ?? '').trim() || null,
    updated_at: new Date(updatedAt).toISOString(),
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, fingerprint });
}

export async function createCorridorRegistration({
  id,
  from,
  to,
  jacobian,
  identity = 0.95,
  continuity = 0.95,
  agency = 0.95,
  floor = 0.8,
  vetoes = [],
  bidirectional = false,
  state = 'draft',
  notes = '',
  updatedAt = new Date().toISOString(),
} = {}) {
  const core = {
    schema: REACTION_CORRIDOR_SCHEMA,
    schema_version: 1,
    corridor_id: text(id, 'id'),
    from: text(from, 'from').toLowerCase(),
    to: text(to, 'to').toLowerCase(),
    jacobian: Object.freeze(parseMatrix(jacobian).map((row) => Object.freeze(row))),
    continuity: Object.freeze({
      identity: unit(identity, 'identity'),
      continuity: unit(continuity, 'continuity'),
      agency: unit(agency, 'agency'),
      floor: unit(floor, 'floor'),
      vetoes: Object.freeze(uniqueStrings(vetoes)),
    }),
    bidirectional: Boolean(bidirectional),
    state: normaliseState(state, 'state'),
    notes: String(notes ?? '').trim() || null,
    updated_at: new Date(updatedAt).toISOString(),
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, fingerprint });
}

function registrationToEndpoint(registration) {
  const harmonic = registration.harmonic ? createRunaHarmonicSignature({
    worldId: registration.world.id,
    rootHz: registration.harmonic.root_hz,
    phase: registration.harmonic.phase,
    sourceRef: registration.harmonic.source_ref,
    profileVersion: registration.harmonic.profile_version,
    evidenceClass: registration.harmonic.evidence_class,
  }) : null;
  return createReactionEndpoint({
    name: registration.name,
    aliases: registration.aliases,
    world: registration.world,
    location: registration.location,
    anchor: registration.anchor,
    address: registration.address,
    harmonic,
    provenance: {
      registration_id: registration.registration_id,
      registration_fingerprint: registration.fingerprint,
      registration_kind: registration.kind,
      registration_state: registration.state,
      source: 'react-ion-registry',
    },
  });
}

function addGraphEdge(graph, from, edge) {
  graph[from] ||= [];
  graph[from].push(edge);
}

export function compileReactionRegistry(storeInput) {
  const store = normaliseReactionRegistryStore(storeInput);
  const diagnostics = [];
  const approved = [];

  for (const registration of store.destinations) {
    if (registration?.state !== 'approved') continue;
    try {
      approved.push(registrationToEndpoint(registration));
    } catch (error) {
      diagnostics.push(Object.freeze({
        kind: 'destination-invalid',
        registration_id: registration?.registration_id ?? null,
        message: error.message,
      }));
    }
  }

  let registry;
  try {
    registry = createReactionDestinationRegistry(approved);
  } catch (error) {
    diagnostics.push(Object.freeze({ kind: 'registry-conflict', message: error.message }));
    registry = createReactionDestinationRegistry([]);
  }

  const graph = {};
  const corridors = [];
  for (const corridor of store.corridors) {
    if (corridor?.state !== 'approved') continue;
    const left = registry.resolve(corridor.from)?.endpoint ?? null;
    const right = registry.resolve(corridor.to)?.endpoint ?? null;
    if (!left || !right) {
      diagnostics.push(Object.freeze({
        kind: 'corridor-unresolved',
        corridor_id: corridor?.corridor_id ?? null,
        message: `${corridor?.from ?? '?'} -> ${corridor?.to ?? '?'} does not resolve through approved destinations`,
      }));
      continue;
    }

    try {
      const continuity = evaluateContinuityGate({
        required: ['identity', 'continuity', 'agency'],
        scores: {
          identity: corridor.continuity.identity,
          continuity: corridor.continuity.continuity,
          agency: corridor.continuity.agency,
        },
        floor: corridor.continuity.floor,
        vetoes: corridor.continuity.vetoes,
      });
      const forward = buildProjectionEdge({
        from: left,
        to: right,
        jacobian: corridor.jacobian,
        continuity,
      });
      const annotatedForward = Object.freeze({
        ...forward,
        corridor_id: corridor.corridor_id,
        corridor_fingerprint: corridor.fingerprint,
        direction: 'forward',
      });
      addGraphEdge(graph, left.address_text, annotatedForward);
      corridors.push(annotatedForward);

      if (corridor.bidirectional) {
        const reverse = buildProjectionEdge({
          from: right,
          to: left,
          jacobian: transpose(corridor.jacobian),
          continuity,
        });
        const annotatedReverse = Object.freeze({
          ...reverse,
          corridor_id: corridor.corridor_id,
          corridor_fingerprint: corridor.fingerprint,
          direction: 'reverse',
        });
        addGraphEdge(graph, right.address_text, annotatedReverse);
        corridors.push(annotatedReverse);
      }
    } catch (error) {
      diagnostics.push(Object.freeze({
        kind: 'corridor-invalid',
        corridor_id: corridor?.corridor_id ?? null,
        message: error.message,
      }));
    }
  }

  return Object.freeze({
    schema: REACTION_REGISTRY_RUNTIME_SCHEMA,
    registry,
    destinations: Object.freeze(approved),
    graph: Object.freeze(Object.fromEntries(Object.entries(graph).map(([key, edges]) => [key, Object.freeze(edges)]))),
    corridors: Object.freeze(corridors),
    diagnostics: Object.freeze(diagnostics),
  });
}

export function findApprovedWorldDestination(runtime, worldId) {
  invariant(runtime?.schema === REACTION_REGISTRY_RUNTIME_SCHEMA, 'compiled registry runtime is required');
  const key = String(worldId ?? '').trim();
  return runtime.destinations.find((endpoint) => endpoint.world.id === key && !endpoint.location && !endpoint.anchor) ?? null;
}
