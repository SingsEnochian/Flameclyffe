function clamp(value, low, high) {
  return Math.max(low, Math.min(high, Number(value) || 0));
}

function brushExpression(signal, state) {
  const vector = signal?.vector || {};
  const pressure = clamp(vector.pressure, 0, 1);
  const referenceVelocity = Math.max(100, Number(state.brush?.velocity_reference_px_s) || 900);
  const velocity = clamp((Number(vector.velocity_px_s) || 0) / referenceVelocity, 0, 1);
  const tiltMagnitude = clamp(Math.hypot(Number(vector.tilt_x) || 0, Number(vector.tilt_y) || 0) / 90, 0, 1);
  return Object.freeze({
    gain_ceiling: clamp(state.gain_ceiling * (0.55 + pressure * 0.75), 0.001, 0.08),
    modulation: Object.freeze({
      frequency_scale: 0.94 + velocity * 0.12,
      duration_scale: 0.85 + tiltMagnitude * 0.30,
      haptic_scale: 0.60 + pressure * 0.80,
    }),
  });
}

export function createSomaticEventBridge({
  bus,
  somatic,
  profile,
  eventTarget = globalThis,
  now = () => Date.now(),
} = {}) {
  if (!bus?.subscribe || !somatic?.emit || !profile?.load) throw new Error('Somatic event bridge requires bus, somatic API, and profile store.');
  let lastNavigationAt = 0;
  let lastBrushContactAt = 0;
  let lastBrushExpressionAt = 0;
  let cueInFlight = false;
  let destroyed = false;

  async function maybeEmit(cueId, bindingKey, { cooldownMs = null, options = {} } = {}) {
    if (destroyed) return { status: 'ignored', reason: 'destroyed' };
    const state = profile.load();
    if (!state.enabled) return { status: 'suppressed', reason: 'somatic-disabled' };
    if (state.quiet_mode) return { status: 'suppressed', reason: 'quiet-mode' };
    if (state.bindings?.[bindingKey] !== true) return { status: 'suppressed', reason: 'binding-disabled' };
    if (cueInFlight) return { status: 'suppressed', reason: 'cue-in-flight' };
    const stamp = now();
    const cooldown = Math.max(80, Number(cooldownMs ?? state.cooldown_ms) || 450);
    const lastAt = bindingKey === 'navigation' ? lastNavigationAt : bindingKey === 'brush_contact' ? lastBrushContactAt : lastBrushExpressionAt;
    if (stamp - lastAt < cooldown) return { status: 'suppressed', reason: 'cooldown' };
    if (bindingKey === 'navigation') lastNavigationAt = stamp;
    else if (bindingKey === 'brush_contact') lastBrushContactAt = stamp;
    else lastBrushExpressionAt = stamp;
    cueInFlight = true;
    try {
      return await somatic.emit(cueId, { channels: state.channels, gain_ceiling: state.gain_ceiling, ...options });
    } finally {
      cueInFlight = false;
    }
  }

  const unsubscribeNavigation = bus.subscribe('arcsweep:navigation-changed', (event) => {
    const state = profile.load();
    void maybeEmit('navigation', 'navigation', {
      cooldownMs: state.cooldown_ms,
      options: { context: { trigger: 'arcsweep:navigation-changed', ...(event?.payload || {}) } },
    }).catch(() => {});
  }, { id: 'somatic-navigation-bridge' });

  const afferentHandler = (event) => {
    const signal = event?.detail;
    if (!signal || signal.schema !== 'arcsweep.afferent-signal/v1' || signal.source !== 'glyph-forge') return;
    if (!['pencil', 'touch'].includes(signal.modality)) return;
    const state = profile.load();
    if (!state.enabled || state.quiet_mode) return;
    const vector = signal.vector || {};
    const pressure = clamp(vector.pressure, 0, 1);
    if (pressure < Number(state.brush?.min_pressure || 0.05)) return;
    const context = {
      trigger: 'arcsweep:afferent-signal',
      afferent_id: signal.id,
      afferent_sequence: signal.sequence,
      modality: signal.modality,
      intent: signal.intent,
      phase: signal.phase,
      stroke_id: signal.context?.stroke_id,
      brush_id: signal.context?.brush_id,
      pointer_type: signal.context?.pointer_type,
      pressure,
      velocity_px_s: clamp(vector.velocity_px_s, 0, 5000),
      tilt_x: clamp(vector.tilt_x, -90, 90),
      tilt_y: clamp(vector.tilt_y, -90, 90),
      twist: clamp(vector.twist, 0, 359),
    };

    if (signal.intent === 'contact') {
      const expression = brushExpression(signal, state);
      void maybeEmit('brush_contact', 'brush_contact', {
        cooldownMs: state.brush?.contact_cooldown_ms,
        options: { ...expression, context },
      }).catch(() => {});
      return;
    }

    if (signal.intent === 'expression' && state.bindings?.brush_expression === true) {
      const expression = brushExpression(signal, state);
      void maybeEmit('brush_contact', 'brush_expression', {
        cooldownMs: state.brush?.expression_cooldown_ms,
        options: { ...expression, context },
      }).catch(() => {});
    }
  };

  eventTarget?.addEventListener?.('arcsweep:afferent-signal', afferentHandler);

  return Object.freeze({
    maybeEmit,
    brushExpression: (signal) => brushExpression(signal, profile.load()),
    status: () => Object.freeze({
      destroyed,
      cue_in_flight: cueInFlight,
      last_navigation_at: lastNavigationAt || null,
      last_brush_contact_at: lastBrushContactAt || null,
      last_brush_expression_at: lastBrushExpressionAt || null,
    }),
    destroy() {
      destroyed = true;
      unsubscribeNavigation?.();
      eventTarget?.removeEventListener?.('arcsweep:afferent-signal', afferentHandler);
    },
  });
}
