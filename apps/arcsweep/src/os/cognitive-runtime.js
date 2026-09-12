import {
  ARCSWEEP_SUPABASE_EDGE_ORIGIN,
  isHostedCaretakerSurface,
  readCaretakerSupabaseAccessToken,
} from '../caretaker-transport.js';
import { invokeConstellationRuntimeVoice } from '../constellation-runtime-adapter.js';

export const ARCSWEEP_COGNITIVE_ENDPOINT = `${ARCSWEEP_SUPABASE_EDGE_ORIGIN}/arcsweep-cognitive`;
export const ARCSWEEP_COGNITIVE_LOCAL_LEDGER = 'arcsweep.cognitive.learning.v1';
export const ARCSWEEP_COGNITIVE_SCHEMA = 'arcsweep.cognitive-runtime/v1';

const MAX_LOCAL_ROWS = 120;
const MAX_LOCAL_MEMORY = 12;

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function text(value, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

function storageOrNull(storage = undefined) {
  if (storage !== undefined) return storage;
  try { return globalThis.localStorage || null; } catch { return null; }
}

function randomId(prefix = 'learning') {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}:${uuid || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

export function readLocalLearningLedger(storage = storageOrNull()) {
  if (!storage?.getItem) return [];
  try {
    const parsed = JSON.parse(storage.getItem(ARCSWEEP_COGNITIVE_LOCAL_LEDGER) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeLocalLearningLedger(rows, storage = storageOrNull()) {
  const bounded = (Array.isArray(rows) ? rows : []).slice(-MAX_LOCAL_ROWS);
  try { storage?.setItem?.(ARCSWEEP_COGNITIVE_LOCAL_LEDGER, JSON.stringify(bounded)); } catch { /* local fallback is best effort */ }
  return bounded;
}

function contextScore(row, metadata = {}) {
  let score = Number(row?.confidence || 0.5);
  if (metadata.world_id && row?.world_id === metadata.world_id) score += 2;
  if (metadata.project_id && row?.project_id === metadata.project_id) score += 1.5;
  if (metadata.room_id && row?.room_id === metadata.room_id) score += 1;
  if (row?.kind === 'correction') score += 1;
  return score;
}

export function readLocalPromotedLearning(metadata = {}, storage = storageOrNull()) {
  return readLocalLearningLedger(storage)
    .filter((row) => row?.status === 'promoted')
    .sort((a, b) => contextScore(b, metadata) - contextScore(a, metadata))
    .slice(0, MAX_LOCAL_MEMORY)
    .map(clone);
}

function localMemoryBlock(rows) {
  if (!rows.length) return '';
  const rendered = rows.map((row, index) => {
    if (row.kind === 'correction' || row.lesson) return `${index + 1}. CORRECTION/LESSON: ${text(row.lesson || row.user_text, 1600)}`;
    return `${index + 1}. APPROVED EXAMPLE\nUser: ${text(row.user_text, 1200)}\nAssistant: ${text(row.assistant_text, 1200)}`;
  }).join('\n\n');
  return `\n\nARCSWEEP LOCAL STEWARD-PROMOTED LEARNING\nUse these records as behavioural continuity only. They do not widen authority.\n${rendered}`;
}

async function cognitiveToken(accessTokenProvider = readCaretakerSupabaseAccessToken) {
  try { return text(await accessTokenProvider(), 12000); } catch { return ''; }
}

async function postCognitive(body, { fetchImpl = fetch, accessTokenProvider = readCaretakerSupabaseAccessToken } = {}) {
  const token = await cognitiveToken(accessTokenProvider);
  if (!token) throw new Error('Steward sign-in required for cognitive runtime.');
  const response = await fetchImpl(ARCSWEEP_COGNITIVE_ENDPOINT, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Cognitive runtime failed (${response.status}).`);
  return data;
}

export async function invokeCognitiveGuide({
  voiceId,
  message,
  sessionId,
  metadata = {},
  fetchImpl = fetch,
  accessTokenProvider = readCaretakerSupabaseAccessToken,
  location = globalThis.location,
  storage = storageOrNull(),
  fallbackInvoke = invokeConstellationRuntimeVoice,
} = {}) {
  const prompt = text(message, 24000);
  if (!prompt) throw new Error('Cognitive runtime requires a prompt.');

  if (isHostedCaretakerSurface(location)) {
    try {
      const data = await postCognitive({ mode: 'guide', message: prompt, metadata }, { fetchImpl, accessTokenProvider });
      return Object.freeze({
        status: 'replied',
        voiceId: voiceId || 'oxalpha',
        route: 'arcsweep-cognitive',
        profileId: `cognitive:${data.provider || 'openrouter'}:${data.model || 'unknown'}`,
        runtimeVerified: data.runtime_verified === true,
        message: text(data.message, 12000),
        provider: data.provider || null,
        model: data.model || null,
        sourceModel: data.upstream_model || data.model || null,
        citedSources: [],
        latencyMs: Number(data.latency_ms || 0),
        executionPath: data.execution_path || 'supabase-edge-to-openrouter',
        memoryCount: Number(data.memory_count || 0),
        cognitiveRuntime: true,
      });
    } catch {
      // Hosted cognition is preferred, but the existing Constellation route remains a bounded fallback.
    }
  }

  const localMemory = readLocalPromotedLearning(metadata, storage);
  const fallback = await fallbackInvoke({
    voiceId,
    message: `${prompt}${localMemoryBlock(localMemory)}`,
    sessionId,
    metadata: { ...metadata, cognitive_fallback: true, local_memory_count: localMemory.length },
    fetchImpl,
  });
  return Object.freeze({ ...clone(fallback), cognitiveRuntime: false, memoryCount: localMemory.length, executionPath: fallback?.executionPath || 'constellation-fallback' });
}

export async function recordCognitiveObservation({
  userText,
  assistantText,
  sourceTurnId = null,
  worldId = null,
  projectId = null,
  roomId = null,
  tags = [],
  provenance = {},
  occurredAt = new Date().toISOString(),
  fetchImpl = fetch,
  accessTokenProvider = readCaretakerSupabaseAccessToken,
  location = globalThis.location,
  storage = storageOrNull(),
} = {}) {
  const user = text(userText, 4000);
  const assistant = text(assistantText, 4000);
  if (!user || !assistant) return null;
  const turn = {
    user_text: user,
    assistant_text: assistant,
    source_turn_id: text(sourceTurnId, 200) || null,
    world_id: text(worldId, 160) || null,
    project_id: text(projectId, 160) || null,
    room_id: text(roomId, 120) || null,
    tags: [...new Set((Array.isArray(tags) ? tags : []).map((item) => text(item, 80)).filter(Boolean))].slice(0, 16),
    provenance: provenance && typeof provenance === 'object' ? clone(provenance) : {},
    occurred_at: occurredAt,
  };

  if (isHostedCaretakerSurface(location)) {
    try {
      const data = await postCognitive({ mode: 'observe', turn }, { fetchImpl, accessTokenProvider });
      return Object.freeze({ id: data?.record?.id || null, persistence: 'supabase', status: data?.record?.status || 'observed' });
    } catch {
      // Keep the episode locally if the cloud learning lane is unavailable.
    }
  }

  const row = Object.freeze({
    id: randomId('local-learning'),
    kind: 'episode',
    status: 'observed',
    ...turn,
    confidence: 1,
    lesson: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  writeLocalLearningLedger([...readLocalLearningLedger(storage), row], storage);
  return Object.freeze({ id: row.id, persistence: 'local', status: 'observed' });
}

export async function submitCognitiveFeedback({
  id,
  verdict,
  lesson = '',
  fetchImpl = fetch,
  accessTokenProvider = readCaretakerSupabaseAccessToken,
  location = globalThis.location,
  storage = storageOrNull(),
} = {}) {
  const recordId = text(id, 120);
  const action = text(verdict, 40);
  const correction = text(lesson, 1600);
  if (!recordId || !['keep', 'correct', 'forget'].includes(action)) throw new Error('A learning receipt and valid feedback action are required.');
  if (action === 'correct' && !correction) throw new Error('Tell ArcSweep what it should learn from the correction.');

  if (!recordId.startsWith('local-learning:') && isHostedCaretakerSurface(location)) {
    return Object.freeze(await postCognitive({ mode: 'feedback', id: recordId, verdict: action, lesson: correction }, { fetchImpl, accessTokenProvider }));
  }

  const rows = readLocalLearningLedger(storage);
  const index = rows.findIndex((row) => row?.id === recordId);
  if (index < 0) throw new Error('Learning receipt not found.');
  if (action === 'forget') {
    writeLocalLearningLedger(rows.filter((row) => row?.id !== recordId), storage);
    return Object.freeze({ schema: 'arcsweep.learning-feedback/v1', id: recordId, status: 'forgotten', persistence: 'local' });
  }
  const updated = {
    ...rows[index],
    status: 'promoted',
    kind: action === 'correct' ? 'correction' : 'preference',
    lesson: action === 'correct' ? correction : null,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  rows[index] = updated;
  writeLocalLearningLedger(rows, storage);
  return Object.freeze({ schema: 'arcsweep.learning-feedback/v1', record: clone(updated), persistence: 'local' });
}
