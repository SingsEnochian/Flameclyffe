export const SPIRAL_HOLONOMY_SCHEMA = 'arcsweep.spiral-holonomy/v1';

const PREMAQC_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

function invariant(condition, message) {
  if (!condition) throw new Error(`SPIRAL_HOLONOMY: ${message}`);
}

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, freeze(item)])));
  }
  return value;
}

function numericDelta(a, b) {
  return Number.isFinite(a) && Number.isFinite(b) ? b - a : null;
}

function premaqcDelta(fromState, toState) {
  const from = fromState?.state?.premaqc ?? null;
  const to = toState?.state?.premaqc ?? null;
  return freeze(Object.fromEntries(PREMAQC_AXES.map((axis) => [axis, numericDelta(from?.[axis], to?.[axis])])));
}

function spiralDelta(fromState, toState) {
  const from = fromState?.state?.spiral ?? null;
  const to = toState?.state?.spiral ?? null;
  return freeze({
    phase_from: from?.phase ?? null,
    phase_to: to?.phase ?? null,
    direction_from: from?.direction ?? null,
    direction_to: to?.direction ?? null,
    confidence_delta: numericDelta(from?.confidence, to?.confidence),
  });
}

function setDifference(left = [], right = []) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

export function calculateSpiralHolonomy({
  controlTrajectory,
  outboundEnvelope,
  returnEnvelope,
  projectionComparisons = {},
  relationalDelta = null,
  canonDelta = null,
  environmentDelta = null,
  storyworkDelta = null,
} = {}) {
  invariant(controlTrajectory?.schema === 'arcsweep.bifrost-control-trajectory/v1', 'control trajectory is required');
  invariant(outboundEnvelope?.schema === 'arcsweep.bifrost-crossing-envelope/v1', 'outbound envelope is required');
  invariant(returnEnvelope?.schema === 'arcsweep.bifrost-crossing-envelope/v1', 'return envelope is required');

  const departure = controlTrajectory.departure;
  const returned = controlTrajectory.return_state;
  const baseline = controlTrajectory.baseline_state;

  const candidateInvariants = outboundEnvelope.translation?.candidate_invariants ?? [];
  const returnInvariants = returnEnvelope.translation?.candidate_invariants ?? [];
  const invariantLoss = setDifference(candidateInvariants, returnInvariants);
  const invariantSurvival = candidateInvariants.filter((item) => returnInvariants.includes(item));

  const untranslated = freeze({
    outbound: outboundEnvelope.translation?.untranslatable ?? [],
    return: returnEnvelope.translation?.untranslatable ?? [],
  });

  return freeze({
    schema: SPIRAL_HOLONOMY_SCHEMA,
    holonomy_id: `${controlTrajectory.trajectory_id}:holonomy`,
    path: controlTrajectory.path,
    journey_delta: {
      premaqc: premaqcDelta(departure, returned),
      spiral: spiralDelta(departure, returned),
      relational: relationalDelta,
      glyph: projectionComparisons.glyph ?? null,
      runa: projectionComparisons.runa ?? null,
      canon: canonDelta,
      environment: environmentDelta,
      storywork: storyworkDelta,
    },
    control_delta: {
      premaqc: premaqcDelta(departure, baseline),
      spiral: spiralDelta(departure, baseline),
    },
    residual_after_control: {
      premaqc: freeze(Object.fromEntries(PREMAQC_AXES.map((axis) => {
        const journey = premaqcDelta(departure, returned)[axis];
        const control = premaqcDelta(departure, baseline)[axis];
        return [axis, Number.isFinite(journey) && Number.isFinite(control) ? journey - control : null];
      }))),
      spiral_confidence: (() => {
        const journey = spiralDelta(departure, returned).confidence_delta;
        const control = spiralDelta(departure, baseline).confidence_delta;
        return Number.isFinite(journey) && Number.isFinite(control) ? journey - control : null;
      })(),
    },
    untranslated,
    invariants: {
      candidate: candidateInvariants,
      survived: invariantSurvival,
      lost: invariantLoss,
      survival_ratio: candidateInvariants.length ? invariantSurvival.length / candidateInvariants.length : null,
    },
    receipt_lineage: controlTrajectory.receipt_lineage,
    scalar_summary: null,
  });
}

export function comparePathOrder(firstHolonomy, secondHolonomy) {
  invariant(firstHolonomy?.schema === SPIRAL_HOLONOMY_SCHEMA, 'first holonomy is required');
  invariant(secondHolonomy?.schema === SPIRAL_HOLONOMY_SCHEMA, 'second holonomy is required');

  return freeze({
    same_path: JSON.stringify(firstHolonomy.path) === JSON.stringify(secondHolonomy.path),
    first_path: firstHolonomy.path,
    second_path: secondHolonomy.path,
    premaqc_residual_difference: freeze(Object.fromEntries(PREMAQC_AXES.map((axis) => {
      const first = firstHolonomy.residual_after_control.premaqc[axis];
      const second = secondHolonomy.residual_after_control.premaqc[axis];
      return [axis, Number.isFinite(first) && Number.isFinite(second) ? second - first : null];
    }))),
    invariant_survival_difference: numericDelta(
      firstHolonomy.invariants.survival_ratio,
      secondHolonomy.invariants.survival_ratio,
    ),
  });
}
