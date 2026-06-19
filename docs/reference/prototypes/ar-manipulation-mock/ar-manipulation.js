import { AR_MANIPULATION_CONFIG, AR_OBJECT } from './ar-manipulation.model.js';
import { POINTER_INTENTS, describeIntent } from './ar-intents.js';
import { createARManipulationController } from './ar-manipulation-controller.js';
import { createGestureAdapterShim, makeSyntheticPayload } from './gesture-adapter-shim.js';
import { handleARKeyboard } from './ar-keyboard-controls.js';
import { createARLightingControls, applyLightingToElement } from './ar-lighting-controls.js';

const arStage = document.querySelector('#ar-stage');
const arObject = document.querySelector('#ar-object');
const objectStatus = document.querySelector('#object-status');
const intentLog = document.querySelector('#intent-log');
let dragStart = null;
let logItems = [];

const lightInputs = {
  ambient: document.querySelector('#light-ambient'),
  bloom: document.querySelector('#light-bloom'),
  green: document.querySelector('#light-green'),
  rim: document.querySelector('#light-rim'),
};

function renderIntentLog(intent) {
  logItems = [describeIntent(intent), ...logItems].slice(0, 8);
  intentLog.replaceChildren(...logItems.map((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    return li;
  }));
}

function renderState(state) {
  arObject.style.setProperty('--ar-x', `${state.x}px`);
  arObject.style.setProperty('--ar-y', `${state.y}px`);
  arObject.style.setProperty('--ar-rotation', `${state.rotation}deg`);
  arObject.style.setProperty('--ar-scale', String(state.scale));
  arObject.dataset.mode = state.mode;
  arObject.dataset.anchor = state.anchor;
  arObject.dataset.visible = String(state.visible);
  arObject.dataset.pulsing = String(state.pulsing);
  objectStatus.textContent = `${AR_OBJECT.label}: ${state.mode}, ${state.anchor}, x ${Math.round(state.x)}, y ${Math.round(state.y)}, rotation ${Math.round(state.rotation)}, scale ${state.scale.toFixed(2)}.`;
}

function renderLighting(lightState) {
  applyLightingToElement(arStage, lightState);
  Object.entries(lightInputs).forEach(([name, input]) => {
    input.value = String(lightState[name]);
  });
}

const controller = createARManipulationController({
  onChange: renderState,
  onIntent: renderIntentLog,
});
const gestureShim = createGestureAdapterShim(controller);
const lighting = createARLightingControls({ onChange: renderLighting });

function startDrag(event) {
  dragStart = {
    x: event.clientX,
    y: event.clientY,
    objectX: controller.getState().x,
    objectY: controller.getState().y,
  };
  controller.setMode(POINTER_INTENTS.grab);
}

function dragMove(event) {
  if (!dragStart) return;
  const dx = dragStart.objectX + event.clientX - dragStart.x - controller.getState().x;
  const dy = dragStart.objectY + event.clientY - dragStart.y - controller.getState().y;
  controller.moveBy(dx, dy, POINTER_INTENTS.drag);
}

function endDrag() {
  if (!dragStart) return;
  dragStart = null;
  controller.setMode(POINTER_INTENTS.release);
}

function sendSynthetic(type) {
  gestureShim.receive(makeSyntheticPayload(type));
}

arObject.addEventListener('pointerenter', () => renderIntentLog(POINTER_INTENTS.hover));
arObject.addEventListener('pointerdown', startDrag);
window.addEventListener('pointermove', dragMove);
window.addEventListener('pointerup', endDrag);
arObject.addEventListener('keydown', (event) => handleARKeyboard(event, controller));

Object.entries(lightInputs).forEach(([name, input]) => {
  input.addEventListener('input', (event) => lighting.setLight(name, event.target.value));
});
document.querySelector('#light-moonlit').addEventListener('click', () => lighting.applyPreset('moonlit'));
document.querySelector('#light-hearth').addEventListener('click', () => lighting.applyPreset('hearth'));
document.querySelector('#light-grove').addEventListener('click', () => lighting.applyPreset('grove'));
document.querySelector('#light-eclipse').addEventListener('click', () => lighting.applyPreset('eclipse'));

document.querySelector('#move-left').addEventListener('click', () => controller.moveBy(-AR_MANIPULATION_CONFIG.step, 0));
document.querySelector('#move-right').addEventListener('click', () => controller.moveBy(AR_MANIPULATION_CONFIG.step, 0));
document.querySelector('#move-up').addEventListener('click', () => controller.moveBy(0, -AR_MANIPULATION_CONFIG.step));
document.querySelector('#move-down').addEventListener('click', () => controller.moveBy(0, AR_MANIPULATION_CONFIG.step));
document.querySelector('#rotate-left').addEventListener('click', () => controller.rotateBy(-AR_MANIPULATION_CONFIG.rotationStep));
document.querySelector('#rotate-right').addEventListener('click', () => controller.rotateBy(AR_MANIPULATION_CONFIG.rotationStep));
document.querySelector('#scale-down').addEventListener('click', () => controller.scaleBy(-AR_MANIPULATION_CONFIG.scaleStep));
document.querySelector('#scale-up').addEventListener('click', () => controller.scaleBy(AR_MANIPULATION_CONFIG.scaleStep));
document.querySelector('#anchor-toggle').addEventListener('click', () => controller.toggleAnchor());
document.querySelector('#pulse-object').addEventListener('click', () => controller.pulse());
document.querySelector('#dismiss-object').addEventListener('click', () => controller.toggleDismiss());
document.querySelector('#reset-object').addEventListener('click', () => controller.reset());
document.querySelector('#synthetic-pinch-drag').addEventListener('click', () => sendSynthetic('pinchDrag'));
document.querySelector('#synthetic-two-hand-rotate').addEventListener('click', () => sendSynthetic('twoHandRotate'));
document.querySelector('#synthetic-hand-scale').addEventListener('click', () => sendSynthetic('handScale'));
document.querySelector('#synthetic-air-anchor').addEventListener('click', () => sendSynthetic('airAnchor'));

renderIntentLog(POINTER_INTENTS.select);
renderState(controller.getState());
renderLighting(lighting.getState());
