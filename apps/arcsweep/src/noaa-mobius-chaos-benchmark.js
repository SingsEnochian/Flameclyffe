// Wayglass Möbius/chaos pilot: observed NOAA telemetry -> falsifiable lag baselines.
// This measures prediction utility; eightfold architectural folds are NOT eight-minute lags.
export const NOAA_MOBIUS_BENCHMARK_SCHEMA = 'wayglass.noaa-mobius-benchmark/v0.1';
export const DEFAULT_LAGS = Object.freeze([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16]);
export const CHRONOLOGICAL_FOLDS = Object.freeze([[0.50, 0.60], [0.65, 0.75], [0.80, 0.90]]);

function insist(condition, message) {
  if (!condition) throw new Error('NOAA_MOBIUS: ' + message);
}

function utcMillis(input) {
  if (typeof input !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z?$/.test(input)) return null;
  const time = Date.parse(input.endsWith('Z') ? input : input + 'Z');
  return Number.isFinite(time) ? time : null;
}

export function selectNoaaSeries(rows, { field, energy = null, activeOnly = false, log10 = false } = {}) {
  insist(Array.isArray(rows), 'raw records must be an array');
  insist(typeof field === 'string' && /^[a-z][a-z0-9_]*$/.test(field), 'field must be a NOAA numeric key');
  const latestByTime = new Map();
  let accepted = 0, invalid = 0, filtered = 0, collisions = 0;
  for (const row of rows) {
    if (!row || typeof row !== 'object') { invalid++; continue; }
    if (energy !== null && row.energy !== energy) { filtered++; continue; }
    if (activeOnly && row.active !== true) { filtered++; continue; }
    const time = utcMillis(row.time_tag), value = row[field];
    if (time === null || typeof value !== 'number' || !Number.isFinite(value) ||
        (log10 && value <= 0)) { invalid++; continue; }
    accepted++;
    if (latestByTime.has(time)) collisions++;
    latestByTime.set(time, { time, value });
  }
  const points = [...latestByTime.values()].sort((a, b) => a.time - b.time);
  let gaps = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].time - points[i - 1].time !== 60000) gaps++;
  }
  return {
    schema: 'wayglass.noaa-observed-series/v0.1',
    field, energy, active_only: activeOnly, log10,
    record_count: rows.length, selected_rows: accepted, filtered_rows: filtered,
    invalid_rows: invalid, duplicate_time_rows: collisions,
    unique_timestamps: points.length, cadence_breaks: gaps,
    first_at: points.length ? new Date(points[0].time).toISOString() : null,
    last_at: points.length ? new Date(points[points.length - 1].time).toISOString() : null,
    points,
  };
}

export function mobiusOrientationAfterTraversals(traversals) {
  insist(Number.isSafeInteger(traversals) && traversals >= 0, 'traversals must be a nonnegative integer');
  return traversals % 2 === 0 ? 1 : -1;
}

function linearSolve(coefficients, rhs) {
  const n = rhs.length, a = coefficients.map((row, i) => [...row, rhs[i]]);
  for (let k = 0; k < n; k++) {
    let pivot = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(a[i][k]) > Math.abs(a[pivot][k])) pivot = i;
    [a[k], a[pivot]] = [a[pivot], a[k]];
    if (!Number.isFinite(a[k][k]) || Math.abs(a[k][k]) < 1e-14) return null;
    const factor = a[k][k];
    for (let j = k; j <= n; j++) a[k][j] /= factor;
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const ratio = a[i][k];
      for (let j = k; j <= n; j++) a[i][j] -= ratio * a[k][j];
    }
  }
  return a.map(row => row[n]);
}

function fitRidge(changes, count, lag, maxLag, validAt, penalty) {
  const training = [];
  for (let t = maxLag + 1; t < count; t++) if (validAt[t]) training.push(t);
  if (training.length < 100) return null;
  const mean = training.reduce((s, t) => s + changes[t], 0) / training.length;
  const variance = training.reduce((s, t) => s + (changes[t] - mean) ** 2, 0) / training.length;
  const sigma = Math.max(1e-12, Math.sqrt(variance));
  const dimension = lag + 1;
  const mat = Array.from({ length: dimension }, () => Array(dimension).fill(0));
  const rhs = Array(dimension).fill(0);
  for (const t of training) {
    const target = (changes[t] - mean) / sigma;
    const feature = [1];
    for (let j = 1; j <= lag; j++) feature.push((changes[t - j] - mean) / sigma);
    for (let i = 0; i < dimension; i++) {
      rhs[i] += feature[i] * target;
      for (let j = 0; j < dimension; j++) mat[i][j] += feature[i] * feature[j];
    }
  }
  for (let i = 0; i < dimension; i++) {
    rhs[i] /= training.length;
    for (let j = 0; j < dimension; j++) mat[i][j] /= training.length;
    if (i > 0) mat[i][i] += penalty;
  }
  const weights = linearSolve(mat, rhs);
  return weights ? { weights, mean, sigma } : null;
}

export function benchmarkNoaaMemory(series, {
  lags = DEFAULT_LAGS, folds = CHRONOLOGICAL_FOLDS, ridge = 0.001,
} = {}) {
  insist(series?.schema === 'wayglass.noaa-observed-series/v0.1', 'an observed NOAA series is required');
  insist(Array.isArray(lags) && lags.length >= 2 &&
    lags.every(n => Number.isSafeInteger(n) && n >= 1 && n <= 64) &&
    new Set(lags).size === lags.length, 'two or more unique lag candidates are required');
  insist(Number.isFinite(ridge) && ridge > 0, 'positive ridge penalty is required');
  insist(Array.isArray(folds) && folds.length > 0 &&
    folds.every(([a, b]) => a >= 0.4 && b > a && b <= 1), 'forward chronological validation folds required');
  const maxLag = Math.max(...lags), points = series.points;
  insist(points.length >= Math.max(500, maxLag + 200), 'insufficient observed minutes');
  const changes = points.map((item, i) => {
    if (i === 0 || item.time - points[i - 1].time !== 60000) return NaN;
    const v = series.log10 ? Math.log10(item.value) - Math.log10(points[i - 1].value)
      : item.value - points[i - 1].value;
    return Number.isFinite(v) ? v : NaN;
  });
  const validAt = changes.map((value, t) => {
    if (t <= maxLag || !Number.isFinite(value)) return false;
    for (let j = 1; j <= maxLag; j++) if (!Number.isFinite(changes[t - j])) return false;
    return true;
  });
  let baselineError = 0, baselineN = 0;
  for (const [start, end] of folds) {
    for (let t = Math.floor(points.length * start); t < Math.floor(points.length * end); t++) {
      if (!validAt[t]) continue;
      baselineError += changes[t] ** 2; baselineN++;
    }
  }
  insist(baselineN > 0, 'no gap-free held-out observations');
  const results = lags.map(lag => {
    let squareError = 0, validated = 0;
    for (const [start, end] of folds) {
      const trainEnd = Math.floor(points.length * start);
      const model = fitRidge(changes, trainEnd, lag, maxLag, validAt, ridge);
      insist(model, 'insufficient uninterrupted training window');
      for (let t = trainEnd; t < Math.floor(points.length * end); t++) {
        if (!validAt[t]) continue;
        let estimate = model.weights[0];
        for (let j = 1; j <= lag; j++) {
          estimate += model.weights[j] * (changes[t - j] - model.mean) / model.sigma;
        }
        const residual = changes[t] - (estimate * model.sigma + model.mean);
        squareError += residual ** 2;
        validated++;
      }
    }
    insist(validated === baselineN, 'validation support must remain equal across lag lengths');
    return { lag, rmse: Math.sqrt(squareError / validated), validated };
  });
  const ranked = [...results].sort((a, b) => a.rmse - b.rmse);
  return {
    schema: NOAA_MOBIUS_BENCHMARK_SCHEMA,
    classification: 'observed-input-derived-model-comparison',
    lens: 'chronological ridge autoregression of one-minute changes; NOT an eightfold topology test',
    sample_count: points.length, continuous_holdout_samples: baselineN,
    max_lag: maxLag, ridge, folds,
    baseline_zero_change_rmse: Math.sqrt(baselineError / baselineN),
    scores: results, ranked_lags: ranked.map(entry => entry.lag),
    best_lag: ranked[0].lag, eight_rank: ranked.findIndex(entry => entry.lag === 8) + 1 || null,
    authority: { no_canon_promotion: true, no_participant_inference: true, no_physical_causality_claim: true },
  };
}
