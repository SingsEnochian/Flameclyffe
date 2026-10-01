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
  target?: string | null;
  trajectoryId?: string | null;
  requestId?: string | null;
  sessionId?: string | null;
  occurredAt: string;
  epistemicClass?: HouseBrainEpistemicClass | null;
  payload: T;
}

export interface HouseBrainNodeState {
  id: string;
  kind: 'agent' | 'runtime' | 'surface' | 'session' | 'capability' | 'artifact' | 'unknown';
  state: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface HouseBrainSnapshot {
  schema: 'house.brain-snapshot/v0.1';
  signalCount: number;
  recentSignals: readonly HouseBrainSignal[];
  nodes: readonly HouseBrainNodeState[];
}

export interface HouseBrainApi {
  emit<T = unknown>(signal: Omit<HouseBrainSignal<T>, 'schema' | 'id' | 'occurredAt'> & { id?: string; occurredAt?: string }): HouseBrainSignal<T>;
  subscribe(listener: (signal: HouseBrainSignal) => void): () => void;
  setNode(id: string, update: Partial<Omit<HouseBrainNodeState, 'id' | 'updatedAt'>>): HouseBrainNodeState;
  snapshot(): HouseBrainSnapshot;
  clearTransient(): void;
}

declare global {
  interface Window {
    HouseBrain?: HouseBrainApi;
  }
}

export {};
