import {
  AR_MANIPULATION_CONFIG,
  AR_OBJECT,
  DEFAULT_MANIPULATION_STATE,
} from './ar-manipulation.model.js';

const arObject = document.querySelector('#ar-object');
const objectStatus = document.querySelector('#object-status');
const intentLog = document.querySelector('#intent-log');

let state = { ...DEFAULT_MANIPULATION_STATE };
let dragStart = null;
let pulseTimer = null;
let logItems = [];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function logIntent(intent) {
  logItems = [intent, ...logItems].slice(0, 8);
  intentLog.replaceChildren(...logItems.map((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    return li;
  }));
}

function applyState() {
  arObject.style.setProperty('--ar-x', `${state.x}px`);
  arObject.style.setProperty('--ar-y', `${state.y}px`);
  arObject.style.setProperty('--ar-rotation', `${state.rotation}deg`);
  arObject.style.setProperty('--ar-scale', String(state.scale));
  arObject.dataset.mode = state.mode;
  arObject.dataset.anchor = state.anchor;
  arObject.dataset.visible = String(state.visible);
  arObject.dataset.pulsing = String(state.pulsing);
  objectStatus.textContent = `${AR_OBJECT.label}: ${state.mode}, ${state.anchor}, x ${Math.round(state.x)}, y ${Math.round(state.y)}, scale ${state.scale.toFixed(2)}.`;
}

function moveBy(dx, dy) {
  state.x += dx;
  state.y += dy;
  state.mode = 'drag';
  logIntent('drag');
  applyState();
}

function rotateBy(delta) {
  state.rotation += delta;
  state.mode = 'rotate';
  logIntent('rotate');
  applyState();
}

function scaleBy(delta) {
  state.scale = clamp(state.scale + delta, AR_OBJECT.minScale, AR_OBJECT.maxScale);
  state.mode = 'scale';
  logIntent('scale');
  applyState();
}

function toggleAnchor() {
  state.anchor = state.anchor === 'floating' ? 'surface' : 'floating';
  state.mode = 'anchor';
  logIntent('anchor');
  applyState();
}

function pulseObject() {
  state.pulsing = true;
  state.mode = 'pulse';
  logIntent('pulse');
  applyState();
  if (pulseTimer) window.clearTimeout(pulseTimer);
  pulseTimer = window.setTimeout(() => {
    state.pulsing = false;
    state.mode = 'idle';
    applyState();
  }, AR_MANIPULATION_CONFIG.pulseMs);
}

function toggleDismiss() {
  state.visible = !state.visible;
  state.mode = state.visible ? 'select' : 'dismiss';
  logIntent(state.mode);
  applyState();
}

function resetObject() {
  state = { ...DEFAULT_MANIPULATION_STATE };
  logIntent('reset');
  applyState();
}

function startDrag(event) {
  dragStart = { x: event.clientX, y: event.clientY, objectX: state.x, objectY: state.y };
  state.mode = 'grab';
  logIntent('grab');
  applyState();
}

function dragMove(event) {
  if (!dragStart) return;
  state.x = dragStart.objectX + event.clientX - dragStart.x;
  state.y = dragStart.objectY + event.clientY - dragStart.y;
  state.mode = 'drag';
  applyState();
}

function endDrag() {
  if (!dragStart) return;
  dragStart = null;
  state.mode = 'release';
  logIntent('release');
  applyState();
}

function keyMove(event) {
  const step = event.shiftKey ? AR_MANIPULATION_CONFIG.step * 2 : AR_MANIPULATION_CONFIG.step;
  if (event.key === 'ArrowLeft') { event.preventDefault(); moveBy(-step, 0); }
  if (event.key === 'ArrowRight') { event.preventDefault(); moveBy(step, 0); }
  if (event.key === 'ArrowUp') { event.preventDefault(); moveBy(0, -step); }
  if (event.key === 'ArrowDown') { event.preventDefault(); moveBy(0, step); }
  if (event.key === '[') { event.preventDefault(); rotateBy(-AR_MANIPULATION_CONFIG.rotationStep); }
  if (event.key === ']') { event.preventDefault(); rotateBy(AR_MANIPULATION_CONFIG.rotationStep); }
  if (event.key === '-') { event.preventDefault(); scaleBy(-AR_MANIPULATION_CONFIG.scaleStep); }
  if (event.key === '+') { event.preventDefault(); scaleBy(AR_MANIPULATION_CONFIG.scaleStep); }
  if (event.key === 'Enter') { event.preventDefault(); pulseObject(); }
}

arObject.addEventListener('pointerenter', () => logIntent('hover'));
arObject.addEventListener('pointerdown', startDrag);
window.addEventListener('pointermove', dragMove);
window.addEventListener('pointerup', endDrag);
arObject.addEventListener('keydown', keyMove);

document.querySelector('#move-left').addEventListener('click', () => moveBy(-AR_MANIPULATION_CONFIG.step, 0));
document.querySelector('#move-right').addEventListener('click', () => moveBy(AR_MANIPULATION_CONFIG.step, 0));
document.querySelector('#move-up').addEventListener('click', () => moveBy(0, -AR_MANIPULATION_CONFIG.step));
document.querySelector('#move-down').addEventListener('click', () => moveBy(0, AR_MANIPULATION_CONFIG.step));
document.querySelector('#rotate-left').addEventListener('click', () => rotateBy(-AR_MANIPULATION_CONFIG.rotationStep));
document.querySelector('#rotate-right').addEventListener('click', () => rotateBy(AR_MANIPULATION_CONFIG.rotationStep));
document.querySelector('#scale-down').addEventListener('click', () => scaleBy(-AR_MANIPULATION_CONFIG.scaleStep));
document.querySelector('#scale-up').addEventListener('click', () => scaleBy(AR_MANIPULATION_CONFIG.scaleStep));
document.querySelector('#anchor-toggle').addEventListener('click', toggleAnchor);
document.querySelector('#pulse-object').addEventListener('click', pulseObject);
document.querySelector('#dismiss-object').addEventListener('click', toggleDismiss);
document.querySelector('#reset-object').addEventListener('click', resetObject);

logIntent('select');
applyState();
