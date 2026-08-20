import {
  TRANSFORMATION_REQUEST_SCHEMA,
  TRANSFORMATION_RESPONSE_SCHEMA,
  TRANSFORMATION_AXES,
} from './transformation-request.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const ADMISSIBILITY_RESIDUAL_SCHEMA = 'arcsweep.admissibility-residual/v1';

const DONORS = Object.freeze([
  Object.freeze({
    title: 'Projection Residual Geometry v1.1',
    source_id: 'bseng:124fd8f1ff659dea5ba9',
    source_hash: '124fd8f1ff659dea5ba9fe3919fcc47b8e1047a8055db2041a388c232cc23e17',
    relation: 'implementation-donor',
  }),
  Object.freeze({
    title: 'Closure-Restoration Geometry v1.0',
    source_id: 'bseng:2186ef82b407cafd6d74',
    source_hash: '2186ef82b407cafd6d74df7af5beb869850c779d10804477a004e9d65bc5abe7',
    relation: 'implementation-donor',
  }),
  Object.freeze({
    title: 'Residual Space Geometry v1.1',
    source_id: 'bseng:384d9c8cd5cb9e599235',
    source_hash: '384d9c8cd5cb9e59923582879b406e97a0387732245d5b24f8d0272f83a348eb',
    relation: 'implementation-donor',
  }),
]);

function invariant(condition, message) {
  if (!condition) throw new Error(`ADMISSIBILITY_RESIDUAL: ${message}`);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function nonNegative(value, field) {
  const number = finite(value, field);
  invariant(number >= 0, `${field} must be >= 0`);
  return number;
}

function round(value, places = 8) {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

function rms(values) {
  if (!values.length) return 0;
  return Math.sqrt(values.reduce((sum, value) => sum + Number(value) ** 2, 0) / values.length);
}

function timestamp(value) {
  const when = new Date(value ?? new Date().toISOString());
  invariant(!Number.isNaN(when.getTime()), 'generatedAt must be an ISO-compatible timestamp');
  return when.toISOString();
}

function commonAuthority() {
  return deepFreeze({
    representation_status: 'representational-formalism',
    residual_is_external_world_fact: false,
    zero_residual_is_fulfilment: false,
    route_admissibility_is_fulfilment: false,
    transport_ack_is_fulfilment: false,
    semantic_response_is_transport_ack: false,
    canon_commit: false,
  });
}

async function seal(core) {
  const fingerprint = await sha256Hex(core);
  return deepFreeze({
    ...core,
    residual_id: `admissibility-residual-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

/**
 * Project an observed PREMAQC response into the requested target subspace and
 * retain everything orthogonal to that request as a residual. This is an
 * engineering representation over receipted measurements, not a declaration
 * that the requested transformation was fulfilled or caused by the Ask.
 */
export async function createTransformationAdmissibilityResidual({
  request,
  response,
  normalTolerance = 0.18,
  generatedAt = response?.observed_at || new Date().toISOString(),
} = {}) {
  invariant(request?.schema === TRANSFORMATION_REQUEST_SCHEMA, 'a transformation request receipt is required');
  invariant(response?.schema === TRANSFORMATION_RESPONSE_SCHEMA, 'a transformation response receipt is required');
  invariant(response.request_id === request.request_id, 'request and response must share a request_id');
  const tolerance = nonNegative(normalTolerance, 'normalTolerance');
  const targetAxes = new Set(request.target.axes);
  const sign = request.target.direction === 'increase' ? 1 : -1;

  const tangentProjection = {};
  const normalResidual = {};
  const targetDeficit = {};
  const directionViolation = {};
  for (const axis of TRANSFORMATION_AXES) {
    const delta = finite(response.measurement?.deltas?.[axis], `response delta ${axis}`);
    const requested = targetAxes.has(axis);
    tangentProjection[axis] = round(requested ? delta : 0);
    normalResidual[axis] = round(requested ? 0 : delta);
    if (requested) {
      const signedProgress = round(delta * sign);
      targetDeficit[axis] = round(Math.max(0, Number(request.target.minimum_delta) - signedProgress));
      directionViolation[axis] = round(Math.max(0, -signedProgress));
    } else {
      targetDeficit[axis] = 0;
      directionViolation[axis] = 0;
    }
  }

  const targetDeficitNorm = round(rms(request.target.axes.map((axis) => targetDeficit[axis])));
  const directionViolationNorm = round(rms(request.target.axes.map((axis) => directionViolation[axis])));
  const normalAxes = TRANSFORMATION_AXES.filter((axis) => !targetAxes.has(axis));
  const normalResidualNorm = round(rms(normalAxes.map((axis) => normalResidual[axis])));
  const maximumNormalComponent = round(normalAxes.length ? Math.max(...normalAxes.map((axis) => Math.abs(normalResidual[axis]))) : 0);
  const hasTargetDeficit = targetDeficitNorm > 1e-9 || directionViolationNorm > 1e-9;
  const hasCollateralResidual = maximumNormalComponent > tolerance;
  const classification = hasTargetDeficit && hasCollateralResidual ? 'MIXED_RESIDUAL'
    : hasTargetDeficit ? 'TARGET_DEFICIT'
      : hasCollateralResidual ? 'COLLATERAL_RESIDUAL'
        : 'WITHIN_REQUEST_CORRIDOR';
  const totalResidualNorm = round(rms([
    ...request.target.axes.map((axis) => targetDeficit[axis]),
    ...request.target.axes.map((axis) => directionViolation[axis]),
    ...normalAxes.map((axis) => normalResidual[axis]),
  ]));

  const core = {
    schema: ADMISSIBILITY_RESIDUAL_SCHEMA,
    schema_version: 1,
    mode: 'transformation-response',
    generated_at: timestamp(generatedAt),
    source: {
      request_id: request.request_id,
      request_fingerprint: request.request_fingerprint,
      response_id: response.response_id,
      response_fingerprint: response.response_fingerprint,
      response_receipt_id: response.response?.receipt_id || null,
    },
    projection: {
      target_axes: Object.freeze([...request.target.axes]),
      direction: request.target.direction,
      minimum_delta: Number(request.target.minimum_delta),
      tangent_projection: deepFreeze(tangentProjection),
      normal_residual: deepFreeze(normalResidual),
    },
    residual: {
      target_deficit: deepFreeze(targetDeficit),
      direction_violation: deepFreeze(directionViolation),
      target_deficit_norm: targetDeficitNorm,
      direction_violation_norm: directionViolationNorm,
      normal_residual_norm: normalResidualNorm,
      maximum_normal_component: maximumNormalComponent,
      total_residual_norm: totalResidualNorm,
      normal_tolerance: round(tolerance),
    },
    classification,
    provenance: {
      corpus_id: 'bseng-rse',
      implementation_donors: DONORS,
      note: 'Hearthfire residual geometry is an operational adaptation over receipted system measurements, not a verbatim reproduction or ontic claim.',
    },
    authority: {
      ...commonAuthority(),
      source_measurement_observed: true,
      residual_is_derived_representation: true,
      request_is_cause_proof: false,
      within_request_corridor_is_fulfilment: false,
      observed_response_preserved_separately: true,
    },
  };
  return seal(core);
}

/**
 * Express React-ion route-envelope violations as a residual vector. A zero
 * vector means the compiled projection state lies inside its declared route
 * envelope; it says nothing about transport delivery, semantic response, or
 * transformation fulfilment.
 */
export async function createProjectionAdmissibilityResidual({
  projectionState,
  generatedAt = new Date().toISOString(),
} = {}) {
  invariant(projectionState?.schema === 'reaction.projection-state/v1', 'a React-ion projection state is required');
  const cusp = finite(projectionState.cusp_score, 'cusp_score');
  const continuity = finite(projectionState.continuity, 'continuity');
  const harmonic = finite(projectionState.harmonic_mismatch, 'harmonic_mismatch');
  const cuspThreshold = finite(projectionState.thresholds?.cusp, 'cusp threshold');
  const continuityThreshold = finite(projectionState.thresholds?.continuity, 'continuity threshold');
  const harmonicThreshold = finite(projectionState.thresholds?.harmonic, 'harmonic threshold');
  const vector = deepFreeze({
    cusp_excess: round(Math.max(0, cusp - cuspThreshold)),
    continuity_deficit: round(Math.max(0, continuityThreshold - continuity)),
    harmonic_excess: round(Math.max(0, harmonic - harmonicThreshold)),
  });
  const residualNorm = round(rms(Object.values(vector)));
  const classification = residualNorm <= 1e-9 ? 'WITHIN_ROUTE_ENVELOPE' : 'ROUTE_ENVELOPE_RESIDUAL';

  const core = {
    schema: ADMISSIBILITY_RESIDUAL_SCHEMA,
    schema_version: 1,
    mode: 'react-ion-route-envelope',
    generated_at: timestamp(generatedAt),
    source: {
      projection_state: projectionState.state,
      projection_state_schema: projectionState.schema,
    },
    projection: {
      observed: { cusp_score: cusp, continuity, harmonic_mismatch: harmonic },
      envelope: { cusp: cuspThreshold, continuity: continuityThreshold, harmonic: harmonicThreshold },
    },
    residual: {
      vector,
      residual_norm: residualNorm,
    },
    classification,
    provenance: {
      corpus_id: 'bseng-rse',
      implementation_donors: DONORS,
      note: 'The residual vector measures declared route-envelope deficit only; it is not a travel or fulfilment receipt.',
    },
    authority: {
      ...commonAuthority(),
      residual_is_derived_representation: true,
      projection_state_is_external_world_fact: false,
      within_route_envelope_is_fulfilment: false,
      route_envelope_admission_is_observed_transformation: false,
    },
  };
  return seal(core);
}
