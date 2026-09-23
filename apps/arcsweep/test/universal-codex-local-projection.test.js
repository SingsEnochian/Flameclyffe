import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLocalCodexProjection } from '../src/universal-codex-local-projection.js';

function fixture(t, { reduced = false, hidden = false } = {}) {
  const frames = new Map();
  let frameId = 0;
  const contexts = [];
  const elements = [];
  const observers = [];
  const listeners = new Map();
  const motion = { matches: reduced, addEventListener(type, fn) { listeners.set(`motion:${type}`, fn); }, removeEventListener(type) { listeners.delete(`motion:${type}`); } };
  const makeCanvas = () => {
    const calls = [];
    const context = {
      clearRect(...args) { calls.push(['clear', ...args]); },
      setTransform() {},
      beginPath() {}, closePath() {}, fill() {}, stroke() {},
      moveTo(...args) { calls.push(['move', ...args]); },
      lineTo(...args) { calls.push(['line', ...args]); },
      fillRect(...args) { calls.push(['fillRect', ...args]); },
      arc(...args) { calls.push(['arc', ...args]); },
      createRadialGradient() { return { addColorStop() {} }; },
      calls,
    };
    contexts.push(context);
    const canvas = { style: {}, clientWidth: 112, clientHeight: 44, width: 0, height: 0, getContext: () => context, setAttribute() {}, remove() { canvas.removed = true; } };
    elements.push(canvas);
    return canvas;
  };
  const source = { clientWidth: 200, clientHeight: 150, offsetLeft: 2, offsetTop: 3, isConnected: true, parentElement: { append() {} } };
  const root = { hidden, source, contains: (node) => node.isConnected, querySelector: () => root.source };
  t.mock.method(globalThis, 'matchMedia', () => motion);
  t.mock.method(globalThis, 'requestAnimationFrame', (callback) => { frames.set(++frameId, callback); return frameId; });
  t.mock.method(globalThis, 'cancelAnimationFrame', (id) => frames.delete(id));
  t.mock.property(globalThis, 'MutationObserver', class {
    constructor(callback) { observers.push(this); this.callback = callback; }
    observe() {}
    disconnect() { this.disconnected = true; }
  });
  const document = { hidden: false, createElement: makeCanvas, addEventListener(type, fn) { listeners.set(type, fn); }, removeEventListener(type) { listeners.delete(type); } };
  t.mock.property(globalThis, 'document', document);
  const canvas = makeCanvas();
  const controller = createLocalCodexProjection(canvas, root, { holograms: true, inkAura: true, orbit: true, scanlines: true, intensity: 1 });
  t.after(() => controller.destroy());
  return { controller, canvas, source, root, frames, contexts, elements, observers, motion, listeners, document };
}

// Node lacks these browser globals; test mocks restore each stub after use.
globalThis.matchMedia ??= () => null;
globalThis.requestAnimationFrame ??= () => 0;
globalThis.cancelAnimationFrame ??= () => {};
globalThis.MutationObserver ??= class {};
globalThis.document ??= undefined;

test('maximum legacy preferences paint only a tiny seated margin light and idle without frames', (t) => {
  const f = fixture(t);
  assert.equal(f.controller.mode, 'page-local');
  assert.equal(f.frames.size, 0);
  assert.equal(f.contexts[0].calls.filter(([op]) => op === 'arc').length, 0);
  const rect = f.contexts[0].calls.find(([op]) => op === 'fillRect');
  assert.equal(rect[3], 24);
  assert.equal(rect[4], 24);
  f.controller.pulse({ family: 'page' });
  assert.equal(f.frames.size, 1);
  const next = [...f.frames.values()][0];
  f.frames.clear();
  next(performance.now() + 1000);
  assert.equal(f.frames.size, 0);
});

test('ink is independent of margin light and tracks actual glyph dimensions without stage offsets', (t) => {
  const f = fixture(t);
  f.controller.applyState({ holograms: false, inkAura: true });
  f.controller.addInkSpark({ x: .25, y: .75, energy: .5 });
  const ink = f.elements[1];
  assert.match(ink.className, /universal-codex-ink-fx/);
  assert.equal(ink.style.left, '2px');
  assert.equal(ink.style.top, '3px');
  assert.equal(ink.style.width, '200px');
  const arc = f.contexts[1].calls.find(([op]) => op === 'arc');
  assert.equal(arc[1], 50);
  assert.ok(Math.abs(arc[2] - 112.5) < 1);
  f.source.clientWidth = 400;
  f.controller.resize();
  assert.equal(ink.style.width, '400px');
  const resized = f.contexts[1].calls.filter(([op]) => op === 'arc').at(-1);
  assert.equal(resized[1], 100);
  f.controller.applyState({ holograms: false, inkAura: false });
  assert.equal(f.frames.size, 0);
});

test('page replacement removes old ink and unrelated pages never get a canvas', (t) => {
  const f = fixture(t);
  f.controller.addInkSpark({ x: .5, y: .5, energy: 1 });
  f.source.isConnected = false;
  f.root.source = null;
  f.observers[0].callback();
  assert.equal(f.elements[1].removed, true);
  assert.equal(f.frames.size, 0);
  f.controller.addInkSpark({ x: .5, y: .5, energy: 1 });
  assert.equal(f.elements.length, 2);
});

test('reduced motion and hidden Book suppress all projection work, including saved opt-ins', (t) => {
  const f = fixture(t, { reduced: true });
  f.controller.pulse({ family: 'page' });
  f.controller.addInkSpark({ x: .5, y: .5, energy: 1 });
  assert.equal(f.frames.size, 0);
  assert.equal(f.elements.length, 1);
  assert.equal(f.contexts[0].calls.some(([op]) => op === 'fillRect'), false);
  f.motion.matches = false;
  f.listeners.get('motion:change')();
  f.controller.pulse({ family: 'page' });
  assert.equal(f.frames.size, 1);
  f.root.hidden = true;
  f.observers[0].callback();
  assert.equal(f.frames.size, 0);
  f.controller.destroy();
  assert.equal(f.listeners.size, 0);
  assert.equal(f.observers[0].disconnected, true);
});

test('Book containment is structural and controls are an in-flow disclosure', () => {
  const sidecar = readFileSync(new URL('../src/universal-codex-animation-sidecar.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/universal-codex-animation.css', import.meta.url), 'utf8');
  assert.match(sidecar, /spread\.append\(margin\)/);
  assert.doesNotMatch(sidecar, /stage\.prepend|RingGeometry|ShaderMaterial|WebGLRenderer/);
  assert.match(sidecar, /<details class="universal-codex-control-dock"/);
  assert.match(css, /grid-column: 1 \/ -1/);
  assert.match(css, /width: 112px/);
  assert.doesNotMatch(css, /position: fixed|backdrop-filter/);
});
