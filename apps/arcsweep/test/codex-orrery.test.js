import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  CODEX_ORRERY_STATE_SCHEMA,
  codexOrreryBody,
  compressedOrreryRadius,
  createCodexOrreryState,
  heliocentricRectangular,
} from '../src/codex/codex-orrery-model.js';

test('orrery rectangular conversion preserves heliocentric geometry', () => {
  const x = heliocentricRectangular({ lon: 0, lat: 0, range: 2 });
  assert.ok(Math.abs(x.xAU - 2) < 1e-12);
  assert.ok(Math.abs(x.yAU) < 1e-12);
  assert.ok(Math.abs(x.zAU) < 1e-12);

  const y = heliocentricRectangular({ lon: Math.PI / 2, lat: 0, range: 1 });
  assert.ok(Math.abs(y.xAU) < 1e-12);
  assert.ok(Math.abs(y.yAU - 1) < 1e-12);
});

test('display compression is monotonic but remains explicitly separate from physical AU', () => {
  assert.equal(compressedOrreryRadius(0), 0);
  assert.ok(compressedOrreryRadius(0.4) < compressedOrreryRadius(1));
  assert.ok(compressedOrreryRadius(1) < compressedOrreryRadius(5.2));
  assert.ok(compressedOrreryRadius(5.2) < compressedOrreryRadius(30));
  assert.ok(compressedOrreryRadius(30) <= 1);
});

test('orrery computes a deterministic eight-planet heliocentric state from local VSOP87 data', async () => {
  const at = new Date('2000-01-01T12:00:00.000Z');
  const first = await createCodexOrreryState({ at });
  const second = await createCodexOrreryState({ at });

  assert.equal(first.schema, CODEX_ORRERY_STATE_SCHEMA);
  assert.equal(first.selectedAt, at.toISOString());
  assert.equal(first.bodies.length, 8);
  assert.deepEqual(first, second);
  assert.equal(first.source.networkRequired, false);
  assert.match(first.source.theory, /VSOP87/i);

  const earth = codexOrreryBody(first, 'earth');
  const jupiter = codexOrreryBody(first, 'jupiter');
  const neptune = codexOrreryBody(first, 'neptune');
  assert.ok(earth.rangeAU > 0.97 && earth.rangeAU < 1.03);
  assert.ok(jupiter.rangeAU > 4.8 && jupiter.rangeAU < 5.6);
  assert.ok(neptune.rangeAU > 29 && neptune.rangeAU < 31.5);

  for (const body of first.bodies) {
    assert.ok(Number.isFinite(body.longitudeDegrees));
    assert.ok(Number.isFinite(body.latitudeDegrees));
    assert.ok(Number.isFinite(body.rangeAU));
    assert.ok(Number.isFinite(body.xAU));
    assert.ok(Number.isFinite(body.yAU));
    assert.ok(Number.isFinite(body.zAU));
    assert.equal(body.display.scale, 'sqrt-heliocentric-range');
  }
});

test('orrery refuses invalid selected time', async () => {
  await assert.rejects(
    () => createCodexOrreryState({ at: 'not-a-date' }),
    /invalid selected time/,
  );
});

test('orrery sidecar is explicit-time and finite-motion rather than autonomous liveness', async () => {
  const sidecar = await readFile(new URL('../src/codex-orrery-sidecar.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/codex-orrery.css', import.meta.url), 'utf8');
  const entry = await readFile(new URL('../src/magic-book-physical-acceptance-entry.js', import.meta.url), 'utf8');

  assert.match(sidecar, /codex:orrery-time-change/);
  assert.match(sidecar, /codex:orrery-focus/);
  assert.match(sidecar, /autonomousTime:\s*false/);
  assert.match(sidecar, /autonomousMotion:\s*false/);
  assert.doesNotMatch(sidecar, /setInterval\s*\(/);
  assert.doesNotMatch(sidecar, /requestAnimationFrame\s*\(/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(entry, /codex-orrery-sidecar\.js/);
});
