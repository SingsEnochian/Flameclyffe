const DEFAULT_EPSILON = 1e-10;
const TWO_PI = Math.PI * 2;

export const DEFAULT_CUSP_CONTROL_SEMANTICS = Object.freeze({
  a: Object.freeze({
    key: 'a',
    role: 'structure',
    label: 'Structure',
    unit: null,
    source: 'explicit-control',
    intentional: false,
  }),
  b: Object.freeze({
    key: 'b',
    role: 'intention',
    label: 'Intention',
    unit: null,
    source: 'explicit-control',
    intentional: true,
  }),
});

function invariant(condition, message) {
  if (!condition) throw new Error(`CUSP_CATASTROPHE: ${message}`);
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
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

function normaliseSemantic(input, fallback) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const role = nonEmpty(source.role, fallback.role);
  return deepFreeze({
    key: fallback.key,
    role,
    label: nonEmpty(source.label, fallback.label),
    unit: source.unit == null || String(source.unit).trim() === '' ? null : String(source.unit).trim(),
    source: nonEmpty(source.source, fallback.source),
    intentional: source.intentional == null ? role === 'intention' : Boolean(source.intentional),
  });
}

export function normaliseCuspControlSemantics(input = null) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  return deepFreeze({
    a: normaliseSemantic(source.a, DEFAULT_CUSP_CONTROL_SEMANTICS.a),
    b: normaliseSemantic(source.b, DEFAULT_CUSP_CONTROL_SEMANTICS.b),
  });
}

function resolveControl(primary, legacy, field) {
  if (primary !== null && primary !== undefined) return finite(primary, field);
  return finite(legacy, field);
}

function cubeRoot(value) {
  return Math.cbrt ? Math.cbrt(value) : Math.sign(value) * Math.abs(value) ** (1 / 3);
}

function uniqueSorted(values, epsilon) {
  return values
    .filter(Number.isFinite)
    .sort((left, right) => left - right)
    .filter((value, index, all) => index === 0 || Math.abs(value - all[index - 1]) > epsilon);
}

function depressedCubicRoots(controlA, controlB, epsilon) {
  const p = controlA;
  const q = controlB;
  const cardano = (q / 2) ** 2 + (p / 3) ** 3;

  if (cardano > epsilon) {
    const radical = Math.sqrt(cardano);
    return [cubeRoot(-q / 2 + radical) + cubeRoot(-q / 2 - radical)];
  }

  if (cardano < -epsilon) {
    const radius = 2 * Math.sqrt(-p / 3);
    const cosineArgument = Math.max(-1, Math.min(1, (3 * q / (2 * p)) * Math.sqrt(-3 / p)));
    const angle = Math.acos(cosineArgument);
    return uniqueSorted([
      radius * Math.cos(angle / 3),
      radius * Math.cos((angle + TWO_PI) / 3),
      radius * Math.cos((angle + 2 * TWO_PI) / 3),
    ], epsilon);
  }

  if (Math.abs(p) <= epsilon && Math.abs(q) <= epsilon) return [0];
  if (Math.abs(p) <= epsilon) return [cubeRoot(-q)];

  return uniqueSorted([
    3 * q / p,
    -3 * q / (2 * p),
  ], epsilon);
}

function classifyEquilibria(roots, controlA, epsilon) {
  const lastIndex = roots.length - 1;
  return roots.map((value, index) => {
    const curvature = 3 * value ** 2 + controlA;
    const stability = curvature > epsilon ? 'stable' : curvature < -epsilon ? 'unstable' : 'neutral-fold';
    const branch = roots.length === 1
      ? 'single'
      : index === 0
        ? 'lower'
        : index === lastIndex
          ? 'upper'
          : 'middle';
    return deepFreeze({ value, curvature, stability, branch });
  });
}

function nearestEquilibrium(equilibria, orderParameter) {
  if (orderParameter === null) return null;
  return equilibria.reduce((best, item) => {
    const distance = Math.abs(item.value - orderParameter);
    return !best || distance < best.distance ? { ...item, distance } : best;
  }, null);
}

function controlPairFromObservation(value) {
  if (!value || typeof value !== 'object') return null;
  const controls = value.controls || value;
  const a = Number(controls.a ?? controls.structure);
  const b = Number(controls.b ?? controls.intention);
  return Number.isFinite(a) && Number.isFinite(b) ? { a, b } : null;
}

function previousSelection(previous) {
  if (!previous || typeof previous !== 'object') return null;
  const selected = previous.selected_equilibrium || previous.selectedEquilibrium;
  if (!selected || typeof selected !== 'object') return null;
  const value = Number(selected.value);
  return Number.isFinite(value) ? { ...selected, value } : null;
}

function controlBDirection(currentControlB, previous) {
  const controls = controlPairFromObservation(previous);
  if (!controls) return 'unknown';
  if (currentControlB > controls.b) return 'increasing';
  if (currentControlB < controls.b) return 'decreasing';
  return 'stationary';
}

function classifyRegime(foldPolynomial, controlA, controlB, epsilon) {
  if (Math.abs(controlA) <= epsilon && Math.abs(controlB) <= epsilon) return 'cusp-point';
  if (Math.abs(foldPolynomial) <= epsilon) return 'fold-boundary';
  if (foldPolynomial < 0) return 'multistable';
  return 'single-stable';
}

/**
 * Canonical cusp normal form.
 *
 * Potential: V(x) = x^4/4 + a*x^2/2 + b*x
 * Equilibria: x^3 + a*x + b = 0
 * Fold locus: 4*a^3 + 27*b^2 = 0
 *
 * `controlA` and `controlB` are the domain-general controls. `structure` and
 * `intention` remain supported aliases for the BAI / Requested Transformation
 * projection. Control semantics carry the domain meaning so natural systems do
 * not acquire manufactured intention merely because they use the same cusp
 * mathematics.
 */
export function analyseCuspCatastrophe({
  controlA = null,
  controlB = null,
  structure = null,
  intention = null,
  controlSemantics = null,
  orderParameter = null,
  previous = null,
  epsilon = DEFAULT_EPSILON,
} = {}) {
  const a = resolveControl(controlA, structure, 'control a');
  const b = resolveControl(controlB, intention, 'control b');
  const semantics = normaliseCuspControlSemantics(controlSemantics);
  invariant(Number.isFinite(epsilon) && epsilon > 0, 'epsilon must be positive');
  const x = orderParameter === null || orderParameter === undefined
    ? null
    : finite(orderParameter, 'orderParameter');

  const foldPolynomial = 4 * a ** 3 + 27 * b ** 2;
  const cubicDiscriminant = -foldPolynomial;
  const regime = classifyRegime(foldPolynomial, a, b, epsilon);
  const roots = depressedCubicRoots(a, b, epsilon);
  const equilibria = classifyEquilibria(roots, a, epsilon);
  const selected = nearestEquilibrium(equilibria, x);
  const direction = controlBDirection(b, previous);
  const priorSelection = previousSelection(previous);
  const branchChanged = Boolean(selected && priorSelection && selected.branch !== priorSelection.branch);
  const pathDependencePossible = regime === 'multistable' || regime === 'fold-boundary';
  const controlBIsIntention = semantics.b.role === 'intention' || semantics.b.intentional === true;

  return deepFreeze({
    schema: 'hearthgate.cusp-catastrophe-observation/v1',
    model: 'canonical-cusp-potential/v1',
    controls: {
      a,
      b,
      structure: a,
      intention: b,
    },
    control_semantics: semantics,
    order_parameter: x,
    potential: {
      form: 'x^4/4 + a*x^2/2 + b*x',
      equilibrium_equation: 'x^3 + a*x + b = 0',
    },
    fold_polynomial: foldPolynomial,
    cubic_discriminant: cubicDiscriminant,
    regime,
    equilibria,
    selected_equilibrium: selected,
    history: {
      control_b_direction: direction,
      sweep_label: semantics.b.label,
      intention_direction: controlBIsIntention ? direction : null,
      prior_branch: priorSelection?.branch ?? null,
      branch_changed: branchChanged,
      path_dependence_possible: pathDependencePossible,
      branch_transition_candidate: branchChanged && (pathDependencePossible || previous?.history?.path_dependence_possible === true),
    },
    epistemic: {
      observational_model: true,
      physical_claim: false,
      controls_are_domain_semantic: true,
      control_b_is_intention: controlBIsIntention,
      intention_is_premaqc_agency: false,
      legacy_structure_intention_aliases_present: true,
      hysteresis_requires_trace: true,
    },
  });
}

function oppositeDirections(left, right) {
  return (left === 'increasing' && right === 'decreasing')
    || (left === 'decreasing' && right === 'increasing');
}

function observationSweepDirection(observation) {
  return observation?.history?.control_b_direction
    ?? observation?.history?.intention_direction
    ?? 'unknown';
}

/**
 * Detects a hysteresis witness only when two observations revisit approximately
 * the same controls from opposite control-B sweep directions and occupy
 * different stable branches. A single branch jump is not called hysteresis.
 */
export function analyseCuspTrace(observations, {
  controlTolerance = 1e-6,
  stateTolerance = 1e-6,
} = {}) {
  invariant(Array.isArray(observations), 'observations must be an array');
  invariant(Number.isFinite(controlTolerance) && controlTolerance >= 0, 'controlTolerance must be nonnegative');
  invariant(Number.isFinite(stateTolerance) && stateTolerance >= 0, 'stateTolerance must be nonnegative');

  const witnesses = [];
  for (let leftIndex = 0; leftIndex < observations.length; leftIndex += 1) {
    const left = observations[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < observations.length; rightIndex += 1) {
      const right = observations[rightIndex];
      const leftControls = controlPairFromObservation(left);
      const rightControls = controlPairFromObservation(right);
      if (!leftControls || !rightControls) continue;
      if (Math.abs(leftControls.a - rightControls.a) > controlTolerance) continue;
      if (Math.abs(leftControls.b - rightControls.b) > controlTolerance) continue;
      if (!oppositeDirections(observationSweepDirection(left), observationSweepDirection(right))) continue;
      const leftSelected = left.selected_equilibrium;
      const rightSelected = right.selected_equilibrium;
      if (!leftSelected || !rightSelected) continue;
      if (leftSelected.stability !== 'stable' || rightSelected.stability !== 'stable') continue;
      if (leftSelected.branch === rightSelected.branch) continue;
      if (Math.abs(leftSelected.value - rightSelected.value) <= stateTolerance) continue;
      witnesses.push(deepFreeze({
        left_index: leftIndex,
        right_index: rightIndex,
        controls: {
          a: (leftControls.a + rightControls.a) / 2,
          b: (leftControls.b + rightControls.b) / 2,
          structure: (leftControls.a + rightControls.a) / 2,
          intention: (leftControls.b + rightControls.b) / 2,
        },
        control_semantics: left.control_semantics
          ? structuredClone(left.control_semantics)
          : normaliseCuspControlSemantics(),
        left_branch: leftSelected.branch,
        right_branch: rightSelected.branch,
        state_separation: Math.abs(leftSelected.value - rightSelected.value),
      }));
    }
  }

  return deepFreeze({
    schema: 'hearthgate.cusp-hysteresis-trace/v1',
    observation_count: observations.length,
    hysteresis_detected: witnesses.length > 0,
    witnesses,
    epistemic: {
      observational_model: true,
      physical_claim: false,
      requires_opposite_control_b_sweeps: true,
      legacy_intention_sweep_alias_supported: true,
    },
  });
}
