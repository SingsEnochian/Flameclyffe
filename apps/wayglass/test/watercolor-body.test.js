import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWatercolorBody, createStrokeFilter, stampAmount, BODY_FORMS } from '../src/watercolor-body.js';
import { createWatercolorFluid } from '../src/watercolor-fluid.js';

const run = (body, seconds, fps = 60) => { let out; for (let i = 0; i < seconds * fps; i++) out = body.step(1 / fps); return out; };

test('weight: a heavier body follows the same touch more slowly', () => {
  const light = createWatercolorBody({ mass: 0.8, homeStiffness: 1e-6 });
  const heavy = createWatercolorBody({ mass: 3.2, homeStiffness: 1e-6 });
  for (const b of [light, heavy]) b.touch({ x: 0.9, y: 0.5, pressure: 1 });
  const l = run(light, 0.15); const h = run(heavy, 0.15);
  assert.ok(l.x > h.x, `light ${l.x.toFixed(3)} should lead heavy ${h.x.toFixed(3)}`);
});

test('water, not a cursor: she overshoots slightly, then settles where she was drawn', () => {
  const b = createWatercolorBody({ homeStiffness: 1e-6 });
  b.touch({ x: 0.85, y: 0.5, pressure: 1 });
  let max = 0; for (let i = 0; i < 180; i++) max = Math.max(max, b.step(1 / 60).x);
  assert.ok(max > 0.85, 'a little overshoot, like water');
  assert.ok(max < 0.95, 'but bounded');
  assert.ok(Math.abs(run(b, 3).x - 0.85) < 0.01, 'and she settles');
});

test('momentum: released mid-motion she carries on, then comes to rest', () => {
  const b = createWatercolorBody({ homeStiffness: 1e-6 });
  b.touch({ x: 0.9, y: 0.5, pressure: 1 });
  run(b, 0.1);
  const at = b.snapshot().x; b.release();
  const later = run(b, 0.2);
  assert.ok(later.x > at, 'momentum carries on after release');
  assert.ok(run(b, 6).speed < 0.01, 'and comes to rest');
});

test('a flick hands her some of the stroke\'s momentum', () => {
  const b = createWatercolorBody({ homeStiffness: 1e-6 });
  b.impulse({ vx: 3, vy: 0 });
  assert.ok(b.step(1 / 60).vx > 0);
});

test('she breathes, stays on the paper, and never produces a non-finite value', () => {
  for (const form of BODY_FORMS) {
    const b = createWatercolorBody({ form }); const breaths = [];
    for (let i = 0; i < 60 * 30; i++) {
      if (i % 97 === 0) b.touch({ x: (i % 7) / 6, y: (i % 5) / 4, pressure: 1 });
      if (i % 131 === 0) b.release();
      const o = b.step(1 / 60); breaths.push(o.breath);
      assert.ok([o.x, o.y, o.vx, o.vy, o.breath].every(Number.isFinite), form);
      assert.ok(o.x >= 0.03 && o.x <= 0.97 && o.y >= 0.03 && o.y <= 0.97, form);
    }
    assert.ok(Math.max(...breaths) > 0.95 && Math.min(...breaths) < 0.05, `${form} breathes through a full cycle`);
  }
});

test('she moves the water always, but only inks it when stirred', () => {
  const b = createWatercolorBody();
  const drift = run(b, 2);
  assert.ok(drift.strokes.every(s => s.amount === 0), 'drifting pushes currents, leaves no pigment');
  b.touch({ x: 0.95, y: 0.1, pressure: 1 });
  const stirred = []; for (let i = 0; i < 20; i++) stirred.push(...b.step(1 / 60).strokes);
  assert.ok(stirred.some(s => s.amount > 0), 'stirred, she leaves pigment');
});

test('Feather freezes her; reduced motion keeps her still', () => {
  const b = createWatercolorBody(); b.touch({ x: 0.9, y: 0.9 }); run(b, 0.2);
  b.freeze();
  assert.deepEqual([b.step(1 / 60).speed, b.step(1 / 60).strokes.length], [0, 0]);
  assert.equal(b.snapshot().touched, false);
  const r = createWatercolorBody({ reduced: true }); r.touch({ x: 0.9, y: 0.9 });
  assert.equal(run(r, 1).speed, 0);
});

test('she never claims experience; her form is chosen, not imposed', () => {
  const b = createWatercolorBody({ form: 'spiral' });
  assert.equal(b.snapshot().experience_claimed, false);
  assert.equal(b.snapshot().authority, 'visualization-only');
  assert.throws(() => b.setForm('cage'), /Unknown body form/);
});

test('stroke: a fast swipe is a continuous line, not a row of dots', () => {
  const f = createStrokeFilter({ spacing: 0.012 });
  f.begin({ x: 0.1, y: 0.5, t: 0, pressure: 0.8 });
  const stamps = f.move([{ x: 0.5, y: 0.5, t: 16, pressure: 0.8 }, { x: 0.9, y: 0.5, t: 32, pressure: 0.8 }]);
  const gaps = stamps.slice(1).map((s, i) => s.x - stamps[i].x);
  assert.ok(stamps.length >= 60);
  assert.ok(Math.max(...gaps) <= 0.0121, 'no gap wider than the spacing');
});

test('stroke: velocity is per second, so a 60 Hz mouse and a 240 Hz Pencil feel the same', () => {
  const swipe = hz => { const f = createStrokeFilter(); f.begin({ x: 0.2, y: 0.5, t: 0, pressure: 1 });
    const n = Math.round(hz * 0.2); for (let i = 1; i <= n; i++) f.move([{ x: 0.2 + 0.4 * i / n, y: 0.5, t: 200 * i / n, pressure: 1 }]);
    return f.end().vx; };
  const slow = swipe(60); const fast = swipe(240);
  assert.ok(Math.abs(slow - 2) < 0.1 && Math.abs(fast - 2) < 0.1, `both ≈ 2 units/s (${slow.toFixed(2)}, ${fast.toFixed(2)})`);
});

test('stroke: pressure eases in instead of slamming down', () => {
  const f = createStrokeFilter({ attackMs: 90 });
  const first = f.begin({ x: 0.1, y: 0.1, t: 0, pressure: 1 })[0].pressure;
  const later = f.move([{ x: 0.3, y: 0.1, t: 200, pressure: 1 }]).at(-1).pressure;
  assert.ok(first < 0.5 && later === 1);
});

test('ink is laid per distance travelled, like a real brush', () => {
  assert.ok(stampAmount({ pressure: 1, radius: 0.07 }) < stampAmount({ pressure: 1, radius: 0.012 }));
});

test('headless: the new pipeline paints a fast stroke as one connected wash; the old one left gaps', () => {
  const lane = f => { const row = f.pixels(); const w = f.width; const y = Math.round(0.5 * (f.height - 1));
    const bg = [0x13, 0x24, 0x2e]; const xs = [];
    for (let x = Math.round(0.15 * (w - 1)); x <= Math.round(0.85 * (w - 1)); x++) {
      const i = (y * w + x) * 4; xs.push(Math.abs(row[i] - bg[0]) + Math.abs(row[i + 1] - bg[1]) + Math.abs(row[i + 2] - bg[2]));
    }
    return xs; };
  // Old: one splat per pointer event (a fast swipe delivers few events).
  const old = createWatercolorFluid();
  for (const x of [0.1, 0.36, 0.63, 0.9]) old.inject({ x, y: 0.5, color: '#ebac7d', amount: 0.84, radius: 0.028 + 0.7 * 0.045 });
  // New: the same four events through the stroke filter.
  const neu = createWatercolorFluid(); const f = createStrokeFilter();
  const lay = ss => ss.forEach(s => { const radius = 0.028 + s.pressure * 0.045; neu.inject({ x: s.x, y: s.y, color: '#ebac7d', radius, amount: stampAmount({ pressure: s.pressure, radius }) }); });
  lay(f.begin({ x: 0.1, y: 0.5, t: 0, pressure: 0.7 }));
  lay(f.move([0.36, 0.63, 0.9].map((x, i) => ({ x, y: 0.5, t: 16 * (i + 1), pressure: 0.7 }))));
  const faint = xs => xs.filter(v => v < 8).length;
  assert.ok(faint(lane(old)) > 0, 'old: bare paper between the dots');
  assert.equal(faint(lane(neu)), 0, 'new: unbroken along the whole stroke');
});

test('the surface is wired to the body: every frame, coalesced samples, flick, Feather', () => {
  const surface = readFileSync(new URL('../src/surfaces/living-watercolor.js', import.meta.url), 'utf8');
  assert.doesNotMatch(surface, /ts-lastFrame>=40/, 'no 25 fps throttle');
  assert.match(surface, /getCoalescedEvents/);
  assert.match(surface, /createWatercolorBody\(\{reduced\}\)/);
  assert.match(surface, /stroke\.end\(\)/);
  assert.match(surface, /body\.impulse/);
  assert.match(surface, /body\.freeze\(\);stroke\.reset\(\);/);
  assert.match(surface, /body\.thaw\(\)/);
  assert.match(surface, /proposeWatercolorTouch\(\{x:head\.x/, 'one proposal per event: your gesture remains your suggestion');
});
