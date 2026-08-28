import { constellationRuntimeRouteForVoice } from './constellation-runtime-adapter.js';
import { HOUSE_COOKIE_SESSION, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import {
  compileFantasyRoleplayEnvelope,
  fantasyRoleplayMetadata,
  readHouseInteractionMode,
} from './fantasy-roleplay-runtime.js';
import { invokeOxAlphaPortableChat } from './oxalpha-portable-chat.js';

export const FLAME_CHAT_STREAM_SCHEMA = 'hearthgate.flame-chat-stream/v1';

function authHeaders(token) {
  return token && token !== HOUSE_COOKIE_SESSION ? { authorization: `Bearer ${token}` } : {};
}
async function activeSession(fetchImpl = fetch) {
  return readHouseRuntimeToken() || await restoreHouseRuntimeSession(fetchImpl);
}
function parseBlock(block) {
  if (!block || block.startsWith(':')) return null;
  const message = { event: 'message', id: null, data: '' };
  for (const line of block.split(/\r?\n/)) {
    const split = line.indexOf(':');
    const field = split < 0 ? line : line.slice(0, split);
    const value = split < 0 ? '' : line.slice(split + 1).replace(/^ /, '');
    if (field === 'event') message.event = value;
    if (field === 'id') message.id = value;
    if (field === 'data') message.data += `${value}\n`;
  }
  message.data = message.data.replace(/\n$/, '');
  try { message.payload = message.data ? JSON.parse(message.data) : null; } catch { message.payload = null; }
  return message;
}

async function portableOxAlphaStream({
  compiled,
  sessionId,
  context,
  metadata,
  worldContext,
  fetchImpl,
  onStarted,
  onDelta,
  onCompleted,
} = {}) {
  const reply = await invokeOxAlphaPortableChat({
    message: compiled.message,
    sessionId,
    context,
    metadata,
    fetchImpl,
  });
  const started = {
    schema: FLAME_CHAT_STREAM_SCHEMA,
    flame_id: 'oxalpha',
    provider: reply.provider,
    model: reply.model,
    runtime_world_context_id: worldContext?.context_id || null,
    portable: true,
  };
  const completed = {
    ...started,
    message: reply.message,
    usage: reply.usage,
    latency_ms: reply.latencyMs,
    first_token_ms: null,
    buffered_compatibility: true,
    execution_path: reply.executionPath,
  };
  onStarted(started);
  onDelta({ ...started, text: reply.message, message: reply.message });
  onCompleted(completed);
  return {
    ...reply,
    worldId: worldContext?.identity_anchor?.world_id || metadata.world_id || null,
    runtimeWorldContextId: worldContext?.context_id || null,
  };
}

export async function streamConstellationRuntimeVoice({
  voiceId,
  message,
  sessionId,
  context = [],
  metadata = {},
  worldContext = null,
  fetchImpl = fetch,
  signal = null,
  onStarted = () => {},
  onDelta = () => {},
  onCompleted = () => {},
  onError = () => {},
} = {}) {
  const route = await constellationRuntimeRouteForVoice(voiceId, fetchImpl);
  if (!route.available) throw new Error(`Flame route unavailable: ${route.status}`);
  const interactionMode = metadata.interaction_mode || readHouseInteractionMode();
  const compiled = await compileFantasyRoleplayEnvelope({
    voiceId: route.voiceId,
    message,
    mode: interactionMode,
    worldContext,
    fetchImpl,
  });
  const requestMetadata = fantasyRoleplayMetadata(compiled, { ...metadata, voice_id: route.voiceId });
  if (worldContext?.identity_anchor?.world_id) {
    requestMetadata.world_id = worldContext.identity_anchor.world_id;
    requestMetadata.world_context = worldContext;
  }

  const token = await activeSession(fetchImpl);
  if (!token) {
    if (route.voiceId === 'oxalpha') {
      return portableOxAlphaStream({ compiled, sessionId, context, metadata: requestMetadata, worldContext, fetchImpl, onStarted, onDelta, onCompleted });
    }
    throw new Error('House Runtime offline.');
  }

  let response;
  try {
    response = await fetchImpl(`/api/v1/flames/${route.route}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream', ...authHeaders(token) },
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
      body: JSON.stringify({
        message: compiled.message,
        session_id: sessionId || `arcsweep-${route.voiceId}-${Date.now()}`,
        context: Array.isArray(context) ? context : [],
        metadata: requestMetadata,
      }),
    });
  } catch (error) {
    if (route.voiceId === 'oxalpha' && error?.name !== 'AbortError' && !signal?.aborted) {
      return portableOxAlphaStream({ compiled, sessionId, context, metadata: requestMetadata, worldContext, fetchImpl, onStarted, onDelta, onCompleted });
    }
    throw error;
  }

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    if (route.voiceId === 'oxalpha' && response.status !== 401) {
      return portableOxAlphaStream({ compiled, sessionId, context, metadata: requestMetadata, worldContext, fetchImpl, onStarted, onDelta, onCompleted });
    }
    throw new Error(data.error || `Flame stream ${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = null;
  let started = null;
  let visible = '';
  while (true) {
    const next = await reader.read();
    buffer += decoder.decode(next.value || new Uint8Array(), { stream: !next.done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || '';
    for (const block of blocks) {
      const event = parseBlock(block);
      const payload = event?.payload;
      if (!payload || payload.schema !== FLAME_CHAT_STREAM_SCHEMA) continue;
      if (event.event === 'started') {
        started = payload;
        onStarted(payload);
      } else if (event.event === 'delta') {
        visible += String(payload.text || '');
        onDelta({ ...payload, message: visible });
      } else if (event.event === 'completed') {
        completed = payload;
        onCompleted(payload);
      } else if (event.event === 'error') {
        const error = new Error(payload.error || 'Flame stream failed.');
        error.payload = payload;
        onError(payload);
        throw error;
      }
    }
    if (next.done) break;
  }
  if (!completed) throw new Error('Flame stream closed before completion.');
  if (String(completed.flame_id || '').toLowerCase() !== String(route.route || '').toLowerCase()) throw new Error('Flame stream identity mismatch.');
  const worldId = worldContext?.identity_anchor?.world_id || requestMetadata.world_id || null;
  return {
    status: 'replied',
    voiceId: route.voiceId,
    route: route.route,
    message: String(completed.message || visible).trim(),
    provider: completed.provider || started?.provider || null,
    model: completed.model || started?.model || null,
    profileId: `house:${route.route}:${completed.provider || started?.provider || 'unknown'}:${completed.model || started?.model || 'unknown'}`,
    citedSources: completed.cited_sources || [],
    usage: completed.usage || null,
    latencyMs: completed.latency_ms ?? null,
    firstTokenMs: completed.first_token_ms ?? null,
    worldId,
    runtimeWorldContextId: completed.runtime_world_context_id || started?.runtime_world_context_id || worldContext?.context_id || null,
    bufferedCompatibility: completed.buffered_compatibility === true,
    interactionMode: compiled.mode,
    interactionSkillActive: compiled.active,
  };
}
