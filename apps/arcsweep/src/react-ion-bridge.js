import { analyseWorldJacobian, sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import {
  ASK_PACKET_SCHEMA,
  DIMENSIONAL_ADDRESS_SCHEMA,
  EVIDENCE_CLASSES,
  createDimensionalNameRegistry,
  formatDimensionalAddress,
  parseDimensionalAddress,
} from './bifrost-protocol-stack.js';
import {
  REACTION_NAV_SCHEMA,
  REACTION_ROUTE_SCHEMA,
} from './react-ion-engine.js';
import { createTransformationRequest } from './transformation-request.js';

export const REACTION_ENDPOINT_SCHEMA = 'reaction.endpoint/v1';
export const REACTION_HARMONIC_SCHEMA = 'reaction.runa-harmonic-signature/v1';
export const REACTION_CONTINUITY_SCHEMA = 'reaction.continuity-gate/v1';
export const REACTION_ASK_LINK_SCHEMA = 'reaction.ask-transformation-link/v1';
export const REACTION_DEEPTIME_SCHEMA = 'deeptime.reaction-route/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_BRIDGE: ${message}`);
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

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function uniqueStrings(values = []) {
  return [...new Set((values || []).map(String).map((value) => value.trim()).filter(Boolean))];
}

function normalisePhase(value) {
  if (value == null) return null;
  const phase = finite(value, 'phase');
  const tau = Math.PI * 2;
  return ((phase % tau) + tau) % tau;
}

export function createRunaHarmonicSignature({
  worldId,
  rootHz,
  phase = null,
  sourceRef,
  profileVersion = 'v0.1',
  evidenceClass = 'symbolic',
  components = [],
} = {}) {
  const root = finite(rootHz, 'rootHz');
  invariant(root > 0, 'rootHz must be greater than zero');
  invariant(EVIDENCE_CLASSES.includes(evidenceClass), 'evidenceClass is not recognised');
  invariant(Array.isArray(components), 'components must be an array');

  return Object.freeze({
    schema: REACTION_HARMONIC_SCHEMA,
    world_id: text(worldId, 'worldId'),
    root_hz: root,
    phase: normalisePhase(phase),
    source_ref: text(sourceRef, 'sourceRef'),
    profile_version: text(profileVersion, 'profileVersion'),
    evidence_class: evidenceClass,
    components: Object.freeze(components.map((component, index) => Object.freeze({
      role: text(component?.role, `components[${index}].role`),
      frequency_hz: finite(component?.frequency_hz, `components[${index}].frequency_hz`),
      weight: unit(component?.weight ?? 1, `components[${index}].weight`),
    }))),
    authority: Object.freeze({
      harmonic_signature_is_profile_data: true,
      physical_universe_locator_claimed: false,
    }),
  });
}

export function harmonicMismatch(left, right, {
  maxOctaves = 4,
  phaseWeight = 0.2,
} = {}) {
  invariant(left?.schema === REACTION_HARMONIC_SCHEMA, 'left harmonic signature is required');
  invariant(right?.schema === REACTION_HARMONIC_SCHEMA, 'right harmonic signature is required');
  const span = finite(maxOctaves, 'maxOctaves');
  invariant(span > 0, 'maxOctaves must be greater than zero');
  const pWeight = unit(phaseWeight, 'phaseWeight');

  const octaveDistance = Math.abs(Math.log2(right.root_hz / left.root_hz));
  const rootMismatch = Math.min(1, octaveDistance / span);
  let phaseMismatch = null;
  if (left.phase != null && right.phase != null) {
    const raw = Math.abs(left.phase - right.phase) % (Math.PI * 2);
    const shortest = Math.min(raw, Math.PI * 2 - raw);
    phaseMismatch = shortest / Math.PI;
  }

  const combined = phaseMismatch == null
    ? rootMismatch
    : (1 - pWeight) * rootMismatch + pWeight * phaseMismatch;

  return Object.freeze({
    mismatch: Number(Math.min(1, Math.max(0, combined)).toFixed(9)),
    root_mismatch: Number(rootMismatch.toFixed(9)),
    phase_mismatch: phaseMismatch == null ? null : Number(phaseMismatch.toFixed(9)),
    method: 'log2-root-distance-plus-circular-phase',
    configuration: Object.freeze({ max_octaves: span, phase_weight: pWeight }),
  });
}

export function createReactionEndpoint({
  name,
  aliases = [],
  world,
  location = null,
  anchor = null,
  address,
  harmonic = null,
  provenance = {},
} = {}) {
  invariant(world?.id && world?.name, 'world id and name are required');
  const parsed = typeof address === 'string' ? parseDimensionalAddress(address) : address;
  invariant(parsed?.schema === DIMENSIONAL_ADDRESS_SCHEMA, 'a dimensional address is required');
  if (harmonic != null) {
    invariant(harmonic?.schema === REACTION_HARMONIC_SCHEMA, 'harmonic must be a Runa harmonic signature');
    invariant(harmonic.world_id === world.id, 'harmonic world must match endpoint world');
  }

  const canonicalName = text(name, 'name').toLowerCase();
  const cleanAliases = uniqueStrings(aliases).map((value) => value.toLowerCase()).filter((value) => value !== canonicalName);
  return Object.freeze({
    schema: REACTION_ENDPOINT_SCHEMA,
    name: canonicalName,
    aliases: Object.freeze(cleanAliases),
    world: Object.freeze({ id: String(world.id), name: String(world.name) }),
    location: location ? Object.freeze({
      id: String(location.id ?? location.slug ?? location.name ?? '').trim() || null,
      name: String(location.name ?? location.label ?? '').trim() || null,
    }) : null,
    anchor: anchor ? Object.freeze({
      id: String(anchor.id ?? anchor.slug ?? anchor.name ?? '').trim() || null,
      name: String(anchor.name ?? anchor.display_name ?? anchor.label ?? '').trim() || null,
      consent_scope: String(anchor.consent_scope ?? '').trim() || null,
      confidence_mode: String(anchor.confidence_mode ?? '').trim() || null,
    }) : null,
    address: parsed,
    address_text: formatDimensionalAddress(parsed),
    harmonic,
    provenance: Object.freeze({ ...(provenance || {}) }),
  });
}

export function createReactionDestinationRegistry(endpoints = []) {
  invariant(Array.isArray(endpoints), 'endpoints must be an array');
  const endpointByName = new Map();
  const dnsEntries = [];

  for (const endpoint of endpoints) {
    invariant(endpoint?.schema === REACTION_ENDPOINT_SCHEMA, 'every endpoint must use the React-ion endpoint schema');
    for (const name of [endpoint.name, ...endpoint.aliases]) {
      invariant(!endpointByName.has(name), `duplicate destination name: ${name}`);
      endpointByName.set(name, endpoint);
      dnsEntries.push({
        name,
        address: endpoint.address,
        metadata: {
          endpoint_name: endpoint.name,
          world_id: endpoint.world.id,
          location_id: endpoint.location?.id ?? null,
          anchor_id: endpoint.anchor?.id ?? null,
        },
      });
    }
  }

  const dns = createDimensionalNameRegistry(dnsEntries);
  return Object.freeze({
    size: endpoints.length,
    names: () => dns.names(),
    resolve(name) {
      const key = String(name ?? '').trim().toLowerCase();
      const endpoint = endpointByName.get(key) ?? null;
      if (!endpoint) return null;
      return Object.freeze({ endpoint, dns: dns.resolve(key) });
    },
  });
}

export function evaluateContinuityGate({
  required = ['identity', 'continuity'],
  scores = {},
  floor = 0.8,
  vetoes = [],
} = {}) {
  const threshold = unit(floor, 'floor');
  const requiredInvariants = uniqueStrings(required);
  invariant(requiredInvariants.length > 0, 'at least one continuity invariant is required');
  const blockedBy = [];
  const measured = {};

  for (const invariantName of requiredInvariants) {
    const value = scores?.[invariantName];
    if (value == null) {
      measured[invariantName] = null;
      blockedBy.push(`missing:${invariantName}`);
      continue;
    }
    const score = unit(value, `scores.${invariantName}`);
    measured[invariantName] = score;
    if (score < threshold) blockedBy.push(`below-floor:${invariantName}`);
  }

  for (const veto of uniqueStrings(vetoes)) blockedBy.push(`veto:${veto}`);
  const presentScores = Object.values(measured).filter((value) => value != null);
  const minimum = presentScores.length ? Math.min(...presentScores) : 0;
  const admitted = blockedBy.length === 0;

  return Object.freeze({
    schema: REACTION_CONTINUITY_SCHEMA,
    admitted,
    floor: threshold,
    required: Object.freeze(requiredInvariants),
    scores: Object.freeze(measured),
    minimum_score: Number(minimum.toFixed(9)),
    continuity_risk: admitted ? Number((1 - minimum).toFixed(9)) : 1,
    blocked_by: Object.freeze(blockedBy),
  });
}

function addressProjectionDistance(fromAddress, toAddress) {
  const left = typeof fromAddress === 'string' ? parseDimensionalAddress(fromAddress) : fromAddress;
  const right = typeof toAddress === 'string' ? parseDimensionalAddress(toAddress) : toAddress;
  invariant(left?.schema === DIMENSIONAL_ADDRESS_SCHEMA && right?.schema === DIMENSIONAL_ADDRESS_SCHEMA, 'two dimensional addresses are required');
  const deltas = ['x', 'y', 'z', 't'].map((axis) => (left[axis] - right[axis]) / 255);
  const rms = Math.sqrt(deltas.reduce((sum, value) => sum + value ** 2, 0) / deltas.length);
  return Number(Math.min(1, rms).toFixed(9));
}

export function buildProjectionEdge({
  from,
  to,
  jacobian,
  continuity,
  missingHarmonicPenalty = 0.25,
  harmonicOptions = {},
} = {}) {
  invariant(from?.schema === REACTION_ENDPOINT_SCHEMA, 'from endpoint is required');
  invariant(to?.schema === REACTION_ENDPOINT_SCHEMA, 'to endpoint is required');
  invariant(continuity?.schema === REACTION_CONTINUITY_SCHEMA, 'continuity gate result is required');
  const audit = analyseWorldJacobian(jacobian);
  const missingPenalty = unit(missingHarmonicPenalty, 'missingHarmonicPenalty');
  const harmonic = from.harmonic && to.harmonic
    ? harmonicMismatch(from.harmonic, to.harmonic, harmonicOptions)
    : Object.freeze({ mismatch: missingPenalty, root_mismatch: null, phase_mismatch: null, method: 'missing-profile-penalty' });

  return Object.freeze({
    to: to.address_text,
    from: from.address_text,
    projection_distance: addressProjectionDistance(from.address, to.address),
    jacobian_risk: Number(audit.fold_index.toFixed(9)),
    harmonic_mismatch: harmonic.mismatch,
    continuity_risk: continuity.continuity_risk,
    blocked: !continuity.admitted,
    diagnostics: Object.freeze({
      jacobian: audit,
      harmonic,
      continuity,
      evidence: Object.freeze({
        from_harmonic_class: from.harmonic?.evidence_class ?? 'missing',
        to_harmonic_class: to.harmonic?.evidence_class ?? 'missing',
      }),
    }),
  });
}

export async function bindAskPacketToTransformation({
  packet,
  world,
  baselinePremaqc,
  targetAxes,
  direction = 'increase',
  minimumDelta = 0.03,
  intervention,
  maximumCycles = 3,
  stopConditions = ['Feather'],
  domain = 'story-world',
  wakingWorld = null,
} = {}) {
  invariant(packet?.schema === ASK_PACKET_SCHEMA, 'an Ask packet is required');
  invariant(world?.id && world?.name, 'world is required');
  const packetWorld = String(packet.world).trim().toLowerCase();
  invariant([String(world.id).toLowerCase(), String(world.name).toLowerCase()].includes(packetWorld), 'Ask packet world does not match transformation world');

  const request = await createTransformationRequest({
    world,
    baselinePremaqc,
    description: packet.transformation,
    targetAxes,
    direction,
    minimumDelta,
    intervention,
    authority: packet.sender,
    consent: packet.consent.granted,
    maximumCycles,
    stopConditions,
    domain,
    wakingWorld,
    requestedAt: packet.created_at,
  });

  const core = {
    schema: REACTION_ASK_LINK_SCHEMA,
    schema_version: 1,
    packet_id: packet.packet_id,
    packet_fingerprint: packet.fingerprint,
    transformation_request_id: request.request_id,
    transformation_request_fingerprint: request.request_fingerprint,
    world: clone(request.world),
    domain,
    constraints: clone(packet.constraints),
    authority: Object.freeze({
      ask_is_control_not_observation: true,
      transformation_request_is_success: false,
      consent_inherited_from_packet: true,
      canon_commit: false,
    }),
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    link_id: `reaction-ask-link-${fingerprint.slice(0, 24)}`,
    fingerprint,
    request,
  });
}

export async function createReactionDeepTimeReceipt({
  sequenceId,
  sequenceRevision = 1,
  lambda,
  utc,
  julianDate,
  julianTimeScale = 'UTC',
  premaqc,
  observationRunId,
  acceptanceMaskId,
  acceptanceMaskVersion,
  navigationRequest,
  route,
  askPacket = null,
  transformationRequest = null,
  sourceReceiptHashes = [],
  dataQuality = 1,
  missing = [],
  stale = [],
} = {}) {
  invariant(navigationRequest?.schema === REACTION_NAV_SCHEMA, 'navigationRequest is required');
  invariant(route?.schema === REACTION_ROUTE_SCHEMA, 'route is required');
  invariant(route.request_id === navigationRequest.request_id, 'route must belong to navigationRequest');
  invariant(premaqc?.id && premaqc?.receipt_id, 'a receipted PREMAQC snapshot is required');
  const revision = Number(sequenceRevision);
  invariant(Number.isInteger(revision) && revision >= 1, 'sequenceRevision must be a positive integer');
  const lambdaValue = finite(lambda, 'lambda');
  invariant(lambdaValue >= 0, 'lambda must be nonnegative');
  invariant(!Number.isNaN(Date.parse(utc)), 'utc must be an ISO-compatible timestamp');
  const jd = finite(julianDate, 'julianDate');
  const quality = unit(dataQuality, 'dataQuality');

  if (askPacket != null) invariant(askPacket.schema === ASK_PACKET_SCHEMA, 'askPacket schema is invalid');
  if (transformationRequest != null) invariant(transformationRequest.request_id, 'transformationRequest is invalid');

  const acceptedStateHash = await sha256Hex(premaqc);
  const automaticHashes = [
    navigationRequest.fingerprint,
    route.fingerprint,
    askPacket?.fingerprint,
    transformationRequest?.request_fingerprint,
  ].filter(Boolean);
  const hashes = uniqueStrings([...sourceReceiptHashes, ...automaticHashes]);
  invariant(hashes.every((hash) => /^[0-9a-f]{64}$/i.test(hash)), 'sourceReceiptHashes must contain SHA-256 hex fingerprints');

  const core = {
    dataset: 'DEEPTime',
    schema: REACTION_DEEPTIME_SCHEMA,
    schema_version: '1.0.0',
    sequence_id: text(sequenceId, 'sequenceId'),
    sequence_revision: revision,
    lambda: lambdaValue,
    time: Object.freeze({
      utc: new Date(utc).toISOString(),
      julian_date: jd,
      julian_time_scale: text(julianTimeScale, 'julianTimeScale'),
    }),
    premaqc: clone(premaqc),
    provenance: Object.freeze({
      observation_run_id: text(observationRunId, 'observationRunId'),
      acceptance_mask_id: text(acceptanceMaskId, 'acceptanceMaskId'),
      acceptance_mask_version: text(acceptanceMaskVersion, 'acceptanceMaskVersion'),
      source_receipt_hashes: Object.freeze(hashes),
      accepted_state_hash: acceptedStateHash,
    }),
    quality: Object.freeze({
      data_quality: quality,
      missing: Object.freeze(uniqueStrings(missing)),
      stale: Object.freeze(uniqueStrings(stale)),
    }),
    reaction: Object.freeze({
      navigation_request_id: navigationRequest.request_id,
      route_id: route.route_id,
      source: route.source,
      target: route.target,
      path: clone(route.path),
      hop_count: route.hop_count,
      total_cost: route.total_cost,
      ask_packet_id: askPacket?.packet_id ?? null,
      transformation_request_id: transformationRequest?.request_id ?? null,
    }),
    authority: Object.freeze({
      route_is_modelled_projection_path: true,
      route_is_observation: false,
      physical_travel_claimed: false,
      accepted_premaqc_remains_source_state: true,
      append_only_intent: true,
    }),
  };

  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    receipt_id: `deeptime-reaction-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}
