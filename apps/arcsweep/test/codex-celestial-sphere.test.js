import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  CODEX_CELESTIAL_SPHERE_SCHEMA,
  codexCelestialBody,
  createCodexCelestialSphereState,
  equatorialUnitVector,
  projectCelestialVector,
} from '../src/codex/codex-celestial-sphere-model.js';

test('equatorial coordinates become a unit sphere vector', () => {
  const vector = equatorialUnitVector({ rightAscensionDegrees: 90, declinationDegrees: 30 });
  const norm = Math.hypot(vector.x, vector.y, vector.z);
  assert.ok(Math.abs(norm - 1) < 1e-12);
  assert.ok(Math.abs(vector.y - 0.5) < 1e-12);
});

test('orientation projection distinguishes front and back hemispheres', () => {
  const front = projectCelestialVector({ x: 0, y: 0, z: 1 }, { yawDegrees: 0, pitchDegrees: 0 });
  const back = projectCelestialVector({ x: 0, y: 0, z: 1 }, { yawDegrees: 180, pitchDegrees: 0 });
  assert.equal(front.visible, true);
  assert.equal(back.visible, false);
});

test('celestial sphere computes deterministic apparent geocentric solar-system positions', async () => {
  const at = new Date('2000-01-01T12:00:00.000Z');
  const first = await createCodexCelestialSphereState({ at });
  const second = await createCodexCelestialSphereState({ at });

  assert.equal(first.schema, CODEX_CELESTIAL_SPHERE_SCHEMA);
  assert.equal(first.selectedAt, at.toISOString());
  assert.equal(first.bodies.length, 8);
  assert.deepEqual(first, second);
  assert.equal(first.source.networkRequired, false);
  assert.equal(first.catalogue.starsIncluded, false);
  assert.match(first.observer.frame, /geocentric-equatorial/);

  assert.ok(codexCelestialBody(first, 'sun'));
  assert.ok(codexCelestialBody(first, 'mercury'));
  assert.equal(codexCelestialBody(first, 'earth'), null);

  for (const body of first.bodies) {
    assert.ok(Number.isFinite(body.rightAscensionDegrees));
    assert.ok(Number.isFinite(body.declinationDegrees));
    assert.ok(body.rightAscensionDegrees >= 0 && body.rightAscensionDegrees < 360);
    assert.ok(body.declinationDegrees >= -90 && body.declinationDegrees <= 90);
    assert.ok(Math.abs(Math.hypot(body.vector.x, body.vector.y, body.vector.z) - 1) < 2e-6);
  }
});

test('celestial sphere refuses invalid selected time', async () => {
  await assert.rejects(
    () => createCodexCelestialSphereState({ at: 'not-a-date' }),
    /invalid selected time/,
  );
});

test('celestial sidecar redraws only from explicit state or pointer interaction', async () => {
  const sidecar = await readFile(new URL('../src/codex-celestial-sphere-sidecar.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/codex-celestial-sphere.css', import.meta.url), 'utf8');
  const entry = await readFile(new URL('../src/magic-book-physical-acceptance-entry.js', import.meta.url), 'utf8');

  assert.match(sidecar, /codex:celestial-time-change/);
  assert.match(sidecar, /codex:celestial-focus/);
  assert.match(sidecar, /codex:celestial-orientation-change/);
  assert.match(sidecar, /autonomousTime:\s*false/);
  assert.match(sidecar, /autonomousMotion:\s*false/);
  assert.match(sidecar, /starCatalogue:\s*null/);
  assert.doesNotMatch(sidecar, /setInterval\s*\(/);
  assert.doesNotMatch(sidecar, /requestAnimationFrame\s*\(/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(entry, /codex-celestial-sphere-sidecar\.js/);
});
