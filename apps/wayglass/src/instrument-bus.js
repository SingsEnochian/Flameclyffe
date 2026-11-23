// Shared, bounded, session-local evidence bus. It never grants canon or identity authority.
export const INSTRUMENTS = Object.freeze(['Observation','Continuity','Resonance','Provenance','Geometry','Cosmology','Numerology','Wonder']);
export function createInstrumentBus({ limit = 64 } = {}) {
  const records = [];
  const listeners = new Set();
  const cap = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 256) : 64;
  function publish(kind, data = {}) {
    if (!INSTRUMENTS.includes(kind)) throw new TypeError('Unknown instrument');
    const record = Object.freeze({
      kind,
      source: String(data.source || 'local-ui').slice(0, 80),
      status: ['observed','pending','unconnected','error'].includes(data.status) ? data.status : 'observed',
      description: String(data.description || '').slice(0, 240),
      reference: String(data.reference || '').slice(0, 160),
    });
    records.push(record);
    if (records.length > cap) records.splice(0, records.length - cap);
    for (const listener of listeners) listener(record);
    return record;
  }
  return Object.freeze({
    publish,
    recent(kind) { return Object.freeze(records.filter(item => !kind || item.kind === kind).slice()); },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Listener required');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}
export function instrumentSnapshot(bus, visibleTurns = 0) {
  const count = Math.max(0, Math.floor(Number(visibleTurns) || 0));
  return Object.freeze(INSTRUMENTS.map(kind => {
    const records = bus.recent(kind);
    const last = records.at(-1);
    if (kind === 'Observation') return Object.freeze({ kind, status: 'observed', description: count + ' visible conversation turns', source: 'mounted-writing-room', reference: '' });
    if (kind === 'Geometry') return Object.freeze({ kind, status: 'observed', description: 'Eightfold geometry driven by ' + count + ' visible turns', source: 'local-derived', reference: '' });
    return Object.freeze({ kind, status: last?.status || 'unconnected', description: last?.description || 'No admitted source connected', source: last?.source || 'none', reference: last?.reference || '' });
  }));
}
