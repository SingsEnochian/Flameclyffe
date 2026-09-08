export const HEIMDALL_FOLDWATCH_SCHEMA = 'arcsweep.heimdall-foldwatch/v1';
export const HEIMDALL_FOLD_STATES = Object.freeze(['CLEAR','APPROACH','FOLD','CROSSING','RELEASE','HYSTERESIS']);

function invariant(condition, message) {
  if (!condition) throw new Error(`HEIMDALL_FOLDWATCH: ${message}`);
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function norm(vector = []) {
  return Math.sqrt(vector.reduce((sum, value) => sum + Number(value || 0) ** 2, 0));
}

function normalise(vector = []) {
  const magnitude = norm(vector);
  return magnitude > 0 ? vector.map((value) => Number(value) / magnitude) : vector.map(() => 0);
}

function dot(a = [], b = []) {
  const length = Math.min(a.length, b.length);
  let total = 0;
  for (let index = 0; index < length; index += 1) total += Number(a[index] || 0) * Number(b[index] || 0);
  return total;
}

function matTranspose(matrix) {
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

function matMul(a, b) {
  const bt = matTranspose(b);
  return a.map((row) => bt.map((column) => dot(row, column)));
}

export function symmetricEigenDecomposition(matrix, { tolerance = 1e-10, maxSweeps = 80 } = {}) {
  invariant(Array.isArray(matrix) && matrix.length > 0, 'matrix is required');
  const n = matrix.length;
  invariant(matrix.every((row) => Array.isArray(row) && row.length === n), 'matrix must be square');
  const a = matrix.map((row) => row.map((value, index) => finite(value, `matrix value ${index}`)));
  const v = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (r === c ? 1 : 0)));

  for (let sweep = 0; sweep < maxSweeps; sweep += 1) {
    let p = 0;
    let q = 1;
    let maximum = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const magnitude = Math.abs(a[i][j]);
        if (magnitude > maximum) { maximum = magnitude; p = i; q = j; }
      }
    }
    if (maximum <= tolerance || n === 1) break;

    const phi = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(phi);
    const s = Math.sin(phi);

    for (let k = 0; k < n; k += 1) {
      if (k === p || k === q) continue;
      const akp = a[k][p];
      const akq = a[k][q];
      a[k][p] = a[p][k] = c * akp - s * akq;
      a[k][q] = a[q][k] = s * akp + c * akq;
    }

    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];
    a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][q] = a[q][p] = 0;

    for (let k = 0; k < n; k += 1) {
      const vkp = v[k][p];
      const vkq = v[k][q];
      v[k][p] = c * vkp - s * vkq;
      v[k][q] = s * vkp + c * vkq;
    }
  }

  const pairs = Array.from({ length: n }, (_, index) => ({
    value: a[index][index],
    vector: normalise(v.map((row) => row[index])),
  })).sort((left, right) => left.value - right.value);

  return Object.freeze({
    values: Object.freeze(pairs.map((pair) => pair.value)),
    vectors: Object.freeze(pairs.map((pair) => Object.freeze(pair.vector))),
  });
}

export function singularGeometry(jacobian) {
  invariant(Array.isArray(jacobian) && jacobian.length > 0, 'jacobian is required');
  const rows = jacobian.length;
  const columns = jacobian[0]?.length || 0;
  invariant(columns > 0 && jacobian.every((row) => Array.isArray(row) && row.length === columns), 'jacobian must be rectangular');
  const jt = matTranspose(jacobian);
  const gram = matMul(jt, jacobian);
  const eigen = symmetricEigenDecomposition(gram);
  const singularValues = eigen.values.map((value) => Math.sqrt(Math.max(0, value)));
  const sigmaMin = singularValues[0] ?? 0;
  const sigmaMax = singularValues[singularValues.length - 1] ?? 0;
  return Object.freeze({
    sigma_min: sigmaMin,
    sigma_max: sigmaMax,
    singular_values: Object.freeze(singularValues),
    condition_number: sigmaMin > 1e-12 ? sigmaMax / sigmaMin : Number.POSITIVE_INFINITY,
    soft_direction: Object.freeze(eigen.vectors[0] || Array(columns).fill(0)),
    rows,
    columns,
  });
}

export function estimateJacobian(vectorField, state, { epsilon = 1e-5, parameters = null } = {}) {
  invariant(typeof vectorField === 'function', 'vectorField must be a function');
  invariant(Array.isArray(state) && state.length > 0, 'state vector is required');
  const x = state.map((value, index) => finite(value, `state[${index}]`));
  const h = Math.abs(finite(epsilon, 'epsilon')) || 1e-5;
  const base = vectorField(x, parameters);
  invariant(Array.isArray(base) && base.length > 0, 'vectorField must return a vector');
  const outputSize = base.length;
  const jacobian = Array.from({ length: outputSize }, () => Array(x.length).fill(0));
  for (let column = 0; column < x.length; column += 1) {
    const plus = [...x];
    const minus = [...x];
    plus[column] += h;
    minus[column] -= h;
    const fp = vectorField(plus, parameters);
    const fm = vectorField(minus, parameters);
    invariant(Array.isArray(fp) && Array.isArray(fm) && fp.length === outputSize && fm.length === outputSize, 'vectorField output dimension changed');
    for (let row = 0; row < outputSize; row += 1) jacobian[row][column] = (finite(fp[row], 'field+') - finite(fm[row], 'field-')) / (2 * h);
  }
  return Object.freeze(jacobian.map((row) => Object.freeze(row)));
}

export function alignedSoftDirection(current = [], previous = []) {
  if (!previous?.length || current.length !== previous.length) return Object.freeze(normalise(current));
  const candidate = normalise(current);
  return Object.freeze(dot(candidate, previous) < 0 ? candidate.map((value) => -value) : candidate);
}

function vectorAlignment(a = [], b = []) {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  return Math.abs(dot(normalise(a), normalise(b)));
}

function curvatureFromDirections(history = []) {
  if (history.length < 3) return 0;
  const a = normalise(history[history.length - 3].soft_direction || []);
  const b = normalise(history[history.length - 2].soft_direction || []);
  const c = normalise(history[history.length - 1].soft_direction || []);
  if (!a.length || a.length !== b.length || b.length !== c.length) return 0;
  const turn1 = Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
  const turn2 = Math.acos(Math.max(-1, Math.min(1, dot(b, c))));
  return clamp01(Math.abs(turn2 - turn1) / Math.PI + Math.max(turn1, turn2) / Math.PI);
}

export function relationalParticipation(softDirection = [], relationalIndices = []) {
  const direction = normalise(softDirection);
  if (!direction.length) return null;
  const indices = new Set((relationalIndices || []).map((index) => Number(index)).filter((index) => Number.isInteger(index) && index >= 0 && index < direction.length));
  if (!indices.size) return null;
  let relation = 0;
  direction.forEach((value, index) => { if (indices.has(index)) relation += value ** 2; });
  return clamp01(relation);
}

export function classifyFoldState({ previousState = 'CLEAR', rankLoss = 0, softening = 0, curvature = 0, persistence = 0, recovering = false, branchChanged = false } = {}) {
  const score = clamp01(0.36 * rankLoss + 0.22 * softening + 0.18 * persistence + 0.24 * curvature);
  const prior = HEIMDALL_FOLD_STATES.includes(previousState) ? previousState : 'CLEAR';
  if (prior === 'CROSSING' && !recovering) return Object.freeze({ state: 'HYSTERESIS', score });
  if ((prior === 'FOLD' || prior === 'APPROACH') && branchChanged) return Object.freeze({ state: 'CROSSING', score });
  if ((prior === 'FOLD' || prior === 'CROSSING' || prior === 'HYSTERESIS') && recovering && rankLoss < 0.5) return Object.freeze({ state: 'RELEASE', score });
  if (rankLoss >= 0.88 && persistence >= 0.45 && curvature >= 0.12) return Object.freeze({ state: 'FOLD', score });
  if (rankLoss >= 0.58 || (softening >= 0.55 && persistence >= 0.25)) return Object.freeze({ state: 'APPROACH', score });
  if (prior === 'RELEASE' && rankLoss < 0.3) return Object.freeze({ state: 'CLEAR', score });
  return Object.freeze({ state: rankLoss < 0.38 ? 'CLEAR' : prior, score });
}

export function createFoldTelemetry({
  t = 0,
  jacobian,
  history = [],
  previousState = 'CLEAR',
  relationalIndices = [],
  branchId = null,
  previousBranchId = null,
  rankScale = 0.12,
} = {}) {
  const geometry = singularGeometry(jacobian);
  const previous = history[history.length - 1] || null;
  const softDirection = alignedSoftDirection(geometry.soft_direction, previous?.soft_direction || []);
  const sigmaRatio = geometry.sigma_max > 0 ? geometry.sigma_min / geometry.sigma_max : 0;
  const rankLoss = clamp01(1 - sigmaRatio / Math.max(1e-9, rankScale));
  const previousSigma = Number(previous?.sigma_min);
  const deltaSigma = Number.isFinite(previousSigma) ? geometry.sigma_min - previousSigma : 0;
  const softening = clamp01(-deltaSigma / Math.max(1e-9, geometry.sigma_max || 1));
  const recovering = deltaSigma > 0;
  const persistence = previous ? vectorAlignment(softDirection, previous.soft_direction || []) : 0;
  const provisional = [...history.slice(-2), { soft_direction: softDirection }];
  const curvature = curvatureFromDirections(provisional);
  const branchChanged = branchId != null && previousBranchId != null && branchId !== previousBranchId;
  const classification = classifyFoldState({ previousState, rankLoss, softening, curvature, persistence, recovering, branchChanged });
  const pU = relationalParticipation(softDirection, relationalIndices);

  return Object.freeze({
    schema: HEIMDALL_FOLDWATCH_SCHEMA,
    t: finite(t, 't'),
    sigma_min: geometry.sigma_min,
    sigma_max: geometry.sigma_max,
    singular_values: geometry.singular_values,
    condition_number: geometry.condition_number,
    soft_direction: softDirection,
    rank_loss_score: rankLoss,
    softening_score: softening,
    soft_persistence: persistence,
    curvature,
    relational_participation: pU,
    relational_participation_status: pU == null ? 'unavailable' : 'measured',
    branch_id: branchId,
    branch_changed: branchChanged,
    state: classification.state,
    fold_score: classification.score,
  });
}

export function saddleNodeSample({ x, mu = 0, t = 0, history = [], previousState = 'CLEAR' } = {}) {
  const state = finite(x, 'x');
  const control = finite(mu, 'mu');
  const jacobian = Object.freeze([Object.freeze([-2 * state])]);
  const branchId = state < 0 ? 'negative' : state > 0 ? 'positive' : 'fold';
  const previousBranchId = history[history.length - 1]?.branch_id ?? null;
  const telemetry = createFoldTelemetry({ t, jacobian, history, previousState, branchId, previousBranchId, rankScale: 0.2 });
  return Object.freeze({
    ...telemetry,
    proving_chamber: Object.freeze({ equation: "x' = mu - x^2", x: state, mu: control, equilibrium_residual: control - state ** 2 }),
  });
}

export function buildSwarmFoldPrompt(telemetry, { question = 'Interpret this fold geometry and propose the next instrument action.' } = {}) {
  invariant(telemetry?.schema === HEIMDALL_FOLDWATCH_SCHEMA, 'Foldwatch telemetry is required');
  const compact = {
    state: telemetry.state,
    fold_score: Number(telemetry.fold_score.toFixed(4)),
    sigma_min: Number(telemetry.sigma_min.toFixed(8)),
    sigma_max: Number(telemetry.sigma_max.toFixed(8)),
    rank_loss: Number(telemetry.rank_loss_score.toFixed(4)),
    softening: Number(telemetry.softening_score.toFixed(4)),
    persistence: Number(telemetry.soft_persistence.toFixed(4)),
    curvature: Number(telemetry.curvature.toFixed(4)),
    p_U: telemetry.relational_participation == null ? null : Number(telemetry.relational_participation.toFixed(4)),
    p_U_status: telemetry.relational_participation_status,
    soft_direction: telemetry.soft_direction.map((value) => Number(value.toFixed(4))),
    branch_id: telemetry.branch_id,
  };
  return `Heimdall Foldwatch telemetry\n${JSON.stringify(compact, null, 2)}\n\n${String(question).trim()}\n\nSeparate measured geometry from interpretation. Do not promote a fold candidate to a Crossing without continuation evidence.`;
}
