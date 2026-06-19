import {
  AR_MANIPULATION_CONFIG,
  AR_OBJECT,
  DEFAULT_MANIPULATION_STATE,
} from './ar-manipulation.model.js';
import { POINTER_INTENTS, SYNTHETIC_GESTURES } from './ar-intents.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createARManipulationController(options = {}) {
  let state = { ...DEFAULT_MANIPULATION_STATE };
  let pulseTimer = null;
  const onChange = options.onChange ?? (() => {});
  const onIntent = options.onIntent ?? (() => {});

  function emit(intent) {
    onIntent(intent, { ...state });
    onChange({ ...state });
  }

  function setMode(mode) {
    state.mode = mode;
    emit(mode);
  }

  function moveBy(dx = 0, dy = 0, dz = 0, intent = POINTER_INTENTS.drag) {
    state.x += dx;
    state.y += dy;
    state.z = clamp(state.z + dz, AR_OBJECT.minZ, AR_OBJECT.maxZ);
    state.mode = POINTER_INTENTS.drag;
    emit(intent);
  }

  function moveAxis(axis, delta, intent = POINTER_INTENTS.drag) {
    if (axis === 'x') moveBy(delta, 0, 0, intent);
    if (axis === 'y') moveBy(0, delta, 0, intent);
    if (axis === 'z') moveBy(0, 0, delta, intent);
  }

  function rotateBy(delta, intent = POINTER_INTENTS.rotate) {
    state.rotation += delta;
    state.mode = POINTER_INTENTS.rotate;
    emit(intent);
  }

  function scaleBy(delta, intent = POINTER_INTENTS.scale) {
    state.scale = clamp(state.scale + delta, AR_OBJECT.minScale, AR_OBJECT.maxScale);
    state.mode = POINTER_INTENTS.scale;
    emit(intent);
  }

  function toggleAnchor(intent = POINTER_INTENTS.anchor) {
    state.anchor = state.anchor === 'floating' ? 'surface' : 'floating';
    state.mode = POINTER_INTENTS.anchor;
    emit(intent);
  }

  function pulse(intent = POINTER_INTENTS.pulse) {
    state.pulsing = true;
    state.mode = POINTER_INTENTS.pulse;
    emit(intent);
    if (pulseTimer) window.clearTimeout(pulseTimer);
    pulseTimer = window.setTimeout(() => {
      state.pulsing = false;
      state.mode = 'idle';
      onChange({ ...state });
    }, AR_MANIPULATION_CONFIG.pulseMs);
  }

  function toggleDismiss() {
    state.visible = !state.visible;
    state.mode = state.visible ? POINTER_INTENTS.select : POINTER_INTENTS.dismiss;
    emit(state.mode);
  }

  function reset() {
    state = { ...DEFAULT_MANIPULATION_STATE };
    emit(POINTER_INTENTS.reset);
  }

  function syntheticGesture(type) {
    if (type === SYNTHETIC_GESTURES.pinchDrag) moveBy(AR_MANIPULATION_CONFIG.step * 3, -AR_MANIPULATION_CONFIG.step, 0, type);
    if (type === SYNTHETIC_GESTURES.twoHandRotate) rotateBy(AR_MANIPULATION_CONFIG.rotationStep * 2, type);
    if (type === SYNTHETIC_GESTURES.handScale) scaleBy(AR_MANIPULATION_CONFIG.scaleStep * 2, type);
    if (type === SYNTHETIC_GESTURES.airAnchor) toggleAnchor(type);
  }

  function getState() {
    return { ...state };
  }

  return {
    getState,
    setMode,
    moveBy,
    moveAxis,
    rotateBy,
    scaleBy,
    toggleAnchor,
    pulse,
    toggleDismiss,
    reset,
    syntheticGesture,
  };
}
