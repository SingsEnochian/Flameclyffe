import { WRITER_CONTEXT_EVENTS } from './writer-context-resolver.js';
import { CONSTELLATION_LENS_EVENTS } from './constellation-lens.js';

const ROUTES_URL = new URL('../skills/voice-runtime-routes.json', import.meta.url);
const STATE_EVENT = 'arcsweep:constellation-runtime-state';
const TOKEN_EVENT = 'arcsweep:constellation-runtime-token';
const ROUTE_STATES = new Set(['profile-defined', 'existing-runtime-binding', 'installed', 'credential-ready', 'runtime-verified']);
let sessionToken = null;
let routeRegistry = null;

function escapePacketValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

export async function loadConstellationRuntimeRoutes(fetchImpl = fetch) {
  if (routeRegistry) return routeRegistry;
  const response = await fetchImpl(ROUTES_URL);
  if (!response.ok) throw new Error(`Voice route registry failed: ${response.status}`);
  routeRegistry = await response.json();
  return routeRegistry;
}

export function clearConstellationRuntimeRouteCache() {
  routeRegistry = null;
}

export function setConstellationRuntimeToken(token) {
  sessionToken = String(token || '').trim() || null;
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent(STATE_EVENT, {
      detail: { state: sessionToken ? 'ready' : 'offline-no-token' },
    }));
  }
  return Boolean(sessionToken);
}

export function clearConstellationRuntimeToken() {
  return setConstellationRuntimeToken(null);
}

export function hasConstellationRuntimeToken() {
  return Boolean(sessionToken);
}

export async function constellationRuntimeRouteForVoice(voiceId, fetchImpl = fetch) {
  const voice = normalise(voiceId);
  const registry = await loadConstellationRuntimeRoutes(fetchImpl);
  const entry = registry.routes?.[voice] || null;
  if (!entry?.route || !entry?.profileId || !ROUTE_STATES.has(entry.status)) {
    return {
      available: false,
      voiceId: voice,
      route: entry?.route || null,
      profileId: entry?.profileId || null,
      status: entry?.status || 'route-unavailable',
      entry,
    };
  }
  return {
    available: true,
    voiceId: voice,
    route: entry.route,
    profileId: entry.profileId,
    provider: entry.provider || null,
    runtimeModel: entry.runtimeModel || null,
    sourceModel: entry.sourceModel || null,
    capabilities: entry.capabilities || [],
    status: entry.status,
    entry,
  };
}

function runtimeMismatch(route, data = {}) {
  const reasons = [];
  if (route.profileId && data.profile_id !== route.profileId) {
    reasons.push(`profile ${data.profile_id || '<missing>'} != ${route.profileId}`);
  }
  if (route.provider && normalise(data.provider) !== normalise(route.provider)) {
    reasons.push(`provider ${data.provider || '<missing>'} != ${route.provider}`);
  }
  if (route.sourceModel && data.source_model !== route.sourceModel) {
    reasons.push(`source ${data.source_model || '<missing>'} != ${route.sourceModel}`);
  }
  if (data.runtime_verified !== true) reasons.push('runtime attestation missing');
  return reasons;
}

export async function getConstellationRuntimeVoiceStatus(voiceId, fetchImpl = fetch) {
  const route = await constellationRuntimeRouteForVoice(voiceId, fetchImpl);
  if (!route.available) return { status: route.status, voiceId: route.voiceId, route };
  if (!sessionToken) return { status: 'offline-no-token', voiceId: route.voiceId, route };
  const response = await fetchImpl(`/api/v1/flames/${route.route}/status`, {
    headers: { authorization: `Bearer ${sessionToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { status: 'route-unavailable', voiceId: route.voiceId, route, detail: data.error || response.status };
  const profileMismatch = route.profileId !== data.profile_id;
  const providerMismatch = route.provider && normalise(route.provider) !== normalise(data.provider);
  const sourceMismatch = route.sourceModel && data.source_model !== route.sourceModel;
  if (profileMismatch || providerMismatch || sourceMismatch) {
    return {
      status: 'runtime-mismatch',
      voiceId: route.voiceId,
      route,
      expected: { profileId: route.profileId, provider: route.provider, sourceModel: route.sourceModel },
      actual: { profileId: data.profile_id || null, provider: data.provider || null, sourceModel: data.source_model || null, model: data.model || null },
    };
  }
  return {
    status: data.runtime_state || 'profile-defined',
    voiceId: route.voiceId,
    route,
    profileId: data.profile_id,
    provider: data.provider,
    model: data.model,
    sourceModel: data.source_model,
    capabilities: data.capabilities || route.capabilities,
    detail: data.runtime_detail || null,
  };
}

export async function invokeConstellationRuntimeVoice({
  voiceId,
  message,
  sessionId,
  metadata = {},
  context = [],
  fetchImpl = fetch,
} = {}) {
  const voice = normalise(voiceId);
  if (!voice) throw new Error('Constellation runtime invocation requires a voice id.');
  if (!String(message || '').trim()) throw new Error('Constellation runtime invocation requires a message.');
  const route = await constellationRuntimeRouteForVoice(voice, fetchImpl);
  if (!route.available) {
    return { status: 'unavailable', reason: route.status, voiceId: voice, route: route.route, profileId: route.profileId };
  }
  if (!sessionToken) return { status: 'offline-no-token', voiceId: voice, route: route.route, profileId: route.profileId };

  const response = await fetchImpl(`/api/v1/flames/${route.route}/chat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      message: String(message).trim(),
      session_id: sessionId || `arcsweep-${voice}-${Date.now()}`,
      context: Array.isArray(context) ? context : [],
      metadata: {
        ...metadata,
        voice_id: voice,
        expected_profile_id: route.profileId,
      },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (['runtime-profile-mismatch', 'runtime-model-mismatch'].includes(data.error)) {
      return {
        status: 'runtime-mismatch',
        reason: data.error,
        voiceId: voice,
        route: route.route,
        profileId: route.profileId,
        expected: { profileId: route.profileId, provider: route.provider, sourceModel: route.sourceModel, runtimeModel: route.runtimeModel },
        actual: data.runtime || data,
      };
    }
    return {
      status: 'route-error',
      reason: data.error || `${voice} route failed (${response.status})`,
      voiceId: voice,
      route: route.route,
      profileId: route.profileId,
    };
  }

  const mismatchReasons = runtimeMismatch(route, data);
  if (mismatchReasons.length) {
    return {
      status: 'runtime-mismatch',
      reason: mismatchReasons.join('; '),
      voiceId: voice,
      route: route.route,
      profileId: route.profileId,
      expected: { profileId: route.profileId, provider: route.provider, sourceModel: route.sourceModel, runtimeModel: route.runtimeModel },
      actual: { profileId: data.profile_id || null, provider: data.provider || null, sourceModel: data.source_model || null, model: data.model || null },
    };
  }

  return {
    status: 'replied',
    voiceId: voice,
    route: route.route,
    profileId: data.profile_id,
    runtimeVerified: true,
    message: String(data.message || '').trim(),
    provider: data.provider || null,
    model: data.model || null,
    sourceModel: data.source_model || null,
    capabilities: data.capabilities || route.capabilities,
    citedSources: data.cited_sources || [],
  };
}

function formatCells(cells = []) {
  if (!cells.length) return '- Context is open; no indexed voice cells matched this field.';
  return cells.map((cell) => {
    const authority = cell.authority?.kind || 'unknown';
    return `- [${cell.cellType} | ${authority} | ${cell.id}] ${cell.predicate}: ${escapePacketValue(cell.value)}`;
  }).join('\n');
}

function formatSubjectContext(subjects = []) {
  if (!subjects.length) return '- Narrative and character cortex are unselected for this field.';
  return subjects.map((subject) => {
    const head = `- ${subject.label || subject.id} [${subject.kind}]`;
    const cells = formatCells(subject.cells || []).split('\n').map((line) => `  ${line}`).join('\n');
    return `${head}\n${cells}`;
  }).join('\n');
}

export function buildMarginPrompt(packet, voiceContext) {
  const field = packet.fieldContext?.field || {};
  const page = packet.fieldContext?.page || {};
  return [
    'ARCSWEEP CONSTELLATION LENS · MARGIN CONTRIBUTION',
    `Voice: ${voiceContext.displayName} (${voiceContext.voiceId})`,
    `Mode: ${packet.mode}`,
    `World: ${page.worldId || 'unspecified'}`,
    `Document: ${page.documentId || 'unspecified'}`,
    `Scene: ${page.sceneId || 'unspecified'}`,
    `Field: ${field.label || field.name || field.key || 'untitled'} (${field.type || 'unknown'})`,
    `Current field value:\n${escapePacketValue(field.value)}`,
    'Relevant provenance-bearing continuity cells:',
    formatCells(voiceContext.cells),
    'Relevant narrative/character cortex:',
    formatSubjectContext(packet.subjects || []),
    'Instructions:',
    '- Speak as yourself; every other Constellation member retains their own voice and authorship.',
    '- Give the contribution that matters here. Be concise by default and expand when this field genuinely needs more.',
    '- Return the conclusion, observation, question, image, or flag that you choose to share; hidden reasoning stays internal.',
    '- Field text remains unchanged until the user explicitly applies an edit.',
    '- Quiet is valid participation. Return [QUIET] when you choose not to add anything here.',
    '- Refusal and pause remain valid agency signals. Begin with [REFUSAL] when that is your response.',
    '- For a direct question begin with [QUESTION]. For a continuity issue begin with [CONTINUITY]. For a canon issue begin with [CANON].',
  ].join('\n\n');
}

function parseMarginResponse(text = '') {
  const raw = String(text || '').trim();
  if (!raw || raw.startsWith('[QUIET]')) return { kind: 'quiet', text: '' };
  const markers = [
    ['[QUESTION]', 'question'],
    ['[CONTINUITY]', 'continuity'],
    ['[CANON]', 'canon'],
    ['[REFUSAL]', 'refusal'],
  ];
  for (const [marker, kind] of markers) {
    if (raw.startsWith(marker)) return { kind, text: raw.slice(marker.length).trim() };
  }
  return { kind: 'thought', text: raw };
}

async function invokeVoice(packet, voiceContext, fetchImpl = fetch) {
  const raw = await invokeConstellationRuntimeVoice({
    voiceId: voiceContext.voiceId,
    message: buildMarginPrompt(packet, voiceContext),
    sessionId: `arcsweep-lens-${packet.fieldContext?.page?.worldId || 'world'}-${voiceContext.voiceId}`,
    metadata: {
      writer_context_contract: packet.contract,
      writer_context_request_id: packet.requestId,
      field_key: packet.fieldContext?.field?.key || null,
    },
    fetchImpl,
  });
  if (raw.status !== 'replied') return raw;
  const parsed = parseMarginResponse(raw.message || '');
  return {
    ...raw,
    status: parsed.kind === 'quiet' ? 'quiet' : parsed.kind === 'refusal' ? 'refused' : 'replied',
    kind: parsed.kind,
    text: parsed.text,
  };
}

async function handleWriterContext(event) {
  const packet = event.detail;
  if (!packet?.fieldContext?.field?.key) return;
  if (!sessionToken) {
    document.dispatchEvent(new CustomEvent(STATE_EVENT, {
      detail: { state: 'offline-no-token', requestId: packet.requestId, fieldKey: packet.fieldContext.field.key },
    }));
    return;
  }

  const results = await Promise.allSettled((packet.voices || []).map((voice) => invokeVoice(packet, voice)));
  results.forEach((result, index) => {
    const voice = packet.voices[index];
    if (!voice) return;
    if (result.status === 'rejected') {
      document.dispatchEvent(new CustomEvent(STATE_EVENT, {
        detail: { state: 'voice-error', voiceId: voice.voiceId, error: result.reason?.message || 'Voice route failed.' },
      }));
      return;
    }
    const reply = result.value;
    if (reply.status === 'quiet' || reply.status === 'offline-no-token') return;
    if (['unavailable', 'route-error', 'runtime-mismatch'].includes(reply.status)) {
      document.dispatchEvent(new CustomEvent(STATE_EVENT, {
        detail: {
          state: reply.status === 'runtime-mismatch' ? 'runtime-mismatch' : 'voice-unavailable',
          voiceId: voice.voiceId,
          reason: reply.reason,
          expected: reply.expected,
          actual: reply.actual,
        },
      }));
      return;
    }
    document.dispatchEvent(new CustomEvent(CONSTELLATION_LENS_EVENTS.response, {
      detail: {
        fieldKey: packet.fieldContext.field.key,
        voiceId: voice.voiceId,
        voiceLabel: voice.displayName,
        kind: reply.kind,
        text: reply.text,
        profileId: reply.profileId,
        runtimeVerified: reply.runtimeVerified,
        provider: reply.provider,
        model: reply.model,
        sourceModel: reply.sourceModel,
        citedSources: reply.citedSources,
        requestId: packet.requestId,
        mode: packet.mode,
        fieldContext: packet.fieldContext,
        subjectTargets: (packet.subjects || []).map((subject) => ({ kind: subject.kind, id: subject.id, label: subject.label || subject.id })),
      },
    }));
  });
}

function receiveToken(event) {
  setConstellationRuntimeToken(event.detail?.token || null);
}

export function installConstellationRuntimeAdapter() {
  if (typeof document === 'undefined') return;
  document.addEventListener(WRITER_CONTEXT_EVENTS.ready, handleWriterContext);
  document.addEventListener(TOKEN_EVENT, receiveToken);
}

export const CONSTELLATION_RUNTIME_EVENTS = Object.freeze({ state: STATE_EVENT, token: TOKEN_EVENT });

if (typeof document !== 'undefined') installConstellationRuntimeAdapter();
