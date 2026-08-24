import { analyseCuspCatastrophe, normaliseCuspControlSemantics } from '../../starwell/src/arcsweep-temporal-quantum/cusp-catastrophe.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const DOMAIN_CONTROL_PROFILE_SCHEMA = 'arcsweep.domain-control-profile/v1';
export const DOMAIN_CONTROL_SWEEP_SCHEMA = 'arcsweep.domain-control-sweep/v1';
export const DOMAIN_CONTROL_COMPARISON_SCHEMA = 'arcsweep.domain-control-comparison/v1';

const EPSILON = 1e-9;

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_DOMAIN_CONTROL: ${message}`);
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function nonEmpty(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function slug(value, fallback = 'domain-profile') {
  const text = String(value ?? '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return text || fallback;
}

function normaliseRange(input, field, fallback) {
  const source = input && typeof input === 'object' ? input : {};
  const minimum = finite(source.minimum ?? source.min ?? fallback.minimum, `${field}.minimum`);
  const maximum = finite(source.maximum ?? source.max ?? fallback.maximum, `${field}.maximum`);
  invariant(maximum > minimum, `${field}.maximum must exceed minimum`);
  const defaultValue = finite(source.default ?? source.value ?? fallback.default, `${field}.default`);
  return deepFreeze({
    minimum,
    maximum,
    default: clamp(defaultValue, minimum, maximum),
  });
}

function authorityForProfile(input = {}) {
  return deepFreeze({
    normal_form_model: true,
    physical_claim: false,
    physical_calibration: Boolean(input.physical_calibration),
    intention_may_be_absent: true,
    semantics_explicit: true,
    source_required_for_physical_interpretation: true,
  });
}

export function normaliseDomainControlProfile(input = {}) {
  invariant(input && typeof input === 'object' && !Array.isArray(input), 'profile must be an object');
  const name = nonEmpty(input.name, 'Untitled domain profile');
  const profileId = nonEmpty(input.profile_id ?? input.id, slug(name));
  const semantics = normaliseCuspControlSemantics(input.control_semantics ?? input.semantics ?? null);
  const ranges = {
    a: normaliseRange(input.ranges?.a ?? input.control_a, 'range a', { minimum: -2, maximum: 0.5, default: -1 }),
    b: normaliseRange(input.ranges?.b ?? input.control_b, 'range b', { minimum: -0.6, maximum: 0.6, default: 0 }),
  };
  const orderParameter = finite(input.order_parameter ?? input.orderParameter ?? 0, 'order_parameter');
  const sourceRefs = Array.isArray(input.source_refs ?? input.sourceRefs)
    ? (input.source_refs ?? input.sourceRefs).map((item) => String(item).trim()).filter(Boolean)
    : [];

  return deepFreeze({
    schema: DOMAIN_CONTROL_PROFILE_SCHEMA,
    schema_version: 1,
    profile_id: profileId,
    name,
    domain: nonEmpty(input.domain, 'general'),
    description: String(input.description ?? '').trim(),
    built_in: Boolean(input.built_in),
    control_semantics: semantics,
    ranges: deepFreeze(ranges),
    order_parameter: orderParameter,
    calibration: deepFreeze({
      state: nonEmpty(input.calibration?.state, 'normal-form-only'),
      note: String(input.calibration?.note ?? '').trim(),
    }),
    source_refs: deepFreeze(sourceRefs),
    authority: authorityForProfile(input.authority),
  });
}

const BUILT_IN_RAW = [
  {
    profile_id: 'bai-requested-transformation',
    name: 'Bone · Ash · Intention',
    domain: 'requested-transformation',
    description: 'The Arcsweep Ask projection: structural Bone maps to control a; declared Intention maps to control b. Ash remains trajectory history outside the instantaneous cusp pair.',
    built_in: true,
    control_semantics: {
      a: { role: 'structure', label: 'Bone / structural constraint', unit: 'normal-form', source: 'bai-projection', intentional: false },
      b: { role: 'intention', label: 'Declared Intention', unit: 'normal-form', source: 'receipted-request', intentional: true },
    },
    ranges: {
      a: { minimum: -2, maximum: 0.25, default: -1 },
      b: { minimum: -0.6, maximum: 0.6, default: 0 },
    },
    calibration: { state: 'model-calibrated', note: 'Control semantics are defined by the Requested Transformation contract; values remain reduced normal-form controls.' },
  },
  {
    profile_id: 'black-hole-star-lrd',
    name: 'Black-hole star / Little Red Dot',
    domain: 'astrophysics',
    description: 'Synthetic QA fixture for natural-system topology. The two controls are non-intentional and stand only for a normal-form projection of envelope and accretion conditions.',
    built_in: true,
    control_semantics: {
      a: { role: 'envelope-density-control', label: 'Envelope-density control', unit: 'normal-form', source: 'illustrative-astrophysics-projection', intentional: false },
      b: { role: 'accretion-rate-control', label: 'Accretion-rate control', unit: 'normal-form', source: 'illustrative-astrophysics-projection', intentional: false },
    },
    ranges: {
      a: { minimum: -2, maximum: 0.5, default: -1 },
      b: { minimum: -0.6, maximum: 0.6, default: 0 },
    },
    calibration: { state: 'normal-form-only', note: 'Not calibrated to physical density or accretion units. Used to verify that Arcsweep does not manufacture Intention in a natural system.' },
    source_refs: ['https://www.independent.co.uk/space/black-hole-star-new-study-b3031925.html'],
  },
  {
    profile_id: 'runa-acoustic-field',
    name: 'Runa acoustic field',
    domain: 'acoustics',
    description: 'A non-intentional acoustic control projection for exploring resonance structure against external drive or forcing.',
    built_in: true,
    control_semantics: {
      a: { role: 'resonance-structure', label: 'Resonance structure', unit: 'normal-form', source: 'runa-model', intentional: false },
      b: { role: 'drive-forcing', label: 'Drive / forcing', unit: 'normal-form', source: 'runa-model', intentional: false },
    },
    ranges: {
      a: { minimum: -2, maximum: 0.5, default: -1 },
      b: { minimum: -0.6, maximum: 0.6, default: 0 },
    },
    calibration: { state: 'normal-form-only', note: 'A topology workbench until a domain-specific DSP calibration is explicitly supplied.' },
  },
];

export const BUILT_IN_DOMAIN_CONTROL_PROFILES = deepFreeze(BUILT_IN_RAW.map(normaliseDomainControlProfile));

export function domainControlProfiles(customProfiles = []) {
  invariant(Array.isArray(customProfiles), 'customProfiles must be an array');
  const customs = customProfiles.map((profile) => normaliseDomainControlProfile({ ...profile, built_in: false }));
  const byId = new Map(BUILT_IN_DOMAIN_CONTROL_PROFILES.map((profile) => [profile.profile_id, profile]));
  for (const profile of customs) byId.set(profile.profile_id, profile);
  return deepFreeze([...byId.values()]);
}

function sampleLinear(start, end, steps) {
  invariant(Number.isInteger(steps) && steps >= 5 && steps <= 241, 'steps must be an integer from 5 to 241');
  if (steps === 1) return [start];
  return Array.from({ length: steps }, (_, index) => start + (end - start) * (index / (steps - 1)));
}

function stableSelection(observation) {
  return observation?.selected_equilibrium?.stability === 'stable'
    ? observation.selected_equilibrium
    : null;
}

function runSweepPath({
  profile,
  sweptControl,
  values,
  fixedControl,
  initialOrderParameter,
  previousObservation = null,
}) {
  let previous = previousObservation;
  let orderParameter = finite(initialOrderParameter, 'initialOrderParameter');
  const points = [];

  for (const sweptValue of values) {
    const controlA = sweptControl === 'a' ? sweptValue : fixedControl;
    const controlB = sweptControl === 'b' ? sweptValue : fixedControl;
    const observation = analyseCuspCatastrophe({
      controlA,
      controlB,
      controlSemantics: profile.control_semantics,
      orderParameter,
      previous,
    });
    const selected = observation.selected_equilibrium;
    if (selected && Number.isFinite(selected.value)) orderParameter = selected.value;
    points.push({ swept_value: sweptValue, observation });
    previous = observation;
  }

  return { points, last_observation: previous, last_order_parameter: orderParameter };
}

function pathPointProjection(point) {
  const observation = point.observation;
  return deepFreeze({
    swept_value: point.swept_value,
    control_a: observation.controls.a,
    control_b: observation.controls.b,
    order_parameter: observation.order_parameter,
    selected_value: observation.selected_equilibrium?.value ?? null,
    selected_branch: observation.selected_equilibrium?.branch ?? null,
    selected_stability: observation.selected_equilibrium?.stability ?? null,
    equilibrium_count: observation.equilibria.length,
    regime: observation.regime,
    fold_polynomial: observation.fold_polynomial,
    cubic_discriminant: observation.cubic_discriminant,
    branch_changed: Boolean(observation.history?.branch_changed),
  });
}

function analyseBidirectionalHysteresis(forwardPoints, reversePoints, sweptControl, semantics, {
  stateTolerance = 1e-6,
} = {}) {
  const alignedReverse = [...reversePoints].reverse();
  invariant(alignedReverse.length === forwardPoints.length, 'forward and reverse paths must have equal sample counts');
  const witnesses = [];
  let area = 0;

  for (let index = 0; index < forwardPoints.length; index += 1) {
    const left = forwardPoints[index];
    const right = alignedReverse[index];
    const leftSelected = stableSelection(left.observation);
    const rightSelected = stableSelection(right.observation);
    const separation = leftSelected && rightSelected
      ? Math.abs(leftSelected.value - rightSelected.value)
      : 0;

    if (index > 0) {
      const previous = forwardPoints[index - 1];
      const delta = Math.abs(left.swept_value - previous.swept_value);
      const previousRight = alignedReverse[index - 1];
      const previousLeftSelected = stableSelection(previous.observation);
      const previousRightSelected = stableSelection(previousRight.observation);
      const previousSeparation = previousLeftSelected && previousRightSelected
        ? Math.abs(previousLeftSelected.value - previousRightSelected.value)
        : 0;
      area += delta * (previousSeparation + separation) / 2;
    }

    if (!leftSelected || !rightSelected) continue;
    if (leftSelected.branch === rightSelected.branch) continue;
    if (separation <= stateTolerance) continue;
    witnesses.push(deepFreeze({
      sample_index: index,
      swept_control: sweptControl,
      swept_label: semantics[sweptControl].label,
      swept_value: left.swept_value,
      forward_branch: leftSelected.branch,
      reverse_branch: rightSelected.branch,
      forward_state: leftSelected.value,
      reverse_state: rightSelected.value,
      state_separation: separation,
    }));
  }

  return deepFreeze({
    schema: 'arcsweep.domain-control-hysteresis/v1',
    swept_control: sweptControl,
    swept_label: semantics[sweptControl].label,
    detected: witnesses.length > 0,
    witness_count: witnesses.length,
    witnesses,
    loop_area: area,
    state_tolerance: stateTolerance,
    authority: {
      path_dependence_model: true,
      physical_claim: false,
      requires_forward_reverse_sweeps: true,
    },
  });
}

function regimeCounts(points) {
  const counts = { 'single-stable': 0, multistable: 0, 'fold-boundary': 0, 'cusp-point': 0 };
  for (const point of points) counts[point.observation.regime] = (counts[point.observation.regime] ?? 0) + 1;
  return counts;
}

function topologyState({ hysteresis, points }) {
  if (hysteresis.detected) return 'HYSTERETIC';
  if (points.some((point) => point.observation.regime === 'cusp-point')) return 'CUSP_NEAR';
  if (points.some((point) => point.observation.regime === 'multistable')) return 'BRANCH';
  if (points.some((point) => point.observation.regime === 'fold-boundary')) return 'FOLD_NEAR';
  return 'OPEN';
}

export async function runBidirectionalDomainSweep({
  profile: profileInput,
  sweptControl = 'b',
  start = null,
  end = null,
  steps = 61,
  fixedControl = null,
  initialOrderParameter = null,
  generatedAt,
} = {}) {
  const profile = normaliseDomainControlProfile(profileInput);
  invariant(sweptControl === 'a' || sweptControl === 'b', 'sweptControl must be a or b');
  const otherControl = sweptControl === 'a' ? 'b' : 'a';
  const range = profile.ranges[sweptControl];
  const from = start == null ? range.minimum : finite(start, 'start');
  const to = end == null ? range.maximum : finite(end, 'end');
  invariant(Math.abs(to - from) > EPSILON, 'sweep start and end must differ');
  const fixed = fixedControl == null ? profile.ranges[otherControl].default : finite(fixedControl, 'fixedControl');
  const initialX = initialOrderParameter == null ? profile.order_parameter : finite(initialOrderParameter, 'initialOrderParameter');
  const count = Number(steps);
  invariant(Number.isInteger(count) && count >= 5 && count <= 241, 'steps must be an integer from 5 to 241');

  const forwardValues = sampleLinear(from, to, count);
  const forward = runSweepPath({
    profile,
    sweptControl,
    values: forwardValues,
    fixedControl: fixed,
    initialOrderParameter: initialX,
  });
  const reverseValues = sampleLinear(to, from, count);
  const reverse = runSweepPath({
    profile,
    sweptControl,
    values: reverseValues,
    fixedControl: fixed,
    initialOrderParameter: forward.last_order_parameter,
    previousObservation: forward.last_observation,
  });

  const hysteresis = analyseBidirectionalHysteresis(
    forward.points,
    reverse.points,
    sweptControl,
    profile.control_semantics,
  );
  const allPoints = [...forward.points, ...reverse.points];
  const counts = regimeCounts(allPoints);
  const transitions = allPoints.filter((point) => point.observation.history?.branch_changed).length;
  const maxBranches = Math.max(...allPoints.map((point) => point.observation.equilibria.length));
  const state = topologyState({ hysteresis, points: allPoints });

  const core = {
    schema: DOMAIN_CONTROL_SWEEP_SCHEMA,
    schema_version: 1,
    profile,
    configuration: {
      swept_control: sweptControl,
      swept_label: profile.control_semantics[sweptControl].label,
      start: from,
      end: to,
      steps: count,
      fixed_control: otherControl,
      fixed_label: profile.control_semantics[otherControl].label,
      fixed_value: fixed,
      initial_order_parameter: initialX,
    },
    forward: deepFreeze(forward.points.map(pathPointProjection)),
    reverse: deepFreeze(reverse.points.map(pathPointProjection)),
    hysteresis,
    summary: deepFreeze({
      topology_state: state,
      regime_counts: counts,
      max_equilibrium_count: maxBranches,
      branch_transition_count: transitions,
      hysteresis_detected: hysteresis.detected,
      hysteresis_loop_area: hysteresis.loop_area,
    }),
    authority: deepFreeze({
      normal_form_model: true,
      physical_claim: false,
      semantics_explicit: true,
      controls_may_be_nonintentional: true,
      profile_physical_calibration: profile.authority.physical_calibration,
      topology_is_model_output: true,
      canon_commit: false,
    }),
  };
  const fingerprint = await sha256Hex(core);

  return deepFreeze({
    ...core,
    sweep_id: `domain-sweep-${fingerprint.slice(0, 24)}`,
    sweep_fingerprint: fingerprint,
    generated_at: generatedAt ?? new Date().toISOString(),
  });
}

export function compareDomainControlSweeps(sweeps = []) {
  invariant(Array.isArray(sweeps), 'sweeps must be an array');
  const rows = sweeps
    .filter((sweep) => sweep?.schema === DOMAIN_CONTROL_SWEEP_SCHEMA)
    .map((sweep) => deepFreeze({
      sweep_id: sweep.sweep_id,
      profile_id: sweep.profile.profile_id,
      profile_name: sweep.profile.name,
      domain: sweep.profile.domain,
      swept_control: sweep.configuration.swept_control,
      swept_label: sweep.configuration.swept_label,
      topology_state: sweep.summary.topology_state,
      hysteresis_detected: sweep.hysteresis.detected,
      hysteresis_loop_area: sweep.hysteresis.loop_area,
      branch_transition_count: sweep.summary.branch_transition_count,
      max_equilibrium_count: sweep.summary.max_equilibrium_count,
      control_b_intentional: Boolean(sweep.profile.control_semantics.b.intentional),
      physical_calibration: Boolean(sweep.profile.authority.physical_calibration),
      generated_at: sweep.generated_at,
    }));

  return deepFreeze({
    schema: DOMAIN_CONTROL_COMPARISON_SCHEMA,
    row_count: rows.length,
    rows,
    authority: {
      comparison_of_model_runs: true,
      physical_claim: false,
      semantics_not_assumed_equivalent_across_domains: true,
    },
  });
}
