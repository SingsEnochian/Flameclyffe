import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const TRANSFORMATION_REQUEST_SCHEMA = 'arcsweep.transformation-request/v1';
export const TRANSFORMATION_RESPONSE_SCHEMA = 'arcsweep.transformation-response/v1';
export const TRANSFORMATION_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_TRANSFORMATION: ${message}`);
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function component(packet, axis) {
  const value = finite(packet?.state?.[axis]?.value, `PREMAQC ${axis}`);
  invariant(value >= 0 && value <= 1, `PREMAQC ${axis} must lie within 0..1`);
  return value;
}

function normaliseAxes(axes) {
  const unique = [...new Set((axes || []).map((axis) => String(axis).toUpperCase()))];
  invariant(unique.length > 0, 'at least one observable target axis is required');
  invariant(unique.every((axis) => TRANSFORMATION_AXES.includes(axis)), 'target axes must be PREMAQC axes');
  return Object.freeze(unique);
}

function requestGate({ authority, consent, intervention, bounds, observability, stopConditions }) {
  const gates = Object.freeze({
    authority: Boolean(String(authority || '').trim()),
    consent: consent === true,
    boundedness: Number.isFinite(Number(intervention?.strength))
      && Number(intervention.strength) > 0 && Number(intervention.strength) <= 1
      && Number.isInteger(Number(bounds?.maximumCycles))
      && Number(bounds.maximumCycles) >= 1 && Number(bounds.maximumCycles) <= 24,
    observability: Array.isArray(observability?.axes) && observability.axes.length > 0
      && Number.isFinite(Number(observability?.minimumDelta)) && Number(observability.minimumDelta) > 0,
    stop: Array.isArray(stopConditions) && stopConditions.length > 0
      && stopConditions.some((condition) => condition === 'Feather'),
  });
  return Object.freeze({ gates, admitted: Object.values(gates).every(Boolean) });
}

export async function createTransformationRequest({
  world,
  baselinePremaqc,
  description,
  targetAxes,
  direction = 'increase',
  minimumDelta = 0.03,
  intervention,
  authority,
  consent = false,
  maximumCycles = 3,
  stopConditions = ['Feather'],
  requestedAt = new Date().toISOString(),
} = {}) {
  invariant(world?.id && world?.name, 'a world is required');
  invariant(baselinePremaqc?.id && baselinePremaqc?.receipt_id, 'a receipted baseline PREMAQC packet is required');
  invariant(String(description || '').trim(), 'the requested change must be stated');
  invariant(['increase', 'decrease'].includes(direction), 'direction must be increase or decrease');
  const axes = normaliseAxes(targetAxes);
  const delta = finite(minimumDelta, 'minimumDelta');
  invariant(delta > 0 && delta <= 1, 'minimumDelta must lie within 0..1');
  for (const axis of TRANSFORMATION_AXES) component(baselinePremaqc, axis);
  const stop = [...new Set((stopConditions || []).map(String).filter(Boolean))];
  if (!stop.includes('Feather')) stop.unshift('Feather');
  const gate = requestGate({
    authority,
    consent,
    intervention,
    bounds: { maximumCycles: Number(maximumCycles) },
    observability: { axes, minimumDelta: delta },
    stopConditions: stop,
  });
  invariant(gate.admitted, `request gate closed: ${Object.entries(gate.gates).filter(([, open]) => !open).map(([name]) => name).join(', ')}`);

  const strength = Number(intervention.strength);
  const sign = direction === 'increase' ? 1 : -1;
  const core = {
    schema: TRANSFORMATION_REQUEST_SCHEMA,
    schema_version: 1,
    world: { id: world.id, name: world.name },
    requested_at: requestedAt,
    request: { description: String(description).trim(), status: 'requested-not-observed' },
    target: { axes, direction, minimum_delta: delta },
    intervention: {
      type: String(intervention.type || 'unspecified').trim(),
      strength,
      duration_cycles: Number(maximumCycles),
      control_input: Object.freeze(Object.fromEntries(TRANSFORMATION_AXES.map((axis) => [axis, axes.includes(axis) ? sign * strength : 0]))),
    },
    baseline: {
      premaqc_id: baselinePremaqc.id,
      receipt_id: baselinePremaqc.receipt_id,
      sequence: baselinePremaqc.sequence,
      observed_at: baselinePremaqc.observed_at,
      state: Object.freeze(Object.fromEntries(TRANSFORMATION_AXES.map((axis) => [axis, component(baselinePremaqc, axis)]))),
    },
    authority: {
      requested_by: String(authority).trim(),
      consent_recorded: true,
      request_is_observation: false,
      request_is_success: false,
      may_rewrite_premaqc: false,
      canon_commit: false,
    },
    bounds: { maximum_cycles: Number(maximumCycles), stop_conditions: Object.freeze(stop) },
    observability: { axes, minimum_delta: delta },
    gate,
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, request_id: `arcsweep-request-${fingerprint.slice(0, 24)}`, request_fingerprint: fingerprint });
}

export async function assessTransformationResponse({
  request,
  responsePremaqc,
  cycleCount = 1,
  maximumCollateralDelta = 0.18,
  maximumCouplingDelta = 0.16,
  observedAt = new Date().toISOString(),
} = {}) {
  invariant(request?.schema === TRANSFORMATION_REQUEST_SCHEMA, 'a transformation request receipt is required');
  invariant(responsePremaqc?.id && responsePremaqc?.receipt_id, 'a receipted response PREMAQC packet is required');
  invariant(Number(responsePremaqc.sequence) > Number(request.baseline.sequence), 'response must follow the baseline sequence');
  const cycles = finite(cycleCount, 'cycleCount');
  invariant(Number.isInteger(cycles) && cycles >= 1, 'cycleCount must be a positive integer');
  const deltas = Object.fromEntries(TRANSFORMATION_AXES.map((axis) => [axis, Number((component(responsePremaqc, axis) - request.baseline.state[axis]).toFixed(6))]));
  const sign = request.target.direction === 'increase' ? 1 : -1;
  const targetProgress = Object.fromEntries(request.target.axes.map((axis) => [axis, Number((deltas[axis] * sign).toFixed(6))]));
  const susceptibility = Object.fromEntries(TRANSFORMATION_AXES.map((axis) => [axis, Number((deltas[axis] / request.intervention.strength).toFixed(6))]));
  const unrequested = TRANSFORMATION_AXES.filter((axis) => !request.target.axes.includes(axis));
  const collateral = unrequested.filter((axis) => Math.abs(deltas[axis]) > Number(maximumCollateralDelta));
  const couplingDelta = deltas.E;
  const runaway = collateral.length > 0 || (couplingDelta > Number(maximumCouplingDelta) && !request.target.axes.includes('E'));
  const achievedAxes = request.target.axes.filter((axis) => targetProgress[axis] >= request.target.minimum_delta);
  const movingAxes = request.target.axes.filter((axis) => targetProgress[axis] > 0);
  const stopTriggered = runaway || cycles >= request.bounds.maximum_cycles;
  const coupling = runaway ? 'runaway-coupling'
    : achievedAxes.length === request.target.axes.length ? 'resonant-coupling'
      : movingAxes.length ? 'productive-coupling'
        : couplingDelta > 0 ? 'dangling-coupling' : 'no-observed-response';
  const status = runaway ? 'stop'
    : achievedAxes.length === request.target.axes.length ? 'target-observed'
      : cycles >= request.bounds.maximum_cycles ? 'bounded-window-complete'
        : 'continue-observation';
  const core = {
    schema: TRANSFORMATION_RESPONSE_SCHEMA,
    schema_version: 1,
    request_id: request.request_id,
    request_fingerprint: request.request_fingerprint,
    world: structuredClone(request.world),
    observed_at: observedAt,
    response: { premaqc_id: responsePremaqc.id, receipt_id: responsePremaqc.receipt_id, sequence: responsePremaqc.sequence },
    measurement: { deltas, susceptibility, target_progress: targetProgress, achieved_axes: achievedAxes, collateral_axes: collateral },
    classification: { status, coupling, stop_triggered: stopTriggered },
    authority: { response_observed: true, success_declared_by_request: false, premaqc_rewritten: false, canon_commit: false },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, response_id: `arcsweep-response-${fingerprint.slice(0, 24)}`, response_fingerprint: fingerprint });
}
