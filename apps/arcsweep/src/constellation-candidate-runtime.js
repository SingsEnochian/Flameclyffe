import {
  HOUSE_COOKIE_SESSION,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
} from './house-runtime.js';

function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

function authHeaders(session) {
  return session && session !== HOUSE_COOKIE_SESSION ? { authorization: `Bearer ${session}` } : {};
}

async function activeHouseSession(fetchImpl = fetch) {
  const local = readHouseRuntimeToken();
  if (local) return local;
  return restoreHouseRuntimeSession(fetchImpl);
}

export async function invokeConstellationRuntimeCandidate({
  voiceId,
  candidateId,
  message,
  context = [],
  fetchImpl = fetch,
} = {}) {
  const voice = normalise(voiceId);
  const candidate = String(candidateId || '').trim();
  const utterance = String(message || '').trim();
  if (!voice) throw new Error('Candidate invocation requires a voiceId.');
  if (!candidate) throw new Error('Candidate invocation requires a candidateId.');
  if (!utterance) throw new Error('Candidate invocation requires a message.');

  const session = await activeHouseSession(fetchImpl);
  if (!session) return { status: 'house-offline', voiceId: voice, candidateId: candidate };

  const startedAt = globalThis.performance?.now?.() ?? Date.now();
  const response = await fetchImpl(`/api/v1/flames/${encodeURIComponent(voice)}/audition/${encodeURIComponent(candidate)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(session) },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({
      message: utterance,
      context: Array.isArray(context) ? context : [],
    }),
  });
  const latencyMs = Math.max(0, Math.round((globalThis.performance?.now?.() ?? Date.now()) - startedAt));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      status: 'route-error',
      reason: data.error || `${candidate} audition failed (${response.status})`,
      voiceId: voice,
      candidateId: candidate,
      latencyMs,
    };
  }

  const runtimeVerified = normalise(data.flame_id) === voice
    && String(data.candidate_id || '') === candidate
    && Boolean(data.provider)
    && Boolean(data.model);
  if (!runtimeVerified) {
    return {
      status: 'runtime-mismatch',
      reason: 'Audition response did not attest the selected Flame/candidate/provider/model.',
      voiceId: voice,
      candidateId: candidate,
      latencyMs,
      actual: {
        flameId: data.flame_id || null,
        candidateId: data.candidate_id || null,
        provider: data.provider || null,
        model: data.model || null,
      },
    };
  }

  return {
    status: 'replied',
    voiceId: voice,
    candidateId: candidate,
    route: `${voice}/audition/${candidate}`,
    profileId: `audition:${voice}:${candidate}:${data.provider}:${data.model}`,
    runtimeVerified: true,
    audition: true,
    primaryRouteUnchanged: data.primary_route_unchanged !== false,
    message: String(data.message || '').trim(),
    provider: data.provider || null,
    model: data.model || null,
    sourceModel: data.model || null,
    executionPath: data.execution_path || null,
    reasoningEffort: data.reasoning_effort ?? null,
    usage: data.usage ?? null,
    latencyMs,
  };
}
