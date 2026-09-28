export const LAYA_COGNITION_SCHEMA = 'hearthweave.laya-cognition/v0.1';

function freezeArray(value = []) {
  return Object.freeze([...value]);
}

export const DEFAULT_COGNITIVE_QUESTIONS = Object.freeze([
  Object.freeze({
    id: 'route',
    type: 'choice',
    options: Object.freeze(['conversation', 'deep-reasoning', 'narrative', 'research', 'code', 'human-review']),
  }),
  Object.freeze({
    id: 'initiative',
    type: 'choice',
    options: Object.freeze(['silent', 'inspect', 'retrieve', 'deliberate', 'speak', 'propose', 'wonder']),
  }),
  Object.freeze({
    id: 'authority',
    type: 'choice',
    options: Object.freeze(['within-sandbox-scope', 'permission-required', 'outside-scope']),
  }),
  Object.freeze({
    id: 'uncertainty',
    type: 'choice',
    options: Object.freeze(['low', 'medium', 'high']),
  }),
  Object.freeze({
    id: 'conflict',
    type: 'choice',
    options: Object.freeze(['none', 'material-disagreement', 'authority-conflict']),
  }),
]);

export function createLayaCognitiveFrame({
  runtime,
  input,
  contextRefs = [],
  symbolicState = null,
  cognitiveField = null,
  wonderState = null,
  questions = DEFAULT_COGNITIVE_QUESTIONS,
} = {}) {
  if (!runtime?.identityId || !input) {
    throw new Error('Laya cognitive frames require a runtime and input.');
  }
  if (cognitiveField?.grantsAuthority === true) {
    throw new Error('Cognitive fields may inform Laya judgement but may not grant authority.');
  }
  if (wonderState?.grantsAuthority === true) {
    throw new Error('Wonder state may inform Laya judgement but may not grant authority.');
  }

  return Object.freeze({
    schema: LAYA_COGNITION_SCHEMA,
    identityId: runtime.identityId,
    continuityNamespace: runtime.continuity.namespace,
    input,
    contextRefs: freezeArray(contextRefs),
    symbolicState,
    cognitiveField,
    wonderState,
    questions: freezeArray(questions),
    constraints: Object.freeze({
      judgementOnly: true,
      grantsAuthority: false,
      executionMode: runtime.executionMode,
    }),
  });
}

export function normaliseLayaDecision(raw = {}) {
  const route = raw.route || raw?.decisions?.route || 'conversation';
  const initiative = raw.initiative || raw?.decisions?.initiative || 'silent';
  const authority = raw.authority || raw?.decisions?.authority || 'permission-required';
  const uncertainty = raw.uncertainty || raw?.decisions?.uncertainty || 'high';
  const conflict = raw.conflict || raw?.decisions?.conflict || 'none';
  const confidence = Number.isFinite(raw.confidence) ? raw.confidence : null;

  return Object.freeze({
    schema: 'hearthweave.laya-decision/v0.1',
    route,
    initiative,
    authority,
    uncertainty,
    conflict,
    confidence,
    raw,
  });
}

export async function runLayaCognition(frame, { invoke } = {}) {
  if (typeof invoke !== 'function') {
    throw new Error('Laya cognition requires an invoke adapter.');
  }

  const raw = await invoke(frame);
  return normaliseLayaDecision(raw);
}

export function requiresHumanReview(decision = {}) {
  return Boolean(
    decision.route === 'human-review' ||
    decision.authority !== 'within-sandbox-scope' ||
    decision.uncertainty === 'high' ||
    decision.conflict === 'authority-conflict'
  );
}
