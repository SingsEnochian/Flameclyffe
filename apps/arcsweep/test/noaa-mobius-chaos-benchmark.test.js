import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectNoaaSeries, benchmarkNoaaMemory, mobiusOrientationAfterTraversals,
  DEFAULT_LAGS, NOAA_MOBIUS_BENCHMARK_SCHEMA,
} from '../src/noaa-mobius-chaos-benchmark.js';

test('Möbius orientation reverses after one traversal and restores after two, independently of clock lag', () => {
  assert.equal(mobiusOrientationAfterTraversals(0), 1);
  assert.equal(mobiusOrientationAfterTraversals(1), -1);
  assert.equal(mobiusOrientationAfterTraversals(2), 1);
  assert.equal(mobiusOrientationAfterTraversals(7), -1);
  assert.equal(mobiusOrientationAfterTraversals(8), 1);
  assert.throws(() => mobiusOrientationAfterTraversals(-1), /nonnegative/);
  assert.throws(() => mobiusOrientationAfterTraversals(1.2), /nonnegative/);
});

test('instrument selection respects channel, active flag, UTC, invalid entries, and gaps', () => {
  const rows = [
    { time_tag: '2026-11-07T06:00:00Z', energy: '0.1-0.8nm', active: true, flux: 2e-7 },
    { time_tag: '2026-11-07T06:00:00', energy: '0.05-0.4nm', active: true, flux: 1e-8 },
    { time_tag: '2026-11-07T06:01:00', energy: '0.1-0.8nm', active: false, flux: 3e-7 },
    { time_tag: '2026-11-07T06:02:00', energy: '0.1-0.8nm', active: true, flux: 4e-7 },
    { time_tag: 'not-a-timestamp', energy: '0.1-0.8nm', active: true, flux: 3e-7 },
    { time_tag: '2026-11-07T06:02:00', energy: '0.1-0.8nm', active: true, flux: 4e-7 },
  ];
  const selected = selectNoaaSeries(rows, { field: 'flux', energy: '0.1-0.8nm', activeOnly: true, log10: true });
  assert.equal(selected.selected_rows, 3);
  assert.equal(selected.unique_timestamps, 2);
  assert.equal(selected.duplicate_time_rows, 1);
  assert.equal(selected.cadence_breaks, 1);
  assert.equal(selected.first_at, '2026-11-07T06:00:00.000Z');
  assert.equal(selected.invalid_rows, 1);
  assert.equal(selected.filtered_rows, 2);
  assert.throws(() => selectNoaaSeries([], { field: 'flux;drop' }), /numeric key/);
});

test('benchmarks require actual numeric time series; no synthetic or empty feed may be treated as observed', () => {
  const empty = selectNoaaSeries([], { field: 'flux' });
  assert.throws(() => benchmarkNoaaMemory(empty), /insufficient observed/);
  assert.throws(() => benchmarkNoaaMemory({ points: Array(1000).fill({time:0,value:1}) }), /observed NOAA/);
});

test('chronological folds use the same held-out minutes for every lag, without selecting eight by construction', () => {
  const origin = Date.parse('2026-11-01T00:00:00Z');
  let seed = 725361;
  const rows = Array.from({ length: 1240 }, (_, i) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const jitter = ((seed / 4294967296) - 0.5) * 0.04;
    const value = 7.5 + Math.sin(i * 2 * Math.PI / 7) * 0.3 + Math.sin(i * 2 * Math.PI / 19) * 0.2 + jitter;
    return { time_tag: new Date(origin + i * 60000).toISOString(), active: true, bt: value };
  });
  const series = selectNoaaSeries(rows, { field: 'bt', activeOnly: true });
  const a = benchmarkNoaaMemory(series), b = benchmarkNoaaMemory(series);
  assert.equal(a.schema, NOAA_MOBIUS_BENCHMARK_SCHEMA);
  assert.deepEqual(a, b);
  assert.deepEqual(a.scores.map(r => r.lag), DEFAULT_LAGS);
  assert.equal(a.scores.length, 11);
  assert.ok(a.scores.every(r => r.validated === a.continuous_holdout_samples));
  assert.ok(a.scores.every(r => Number.isFinite(r.rmse) && r.rmse >= 0));
  assert.ok(a.eight_rank >= 1 && a.eight_rank <= DEFAULT_LAGS.length);
  assert.equal(a.authority.no_canon_promotion, true);
});

test('missing minutes exclude cross-gap validation instead of hallucinating continuity', () => {
  const origin = Date.parse('2026-11-01T00:00:00Z');
  const rows = Array.from({ length: 1000 }, (_, i) => ({
    time_tag: new Date(origin + (i >= 520 ? i + 5 : i) * 60000).toISOString(),
    active: true, bz_gsm: Math.sin(i / 12),
  }));
  const series = selectNoaaSeries(rows, { field: 'bz_gsm', activeOnly: true });
  assert.equal(series.cadence_breaks, 1);
  const b = benchmarkNoaaMemory(series);
  assert.ok(b.continuous_holdout_samples < 300);
  assert.ok(b.scores.every(r => r.validated === b.continuous_holdout_samples));
});
