import { AR_MANIPULATION_CONFIG } from './ar-manipulation.model.js';
import { SYNTHETIC_GESTURES } from './ar-intents.js';
import { createARManipulationController } from './ar-manipulation-controller.js';
import { createGestureAdapterShim, makeSyntheticPayload } from './gesture-adapter-shim.js';

const status = document.querySelector('#test-status');
const results = document.querySelector('#test-results');
const runButton = document.querySelector('#run-tests');
const clearButton = document.querySelector('#clear-tests');

function assert(name, condition) {
  return { name, passed: Boolean(condition) };
}

function render(items) {
  results.replaceChildren(...items.map((item) => {
    const li = document.createElement('li');
    li.textContent = `${item.passed ? 'PASS' : 'FAIL'} · ${item.name}`;
    li.dataset.passed = String(item.passed);
    return li;
  }));

  const passed = items.filter((item) => item.passed).length;
  status.textContent = `${passed}/${items.length} checks passed.`;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function runTests() {
  const controller = createARManipulationController();
  const shim = createGestureAdapterShim(controller);
  const tests = [];

  controller.moveBy(AR_MANIPULATION_CONFIG.step, 0);
  tests.push(assert('moveBy updates x', controller.getState().x === AR_MANIPULATION_CONFIG.step));
  tests.push(assert('moveBy sets drag mode', controller.getState().mode === 'drag'));

  controller.rotateBy(AR_MANIPULATION_CONFIG.rotationStep);
  tests.push(assert('rotateBy updates rotation', controller.getState().rotation === AR_MANIPULATION_CONFIG.rotationStep));
  tests.push(assert('rotateBy sets rotate mode', controller.getState().mode === 'rotate'));

  controller.scaleBy(99);
  tests.push(assert('scaleBy clamps to max', controller.getState().scale <= 2.4));

  controller.toggleAnchor();
  tests.push(assert('toggleAnchor changes anchor', controller.getState().anchor === 'surface'));

  controller.toggleDismiss();
  tests.push(assert('toggleDismiss hides object', controller.getState().visible === false));

  controller.reset();
  tests.push(assert('reset restores x', controller.getState().x === 0));
  tests.push(assert('reset restores visibility', controller.getState().visible === true));

  controller.syntheticGesture(SYNTHETIC_GESTURES.twoHandRotate);
  tests.push(assert('synthetic rotate affects rotation', controller.getState().rotation === AR_MANIPULATION_CONFIG.rotationStep * 2));

  controller.reset();
  tests.push(assert('shim accepts synthetic payload', shim.receive(makeSyntheticPayload('handScale')) === true));
  tests.push(assert('synthetic payload changes scale', controller.getState().scale > 1));
  tests.push(assert('shim rejects missing source', shim.receive({ type: 'pinchDrag', createdAt: new Date().toISOString() }) === false));
  tests.push(assert('shim rejects disabled consent', shim.receive({ ...makeSyntheticPayload('pinchDrag'), consentState: 'disabled' }) === false));

  controller.reset();
  controller.pulse();
  tests.push(assert('pulse starts pulsing', controller.getState().pulsing === true));
  await wait(AR_MANIPULATION_CONFIG.pulseMs + 40);
  tests.push(assert('pulse timeout settles pulsing', controller.getState().pulsing === false));
  tests.push(assert('pulse timeout returns idle mode', controller.getState().mode === 'idle'));

  render(tests);
}

runButton.addEventListener('click', () => { runTests(); });
clearButton.addEventListener('click', () => {
  results.replaceChildren();
  status.textContent = 'Ready.';
});

runTests();
