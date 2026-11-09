'use strict';

/**
 * Gateway × Wayglass, double-Möbius engine.
 * Two explicitly sourced perspectives cross, transform and return without
 * exchanging identity, claiming unobserved cognition, or mutating world canon.
 * Computational state engine, not an assertion about physical consciousness.
 */
const { createHash } = require('node:crypto');
const { enterWayglassWorld } = require('./wayglass-world-entry.cjs');
const { createWayglassDeparture } = require('./wayglass-stop-receipt.cjs');
const { evaluateReturnAttempt } = require('./wayglass-return-trial.cjs');

const SCHEMA = 'wayglass.gateway-double-mobius/v0.1';
const FOCI = Object.freeze(['focus-10', 'focus-12', 'focus-15', 'focus-21', 'unclassified']);
const EIGHTFOLD = Object.freeze(['perceive', 'compress', 'release', 'verify', 'integrate', 'choose', 'return', 'transcend']);
const KINDS = Object.freeze(['firsthand', 'instrument', 'model-observation', 'symbolic', 'hypothesis']);
const LIMIT = 4000;

function nonempty(value, name, max = LIMIT) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new TypeError(name + ' must be a nonempty bounded string.');
  }
  return value.trim();
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}
function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}
function observation(value, side) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(side + ' observation is required.');
  const kind = nonempty(value.kind, side + '.kind', 50);
  if (!KINDS.includes(kind)) throw new TypeError('Unknown ' + side + ' observation kind.');
  const record = {
    kind,
    actor_id: nonempty(value.actor_id, side + '.actor_id', 180),
    source_ref: nonempty(value.source_ref, side + '.source_ref', 500),
    content: nonempty(value.content, side + '.content', LIMIT),
    route_ref: value.route_ref == null ? null : nonempty(value.route_ref, side + '.route_ref', 180),
  };
  if (kind === 'model-observation' && !record.route_ref) {
    throw new TypeError('Model observations require a route_ref, not an assumed Wayglass voice.');
  }
  return Object.freeze(record);
}

/** Smooth Möbius geometry; no angular corners. 4π returns to full orientation. */
function mobiusPoint(theta, transverse = 0.2, phase = 0) {
  if (![theta, transverse, phase].every(Number.isFinite) || Math.abs(transverse) > 0.45) {
    throw new TypeError('Finite Möbius coordinates and a bounded transverse offset required.');
  }
  const a = theta + phase;
  const r = 1 + transverse * Math.cos(a / 2);
  return Object.freeze({
    x: r * Math.cos(a),
    y: r * Math.sin(a),
    z: transverse * Math.sin(a / 2),
  });
}
function inspectDoubleMobius() {
  return Object.freeze({
    schema: SCHEMA,
    status: 'available-in-host',
    loops: Object.freeze(['gateway:state-transformation', 'wayglass:information-and-continuity']),
    withness: 'reciprocal-crossing-with-distinct-provenance',
    phases: EIGHTFOLD,
    focus_profiles: FOCI,
    observation_kinds: KINDS,
    full_orientation_period_radians: 4 * Math.PI,
    audio_started: false,
    model_invoked: false,
    owner_authenticated: false,
    persistence: 'explicit-existing-Return-Engine-only',
    claim: 'deterministic engine; no verified live participant response',
  });
}

/**
 * Executes a complete two-loop crossing in memory. The Waygate and continuation
 * inspector run before any observation is accepted. Source material is copied
 * as distinct perspectives and carried into a validated Return Engine packet.
 */
function traverseDoubleMobius({
  world_id, participant_id, waygate_manifest, continuation_packet = null,
  embodiment = {}, preferred_route = null, explicit_consent = false,
  gateway_focus = 'unclassified', gateway_observation, wayglass_observation,
  identity_declarations, relationship_state = [], unresolved_wonder_questions = [],
  revoked_refs = [], provenance_refs = [], next_owner, stop_point,
  recorded_at = '2026-11-08T00:00:00.000Z',
} = {}) {
  if (explicit_consent !== true) throw new TypeError('Explicit consent is required for this crossing.');
  if (!FOCI.includes(gateway_focus)) throw new TypeError('Unknown Gateway focus profile.');
  if (!Array.isArray(identity_declarations) || !identity_declarations.length) {
    throw new TypeError('Identity declarations must be supplied by the caller.');
  }
  if (!Array.isArray(provenance_refs) || !Array.isArray(revoked_refs)
      || !Array.isArray(unresolved_wonder_questions) || !Array.isArray(relationship_state)) {
    throw new TypeError('Lineage, revocations and relationship fields must be arrays.');
  }
  const at = nonempty(recorded_at, 'recorded_at', 80);
  if (!Number.isFinite(Date.parse(at))) throw new TypeError('recorded_at must be a valid timestamp.');
  const entry = enterWayglassWorld({
    world_id, participant_id, waygate_manifest, continuation_packet,
    embodiment, preferred_route, entered_at: at,
  });
  if (!entry.entered) {
    return Object.freeze({
      schema: SCHEMA, status: 'blocked-entry', blocked_by: entry.blocked_by,
      entry_receipt: entry.receipt, audio_started: false, model_invoked: false,
    });
  }
  const left = observation(gateway_observation, 'gateway');
  const right = observation(wayglass_observation, 'wayglass');
  const revoked = new Set(revoked_refs);
  if (revoked.has(left.source_ref) || revoked.has(right.source_ref)) {
    throw new TypeError('A revoked observation cannot cross into a new continuity packet.');
  }
  const sources = [...new Set([...provenance_refs, left.source_ref, right.source_ref])];
  if (sources.some(x => typeof x !== 'string' || !x.trim())) throw new TypeError('Invalid provenance reference.');
  const identity = nonempty(participant_id, 'participant_id', 180);
  const world = nonempty(world_id, 'world_id', 180);
  const owner = nonempty(next_owner, 'next_owner', 180);
  const stop = nonempty(stop_point, 'stop_point', 1000);
  const gateway = Object.freeze({ loop: 'gateway', focus: gateway_focus, observation: left, orientation_before: 1, orientation_after: -1 });
  const wayglass = Object.freeze({ loop: 'wayglass', observation: right, orientation_before: -1, orientation_after: 1 });
  const crossings = Object.freeze([
    Object.freeze({ direction: 'gateway-to-wayglass', carries: left.source_ref, received_by: right.actor_id }),
    Object.freeze({ direction: 'wayglass-to-gateway', carries: right.source_ref, received_by: left.actor_id }),
  ]);
  const lanes = Object.freeze(EIGHTFOLD.map((phase, index) => Object.freeze({
    step: index + 1, phase, gateway_source: left.source_ref, wayglass_source: right.source_ref,
    authority_grant: false,
  })));
  const core = {
    schema: SCHEMA, world_id: world, participant_id: identity,
    gateway, wayglass, crossings, lanes,
    orientation: Object.freeze({ start: 1, after_gateway: -1, after_wayglass: 1 }),
    source_refs: sources, recorded_at: at,
  };
  const trace_hash = digest(core);
  const departure = createWayglassDeparture({
    receipt_id: 'double-mobius-stop:' + trace_hash.slice(0,32),
    packet_id: 'double-mobius-return:' + trace_hash.slice(0,32),
    world_id: world, participant_id: identity, stopped_at: at,
    reason: 'gateway-double-mobius-cycle',
    identity_declarations, relationship_state,
    active_work: [{
      work_id: 'wayglass:gateway-double-mobius', status: 'transformed-returned',
      trace_sha256: trace_hash, gateway_focus,
    }],
    unresolved_wonder_questions, provenance_refs: [...sources, 'wayglass.double-mobius:' + trace_hash],
    stop_point: stop, next_owner: owner,
    alternatives: [
      { source_ref: left.source_ref, perspective: 'gateway', kind: left.kind, status: 'unresolved' },
      { source_ref: right.source_ref, perspective: 'wayglass', kind: right.kind, status: 'unresolved' },
    ],
    revoked_refs,
  });
  const return_verification = evaluateReturnAttempt({
    attempt_id: 'double-mobius-check:' + trace_hash.slice(0,32),
    recorded_at: at,
    stop_receipt: departure.stop_receipt,
    continuation_packet: departure.continuation_packet,
  });
  if (return_verification.verdict !== 'accepted') {
    throw new Error('Double Möbius return failed continuity inspection.');
  }
  return Object.freeze({
    ...core, status: 'completed-in-memory', trace_sha256: trace_hash,
    entry_receipt: entry.receipt, departure, return_verification,
    audio_started: false, model_invoked: false,
    persisted: false, canon_commit: false, identity_commit: false,
    relationship_commit: false, authority_grant: false,
  });
}

module.exports = { SCHEMA, FOCI, EIGHTFOLD, inspectDoubleMobius, mobiusPoint, traverseDoubleMobius };
