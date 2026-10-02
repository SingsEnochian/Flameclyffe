export type HouseBrainLane =
  | 'sensory'
  | 'session'
  | 'presence'
  | 'runtime'
  | 'capability'
  | 'agent'
  | 'tool'
  | 'artifact'
  | 'astra'
  | 'continuity'
  | 'ui';

export type HouseBrainEpistemicClass =
  | 'FORMAL'
  | 'SIMULATED'
  | 'MEASURED'
  | 'DERIVED'
  | 'INTERPRETIVE'
  | 'SPECULATIVE'
  | 'FICTIONAL'
  | 'UNKNOWN';

export interface HouseBrainSignal<T = unknown> {
  schema: 'house.brain-signal/v0.1';
  id: string;
  lane: HouseBrainLane;
  kind: string;
  source: string;
  target: string | null;
  trajectoryId: string | null;
  requestId: string | null;
  sessionId: string | null;
  occurredAt: string;
  epistemicClass: HouseBrainEpistemicClass | null;
  payload: T;
}

export interface HouseBrainNodeState {
  id: string;
  kind: 'agent' | 'runtime' | 'surface' | 'session' | 'capability' | 'artifact' | 'unknown';
  state: string;
  updatedAt: string;
  metadata: Readonly<Record<string, unknown>>;
}

export interface HouseBrainSnapshot {
  schema: 'house.brain-snapshot/v0.1';
  signalCount: number;
  recentSignals: readonly HouseBrainSignal[];
  nodes: readonly HouseBrainNodeState[];
}

type EmitInput<T> = Omit<HouseBrainSignal<T>, 'schema' | 'id' | 'occurredAt' | 'target' | 'trajectoryId' | 'requestId' | 'sessionId' | 'epistemicClass'> & {
  id?: string;
  occurredAt?: string;
  target?: string | null;
  trajectoryId?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  epistemicClass?: HouseBrainEpistemicClass | null;
};

export interface HouseBrainApi {
  emit<T = unknown>(signal: EmitInput<T>): HouseBrainSignal<T>;
  subscribe(listener: (signal: HouseBrainSignal) => void): () => void;
  setNode(id: string, update: Partial<Omit<HouseBrainNodeState, 'id' | 'updatedAt'>>): HouseBrainNodeState;
  snapshot(): HouseBrainSnapshot;
  clearTransient(): void;
}

const SIGNAL_SCHEMA = 'house.brain-signal/v0.1' as const;
const SNAPSHOT_SCHEMA = 'house.brain-snapshot/v0.1' as const;
const MAX_SIGNALS = 160;
const listeners = new Set<(signal: HouseBrainSignal) => void>();
const nodes = new Map<string, HouseBrainNodeState>();
let signals: readonly HouseBrainSignal[] = Object.freeze([]);

function now(): string {
  return new Date().toISOString();
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() || `brain-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function text(value: unknown, max = 180): string {
  return String(value ?? '').trim().slice(0, max);
}

function emit<T = unknown>(input: EmitInput<T>): HouseBrainSignal<T> {
  const signal = Object.freeze({
    schema: SIGNAL_SCHEMA,
    id: text(input.id, 180) || createId(),
    lane: input.lane,
    kind: text(input.kind, 96) || 'unknown',
    source: text(input.source, 160) || 'workspace',
    target: text(input.target, 160) || null,
    trajectoryId: text(input.trajectoryId, 180) || null,
    requestId: text(input.requestId, 180) || null,
    sessionId: text(input.sessionId, 180) || null,
    occurredAt: text(input.occurredAt, 64) || now(),
    epistemicClass: input.epistemicClass ?? null,
    payload: input.payload,
  }) satisfies HouseBrainSignal<T>;

  signals = Object.freeze([...signals, signal].slice(-MAX_SIGNALS));
  document.dispatchEvent(new CustomEvent('house:brain-signal', { detail: signal }));
  for (const listener of listeners) {
    try {
      listener(signal);
    } catch (error) {
      console.warn('[HouseBrain] listener failed', error);
    }
  }
  return signal;
}

function subscribe(listener: (signal: HouseBrainSignal) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setNode(nodeId: string, update: Partial<Omit<HouseBrainNodeState, 'id' | 'updatedAt'>>): HouseBrainNodeState {
  const key = text(nodeId, 180);
  if (!key) throw new Error('house-brain: node id is required');
  const previous = nodes.get(key) ?? { id: key, kind: 'unknown' as const, state: 'unknown', updatedAt: now(), metadata: Object.freeze({}) };
  const node = Object.freeze({
    id: key,
    kind: update.kind ?? previous.kind,
    state: text(update.state ?? previous.state, 64) || 'unknown',
    updatedAt: now(),
    metadata: Object.freeze({ ...previous.metadata, ...(update.metadata ?? {}) }),
  }) satisfies HouseBrainNodeState;
  nodes.set(key, node);
  document.dispatchEvent(new CustomEvent('house:brain-node', { detail: node }));
  return node;
}

function snapshot(): HouseBrainSnapshot {
  return Object.freeze({
    schema: SNAPSHOT_SCHEMA,
    signalCount: signals.length,
    recentSignals: Object.freeze([...signals]),
    nodes: Object.freeze([...nodes.values()]),
  });
}

function clearTransient(): void {
  signals = Object.freeze([]);
  document.dispatchEvent(new CustomEvent('house:brain-reset', { detail: { occurredAt: now() } }));
}

export const HouseBrain: HouseBrainApi = Object.freeze({ emit, subscribe, setNode, snapshot, clearTransient });

declare global {
  interface Window {
    HouseBrain?: HouseBrainApi;
  }
}

globalThis.HouseBrain = HouseBrain;
emit({ lane: 'ui', kind: 'brain-online', source: 'house-brain', payload: { transport: 'document-event-bus', maxSignals: MAX_SIGNALS } });
