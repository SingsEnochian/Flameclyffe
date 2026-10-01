const SIGNAL_SCHEMA = 'house.brain-signal/v0.1';
const SNAPSHOT_SCHEMA = 'house.brain-snapshot/v0.1';
const MAX_SIGNALS = 160;
const listeners = new Set();
const nodes = new Map();
let signals = [];

function now() { return new Date().toISOString(); }
function id() { return globalThis.crypto?.randomUUID?.() || `brain-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function text(value, max = 180) { return String(value ?? '').trim().slice(0, max); }

function emit(input = {}) {
  const signal = Object.freeze({
    schema: SIGNAL_SCHEMA,
    id: text(input.id, 180) || id(),
    lane: text(input.lane, 48) || 'ui',
    kind: text(input.kind, 96) || 'unknown',
    source: text(input.source, 160) || 'workspace',
    target: text(input.target, 160) || null,
    trajectoryId: text(input.trajectoryId, 180) || null,
    requestId: text(input.requestId, 180) || null,
    sessionId: text(input.sessionId, 180) || null,
    occurredAt: text(input.occurredAt, 64) || now(),
    epistemicClass: text(input.epistemicClass, 32) || null,
    payload: input.payload ?? null,
  });
  signals = Object.freeze([...signals, signal].slice(-MAX_SIGNALS));
  document.dispatchEvent(new CustomEvent('house:brain-signal', { detail: signal }));
  for (const listener of listeners) {
    try { listener(signal); } catch (error) { console.warn('[HouseBrain] listener failed', error); }
  }
  return signal;
}

function subscribe(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setNode(nodeId, update = {}) {
  const key = text(nodeId, 180);
  if (!key) throw new Error('house-brain: node id is required');
  const previous = nodes.get(key) || { id: key, kind: 'unknown', state: 'unknown', metadata: {} };
  const node = Object.freeze({
    id: key,
    kind: text(update.kind ?? previous.kind, 48) || 'unknown',
    state: text(update.state ?? previous.state, 64) || 'unknown',
    updatedAt: now(),
    metadata: Object.freeze({ ...(previous.metadata || {}), ...(update.metadata || {}) }),
  });
  nodes.set(key, node);
  document.dispatchEvent(new CustomEvent('house:brain-node', { detail: node }));
  return node;
}

function snapshot() {
  return Object.freeze({
    schema: SNAPSHOT_SCHEMA,
    signalCount: signals.length,
    recentSignals: Object.freeze([...signals]),
    nodes: Object.freeze([...nodes.values()]),
  });
}

function clearTransient() {
  signals = Object.freeze([]);
  document.dispatchEvent(new CustomEvent('house:brain-reset', { detail: { occurredAt: now() } }));
}

const api = Object.freeze({ emit, subscribe, setNode, snapshot, clearTransient });
globalThis.HouseBrain = api;

emit({ lane: 'ui', kind: 'brain-online', source: 'house-brain', payload: { transport: 'document-event-bus', maxSignals: MAX_SIGNALS } });
