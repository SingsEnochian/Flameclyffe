function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function pointerMaterialState({ x = 0, y = 0, width = 1, height = 1, velocity = 0 } = {}) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  return Object.freeze({
    x: clamp((Number(x) || 0) / safeWidth),
    y: clamp((Number(y) || 0) / safeHeight),
    velocity: clamp((Number(velocity) || 0) / 1.6),
  });
}

export function installMotionChoreography({ root = document.documentElement } = {}) {
  if (!root || typeof document === 'undefined') return null;

  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  let frame = 0;
  let lastX = 0;
  let lastY = 0;
  let lastAt = performance.now();
  let pending = null;

  function commit() {
    frame = 0;
    if (!pending || reduced) return;
    root.style.setProperty('--wg-pointer-x', (pending.x * 100).toFixed(2) + '%');
    root.style.setProperty('--wg-pointer-y', (pending.y * 100).toFixed(2) + '%');
    root.style.setProperty('--wg-velocity', pending.velocity.toFixed(3));
    root.style.setProperty('--wg-tilt-x', ((pending.y - 0.5) * -1.15).toFixed(3) + 'deg');
    root.style.setProperty('--wg-tilt-y', ((pending.x - 0.5) * 1.35).toFixed(3) + 'deg');
  }

  function pointer(event) {
    if (reduced) return;
    const now = performance.now();
    const dt = Math.max(8, now - lastAt);
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    const speed = Math.hypot(dx, dy) / dt;
    pending = pointerMaterialState({
      x: event.clientX,
      y: event.clientY,
      width: globalThis.innerWidth,
      height: globalThis.innerHeight,
      velocity: speed,
    });
    lastX = event.clientX;
    lastY = event.clientY;
    lastAt = now;
    if (!frame) frame = requestAnimationFrame(commit);
  }

  globalThis.addEventListener?.('pointermove', pointer, { passive: true });

  return Object.freeze({
    destroy() {
      globalThis.removeEventListener?.('pointermove', pointer);
      if (frame) cancelAnimationFrame(frame);
    },
  });
}
