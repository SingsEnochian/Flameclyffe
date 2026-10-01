import {
  createSignal,
  dampSignal,
  exciteSignal,
  integrateEvidenceSignal,
  signalActivationScore,
} from './signal-contract.js';

export const TRAJECTORY_SCHEMA = 'arcsweep.trajectory/v0.1';

export const TRAJECTORY_STATES = Object.freeze([
  'sleeping',
  'active',
  'waiting',
  'contradicted',
  'resolved',
  'abandoned',
]);

function nowIso(now) {
  return typeof now === 'function' ? now().toISOString() : new Date().toISOString();
}

function freezeArray(value) {
  return Object.freeze([...(Array.isArray(value) ? value : [])]);
}

export function createTrajectory({
  id,
  origin,
  hypothesis = '',
  state = 'sleeping',
  signal = {},
  activationThreshold = 0.55,
  damping = 0.9,
  evidenceRefs = [],
  dependencies = [],
  excitationHistory = [],
  createdAt,
  updatedAt,
} = {}, { now = () => new Date() } = {}) {
  if (!id) throw new Error('trajectory-id-required');
  if (!origin) throw new Error('trajectory-origin-required');
  if (!TRAJECTORY_STATES.includes(state)) throw new Error(`invalid-trajectory-state:${state}`);
  const stamp = nowIso(now);
  return Object.freeze({
    schema: TRAJECTORY_SCHEMA,
    id: String(id),
    origin: String(origin),
    hypothesis: String(hypothesis || ''),
    state,
    signal: createSignal(signal),
    activationThreshold: Math.min(1, Math.max(0, Number(activationThreshold) || 0)),
    damping: Math.min(1, Math.max(0, Number(damping) || 0)),
    evidenceRefs: freezeArray(evidenceRefs),
    dependencies: freezeArray(dependencies),
    excitationHistory: freezeArray(excitationHistory),
    createdAt: createdAt || stamp,
    updatedAt: updatedAt || stamp,
  });
}

export function exciteTrajectory(trajectory, { sourceRef, amount, at } = {}, options = {}) {
  if (!sourceRef) throw new Error('trajectory-excitation-source-required');
  const stamp = at || nowIso(options.now || (() => new Date()));
  const signal = exciteSignal(trajectory.signal, amount);
  const score = signalActivationScore(signal);
  const nextState = score >= trajectory.activationThreshold ? 'active' : trajectory.state;
  return createTrajectory({
    ...trajectory,
    state: nextState,
    signal,
    excitationHistory: [
      ...trajectory.excitationHistory,
      Object.freeze({ sourceRef: String(sourceRef), amount: Number(amount) || 0, at: stamp }),
    ],
    updatedAt: stamp,
  }, options);
}

export function integrateTrajectoryEvidence(trajectory, {
  evidenceRef,
  relevance = 0,
  coherence,
  uncertainty,
  contradicted = false,
} = {}, options = {}) {
  if (!evidenceRef) throw new Error('trajectory-evidence-ref-required');
  const stamp = nowIso(options.now || (() => new Date()));
  const signal = integrateEvidenceSignal(trajectory.signal, { relevance, coherence, uncertainty });
  const score = signalActivationScore(signal);
  let state = trajectory.state;
  if (contradicted) state = 'contradicted';
  else if (score >= trajectory.activationThreshold && state !== 'resolved' && state !== 'abandoned') state = 'active';
  return createTrajectory({
    ...trajectory,
    state,
    signal,
    evidenceRefs: [...new Set([...trajectory.evidenceRefs, String(evidenceRef)])],
    updatedAt: stamp,
  }, options);
}

export function dampTrajectory(trajectory, options = {}) {
  const stamp = nowIso(options.now || (() => new Date()));
  const signal = dampSignal(trajectory.signal, trajectory.damping);
  const score = signalActivationScore(signal);
  const state = trajectory.state === 'active' && score < trajectory.activationThreshold
    ? 'sleeping'
    : trajectory.state;
  return createTrajectory({ ...trajectory, state, signal, updatedAt: stamp }, options);
}

export function markTrajectoryWaiting(trajectory, options = {}) {
  const stamp = nowIso(options.now || (() => new Date()));
  return createTrajectory({ ...trajectory, state: 'waiting', updatedAt: stamp }, options);
}

export function resolveTrajectory(trajectory, { evidenceRef } = {}, options = {}) {
  const stamp = nowIso(options.now || (() => new Date()));
  return createTrajectory({
    ...trajectory,
    state: 'resolved',
    evidenceRefs: evidenceRef ? [...new Set([...trajectory.evidenceRefs, String(evidenceRef)])] : trajectory.evidenceRefs,
    updatedAt: stamp,
  }, options);
}

export function trajectoryActivationScore(trajectory) {
  return signalActivationScore(trajectory.signal);
}
