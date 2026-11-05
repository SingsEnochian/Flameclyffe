// Motion vocabulary adapted from motion-anything concepts: magnetic controls,
// star-border focus and semantic entrance. No third-party runtime or network calls.
export function installWayglassMotion({ root = document } = {}) {
  if (!root?.addEventListener) return null;
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let enabled = !reduced?.matches;
  const onPreferenceChange = (event) => {
    if (event.matches) { enabled = false; label(); }
  };
  reduced?.addEventListener?.('change', onPreferenceChange);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'glass-chip wg-motion-toggle';
  toggle.setAttribute('aria-label', 'Toggle Wayglass interactive motion');
  function label() {
    toggle.textContent = enabled ? '✧ Motion on' : '✧ Motion off';
    toggle.setAttribute('aria-pressed', String(enabled));
    document.documentElement.dataset.wgMotion = enabled ? 'on' : 'off';
  }
  label();
  const nav = document.querySelector('.wg-shell-nav');
  (nav || document.body).append(toggle);
  toggle.addEventListener('click', () => { enabled = !enabled; label(); });
  function move(event) {
    if (!enabled || event.pointerType === 'touch') return;
    const target = event.target?.closest?.('.glass-chip, .send-jewel');
    if (!target || target === toggle) return;
    const rect = target.getBoundingClientRect();
    const x = (event.clientX - rect.left) / Math.max(1, rect.width) - .5;
    const y = (event.clientY - rect.top) / Math.max(1, rect.height) - .5;
    target.style.setProperty('--wg-magnet-x', (x * 3).toFixed(2) + 'px');
    target.style.setProperty('--wg-magnet-y', (y * 3).toFixed(2) + 'px');
  }
  function reset(event) {
    const target = event.target?.closest?.('.glass-chip, .send-jewel');
    if (!target) return;
    target.style.removeProperty('--wg-magnet-x');
    target.style.removeProperty('--wg-magnet-y');
  }
  root.addEventListener('pointermove', move, { passive: true });
  root.addEventListener('pointerout', reset, { passive: true });
  return { destroy() {
    reduced?.removeEventListener?.('change', onPreferenceChange);
    root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerout', reset);
    toggle.remove();
    delete document.documentElement.dataset.wgMotion;
  } };
}
