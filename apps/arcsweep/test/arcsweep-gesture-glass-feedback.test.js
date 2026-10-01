import test from 'node:test';
import assert from 'node:assert/strict';

import { createGestureGlassFeedback } from '../src/gesture-glass-feedback.js';

function makeNode(id) {
  return { dataset: { arTargetId: id, arSurface: 'glass' } };
}

function fakeDocument(nodes = []) {
  const styles = [];
  return {
    head: { append(node) { styles.push(node); } },
    styles,
    createElement(tag) { return { tagName: tag.toUpperCase(), dataset: {}, textContent: '' }; },
    querySelector(selector) {
      if (selector === 'style[data-astra-gesture-glass-style]') return styles.find((node) => node.dataset?.astraGestureGlassStyle === 'true') || null;
      return null;
    },
    querySelectorAll(selector) { return selector === '[data-ar-target-id]' ? nodes : []; },
  };
}

function fakeTarget() {
  const listeners = new Map();
  const emitted = [];
  return {
    emitted,
    addEventListener(name, handler) { listeners.set(name, handler); },
    removeEventListener(name, handler) { if (listeners.get(name) === handler) listeners.delete(name); },
    dispatchEvent(event) { emitted.push(event); listeners.get(event.type)?.(event); return true; },
  };
}

function gesture(overrides = {}) {
  return {
    schema: 'arcsweep.gesture-state/v1',
    event_id: 'g:1',
    gesture: 'pinch',
    state: 'targeted',
    target_id: 'artifact:1',
    confidence: 0.9,
    ...overrides,
  };
}

test('gesture visual feedback styles only the named local glass target', () => {
  const one = makeNode('artifact:1');
  const two = makeNode('artifact:2');
  const doc = fakeDocument([one, two]);
  const events = fakeTarget();
  const bridge = createGestureGlassFeedback({ doc, eventTarget: events });

  const result = bridge.handle(gesture());
  assert.equal(result.applied, true);
  assert.equal(one.dataset.arState, 'targeted');
  assert.equal(one.dataset.arGesture, 'pinch');
  assert.equal(two.dataset.arState, undefined);
  assert.equal(doc.styles.length, 1);
  assert.match(doc.styles[0].textContent, /data-ar-state="captured"/);
  assert.match(doc.styles[0].textContent, /prefers-reduced-motion/);
  bridge.destroy();
});

test('switching targets clears the previous local glass state', () => {
  const one = makeNode('artifact:1');
  const two = makeNode('artifact:2');
  const bridge = createGestureGlassFeedback({ doc: fakeDocument([one, two]), eventTarget: fakeTarget() });

  bridge.handle(gesture({ target_id: 'artifact:1', state: 'captured' }));
  bridge.handle(gesture({ target_id: 'artifact:2', state: 'armed', event_id: 'g:2' }));
  assert.equal(one.dataset.arState, undefined);
  assert.equal(two.dataset.arState, 'armed');
  bridge.destroy();
});

test('quiet state clears active target instead of animating the whole scene', () => {
  const one = makeNode('artifact:1');
  const bridge = createGestureGlassFeedback({ doc: fakeDocument([one]), eventTarget: fakeTarget() });
  bridge.handle(gesture({ state: 'captured' }));
  assert.equal(one.dataset.arState, 'captured');
  bridge.handle(gesture({ state: 'quiet' }));
  assert.equal(one.dataset.arState, undefined);
  assert.equal(bridge.status().active_target_id, null);
  bridge.destroy();
});
