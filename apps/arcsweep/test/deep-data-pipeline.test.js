import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildState, cacheIsFresh } from '../../../scripts/update-deep-observer-data.mjs';

const NOW = new Date('2026-09-02T03:00:00.000Z');

test('DEEP cache builder accepts the current NOAA summary payloads', () => {
  const state = buildState({
    weather: { current: {
      time: '2026-09-01T23:00', pressure_msl: 1016, is_day: 0, cloud_cover: 57,
      precipitation: 0, relative_humidity_2m: 94, wind_speed_10m: 2.6, weather_code: 2,
    } },
    kpRows: [{ Kp: 2, time_tag: '2026-09-02T00:00:00', a_running: 7 }],
    magRows: [{ bt: 4, bz_gsm: -2, time_tag: '2026-09-02T03:00:00Z' }],
    plasmaRows: [{ proton_speed: 380, time_tag: '2026-09-02T03:00:00Z' }],
  }, NOW);

  assert.equal(state.generated_at, NOW.toISOString());
  assert.equal(state.space_weather.solar_wind.bz, -2);
  assert.equal(state.space_weather.solar_wind.bt, 4);
  assert.equal(state.space_weather.solar_wind.speed, 380);
  assert.equal(state.space_weather.solar_wind.density, null);
  for (const axis of ['P', 'C', 'R', 'E', 'M', 'A', 'T', 'H', 'dpdt']) {
    assert.equal(Number.isFinite(state.field[axis]), true, `${axis} should be finite`);
  }
});

test('stale cache retention turns red after six hours', () => {
  assert.equal(cacheIsFresh({ generated_at: '2026-09-01T22:00:00.000Z' }, NOW.getTime()), true);
  assert.equal(cacheIsFresh({ generated_at: '2026-09-01T20:00:00.000Z' }, NOW.getTime()), false);
});

test('standalone DEEP and Vercel publish the shared static field source', async () => {
  const observer = await readFile(new URL('../../../starwell/deep-observer/deep-observer.js', import.meta.url), 'utf8');
  const starwellBridge = await readFile(new URL('../../starwell/src/lib/deepBridge.js', import.meta.url), 'utf8');
  const vite = await readFile(new URL('../../starwell/vite.config.js', import.meta.url), 'utf8');
  const updater = await readFile(new URL('../../../scripts/update-deep-observer-data.mjs', import.meta.url), 'utf8');

  assert.match(observer, /new URL\('\.\.\/\.\.\/data\/deep-current\.json'/);
  assert.match(observer, /data\?\.field/);
  assert.doesNotMatch(observer, /-bridge-pulse/);
  assert.match(starwellBridge, /data\/deep-current\.json/);
  assert.doesNotMatch(starwellBridge, /-bridge-pulse/);
  assert.match(vite, /data\/deep-current\.json/);
  assert.match(updater, /products\/summary\/solar-wind-mag-field\.json/);
  assert.match(updater, /products\/summary\/solar-wind-speed\.json/);
  assert.doesNotMatch(updater, /products\/solar-wind\/(?:mag|plasma)-1-day\.json/);
});
