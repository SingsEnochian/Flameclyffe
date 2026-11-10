import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NOAA_LIVE_SCHEMA,formatNoaaReading} from '../src/noaa-observer-panel.js';

test('live NOAA packets remain observed external measurements rather than symbolic projection',()=>{
  assert.equal(NOAA_LIVE_SCHEMA,'wayglass.noaa-live-snapshot/v1');
  assert.deepEqual(formatNoaaReading({
    metric_key:'solar_wind_bz_gsm_nt',value:-3.25,unit:'nT',
    freshness:'fresh',measured_at:'2026-11-07T07:10:00Z',source_url:'https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json',
  }).name,'Magnetic Bz (GSM)');
  assert.equal(formatNoaaReading({metric_key:'soul_prediction',value:42}),null);
  assert.equal(formatNoaaReading({metric_key:'planetary_kp',value:NaN}),null);
});

test('Living Observer mounts NOAA live panel and disposes periodic network work',()=>{
  const source=readFileSync(new URL('../src/surfaces/living-observer.js',import.meta.url),'utf8');
  assert.match(source,/mountNoaaObserverPanel\(root\)/);
  assert.match(source,/disposeNoaa\(\)/);
  const panel=readFileSync(new URL('../src/noaa-observer-panel.js',import.meta.url),'utf8');
  assert.match(panel,/House Steward sign-in/);
  assert.match(panel,/AbortController/);
  assert.match(panel,/globalThis\.clearInterval/);
  assert.doesNotMatch(panel,/localStorage|sessionStorage|model_turn\s*:\s*true/);
});
