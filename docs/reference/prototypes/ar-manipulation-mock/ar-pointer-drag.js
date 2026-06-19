import { POINTER_INTENTS } from './ar-intents.js';

export function createARPointerDrag(options = {}) {
  const controller = options.controller;
  const onGrab = options.onGrab ?? (() => {});
  const onRelease = options.onRelease ?? (() => {});
  let dragStart = null;

  function startDrag(event) {
    dragStart = {
      x: event.clientX,
      y: event.clientY,
      objectX: controller.getState().x,
      objectY: controller.getState().y,
    };

    if (event.currentTarget?.setPointerCapture && event.pointerId !== undefined) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    controller.setMode(POINTER_INTENTS.grab);
    onGrab();
  }

  function dragMove(event) {
    if (!dragStart) return;
    const state = controller.getState();
    const dx = dragStart.objectX + event.clientX - dragStart.x - state.x;
    const dy = dragStart.objectY + event.clientY - dragStart.y - state.y;
    controller.moveBy(dx, dy, 0, POINTER_INTENTS.drag);
  }

  function endDrag() {
    if (!dragStart) return;
    dragStart = null;
    controller.setMode(POINTER_INTENTS.release);
    onRelease();
  }

  return {
    startDrag,
    dragMove,
    endDrag,
  };
}
