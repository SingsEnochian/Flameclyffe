import { subscribeWayglassObserver } from './living-observer-model.js';
import { subscribeWatercolorActivity } from './watercolor-bridge.js';

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

// Motion Anything-inspired magnetic controls and semantic arrivals, implemented
// locally. Events describe observed transport; no participant presence is inferred.
export function installMotionChoreography({
  root = globalThis.document?.documentElement,
  controlsHost = null,
  contentRoot = null,
  scope = globalThis,
  document = scope.document,
  subscribe = subscribeWayglassObserver,
  subscribeActivity = subscribeWatercolorActivity,
} = {}) {
  if (!root?.style || !document) return null;
  const preference = scope.matchMedia?.('(prefers-reduced-motion: reduce)');
  let enabled = preference?.matches !== true;
  let stopped = false;
  let disposed = false;
  let frame = null;
  let pending = null;
  let previous = null;
  const magnets = new Set();
  const animations = new Map();
  const active = () => enabled && !stopped && !preference?.matches && !disposed && !document.hidden;
  const toggle = controlsHost ? document.createElement('button') : null;
  const status = controlsHost ? document.createElement('span') : null;
  if (toggle) {
    toggle.type = 'button';
    toggle.className = 'glass-chip wg-motion-toggle';
    toggle.setAttribute('aria-label', 'Toggle Wayglass interactive motion');
    toggle.setAttribute('data-motion-toggle', '');
    status.className = 'wg-motion-status tiny';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'No route activity observed';
    controlsHost.append(toggle, status);
  }
  function label() {
    root.dataset.wgMotion = active() ? 'on' : 'off';
    if (typeof scope.CustomEvent === 'function') scope.dispatchEvent?.(new scope.CustomEvent('wayglass:motion', { detail: { enabled: active() } }));
    if (!toggle) return;
    toggle.textContent = active() ? '✧ Motion on' : '✧ Motion off';
    toggle.setAttribute('aria-pressed', String(active()));
    toggle.disabled = stopped || preference?.matches === true;
    toggle.title = stopped ? 'Feather held; release and enable motion deliberately'
      : preference?.matches ? 'Motion disabled by system accessibility preference'
      : 'Toggle Wayglass interactive motion';
  }
  function resetTarget(target) {
    target?.style?.removeProperty('--wg-magnet-x');
    target?.style?.removeProperty('--wg-magnet-y');
    magnets.delete(target);
  }
  function clear() {
    if (frame !== null) scope.cancelAnimationFrame?.(frame);
    frame = null; pending = null; previous = null;
    for (const target of magnets) resetTarget(target);
    for (const animation of animations.values()) animation.cancel();
    animations.clear();
    for (const property of ['--wg-pointer-x','--wg-pointer-y','--wg-velocity','--wg-tilt-x','--wg-tilt-y']) root.style.removeProperty(property);
  }
  function commit() {
    frame = null;
    if (!pending || !active()) return;
    const { material, target, x, y } = pending;
    pending = null;
    root.style.setProperty('--wg-pointer-x', (material.x * 100).toFixed(2) + '%');
    root.style.setProperty('--wg-pointer-y', (material.y * 100).toFixed(2) + '%');
    root.style.setProperty('--wg-velocity', material.velocity.toFixed(3));
    root.style.setProperty('--wg-tilt-x', ((material.y - 0.5) * -1.15).toFixed(3) + 'deg');
    root.style.setProperty('--wg-tilt-y', ((material.x - 0.5) * 1.35).toFixed(3) + 'deg');
    if (target && !target.matches?.(':disabled, [aria-disabled="true"]')) {
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--wg-magnet-x', (clamp((x - rect.left) / Math.max(1, rect.width)) * 3 - 1.5).toFixed(2) + 'px');
      target.style.setProperty('--wg-magnet-y', (clamp((y - rect.top) / Math.max(1, rect.height)) * 3 - 1.5).toFixed(2) + 'px');
      magnets.add(target);
    }
  }
  function pointer(event) {
    if (!active() || event.pointerType === 'touch') return;
    const now = scope.performance?.now?.() ?? Date.now();
    const speed = previous ? Math.hypot(event.clientX - previous.x, event.clientY - previous.y) / Math.max(8, now - previous.at) : 0;
    previous = { x: event.clientX, y: event.clientY, at: now };
    let target = event.target?.closest?.('.glass-chip, .send-jewel');
    if (target === toggle || target?.matches?.(':disabled, [aria-disabled="true"]')) target = null;
    pending = { material: pointerMaterialState({ x: event.clientX, y: event.clientY,
      width: scope.innerWidth, height: scope.innerHeight, velocity: speed }), target,
      x: event.clientX, y: event.clientY };
    if (frame === null) frame = scope.requestAnimationFrame?.(commit) ?? null;
  }
  function pointerOut(event) {
    const target = event.target?.closest?.('.glass-chip, .send-jewel');
    if (!target || (event.relatedTarget && target.contains?.(event.relatedTarget))) return;
    // A queued frame may otherwise restore an offset after pointerout.
    if (pending?.target === target) pending.target = null;
    resetTarget(target);
  }
  function animate(target, keyframes, duration) {
    if (!active() || typeof target?.animate !== 'function') return;
    animations.get(target)?.cancel();
    const animation = target.animate(keyframes, { duration, easing: 'cubic-bezier(.2,.7,.2,1)' });
    animations.set(target, animation);
    const finish = () => { if (animations.get(target) === animation) animations.delete(target); };
    animation.finished?.then(finish, finish);
  }
  function arrive(target = contentRoot) {
    // A successful mount owns the event; navigation does not predict its success.
    animate(target, [{ opacity: .86, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], 240);
  }
  function observed(sample) {
    if (disposed || !sample || !['started','completed','failed'].includes(sample.status)) return;
    root.dataset.wgRouteStatus = sample.status;
    if (status) status.textContent = 'Route ' + sample.status + ' · ' + (sample.route_id || 'unidentified route')
      + (sample.provider ? ' · ' + sample.provider : '') + (sample.model ? ' · ' + sample.model : '');
    animate(toggle, [{ opacity: .65 }, { opacity: 1 }], 180);
  }
  function setEnabled(next) {
    if (disposed) return false;
    enabled = next === true && !stopped && !preference?.matches;
    if (!active()) clear();
    label(); return active();
  }
  function onToggle() { setEnabled(!active()); }
  function onPreference(event) {
    // Removing a system lock does not silently restart user motion.
    if (event.matches) enabled = false;
    if (!active()) clear();
    label();
  }
  function feather(event) {
    if (event.detail?.stopped === true) { stopped = true; enabled = false; clear(); label(); }
    else if (event.detail?.stopped === false && event.detail?.confirmed === true) { stopped = false; label(); }
  }
  function hidden() { if (document.hidden) clear(); label(); }
  toggle?.addEventListener('click', onToggle);
  preference?.addEventListener?.('change', onPreference);
  scope.addEventListener?.('pointermove', pointer, { passive: true });
  scope.addEventListener?.('pointerout', pointerOut, { passive: true });
  scope.addEventListener?.('pointercancel', clear, { passive: true });
  scope.addEventListener?.('wayglass:feather', feather);
  document.addEventListener?.('visibilitychange', hidden);
  const unsubscribe = subscribe(observed);
  const unsubscribeActivity = subscribeActivity(event => {
    const status = { 'route:pending': 'started', 'route:responded': 'completed', 'route:failed': 'failed' }[event?.kind];
    if (status) observed({status});
  });
  label();
  return Object.freeze({ arrive, setEnabled, snapshot: () => Object.freeze({ enabled: active(), featherStopped: stopped, reducedMotion: preference?.matches === true }),
    destroy() {
      if (disposed) return;
      disposed = true; clear(); unsubscribe?.(); unsubscribeActivity?.();
      toggle?.removeEventListener('click', onToggle);
      preference?.removeEventListener?.('change', onPreference);
      scope.removeEventListener?.('pointermove', pointer);
      scope.removeEventListener?.('pointerout', pointerOut);
      scope.removeEventListener?.('pointercancel', clear);
      scope.removeEventListener?.('wayglass:feather', feather);
      document.removeEventListener?.('visibilitychange', hidden);
      toggle?.remove(); status?.remove();
      delete root.dataset.wgMotion; delete root.dataset.wgRouteStatus;
    },
  });
}
