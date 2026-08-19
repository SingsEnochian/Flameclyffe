import { loadVoiceBankRegistry } from './knowledge-bank-loader.js';
import { WRITER_CONTEXT_EVENTS } from './writer-context-resolver.js';
import { CONSTELLATION_LENS_EVENTS } from './constellation-lens.js';
import {
  HOUSE_COOKIE_SESSION,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
} from './house-runtime.js';

const STATE_EVENT = 'arcsweep:constellation-runtime-state';

function normalise(value) {
  return String(value || '').trim().toLowerCase();
}

function escapePacketValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function authHeaders(session) {
  return session && session !== HOUSE_COOKIE_SESSION ? { authorization: `Bearer ${session}` } : {};
}

async function activeHouseSession(fetchImpl = fetch) {
  const local = readHouseRuntimeToken();
  if (local) return local;
  return restoreHouseRuntimeSession(fetchImpl);
}

export async function constellationRuntimeRouteForVoice(voiceId, fetchImpl = fetch) {
  const voice = normalise(voiceId);
  if (!voice) return { available: false, voiceId: voice, route: null, status: 'voice-id-required' };
  const registry = await loadVoiceBankRegistry({ fetchImpl });
  const voices = [
    ...(registry.canonicalEstablishedVoices || []),
    ...(registry.developingVoices || []),
  ];
  const entry = voices.find((item) => item.id === voice || (item.runtimeAliases || []).map(normalise).includes(voice));
  const route = entry?.runtimeAliases?.find(Boolean) || entry?.id || null;
  return {
    available: Boolean(entry && route && entry.runtimeState !== 'unbound'),
    voiceId: entry?.id || voice,
    displayName: entry?.displayName || voice,
    route,
    entry: entry || null,
    status: entry ? (route ? 'house-route-defined' : 'route-unavailable') : 'voice-unregistered',
  };
}

export async function getConstellationRuntimeVoiceStatus(voiceId, fetchImpl = fetch) {
  const route = await constellationRuntimeRouteForVoice(voiceId, fetchImpl);
  if (!route.available) return { status: route.status, voiceId: route.voiceId, route };
  const session = await activeHouseSession(fetchImpl);
  if (!session) return { status: 'house-offline', voiceId: route.voiceId, route };
  const response = await fetchImpl(`/api/v1/flames/${route.route}/status`, {
    headers: authHeaders(session), credentials: 'same-origin', cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { status: 'route-unavailable', voiceId: route.voiceId, route, detail: data.error || response.status };
  if (normalise(data.flame_id) !== normalise(route.route)) {
    return { status: 'runtime-mismatch', voiceId: route.voiceId, route, actual: data.flame_id || null };
  }
  return {
    status: data.runtime_reachable === false ? 'runtime-unreachable' : data.model_available === false ? 'model-unavailable' : 'ready',
    voiceId: route.voiceId,
    displayName: data.display_name || route.displayName,
    route: route.route,
    provider: data.provider || null,
    model: data.model || null,
    runtimeReachable: data.runtime_reachable ?? null,
    modelAvailable: data.model_available ?? null,
    runtimeError: data.runtime_error || null,
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
  const route = await constellationRuntimeRouteForVoice(voiceId, fetchImpl);
  if (!route.available) return { status: 'unavailable', reason: route.status, voiceId: route.voiceId, route: route.route };
  if (!String(message || '').trim()) throw new Error('Constellation runtime invocation requires a message.');
  const session = await activeHouseSession(fetchImpl);
  if (!session) return { status: 'house-offline', voiceId: route.voiceId, route: route.route };

  const response = await fetchImpl(`/api/v1/flames/${route.route}/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders(session) },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({
      message: String(message).trim(),
      session_id: sessionId || `arcsweep-${route.voiceId}-${Date.now()}`,
      context: Array.isArray(context) ? context : [],
      metadata: { ...metadata, voice_id: route.voiceId },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { status: 'route-error', reason: data.error || `${route.voiceId} route failed (${response.status})`, voiceId: route.voiceId, route: route.route };

  const runtimeVerified = normalise(data.flame_id) === normalise(route.route)
    && Boolean(data.provider)
    && Boolean(data.model);
  if (!runtimeVerified) {
    return {
      status: 'runtime-mismatch',
      reason: 'House response did not attest the selected Flame route/provider/model.',
      voiceId: route.voiceId,
      route: route.route,
      actual: { flameId: data.flame_id || null, provider: data.provider || null, model: data.model || null },
    };
  }

  return {
    status: 'replied',
    voiceId: route.voiceId,
    route: route.route,
    profileId: `house:${route.route}:${data.provider}:${data.model}`,
    runtimeVerified: true,
    message: String(data.message || '').trim(),
    provider: data.provider || null,
    model: data.model || null,
    sourceModel: data.model || null,
    citedSources: data.cited_sources || [],
  };
}

function formatCells(cells = []) {
  if (!cells.length) return '- Context is open; no indexed voice cells matched this field.';
  return cells.map((cell) => `- [${cell.cellType} | ${cell.authority?.kind || 'unknown'} | ${cell.id}] ${cell.predicate}: ${escapePacketValue(cell.value)}`).join('\n');
}

function formatSubjectContext(subjects = []) {
  if (!subjects.length) return '- Narrative and character cortex are unselected for this field.';
  return subjects.map((subject) => {
    const cells = formatCells(subject.cells || []).split('\n').map((line) => `  ${line}`).join('\n');
    return `- ${subject.label || subject.id} [${subject.kind}]\n${cells}`;
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
    '- Speak as yourself. Other Constellation members retain their own voice and authorship.',
    '- Give only the conclusion, observation, question, image, or flag you choose to share. Hidden reasoning stays internal and is never requested or stored.',
    '- Field text remains unchanged until the user explicitly applies an edit.',
    '- Quiet is valid participation. Return [QUIET] when you choose not to add anything here.',
    '- Refusal and pause remain valid agency signals. Begin with [REFUSAL] when that is your response.',
    '- For a direct question begin with [QUESTION]. For a continuity issue begin with [CONTINUITY]. For a canon issue begin with [CANON].',
  ].join('\n\n');
}

function parseMarginResponse(text = '') {
  const raw = String(text || '').trim();
  if (!raw || raw.startsWith('[QUIET]')) return { kind: 'quiet', text: '' };
  for (const [marker, kind] of [['[QUESTION]', 'question'], ['[CONTINUITY]', 'continuity'], ['[CANON]', 'canon'], ['[REFUSAL]', 'refusal']]) {
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
  return { ...raw, status: parsed.kind === 'quiet' ? 'quiet' : parsed.kind === 'refusal' ? 'refused' : 'replied', kind: parsed.kind, text: parsed.text };
}

async function handleWriterContext(event) {
  const packet = event.detail;
  if (!packet?.fieldContext?.field?.key) return;
  const session = await activeHouseSession(fetch).catch(() => '');
  if (!session) {
    document.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: { state: 'house-offline', requestId: packet.requestId, fieldKey: packet.fieldContext.field.key } }));
    return;
  }

  const results = await Promise.allSettled((packet.voices || []).map((voice) => invokeVoice(packet, voice)));
  results.forEach((result, index) => {
    const voice = packet.voices[index];
    if (!voice) return;
    if (result.status === 'rejected') {
      document.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: { state: 'voice-error', voiceId: voice.voiceId, error: result.reason?.message || 'Voice route failed.' } }));
      return;
    }
    const reply = result.value;
    if (reply.status === 'quiet' || reply.status === 'house-offline') return;
    if (['unavailable', 'route-error', 'runtime-mismatch'].includes(reply.status)) {
      document.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: { state: reply.status, voiceId: voice.voiceId, reason: reply.reason, actual: reply.actual } }));
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

export function installConstellationRuntimeAdapter() {
  if (typeof document === 'undefined') return;
  document.addEventListener(WRITER_CONTEXT_EVENTS.ready, handleWriterContext);
}

export const CONSTELLATION_RUNTIME_EVENTS = Object.freeze({ state: STATE_EVENT });

if (typeof document !== 'undefined') installConstellationRuntimeAdapter();
