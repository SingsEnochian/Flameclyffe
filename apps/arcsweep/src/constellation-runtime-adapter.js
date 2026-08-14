import { WRITER_CONTEXT_EVENTS } from './writer-context-resolver.js';
import { CONSTELLATION_LENS_EVENTS } from './constellation-lens.js';

const ROUTES_URL = new URL('../skills/voice-runtime-routes.json', import.meta.url);
const STATE_EVENT = 'arcsweep:constellation-runtime-state';
const TOKEN_EVENT = 'arcsweep:constellation-runtime-token';
let sessionToken = null;
let routeRegistry = null;

function escapePacketValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
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
  const routes = await loadConstellationRuntimeRoutes(fetchImpl);
  const entry = routes.routes?.[String(voiceId || '').trim().toLowerCase()] || null;
  if (!entry?.route || entry.status !== 'configured') {
    return {
      available: false,
      voiceId: String(voiceId || '').trim().toLowerCase(),
      route: entry?.route || null,
      status: entry?.status || 'no-runtime-route',
    };
  }
  return {
    available: true,
    voiceId: String(voiceId || '').trim().toLowerCase(),
    route: entry.route,
    status: entry.status,
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
  const voice = String(voiceId || '').trim().toLowerCase();
  if (!voice) throw new Error('Constellation runtime invocation requires a voice id.');
  if (!String(message || '').trim()) throw new Error('Constellation runtime invocation requires a message.');
  const route = await constellationRuntimeRouteForVoice(voice, fetchImpl);
  if (!route.available) return { status: 'unavailable', reason: route.status, voiceId: voice, route: route.route };
  if (!sessionToken) return { status: 'offline-no-token', voiceId: voice, route: route.route };

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
      metadata: { ...metadata, voice_id: voice },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `${voice} route failed.`);
  return {
    status: 'replied',
    voiceId: voice,
    route: route.route,
    message: String(data.message || '').trim(),
    provider: data.provider || null,
    model: data.model || null,
    citedSources: data.cited_sources || [],
  };
}

function formatCells(cells = []) {
  if (!cells.length) return '- No indexed voice cells matched this field.';
  return cells.map((cell) => {
    const authority = cell.authority?.kind || 'unknown';
    return `- [${cell.cellType} | ${authority} | ${cell.id}] ${cell.predicate}: ${escapePacketValue(cell.value)}`;
  }).join('\n');
}

function formatSubjectContext(subjects = []) {
  if (!subjects.length) return '- No narrative or character cortex is registered for this field yet.';
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
    '- Respond only as yourself. Do not speak for another Constellation member.',
    '- Give one concise margin contribution relevant to this field.',
    '- Do not reveal hidden chain-of-thought. Give the conclusion, observation, question, or flag only.',
    '- Do not rewrite or insert into the field automatically.',
    '- If you have nothing useful to add, respond with [QUIET].',
    '- If you refuse or want to pause, begin with [REFUSAL].',
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
      detail: {
        state: 'offline-no-token',
        requestId: packet.requestId,
        fieldKey: packet.fieldContext.field.key,
      },
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
    if (reply.status === 'unavailable') {
      document.dispatchEvent(new CustomEvent(STATE_EVENT, {
        detail: { state: 'voice-unavailable', voiceId: voice.voiceId, reason: reply.reason },
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
        provider: reply.provider,
        model: reply.model,
        citedSources: reply.citedSources,
        requestId: packet.requestId,
        mode: packet.mode,
        fieldContext: packet.fieldContext,
        subjectTargets: (packet.subjects || []).map((subject) => ({
          kind: subject.kind,
          id: subject.id,
          label: subject.label || subject.id,
        })),
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

export const CONSTELLATION_RUNTIME_EVENTS = Object.freeze({
  state: STATE_EVENT,
  token: TOKEN_EVENT,
});

if (typeof document !== 'undefined') installConstellationRuntimeAdapter();
