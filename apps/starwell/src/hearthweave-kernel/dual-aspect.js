import {
  collapseRelease,
  createBifrostBridgePacket,
  evolveTemporalState,
  premaqToTemporalState,
  validatePremaqPacket,
  validateTemporalState,
} from '../arcsweep-temporal-quantum/engine.js';

export const DUAL_ASPECT_PACKET_SCHEMA = 'hearthweave.dual-aspect-packet/v1';
export const DUAL_ASPECT_PACKET_VERSION = '1.0.0';
export const DUAL_ASPECT_RECEIPT_SCHEMA = 'hearthweave.dual-aspect-receipt/v1';
export const DUAL_ASPECT_ACTIVATION_EVENT = 'hearthweave:dual-aspect-activation';
export const DUAL_ASPECT_DEACTIVATION_EVENT = 'hearthweave:dual-aspect-deactivation';
export const DUAL_ASPECT_ACTIVE_PACKET_KEY = 'hearthweave:dual-aspect-packet:active:v1';
export const DUAL_ASPECT_RECEIPT_LEDGER_KEY = 'hearthweave:dual-aspect-receipts:v1';

export const CLAIM_STATES = Object.freeze({
  VERIFIED: 'Verified',
  FAILED: 'Failed',
  NOT_YET_TESTED: 'Not Yet Tested',
});

export const DEEP_MODES = Object.freeze({
  LIVE: 'LIVE',
  STALE: 'STALE',
  DEGRADED: 'DEGRADED',
});

const PREMAQ_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
const DEFAULT_TRANSFER_VERSION = 'hearthweave-generic-transfer/1.0.0';

export class DualAspectError extends Error {
  constructor(message, code = 'dual-aspect-error') {
    super(message);
    this.name = 'DualAspectError';
    this.code = code;
  }
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DualAspectError(`${field} must be a non-empty string`, 'invalid-string');
  }
  return value.trim();
}

function requireDateTime(value, field) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new DualAspectError(`${field} must be a valid date-time`, 'invalid-date-time');
  }
  return date.toISOString();
}

function requireFinite(value, field) {
  if (!Number.isFinite(value)) {
    throw new DualAspectError(`${field} must be finite`, 'invalid-number');
  }
  return value;
}

function makeId(prefix, idFactory) {
  if (typeof idFactory === 'function') return `${prefix}-${idFactory()}`;
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function canonicalise(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalise);
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalise(value[key])]),
  );
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalise(value));
}

export function fingerprint(value) {
  const text = canonicalJson(value);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * prime) & mask;
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function validateDeepState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new DualAspectError('DEEP snapshot state must be an object', 'invalid-deep-snapshot');
  }
  const required = ['P', 'C', 'R', 'E', 'M', 'A', 'dpdt', 'moonIllum', 'kp', 'bz', 'charge'];
  for (const key of required) requireFinite(state[key], `deep.state.${key}`);
  requireString(state.sky, 'deep.state.sky');
  return clone(state);
}

export function validateDeepSnapshot(snapshotInput) {
  if (!snapshotInput || typeof snapshotInput !== 'object' || Array.isArray(snapshotInput)) {
    throw new DualAspectError('DEEP snapshot must be an object', 'invalid-deep-snapshot');
  }
  const snapshot = clone(snapshotInput);
  if (!Object.values(DEEP_MODES).includes(snapshot.mode)) {
    throw new DualAspectError('DEEP snapshot mode must be LIVE, STALE, or DEGRADED', 'invalid-deep-mode');
  }
  snapshot.snapshot_id = requireString(snapshot.snapshot_id, 'deep.snapshot_id');
  snapshot.observed_at = requireDateTime(snapshot.observed_at, 'deep.observed_at');
  snapshot.captured_at = requireDateTime(snapshot.captured_at, 'deep.captured_at');
  snapshot.source = snapshot.source && typeof snapshot.source === 'object'
    ? snapshot.source
    : { kind: 'unknown', locator: 'unknown' };
  snapshot.source.kind = requireString(snapshot.source.kind, 'deep.source.kind');
  snapshot.source.locator = requireString(snapshot.source.locator, 'deep.source.locator');
  snapshot.state = validateDeepState(snapshot.state);
  snapshot.substitutions = Array.isArray(snapshot.substitutions) ? snapshot.substitutions : [];
  snapshot.errors = Array.isArray(snapshot.errors) ? snapshot.errors : [];
  if (snapshot.mode === DEEP_MODES.DEGRADED && snapshot.substitutions.length === 0) {
    throw new DualAspectError('A DEGRADED snapshot must declare its substitutions', 'silent-degraded-state');
  }
  snapshot.fingerprint = fingerprint({
    mode: snapshot.mode,
    observed_at: snapshot.observed_at,
    source: snapshot.source,
    state: snapshot.state,
    substitutions: snapshot.substitutions,
  });
  return snapshot;
}

export function createDegradedDeepSnapshot({
  state,
  reason,
  sourceLocator = 'hearthweave://explicit-default-deep',
  clock = () => new Date(),
  idFactory,
  error = null,
} = {}) {
  requireString(reason, 'degraded reason');
  const timestamp = clock().toISOString();
  return validateDeepSnapshot({
    snapshot_id: makeId('deep-snapshot-degraded', idFactory),
    mode: DEEP_MODES.DEGRADED,
    observed_at: timestamp,
    captured_at: timestamp,
    source: {
      kind: 'explicit-substitution',
      locator: sourceLocator,
    },
    state,
    substitutions: [{
      field: 'state',
      reason,
      source: sourceLocator,
    }],
    errors: error ? [{ message: String(error.message ?? error), code: error.code ?? null }] : [],
  });
}

function premaqComponent(value, derivative, uncertainty, confidence, contributor) {
  return {
    value: clamp(value),
    derivative,
    uncertainty,
    confidence: clamp(confidence),
    contributors: [contributor],
  };
}

export function deepSnapshotToPremaqV2(snapshotInput, {
  context,
  clock = () => new Date(),
  idFactory,
  sequence = 0,
} = {}) {
  const snapshot = validateDeepSnapshot(snapshotInput);
  if (!context || typeof context !== 'object') {
    throw new DualAspectError('An Arcsweep continuity context is required', 'missing-continuity-context');
  }
  const contextId = requireString(context.session_context_id, 'context.session_context_id');
  const live = snapshot.mode === DEEP_MODES.LIVE;
  const confidence = live ? 0.86 : snapshot.mode === DEEP_MODES.STALE ? 0.62 : 0.28;
  const uncertainty = live ? 0.08 : snapshot.mode === DEEP_MODES.STALE ? 0.18 : 0.42;
  const contributor = {
    source_id: snapshot.snapshot_id,
    source_kind: snapshot.source.kind,
    source_locator: snapshot.source.locator,
    mode: snapshot.mode,
    observed_at: snapshot.observed_at,
  };
  const deep = snapshot.state;
  const quality = clamp(
    (0.35 * deep.charge)
      + (0.25 * deep.C)
      + (0.20 * deep.R)
      + (0.20 * deep.A),
  );
  const derivative = Number.isFinite(deep.dpdt) ? deep.dpdt : 0;
  const packet = {
    schema_version: '2.0.0',
    id: makeId('premaq-dual-aspect', idFactory),
    observed_at: snapshot.observed_at,
    registry_version: 'premaq-registry/2.0',
    state: {
      P: premaqComponent(deep.P, derivative, uncertainty, confidence, contributor),
      C: premaqComponent(deep.C, 0, uncertainty, confidence, contributor),
      R: premaqComponent(deep.R, 0, uncertainty, confidence, contributor),
      E: premaqComponent(deep.E, 0, uncertainty, confidence, contributor),
      M: premaqComponent(deep.M, 0, uncertainty, confidence, contributor),
      A: premaqComponent(deep.A, 0, uncertainty, confidence, contributor),
      Q: premaqComponent(quality, 0, Math.min(1, uncertainty + 0.05), confidence, {
        ...contributor,
        derivation: 'Q=0.35*charge+0.25*C+0.20*R+0.20*A',
      }),
    },
    receipt_id: makeId('premaq-receipt', idFactory),
    sequence,
    prior_state_ref: null,
    model_version: 'hearthweave.deep-to-premaq/1.0.0',
    provenance_refs: [
      `deep:${snapshot.snapshot_id}`,
      `arcsweep-context:${contextId}`,
      ...((context.source?.source_fingerprints ?? []).map((entry) => `continuity:${entry}`)),
    ],
    generated_at: clock().toISOString(),
    degraded: snapshot.mode !== DEEP_MODES.LIVE,
  };
  return validatePremaqPacket(packet);
}

function validateHouseProfile(houseInput) {
  if (!houseInput || typeof houseInput !== 'object' || Array.isArray(houseInput)) {
    throw new DualAspectError('A House profile is required', 'missing-house-profile');
  }
  const house = clone(houseInput);
  house.id = requireString(house.id, 'house.id');
  house.name = requireString(house.name, 'house.name');
  house.canon = house.canon && typeof house.canon === 'object' ? house.canon : {};
  house.canon.foundation = house.canon.foundation && typeof house.canon.foundation === 'object'
    ? house.canon.foundation
    : { id: 'unregistered-foundation', name: 'Unregistered foundation', source_class: 'unregistered' };
  house.canon.overlay = house.canon.overlay && typeof house.canon.overlay === 'object'
    ? house.canon.overlay
    : { id: house.id, name: house.name, source_class: 'overlay' };
  house.transferFunctions = house.transferFunctions && typeof house.transferFunctions === 'object'
    ? house.transferFunctions
    : { version: DEFAULT_TRANSFER_VERSION };
  house.transferFunctions.version = requireString(
    house.transferFunctions.version ?? DEFAULT_TRANSFER_VERSION,
    'house.transferFunctions.version',
  );
  return house;
}

function componentValue(premaq, axis) {
  return clamp(premaq.state[axis].value);
}

function sourceBinding(sharedStateFingerprint, premaq, snapshot, transferVersion) {
  return {
    shared_state_fingerprint: sharedStateFingerprint,
    premaq_id: premaq.id,
    deep_snapshot_id: snapshot.snapshot_id,
    transfer_function_version: transferVersion,
    source_class: 'derived-from-shared-state',
  };
}

export function deriveExperientialState({
  house: houseInput,
  premaq: premaqInput,
  deepSnapshot: snapshotInput,
  context,
  sharedStateFingerprint,
} = {}) {
  const house = validateHouseProfile(houseInput);
  const premaq = validatePremaqPacket(premaqInput);
  const snapshot = validateDeepSnapshot(snapshotInput);
  const transferVersion = house.transferFunctions.version;
  const P = componentValue(premaq, 'P');
  const C = componentValue(premaq, 'C');
  const R = componentValue(premaq, 'R');
  const E = componentValue(premaq, 'E');
  const M = componentValue(premaq, 'M');
  const A = componentValue(premaq, 'A');
  const Q = componentValue(premaq, 'Q');
  const bind = sourceBinding(sharedStateFingerprint, premaq, snapshot, transferVersion);
  const harmonic = house.harmonicIdentity ?? {};
  const visual = house.visualIdentity ?? {};
  const culture = house.culturalIdentity ?? {};
  const carrier = Number.isFinite(harmonic.baseCarrierHz) ? harmonic.baseCarrierHz : 144;
  const beatFloor = Number.isFinite(harmonic.beatFloorHz) ? harmonic.beatFloorHz : 3;
  const beatCeiling = Number.isFinite(harmonic.beatCeilingHz) ? harmonic.beatCeilingHz : 8;
  const glyphSeed = fingerprint({
    sharedStateFingerprint,
    house: house.id,
    context: context.context_signature,
    transferVersion,
  });

  return {
    house: {
      id: house.id,
      name: house.name,
      canon_foundation: clone(house.canon.foundation),
      canon_overlay: clone(house.canon.overlay),
      sovereignty: clone(house.sovereignty ?? {
        foundation_preserved: true,
        overlay_silently_merges: false,
      }),
      temporal_profile: clone(house.temporalProfile ?? {}),
      harmonic_identity: clone(harmonic),
      visual_identity: clone(visual),
      cultural_identity: clone(culture),
    },
    glyph: {
      ...bind,
      seed: glyphSeed,
      arrival_stroke: {
        node_count: Math.round(5 + P * 7),
        edge_clarity: C,
        temporal_angle: Math.round((E + M) * 180),
      },
      reception_stroke: {
        ring_count: Math.round(1 + R * 5),
        luminosity: A,
        response_aperture: Q,
      },
      hearthweave_bind: {
        tension: clamp((C + R + Q) / 3),
        symmetry: clamp(1 - Math.abs(P - A)),
      },
      activation: 'waiting-for-dual-aspect-activation',
    },
    tone: {
      ...bind,
      engine_contract: 'runa.dual-aspect-tone/v1',
      house_voice: harmonic.voice ?? house.name,
      anchor_voice: {
        left_hz: Number((carrier + P * 18).toFixed(3)),
        right_hz: Number((carrier + P * 18 + beatFloor + (beatCeiling - beatFloor) * Q).toFixed(3)),
        gain: Number(clamp(0.18 + C * 0.32).toFixed(3)),
      },
      living_voice: {
        carrier_hz: Number((carrier * (1.25 + R * 0.5)).toFixed(3)),
        pulse_hz: Number((4 + M * 7).toFixed(3)),
        brightness: Number(A.toFixed(3)),
        spatial_width: Number(clamp(0.15 + E * 0.7).toFixed(3)),
      },
      activation: 'waiting-for-dual-aspect-activation',
    },
    visual: {
      ...bind,
      structure: visual.structure ?? 'paired-bridge-geometry',
      atmosphere: visual.atmosphere ?? 'house-native-field',
      palette: clone(visual.palette ?? []),
      structure_density: Number(P.toFixed(3)),
      atmosphere_intensity: Number(A.toFixed(3)),
      temporal_distortion: Number(E.toFixed(3)),
    },
    haptic: {
      ...bind,
      call_pulse: {
        duration_ms: Math.round(90 + P * 180),
        intensity: Number(clamp(0.15 + C * 0.55).toFixed(3)),
      },
      answering_pulse: {
        delay_ms: Math.round(120 + (1 - R) * 260),
        duration_ms: Math.round(100 + Q * 220),
        intensity: Number(clamp(0.12 + A * 0.5).toFixed(3)),
      },
    },
    narrative: {
      ...bind,
      traveller_account: {
        register: 'experiential-projection',
        prompt_seed: culture.arrivalPrompt ?? `Arrival at ${house.name}`,
        intensity: Number(P.toFixed(3)),
      },
      host_account: {
        register: 'experiential-projection',
        prompt_seed: culture.receptionPrompt ?? `${house.name} receives the crossing`,
        receptivity: Number(Q.toFixed(3)),
      },
    },
  };
}

function validateContinuityContext(contextInput) {
  if (!contextInput || typeof contextInput !== 'object' || Array.isArray(contextInput)) {
    throw new DualAspectError('Continuity context must be an object', 'invalid-continuity-context');
  }
  const context = clone(contextInput);
  context.session_context_id = requireString(context.session_context_id, 'context.session_context_id');
  context.context_signature = requireString(context.context_signature, 'context.context_signature');
  context.world_slug = requireString(context.world_slug, 'context.world_slug');
  if (context.authority?.canon_commit !== false) {
    throw new DualAspectError('Continuity context cannot carry canon authority', 'unsafe-continuity-authority');
  }
  if (!Array.isArray(context.items) || context.items.length === 0) {
    throw new DualAspectError('Continuity context must contain reviewed items', 'invalid-continuity-context');
  }
  return context;
}

export function assembleDualAspectPacket({
  context: contextInput,
  deepSnapshot: snapshotInput,
  premaq: premaqInput = null,
  house: houseInput,
  temporal = null,
  clock = () => new Date(),
  idFactory,
} = {}) {
  const context = validateContinuityContext(contextInput);
  const snapshot = validateDeepSnapshot(snapshotInput);
  const house = validateHouseProfile(houseInput);
  const premaq = premaqInput
    ? validatePremaqPacket(premaqInput)
    : deepSnapshotToPremaqV2(snapshot, { context, clock, idFactory });

  const hearthside = temporal?.hearthside
    ? validateTemporalState(temporal.hearthside)
    : premaqToTemporalState(premaq, { clock, idFactory });
  const evolvedTarget = temporal?.targetside
    ? validateTemporalState(temporal.targetside)
    : evolveTemporalState(hearthside, {
      delta: house.temporalProfile?.initialDelta ?? 1,
      bridgeCoupling: house.temporalProfile?.bridgeCoupling ?? 0.08,
      clock,
      idFactory,
    });
  const targetside = temporal?.targetside
    ? evolvedTarget
    : collapseRelease(evolvedTarget, {
      focus: house.temporalProfile?.focusAxis ?? 'Q',
      measurementStrength: house.temporalProfile?.measurementStrength ?? 0.65,
      release: house.temporalProfile?.release ?? 0.35,
      clock,
      idFactory,
    });

  const bridge = createBifrostBridgePacket({
    premaq,
    hearthside,
    targetside,
    worldId: context.world_slug,
    canonGraphVersion: house.canon?.foundation?.version ?? 'unregistered-canon/0',
    transferFunctionVersion: house.transferFunctions.version,
    timeline: house.temporalProfile?.timeline ?? null,
    anchors: {
      hearthside: 'current-reality://hearthside',
      targetside: `${house.id}://house`,
    },
    clock,
    idFactory,
  });

  const createdAt = clock().toISOString();
  const sharedStateFingerprint = fingerprint({
    continuity: {
      context_signature: context.context_signature,
      source_fingerprints: context.source?.source_fingerprints ?? [],
      item_ids: context.items.map((item) => item.continuity_item_id),
    },
    deep: {
      fingerprint: snapshot.fingerprint,
      observed_at: snapshot.observed_at,
    },
    premaq: {
      id: premaq.id,
      observed_at: premaq.observed_at,
      state: premaq.state,
    },
    temporal: {
      hearthside: hearthside.state_id,
      targetside: targetside.state_id,
      bridge: bridge.bridge_packet_id,
    },
    house: {
      id: house.id,
      transfer: house.transferFunctions.version,
    },
  });
  const experiential = deriveExperientialState({
    house,
    premaq,
    deepSnapshot: snapshot,
    context,
    sharedStateFingerprint,
  });
  const packetId = makeId('dual-aspect', idFactory);
  const receiptId = makeId('dual-aspect-receipt', idFactory);
  const base = {
    schema: DUAL_ASPECT_PACKET_SCHEMA,
    schema_version: DUAL_ASPECT_PACKET_VERSION,
    packet_id: packetId,
    created_at: createdAt,
    identity: {
      world_slug: context.world_slug,
      house_id: house.id,
      session_context_id: context.session_context_id,
      canon_foundation_id: house.canon.foundation.id,
      canon_overlay_id: house.canon.overlay.id,
    },
    temporal: {
      observed_at: snapshot.observed_at,
      activated_at: createdAt,
      coordinate: targetside.temporal_coordinate,
      hearthside_state_id: hearthside.state_id,
      targetside_state_id: targetside.state_id,
      bridge_packet_id: bridge.bridge_packet_id,
      spiral: clone(targetside.spiral),
    },
    observable: {
      authority: 'evidence-grounded-observational',
      continuity: context,
      deep_snapshot: snapshot,
      premaq,
      hearthside,
      targetside,
      bridge,
    },
    experiential: {
      authority: 'canon-grounded-projected',
      ...experiential,
    },
    correspondence: {
      shared_state_fingerprint: sharedStateFingerprint,
      explicit: true,
      bindings: {
        observable: sharedStateFingerprint,
        experiential: sharedStateFingerprint,
        glyph: experiential.glyph.shared_state_fingerprint,
        tone: experiential.tone.shared_state_fingerprint,
        visual: experiential.visual.shared_state_fingerprint,
        haptic: experiential.haptic.shared_state_fingerprint,
        narrative: experiential.narrative.shared_state_fingerprint,
      },
    },
    provenance: {
      continuity_packet_ids: clone(context.source?.packet_ids ?? []),
      continuity_review_ids: clone(context.source?.review_ids ?? []),
      continuity_fingerprints: clone(context.source?.source_fingerprints ?? []),
      deep_snapshot_id: snapshot.snapshot_id,
      deep_source: clone(snapshot.source),
      premaq_receipt_id: premaq.receipt_id,
      bridge_packet_id: bridge.bridge_packet_id,
      transfer_function_version: house.transferFunctions.version,
    },
    uncertainty: {
      premaq: Object.fromEntries(PREMAQ_AXES.map((axis) => [axis, premaq.state[axis].uncertainty])),
      source_mode: snapshot.mode,
      degraded: snapshot.mode !== DEEP_MODES.LIVE,
    },
    degraded: {
      active: snapshot.mode !== DEEP_MODES.LIVE || house.canon.foundation.source_class === 'unregistered',
      reasons: [
        ...(snapshot.mode !== DEEP_MODES.LIVE ? [`DEEP_${snapshot.mode}`] : []),
        ...(house.canon.foundation.source_class === 'unregistered' ? ['HOUSE_UNREGISTERED'] : []),
      ],
      substitutions: clone(snapshot.substitutions),
    },
    history: [{
      event: 'kernel-freeze',
      at: createdAt,
      actor: context.resolved_by ?? 'unknown',
      source_context_id: context.session_context_id,
    }],
    receipts: [receiptId],
    claims: {
      shared_state: CLAIM_STATES.VERIFIED,
      dual_aspect_correspondence: CLAIM_STATES.VERIFIED,
      glyph_render: CLAIM_STATES.NOT_YET_TESTED,
      tone_render: CLAIM_STATES.NOT_YET_TESTED,
      replay: CLAIM_STATES.NOT_YET_TESTED,
    },
    laws: [
      'Every renderer consumes this packet or its packet_id; it may not refetch state after activation.',
      'Observable and experiential aspects share one state fingerprint and remain separately authoritative.',
      'Canon foundation and overlay remain distinct and may not silently merge.',
      'Degraded substitutions are explicit, receipted, and replayable.',
      'A renderer may derive an expression but may not invent an unsourced state.',
    ],
  };
  const packetFingerprint = fingerprint(base);
  return deepFreeze({ ...base, packet_fingerprint: packetFingerprint });
}

export function validateDualAspectPacket(packetInput, { verifyFingerprint = true } = {}) {
  if (!packetInput || typeof packetInput !== 'object' || Array.isArray(packetInput)) {
    throw new DualAspectError('DualAspectPacket must be an object', 'invalid-dual-aspect-packet');
  }
  const packet = clone(packetInput);
  if (packet.schema !== DUAL_ASPECT_PACKET_SCHEMA || packet.schema_version !== DUAL_ASPECT_PACKET_VERSION) {
    throw new DualAspectError('Unsupported DualAspectPacket schema', 'unsupported-dual-aspect-packet');
  }
  packet.packet_id = requireString(packet.packet_id, 'packet_id');
  packet.packet_fingerprint = requireString(packet.packet_fingerprint, 'packet_fingerprint');
  requireDateTime(packet.created_at, 'created_at');
  if (packet.correspondence?.explicit !== true) {
    throw new DualAspectError('Dual-aspect correspondence must be explicit', 'implicit-correspondence');
  }
  const shared = requireString(
    packet.correspondence?.shared_state_fingerprint,
    'correspondence.shared_state_fingerprint',
  );
  for (const [renderer, binding] of Object.entries(packet.correspondence?.bindings ?? {})) {
    if (binding !== shared) {
      throw new DualAspectError(`${renderer} is bound to a divergent state`, 'hidden-state-divergence');
    }
  }
  validateDeepSnapshot(packet.observable?.deep_snapshot);
  validatePremaqPacket(packet.observable?.premaq);
  validateTemporalState(packet.observable?.hearthside);
  validateTemporalState(packet.observable?.targetside);
  if (verifyFingerprint) {
    const { packet_fingerprint: ignored, ...base } = packet;
    const actual = fingerprint(base);
    if (actual !== packet.packet_fingerprint) {
      throw new DualAspectError('DualAspectPacket fingerprint mismatch', 'packet-fingerprint-mismatch');
    }
  }
  return deepFreeze(packet);
}

export function replayDualAspectPacket(packetInput) {
  const packet = validateDualAspectPacket(packetInput);
  return deepFreeze({
    schema: 'hearthweave.dual-aspect-replay/v1',
    packet_id: packet.packet_id,
    packet_fingerprint: packet.packet_fingerprint,
    shared_state_fingerprint: packet.correspondence.shared_state_fingerprint,
    temporal: clone(packet.temporal),
    glyph: clone(packet.experiential.glyph),
    tone: clone(packet.experiential.tone),
    visual: clone(packet.experiential.visual),
    haptic: clone(packet.experiential.haptic),
    narrative: clone(packet.experiential.narrative),
    replay_fingerprint: fingerprint({
      packet_id: packet.packet_id,
      glyph: packet.experiential.glyph,
      tone: packet.experiential.tone,
      visual: packet.experiential.visual,
      haptic: packet.experiential.haptic,
      narrative: packet.experiential.narrative,
    }),
  });
}
