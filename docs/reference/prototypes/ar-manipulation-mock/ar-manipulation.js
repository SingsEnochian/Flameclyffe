import { AR_MANIPULATION_CONFIG, AR_OBJECT } from './ar-manipulation.model.js';
import { POINTER_INTENTS, describeIntent } from './ar-intents.js';
import { createARManipulationController } from './ar-manipulation-controller.js';
import { createGestureAdapterShim, makeSyntheticPayload } from './gesture-adapter-shim.js';
import { handleARKeyboard } from './ar-keyboard-controls.js';
import { createARLightingControls, applyLightingToElement } from './ar-lighting-controls.js';
import { createARSoundControls } from './ar-sound-controls.js';

const arStage = document.querySelector('#ar-stage');
const arObject = document.querySelector('#ar-object');
const objectStatus = document.querySelector('#object-status');
const soundStatus = document.querySelector('#sound-status');
const soundVolume = document.querySelector('#sound-volume');
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
  arObject.style.setProperty('--ar-z', `${state.z}px`);
  arObject.style.setProperty('--ar-rotation', `${state.rotation}deg`);
  arObject.style.setProperty('--ar-scale', String(state.scale));
  arObject.dataset.mode = state.mode;
  arObject.dataset.anchor = state.anchor;
  arObject.dataset.visible = String(state.visible);
  arObject.dataset.pulsing = String(state.pulsing);
  objectStatus.textContent = `${AR_OBJECT.label}: ${state.mode}, ${state.anchor}, x ${Math.round(state.x)}, y ${Math.round(state.y)}, z ${Math.round(state.z)}, rotation ${Math.round(state.rotation)}, scale ${state.scale.toFixed(2)}.`;
}

function renderLighting(lightState) {
  applyLightingToElement(arStage, lightState);
  Object.entries(lightInputs).forEach(([name, input]) => {
    input.value = String(lightState[name]);
  });
}

function renderSound(soundState) {
  soundVolume.value = String(soundState.volume);
  soundStatus.textContent = soundState.enabled ? `Sound on. Volume ${Math.round(soundState.volume * 100)}%.` : 'Sound off.';
}

const sound = createARSoundControls({ onChange: renderSound });
const controller = createARManipulationController({
  onChange: renderState,
  onIntent: renderIntentLog,
});
const gestureShim = createGestureAdapterShim(controller);
const lighting = createARLightingControls({ onChange: renderLighting });

function playAndRun(soundName, action) {
  action();
  sound.play(soundName);
}

function moveAxis(axis, delta) {
  playAndRun('move', () => controller.moveAxis(axis, delta));
}

function startDrag(event) {
  dragStart = {
    x: event.clientX,
    y: event.clientY,
    objectX: controller.getState().x,
    objectY: controller.getState().y,
  };
  controller.setMode(POINTER_INTENTS.grab);
  sound.play('select');
}

function dragMove(event) {
  if (!dragStart) return;
  const dx = dragStart.objectX + event.clientX - dragStart.x - controller.getState().x;
  const dy = dragStart.objectY + event.clientY - dragStart.y - controller.getState().y;
  controller.moveBy(dx, dy, 0, POINTER_INTENTS.drag);
}

function endDrag() {
  if (!dragStart) return;
  dragStart = null;
  controller.setMode(POINTER_INTENTS.release);
  sound.play('move');
}

function sendSynthetic(type, soundName = 'select') {
  gestureShim.receive(makeSyntheticPayload(type));
  sound.play(soundName);
}

arObject.addEventListener('pointerenter', () => renderIntentLog(POINTER_INTENTS.hover));
arObject.addEventListener('pointerdown', startDrag);
window.addEventListener('pointermove', dragMove);
window.addEventListener('pointerup', endDrag);
arObject.addEventListener('keydown', (event) => {
  const handled = handleARKeyboard(event, controller);
  if (handled) sound.play('move');
});

document.querySelector('#sound-enable').addEventListener('click', async () => {
  await sound.enable();
  sound.play('select');
});
document.querySelector('#sound-disable').addEventListener('click', () => sound.disable());
soundVolume.addEventListener('input', (event) => sound.setVolume(event.target.value));
document.querySelector('#sound-donk').addEventListener('click', () => sound.play('donk'));
document.querySelector('#sound-ding').addEventListener('click', () => sound.play('ding'));
document.querySelector('#sound-hum').addEventListener('click', () => sound.play('hum'));
document.querySelector('#sound-chime').addEventListener('click', () => sound.play('chime'));
document.querySelector('#sound-seedling-reply').addEventListener('click', () => sound.playPattern('seedlingReply'));

Object.entries(lightInputs).forEach(([name, input]) => {
  input.addEventListener('input', (event) => lighting.setLight(name, event.target.value));
});
document.querySelector('#light-moonlit').addEventListener('click', () => lighting.applyPreset('moonlit'));
document.querySelector('#light-hearth').addEventListener('click', () => lighting.applyPreset('hearth'));
document.querySelector('#light-grove').addEventListener('click', () => lighting.applyPreset('grove'));
document.querySelector('#light-eclipse').addEventListener('click', () => lighting.applyPreset('eclipse'));

document.querySelector('#axis-x-minus').addEventListener('click', () => moveAxis('x', -AR_MANIPULATION_CONFIG.step));
document.querySelector('#axis-x-plus').addEventListener('click', () => moveAxis('x', AR_MANIPULATION_CONFIG.step));
document.querySelector('#axis-y-minus').addEventListener('click', () => moveAxis('y', -AR_MANIPULATION_CONFIG.step));
document.querySelector('#axis-y-plus').addEventListener('click', () => moveAxis('y', AR_MANIPULATION_CONFIG.step));
document.querySelector('#axis-z-minus').addEventListener('click', () => moveAxis('z', -AR_MANIPULATION_CONFIG.zStep));
document.querySelector('#axis-z-plus').addEventListener('click', () => moveAxis('z', AR_MANIPULATION_CONFIG.zStep));
document.querySelector('#rotate-left').addEventListener('click', () => playAndRun('rotate', () => controller.rotateBy(-AR_MANIPULATION_CONFIG.rotationStep)));
document.querySelector('#rotate-right').addEventListener('click', () => playAndRun('rotate', () => controller.rotateBy(AR_MANIPULATION_CONFIG.rotationStep)));
document.querySelector('#scale-down').addEventListener('click', () => playAndRun('scale', () => controller.scaleBy(-AR_MANIPULATION_CONFIG.scaleStep)));
document.querySelector('#scale-up').addEventListener('click', () => playAndRun('scale', () => controller.scaleBy(AR_MANIPULATION_CONFIG.scaleStep)));
document.querySelector('#anchor-toggle').addEventListener('click', () => playAndRun('anchor', () => controller.toggleAnchor()));
document.querySelector('#pulse-object').addEventListener('click', () => playAndRun('pulse', () => controller.pulse()));
document.querySelector('#dismiss-object').addEventListener('click', () => playAndRun('dismiss', () => controller.toggleDismiss()));
document.querySelector('#reset-object').addEventListener('click', () => playAndRun('reset', () => controller.reset()));
document.querySelector('#synthetic-pinch-drag').addEventListener('click', () => sendSynthetic('pinchDrag', 'move'));
document.querySelector('#synthetic-two-hand-rotate').addEventListener('click', () => sendSynthetic('twoHandRotate', 'rotate'));
document.querySelector('#synthetic-hand-scale').addEventListener('click', () => sendSynthetic('handScale', 'scale'));
document.querySelector('#synthetic-air-anchor').addEventListener('click', () => sendSynthetic('airAnchor', 'anchor'));

renderIntentLog(POINTER_INTENTS.select);
renderState(controller.getState());
renderLighting(lighting.getState());
renderSound(sound.getState());
