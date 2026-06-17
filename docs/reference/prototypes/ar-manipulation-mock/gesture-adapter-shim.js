import { SYNTHETIC_GESTURES } from './ar-intents.js';

const gestureMap = {
  pinchDrag: SYNTHETIC_GESTURES.pinchDrag,
  twoHandRotate: SYNTHETIC_GESTURES.twoHandRotate,
  handScale: SYNTHETIC_GESTURES.handScale,
  airAnchor: SYNTHETIC_GESTURES.airAnchor,
};

export function createGestureAdapterShim(controller) {
  function receive(payload = {}) {
    const gesture = gestureMap[payload.type] ?? payload.intent;
    if (!gesture) return false;
    controller.syntheticGesture(gesture);
    return true;
  }

  return { receive };
}

export function makeSyntheticPayload(type, detail = {}) {
  return {
    source: 'synthetic-gesture-shim',
    type,
    detail,
    createdAt: new Date().toISOString(),
  };
}
