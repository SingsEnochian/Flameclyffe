function clamp(value, low, high) {
  return Math.max(low, Math.min(high, Number(value) || 0));
}

function brushExpression(sample, state) {
  const pressure = clamp(sample.pressure, 0, 1);
  const referenceVelocity = Math.max(100, Number(state.brush?.velocity_reference_px_s) || 900);
  const velocity = clamp((Number(sample.velocity_px_s) || 0) / referenceVelocity, 0, 1);
  const tiltMagnitude = clamp(Math.hypot(Number(sample.tilt_x) || 0, Number(sample.tilt_y) || 0) / 90, 0, 1);
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

  const brushHandler = (event) => {
    const sample = event?.detail;
    if (!sample || sample.schema !== 'arcsweep.glyph-brush-sample/v1') return;
    const state = profile.load();
    if (!state.enabled || state.quiet_mode) return;
    const pressure = clamp(sample.pressure, 0, 1);
    if (pressure < Number(state.brush?.min_pressure || 0.05)) return;
    const context = {
      trigger: 'arcsweep:glyph-brush-sample',
      phase: sample.phase,
      stroke_id: sample.stroke_id,
      brush_id: sample.brush_id,
      pointer_type: sample.pointer_type,
      pressure,
      velocity_px_s: clamp(sample.velocity_px_s, 0, 5000),
      tilt_x: clamp(sample.tilt_x, -90, 90),
      tilt_y: clamp(sample.tilt_y, -90, 90),
      twist: clamp(sample.twist, 0, 359),
    };

    if (sample.phase === 'start') {
      const expression = brushExpression(sample, state);
      void maybeEmit('brush_contact', 'brush_contact', {
        cooldownMs: state.brush?.contact_cooldown_ms,
        options: { ...expression, context },
      }).catch(() => {});
      return;
    }

    if (sample.phase === 'move' && state.bindings?.brush_expression === true) {
      const expression = brushExpression(sample, state);
      void maybeEmit('brush_contact', 'brush_expression', {
        cooldownMs: state.brush?.expression_cooldown_ms,
        options: { ...expression, context },
      }).catch(() => {});
    }
  };

  eventTarget?.addEventListener?.('arcsweep:glyph-brush-sample', brushHandler);

  return Object.freeze({
    maybeEmit,
    brushExpression: (sample) => brushExpression(sample, profile.load()),
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
      eventTarget?.removeEventListener?.('arcsweep:glyph-brush-sample', brushHandler);
    },
  });
}
