export function createSomaticEventBridge({ bus, somatic, profile, now = () => Date.now() } = {}) {
  if (!bus?.subscribe || !somatic?.emit || !profile?.load) throw new Error('Somatic event bridge requires bus, somatic API, and profile store.');
  let lastCueAt = 0;
  let destroyed = false;

  async function maybeEmit(cueId, bindingKey) {
    if (destroyed) return { status: 'ignored', reason: 'destroyed' };
    const state = profile.load();
    if (!state.enabled) return { status: 'suppressed', reason: 'somatic-disabled' };
    if (state.quiet_mode) return { status: 'suppressed', reason: 'quiet-mode' };
    if (state.bindings?.[bindingKey] !== true) return { status: 'suppressed', reason: 'binding-disabled' };
    const stamp = now();
    if (stamp - lastCueAt < state.cooldown_ms) return { status: 'suppressed', reason: 'cooldown' };
    lastCueAt = stamp;
    return somatic.emit(cueId, { channels: state.channels, gain_ceiling: state.gain_ceiling });
  }

  const unsubscribeNavigation = bus.subscribe('arcsweep:navigation-changed', () => {
    void maybeEmit('navigation', 'navigation');
  }, { id: 'somatic-navigation-bridge' });

  return Object.freeze({
    maybeEmit,
    destroy() {
      destroyed = true;
      unsubscribeNavigation?.();
    },
  });
}
