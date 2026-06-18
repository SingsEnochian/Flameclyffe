import { SYNTHETIC_GESTURES } from './ar-intents.js';

const targetId = 'observer-core';
const supportedSources = new Set(['synthetic', 'keyboard', 'pointer', 'gaze', 'controller', 'mediapipe', 'webxr', 'arkit']);
const safeDetailKeys = new Set(['deltaX', 'deltaY', 'rotationDelta', 'scaleDelta', 'confidence', 'pointerType', 'durationMs']);
const numericKeys = new Set(['deltaX', 'deltaY', 'rotationDelta', 'scaleDelta', 'confidence', 'durationMs']);

const gestureMap = {
  pinchDrag: SYNTHETIC_GESTURES.pinchDrag,
  twoHandRotate: SYNTHETIC_GESTURES.twoHandRotate,
  handScale: SYNTHETIC_GESTURES.handScale,
  airAnchor: SYNTHETIC_GESTURES.airAnchor,
};

function isSafeDetail(detail) {
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return false;

  return Object.entries(detail).every(([key, value]) => {
    if (!safeDetailKeys.has(key)) return false;
    if (numericKeys.has(key) && typeof value !== 'number') return false;
    if (key === 'confidence' && (value < 0 || value > 1)) return false;
    if (key === 'pointerType' && typeof value !== 'string') return false;
    return true;
  });
}

export function isValidAdapterPayload(payload = {}) {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    supportedSources.has(payload.source) &&
    typeof payload.type === 'string' &&
    payload.targetId === targetId &&
    payload.consentState === 'enabled' &&
    typeof payload.createdAt === 'string' &&
    isSafeDetail(payload.detail)
  );
}

export function createGestureAdapterShim(controller) {
  function receive(payload = {}) {
    if (!isValidAdapterPayload(payload)) return false;
    const gesture = gestureMap[payload.type] ?? payload.intent;
    if (!gesture) return false;
    controller.syntheticGesture(gesture);
    return true;
  }

  return { receive };
}

export function makeSyntheticPayload(type, detail = {}) {
  return {
    source: 'synthetic',
    type,
    targetId,
    detail,
    consentState: 'enabled',
    createdAt: new Date().toISOString(),
  };
}
