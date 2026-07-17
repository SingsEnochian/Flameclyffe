import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SIGNAL_SOURCE_ARRAY,
  selectedSources,
  sourceArrayCoverage,
} from '../src/components/signal-well/signalSourceRegistry.js';

const ids = SIGNAL_SOURCE_ARRAY.map((source) => source.id);

test('Signal Well source array covers live, near-live, alert, archive, and local hardware paths', () => {
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('radio-jove-live'));
  assert.ok(ids.includes('e-callisto-global'));
  assert.ok(ids.includes('brams-live-meteor'));
  assert.ok(ids.includes('superdarn-live-hf'));
  assert.ok(ids.includes('noaa-solar-radio-flux'));
  assert.ok(ids.includes('dsn-now'));
  assert.ok(ids.includes('chime-frb-voevents'));
  assert.ok(ids.includes('breakthrough-listen-archive'));
  assert.ok(ids.includes('local-sdr-array'));

  const availability = new Set(SIGNAL_SOURCE_ARRAY.map((source) => source.availability));
  assert.ok(availability.has('live'));
  assert.ok(availability.has('near-live'));
  assert.ok(availability.has('live-alerts'));
  assert.ok(availability.has('archive'));
  assert.ok(availability.has('hardware-adapter'));
});

test('every source is attributable, openable, and declares recording modes', () => {
  for (const source of SIGNAL_SOURCE_ARRAY) {
    assert.ok(source.provider.length > 0, `${source.id} provider`);
    assert.ok(source.officialUrl.length > 0, `${source.id} officialUrl`);
    assert.ok(source.openUrl.length > 0, `${source.id} openUrl`);
    assert.ok(source.families.length > 0, `${source.id} families`);
    assert.ok(source.recordModes.length > 0, `${source.id} recordModes`);
  }
});

test('selection and coverage preserve the requested source order and unique families', () => {
  const chosen = selectedSources(['dsn-now', 'radio-jove-live']);
  assert.deepEqual(chosen.map((source) => source.id), ['radio-jove-live', 'dsn-now']);
  const coverage = sourceArrayCoverage(chosen);
  assert.deepEqual(coverage, [...new Set(coverage)].sort());
  assert.ok(coverage.includes('jovian'));
  assert.ok(coverage.includes('deep-space-telemetry'));
});

test('NOAA source exposes machine-readable endpoints for timed recording', () => {
  const noaa = SIGNAL_SOURCE_ARRAY.find((source) => source.id === 'noaa-solar-radio-flux');
  assert.equal(noaa.availability, 'live-data');
  assert.ok(noaa.dataEndpoints.length >= 2);
  assert.ok(noaa.dataEndpoints.every((endpoint) => endpoint.startsWith('https://services.swpc.noaa.gov/json/')));
  assert.ok(noaa.recordModes.includes('timed-json-series'));
});
