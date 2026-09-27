import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  CODEX_ASTROLABE_METHOD,
  CODEX_ASTROLABE_READING_SCHEMA,
  approximateSunEquatorial,
  buildCodexAstrolabeReading,
  equatorialToHorizontal,
  greenwichMeanSiderealDegrees,
  julianDate,
  localSiderealDegrees,
} from '../src/codex/codex-astrolabe-model.js';

test('Julian date and Greenwich sidereal angle reproduce the J2000 reference instant', () => {
  const instant = new Date('2000-01-01T12:00:00.000Z');
  assert.equal(julianDate(instant), 2451545);
  assert.ok(Math.abs(greenwichMeanSiderealDegrees(instant) - 280.46061837) < 1e-6);
});

test('local sidereal angle applies east-positive longitude without changing the instant', () => {
  const instant = new Date('2000-01-01T12:00:00.000Z');
  assert.ok(Math.abs(localSiderealDegrees(instant, 15) - 295.46061837) < 1e-6);
  assert.ok(Math.abs(localSiderealDegrees(instant, -30) - 250.46061837) < 1e-6);
});

test('equatorial coordinates become a physically bounded local horizon reading', () => {
  const reading = equatorialToHorizontal({
    rightAscensionDegrees: 0,
    declinationDegrees: 0,
    latitudeDegrees: 45,
    localSiderealDegrees: 0,
  });
  assert.ok(Math.abs(reading.altitudeDegrees - 45) < 1e-9);
  assert.ok(Math.abs(reading.azimuthDegrees - 180) < 1e-9);
  assert.ok(Math.abs(reading.hourAngleDegrees) < 1e-9);
});

test('approximate Sun solution stays inside valid equatorial ranges', () => {
  const sun = approximateSunEquatorial(new Date('2026-09-27T12:00:00.000Z'));
  assert.ok(sun.rightAscensionDegrees >= 0 && sun.rightAscensionDegrees < 360);
  assert.ok(sun.declinationDegrees >= -24 && sun.declinationDegrees <= 24);
  assert.ok(sun.eclipticLongitudeDegrees >= 0 && sun.eclipticLongitudeDegrees < 360);
});

test('Codex astrolabe reading is deterministic, bounded, and explicit about authority', () => {
  const input = {
    at: '2026-09-27T14:00:00.000Z',
    latitudeDegrees: 29.9,
    longitudeDegrees: -81.3,
  };
  const a = buildCodexAstrolabeReading(input);
  const b = buildCodexAstrolabeReading(input);

  assert.deepEqual(a, b);
  assert.equal(a.schema, CODEX_ASTROLABE_READING_SCHEMA);
  assert.equal(a.method, CODEX_ASTROLABE_METHOD);
  assert.ok(a.sun.altitudeDegrees >= -90 && a.sun.altitudeDegrees <= 90);
  assert.ok(a.sun.azimuthDegrees >= 0 && a.sun.azimuthDegrees < 360);
  assert.match(a.authority, /approximate astronomical computation/i);
  assert.match(a.authority, /not a historical-instrument reconstruction/i);
});

test('Astrolabe rejects invalid observer coordinates instead of inventing a reading', () => {
  assert.throws(() => buildCodexAstrolabeReading({
    at: '2026-09-27T14:00:00.000Z',
    latitudeDegrees: 91,
    longitudeDegrees: 0,
  }), /latitude/);
  assert.throws(() => buildCodexAstrolabeReading({
    at: '2026-09-27T14:00:00.000Z',
    latitudeDegrees: 0,
    longitudeDegrees: 181,
  }), /longitude/);
});

test('Astrolabe sidecar requests no location and moves no dial until explicit user action', async () => {
  const source = await readFile(new URL('../src/codex-astrolabe-sidecar.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/codex-astrolabe.css', import.meta.url), 'utf8');

  assert.match(source, /data-codex-astrolabe-position/);
  assert.match(source, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(source, /function useDevicePosition\(\)/);
  assert.doesNotMatch(source, /bootCodexAstrolabe\([^)]*\)[\s\S]*getCurrentPosition\(/);
  assert.match(source, /codex:astrolabe-reading/);
  assert.match(source, /persistsCoordinates: false/);
  assert.match(source, /automaticLocation: false/);
  assert.match(source, /autonomousMotion: false/);
  assert.doesNotMatch(css, /animation\s*:/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
