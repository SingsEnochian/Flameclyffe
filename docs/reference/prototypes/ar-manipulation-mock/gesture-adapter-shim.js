import { SYNTHETIC_GESTURES } from './ar-intents.js';

const gestureMap = {
  pinchDrag: SYNTHETIC_GESTURES.pinchDrag,
  twoHandRotate: SYNTHETIC_GESTURES.twoHandRotate,
  handScale: SYNTHETIC_GESTURES.handScale,
  airAnchor: SYNTHETIC_GESTURES.airAnchor,
};

export function isValidAdapterPayload(payload = {}) {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    typeof payload.source === 'string' &&
    typeof payload.type === 'string' &&
    typeof payload.createdAt === 'string' &&
    (!payload.targetId || typeof payload.targetId === 'string') &&
    (!payload.consentState || payload.consentState === 'enabled')
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
    targetId: 'observer-core',
    detail,
    consentState: 'enabled',
    createdAt: new Date().toISOString(),
  };
}
