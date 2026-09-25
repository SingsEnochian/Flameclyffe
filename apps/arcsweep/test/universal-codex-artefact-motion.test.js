import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  ARTEFACT_EFFECTS,
  artefactEffectForReceipt,
  artefactMotionDuration,
  liquidInkSample,
  shouldRunArtefactFrame,
  sigilSegments,
} from '../src/universal-codex-artefact-motion-model.js';

test('artefact receipt mapping gives ink, page turns, memory, and revelation different motion families', () => {
  assert.equal(artefactEffectForReceipt({ kind: 'glyph-stroke' }).id, ARTEFACT_EFFECTS.liquidInk.id);
  assert.equal(artefactEffectForReceipt({ kind: 'page-turn' }).id, ARTEFACT_EFFECTS.pageWake.id);
  assert.equal(artefactEffectForReceipt({ kind: 'growth-memory' }).id, ARTEFACT_EFFECTS.traceThread.id);
  assert.equal(artefactEffectForReceipt({ kind: 'ancestry-read' }).id, ARTEFACT_EFFECTS.glyphBloom.id);
  assert.equal(artefactEffectForReceipt({ kind: 'ordinary-control' }).id, ARTEFACT_EFFECTS.edgeGlint.id);
});

test('liquid ink responds to pressure and remains finite', () => {
  const light = liquidInkSample({ x: 0.2, y: 0.7, pressure: 0.1, velocity: 30, seed: 'same' });
  const heavy = liquidInkSample({ x: 0.2, y: 0.7, pressure: 0.9, velocity: 30, seed: 'same' });
  assert.equal(light.x, 0.2);
  assert.equal(light.y, 0.7);
  assert.ok(heavy.radius > light.radius);
  assert.ok(heavy.opacity > light.opacity);
  assert.ok(heavy.lifeMs > light.lifeMs);
  assert.ok(heavy.lifeMs < 2000);
});

test('sigils are deterministic geometry rather than random decorations', () => {
  const a = sigilSegments('trace:alpha', 8);
  const b = sigilSegments('trace:alpha', 8);
  const c = sigilSegments('trace:beta', 8);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(a.length, 8);
});

test('every artefact motion terminates and reduced motion collapses duration to zero', () => {
  for (const effect of Object.values(ARTEFACT_EFFECTS)) {
    assert.ok(artefactMotionDuration(effect) > 0);
    assert.ok(artefactMotionDuration(effect) <= 2600);
    assert.equal(artefactMotionDuration(effect, true), 0);
  }
});

test('render loop sleeps when no ink, effect, or active gesture remains', () => {
  assert.equal(shouldRunArtefactFrame(), false);
  assert.equal(shouldRunArtefactFrame({ effects: 1 }), true);
  assert.equal(shouldRunArtefactFrame({ ink: 1 }), true);
  assert.equal(shouldRunArtefactFrame({ pointerActive: true }), true);
});

test('runtime mounts one artefact sidecar and motion source contains no perpetual CSS animation contract', async () => {
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  const sidecar = await readFile(new URL('../src/universal-codex-artefact-motion-sidecar.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/universal-codex-artefact-motion.css', import.meta.url), 'utf8');
  assert.match(bootstrap, /universal-codex-artefact-motion-sidecar\.js/);
  assert.match(sidecar, /requestAnimationFrame/);
  assert.match(sidecar, /shouldRunArtefactFrame/);
  assert.match(sidecar, /prefers-reduced-motion/);
  assert.match(sidecar, /traceThread/);
  assert.match(sidecar, /glyphBloom/);
  assert.doesNotMatch(css, /animation\s*:[^;]*infinite/i);
  assert.doesNotMatch(sidecar, /setInterval\s*\(/);
});
