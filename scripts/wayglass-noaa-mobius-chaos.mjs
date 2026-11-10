// Usage: node scripts/wayglass-noaa-mobius-chaos.mjs --live [--output=artifacts/noaa-mobius-chaos.json]
// Public NOAA observations, no model route or private credentials. Offline tests import the pure module.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  selectNoaaSeries, benchmarkNoaaMemory, NOAA_MOBIUS_BENCHMARK_SCHEMA,
} from '../apps/arcsweep/src/noaa-mobius-chaos-benchmark.js';

if (!process.argv.includes('--live')) {
  console.error('Live NOAA read requires --live; synthetic fixtures belong only in unit tests.');
  process.exitCode = 2;
} else {
  const requestedOutput = process.argv.find(arg => arg.startsWith('--output='));
  const output = requestedOutput ? requestedOutput.slice('--output='.length) : null;
  const sources = [
    { id: 'xray', url: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json' },
    { id: 'wind', url: 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json' },
    { id: 'magnetic', url: 'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json' },
  ];
  const channels = [
    { name: 'goes-long', source: 'xray', field: 'flux', energy: '0.1-0.8nm', log10: true },
    { name: 'goes-short', source: 'xray', field: 'flux', energy: '0.05-0.4nm', log10: true },
    { name: 'wind-speed', source: 'wind', field: 'proton_speed', activeOnly: true },
    { name: 'wind-density', source: 'wind', field: 'proton_density', activeOnly: true, log10: true },
    { name: 'wind-temperature', source: 'wind', field: 'proton_temperature', activeOnly: true, log10: true },
    { name: 'magnetic-total', source: 'magnetic', field: 'bt', activeOnly: true },
    { name: 'magnetic-bz', source: 'magnetic', field: 'bz_gsm', activeOnly: true },
    { name: 'magnetic-by', source: 'magnetic', field: 'by_gsm', activeOnly: true },
  ];
  const datasets = new Map(), captures = [];
  for (const source of sources) {
    const response = await fetch(source.url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw Error('NOAA ' + source.id + ' fetch returned ' + response.status);
    const body = await response.text();
    if (body.length > 12000000) throw Error('NOAA ' + source.id + ' exceeded expected bounded payload');
    const rows = JSON.parse(body);
    if (!Array.isArray(rows) || rows.length < 400) throw Error('NOAA ' + source.id + ' returned insufficient raw records');
    datasets.set(source.id, rows);
    captures.push({ source: source.id, url: source.url, raw_rows: rows.length });
  }
  const results = channels.map(channel => {
    const { name, source, ...selection } = channel;
    const observed = selectNoaaSeries(datasets.get(source), selection);
    const result = benchmarkNoaaMemory(observed);
    return { name, source, observed: {
      field: observed.field, energy: observed.energy, active_only: observed.active_only,
      raw_records: observed.record_count, selected_rows: observed.selected_rows,
      unique_timestamps: observed.unique_timestamps, gaps: observed.cadence_breaks,
      first_at: observed.first_at, last_at: observed.last_at,
      invalid_rows: observed.invalid_rows, duplicate_time_rows: observed.duplicate_time_rows,
    }, benchmark: result };
  });
  const report = {
    schema: 'wayglass.noaa-mobius-live-run/v0.1',
    bench_schema: NOAA_MOBIUS_BENCHMARK_SCHEMA,
    captured_at: new Date().toISOString(),
    classification: { inputs: 'public-NOAA-observed', outputs: 'derived-statistical-hypotheses' },
    capture: captures, channels: results,
    distinction: 'Eight Wayglass operational folds are not equivalent to eight one-minute lag predictors.',
    gate: { live_model_turn: false, canon_commit: false, automatic_branching: false },
  };
  const serialized = JSON.stringify(report, null, 2) + '\n';
  if (output) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, serialized, 'utf8');
  }
  process.stdout.write(serialized);
}
