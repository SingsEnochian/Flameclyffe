import { AR_MANIPULATION_CONFIG } from './ar-manipulation.model.js';

export function handleARKeyboard(event, controller) {
  const step = event.shiftKey ? AR_MANIPULATION_CONFIG.step * 2 : AR_MANIPULATION_CONFIG.step;
  const rotationStep = AR_MANIPULATION_CONFIG.rotationStep;
  const scaleStep = AR_MANIPULATION_CONFIG.scaleStep;

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    controller.moveBy(-step, 0);
    return true;
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    controller.moveBy(step, 0);
    return true;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    controller.moveBy(0, -step);
    return true;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    controller.moveBy(0, step);
    return true;
  }

  if (event.key === '[') {
    event.preventDefault();
    controller.rotateBy(-rotationStep);
    return true;
  }

  if (event.key === ']') {
    event.preventDefault();
    controller.rotateBy(rotationStep);
    return true;
  }

  if (event.key === '-') {
    event.preventDefault();
    controller.scaleBy(-scaleStep);
    return true;
  }

  if (event.key === '+' || event.key === '=') {
    event.preventDefault();
    controller.scaleBy(scaleStep);
    return true;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    controller.pulse();
    return true;
  }

  return false;
}
