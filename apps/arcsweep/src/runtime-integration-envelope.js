export const ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA = 'arcsweep.runtime-integration-envelope/v1';

export const RUNTIME_PRESENCE_STATES = Object.freeze([
  'offline',
  'waking',
  'ready',
  'thinking',
  'speaking',
  'degraded',
  'error',
]);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function cleanId(value) {
  const text = String(value || '').trim();
  return text || null;
}

function cleanPresence(value) {
  const state = String(value || 'offline').trim().toLowerCase();
  return RUNTIME_PRESENCE_STATES.includes(state) ? state : 'error';
}

export function buildRuntimeIntegrationEnvelope({
  sessionId,
  world = null,
  canon = null,
  premaq = null,
  spiral = null,
  ask = null,
  provenance = [],
  activeFlame = null,
  presence = {},
  feedback = [],
  context = [],
  createdAt = new Date().toISOString(),
} = {}) {
  const resolvedSessionId = cleanId(sessionId);
  if (!resolvedSessionId) throw new Error('Runtime integration envelope requires sessionId.');

  const presenceMap = Object.fromEntries(
    Object.entries(presence || {}).map(([voiceId, state]) => [String(voiceId), cleanPresence(state)]),
  );

  return {
    schema: ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA,
    session_id: resolvedSessionId,
    created_at: createdAt,
    world: clone(world),
    canon: clone(canon),
    premaq: clone(premaq),
    spiral: clone(spiral),
    ask: clone(ask),
    active_flame: cleanId(activeFlame),
    presence: presenceMap,
    provenance: Array.isArray(provenance) ? clone(provenance) : [],
    feedback: Array.isArray(feedback) ? clone(feedback) : [],
    context: Array.isArray(context) ? clone(context) : [],
  };
}

export function updateRuntimePresence(envelope, voiceId, nextState) {
  if (envelope?.schema !== ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA) {
    throw new Error('Runtime presence update requires a valid Arcsweep runtime envelope.');
  }
  const id = cleanId(voiceId);
  if (!id) throw new Error('Runtime presence update requires voiceId.');
  return {
    ...clone(envelope),
    presence: {
      ...(envelope.presence || {}),
      [id]: cleanPresence(nextState),
    },
  };
}

export function appendRuntimeFeedback(envelope, entry) {
  if (envelope?.schema !== ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA) {
    throw new Error('Runtime feedback append requires a valid Arcsweep runtime envelope.');
  }
  const voiceId = cleanId(entry?.voice_id || entry?.voiceId);
  if (!voiceId) throw new Error('Runtime feedback entry requires voice_id.');

  const feedbackEntry = {
    id: cleanId(entry?.id) || `feedback-${voiceId}-${Date.now()}`,
    voice_id: voiceId,
    kind: cleanId(entry?.kind) || 'observation',
    text: String(entry?.text || '').trim(),
    confidence: entry?.confidence ?? null,
    supporting_receipts: Array.isArray(entry?.supporting_receipts) ? clone(entry.supporting_receipts) : [],
    do_not_change: Boolean(entry?.do_not_change),
    created_at: entry?.created_at || new Date().toISOString(),
  };

  return {
    ...clone(envelope),
    feedback: [...(envelope.feedback || []), feedbackEntry],
  };
}

export function runtimeEnvelopeSummary(envelope) {
  if (envelope?.schema !== ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA) return null;
  const states = Object.values(envelope.presence || {});
  return {
    sessionId: envelope.session_id,
    worldId: envelope.world?.identity_anchor?.world_id || envelope.world?.world_id || null,
    activeFlame: envelope.active_flame || null,
    readyVoices: states.filter((state) => state === 'ready').length,
    degradedVoices: states.filter((state) => state === 'degraded' || state === 'error').length,
    feedbackCount: (envelope.feedback || []).length,
    provenanceCount: (envelope.provenance || []).length,
  };
}
