const SCHEMA = 'arcsweep.afferent-signal/v1';

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, Number(value) || 0));
}

function freezeSignal(signal) {
  return Object.freeze({
    ...signal,
    vector: signal.vector ? Object.freeze({ ...signal.vector }) : null,
    context: Object.freeze({ ...(signal.context || {}) }),
  });
}

export function normalizeGlyphBrushSample(sample, now = () => Date.now()) {
  if (!sample || sample.schema !== 'arcsweep.glyph-brush-sample/v1') return null;
  const phase = ['start', 'move', 'end'].includes(sample.phase) ? sample.phase : 'move';
  return freezeSignal({
    schema: SCHEMA,
    id: `glyph:${sample.stroke_id || 'unknown'}:${sample.timestamp || now()}:${phase}`,
    at: Number(sample.timestamp) || now(),
    source: 'glyph-forge',
    source_schema: sample.schema,
    modality: sample.pointer_type === 'pen' ? 'pencil' : 'touch',
    intent: phase === 'start' ? 'contact' : phase === 'end' ? 'release' : 'expression',
    phase,
    confidence: 1,
    vector: {
      pressure: clamp(sample.pressure, 0, 1),
      velocity_px_s: clamp(sample.velocity_px_s, 0, 5000),
      tilt_x: clamp(sample.tilt_x, -90, 90),
      tilt_y: clamp(sample.tilt_y, -90, 90),
      twist: clamp(sample.twist, 0, 359),
    },
    context: {
      stroke_id: sample.stroke_id || null,
      brush_id: sample.brush_id || null,
      pointer_type: sample.pointer_type || null,
    },
  });
}

export function createAfferentBus({ eventTarget = globalThis, bus = null, now = () => Date.now() } = {}) {
  let destroyed = false;
  let sequence = 0;
  let lastSignal = null;
  const listeners = new Set();

  function publish(signal) {
    if (destroyed || !signal) return null;
    sequence += 1;
    lastSignal = freezeSignal({ ...signal, sequence });
    for (const listener of listeners) {
      try { listener(lastSignal); } catch {}
    }
    bus?.publish?.('arcsweep:afferent-signal', lastSignal);
    eventTarget?.dispatchEvent?.(new CustomEvent('arcsweep:afferent-signal', { detail: lastSignal }));
    return lastSignal;
  }

  const glyphHandler = (event) => publish(normalizeGlyphBrushSample(event?.detail, now));
  eventTarget?.addEventListener?.('arcsweep:glyph-brush-sample', glyphHandler);

  return Object.freeze({
    schema: SCHEMA,
    publish,
    normalizeGlyphBrushSample: (sample) => normalizeGlyphBrushSample(sample, now),
    subscribe(listener) {
      if (typeof listener !== 'function') throw new Error('Afferent listener must be a function.');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    status: () => Object.freeze({ destroyed, sequence, last_signal: lastSignal }),
    destroy() {
      destroyed = true;
      listeners.clear();
      eventTarget?.removeEventListener?.('arcsweep:glyph-brush-sample', glyphHandler);
    },
  });
}

export { SCHEMA as AFFERENT_SIGNAL_SCHEMA };
