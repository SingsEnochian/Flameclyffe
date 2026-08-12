const DEFAULT_EPSILON = 1e-10;
const TWO_PI = Math.PI * 2;

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

function cubeRoot(value) {
  return Math.cbrt ? Math.cbrt(value) : Math.sign(value) * Math.abs(value) ** (1 / 3);
}

function uniqueSorted(values, epsilon) {
  return values
    .filter(Number.isFinite)
    .sort((left, right) => left - right)
    .filter((value, index, all) => index === 0 || Math.abs(value - all[index - 1]) > epsilon);
}

function depressedCubicRoots(structure, intention, epsilon) {
  const p = structure;
  const q = intention;
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

function classifyEquilibria(roots, structure, epsilon) {
  const lastIndex = roots.length - 1;
  return roots.map((value, index) => {
    const curvature = 3 * value ** 2 + structure;
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

function previousControls(previous) {
  if (!previous || typeof previous !== 'object') return null;
  const controls = previous.controls || previous;
  const structure = Number(controls.structure);
  const intention = Number(controls.intention);
  return Number.isFinite(structure) && Number.isFinite(intention) ? { structure, intention } : null;
}

function previousSelection(previous) {
  if (!previous || typeof previous !== 'object') return null;
  const selected = previous.selected_equilibrium || previous.selectedEquilibrium;
  if (!selected || typeof selected !== 'object') return null;
  const value = Number(selected.value);
  return Number.isFinite(value) ? { ...selected, value } : null;
}

function intentionDirection(currentIntention, previous) {
  const controls = previousControls(previous);
  if (!controls) return 'unknown';
  if (currentIntention > controls.intention) return 'increasing';
  if (currentIntention < controls.intention) return 'decreasing';
  return 'stationary';
}

function classifyRegime(foldPolynomial, structure, intention, epsilon) {
  if (Math.abs(structure) <= epsilon && Math.abs(intention) <= epsilon) return 'cusp-point';
  if (Math.abs(foldPolynomial) <= epsilon) return 'fold-boundary';
  if (foldPolynomial < 0) return 'multistable';
  return 'single-stable';
}

/**
 * Canonical cusp normal form.
 *
 * Potential: V(x) = x^4/4 + structure*x^2/2 + intention*x
 * Equilibria: x^3 + structure*x + intention = 0
 * Fold locus: 4*structure^3 + 27*intention^2 = 0
 *
 * `intention` is a control parameter, not PREMAQC Agency. `structure` is the
 * second independent control required by the generic cusp. The result is a
 * model observation and carries no physical-causality claim.
 */
export function analyseCuspCatastrophe({
  structure,
  intention,
  orderParameter = null,
  previous = null,
  epsilon = DEFAULT_EPSILON,
} = {}) {
  const a = finite(structure, 'structure');
  const b = finite(intention, 'intention');
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
  const direction = intentionDirection(b, previous);
  const priorSelection = previousSelection(previous);
  const branchChanged = Boolean(selected && priorSelection && selected.branch !== priorSelection.branch);
  const pathDependencePossible = regime === 'multistable' || regime === 'fold-boundary';

  return deepFreeze({
    schema: 'hearthgate.cusp-catastrophe-observation/v1',
    model: 'canonical-cusp-potential/v1',
    controls: { structure: a, intention: b },
    order_parameter: x,
    potential: {
      form: 'x^4/4 + structure*x^2/2 + intention*x',
      equilibrium_equation: 'x^3 + structure*x + intention = 0',
    },
    fold_polynomial: foldPolynomial,
    cubic_discriminant: cubicDiscriminant,
    regime,
    equilibria,
    selected_equilibrium: selected,
    history: {
      intention_direction: direction,
      prior_branch: priorSelection?.branch ?? null,
      branch_changed: branchChanged,
      path_dependence_possible: pathDependencePossible,
      branch_transition_candidate: branchChanged && (pathDependencePossible || previous?.history?.path_dependence_possible === true),
    },
    epistemic: {
      observational_model: true,
      physical_claim: false,
      intention_is_premaqc_agency: false,
      hysteresis_requires_trace: true,
    },
  });
}

function oppositeDirections(left, right) {
  return (left === 'increasing' && right === 'decreasing')
    || (left === 'decreasing' && right === 'increasing');
}

/**
 * Detects a hysteresis witness only when two observations revisit approximately
 * the same controls from opposite intention sweep directions and occupy
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
      if (!left?.controls || !right?.controls) continue;
      if (Math.abs(left.controls.structure - right.controls.structure) > controlTolerance) continue;
      if (Math.abs(left.controls.intention - right.controls.intention) > controlTolerance) continue;
      if (!oppositeDirections(left.history?.intention_direction, right.history?.intention_direction)) continue;
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
          structure: (left.controls.structure + right.controls.structure) / 2,
          intention: (left.controls.intention + right.controls.intention) / 2,
        },
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
      requires_opposite_sweeps: true,
    },
  });
}
