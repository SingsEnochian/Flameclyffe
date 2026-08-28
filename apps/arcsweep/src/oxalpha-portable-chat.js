import { OXALPHA_EDGE_URL, OXALPHA_DEFAULT_MODEL, OXALPHA_DEFAULT_PROVIDER, OXALPHA_EDGE_EXECUTION_PATH } from './aemeth-oxalpha-transport.js';
import { getKelyranSupabase } from './kelyran-supabase.js';

export const OXALPHA_PORTABLE_CHAT_SCHEMA = 'arcsweep.oxalpha-portable-chat/v1';

async function signedInSupabaseAccessToken() {
  try {
    const client = await getKelyranSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) return '';
    return String(data.session?.access_token || '').trim();
  } catch { return ''; }
}

export async function invokeOxAlphaPortableChat({
  message,
  sessionId = '',
  context = [],
  metadata = {},
  accessToken = '',
  accessTokenProvider = signedInSupabaseAccessToken,
  fetchImpl = fetch,
} = {}) {
  const visible = String(message || '').trim();
  if (!visible) throw new Error('Ox Alpha portable chat requires a message.');
  const token = String(accessToken || await accessTokenProvider() || '').trim();
  if (!token) throw new Error('Ox Alpha portable chat requires a signed-in Flameclyffe Supabase session.');
  const startedAt = globalThis.performance?.now?.() ?? Date.now();
  const response = await fetchImpl(OXALPHA_EDGE_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      message: visible,
      session_id: sessionId || `house-oxalpha-${Date.now()}`,
      context: Array.isArray(context) ? context : [],
      metadata: { ...metadata, surface: metadata.surface || 'house-chat-portable' },
    }),
  });
  const latencyMs = Math.max(0, Math.round((globalThis.performance?.now?.() ?? Date.now()) - startedAt));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Ox Alpha portable route failed (${response.status}).`);
  if (String(data.flame_id || '').toLowerCase() !== 'oxalpha') throw new Error(`Ox Alpha portable identity mismatch: received ${data.flame_id || 'unknown'}.`);
  const reply = String(data.message || '').trim();
  if (!reply) throw new Error('Ox Alpha portable route returned an empty reply.');
  return Object.freeze({
    schema: OXALPHA_PORTABLE_CHAT_SCHEMA,
    status: 'replied',
    voiceId: 'oxalpha',
    route: 'oxalpha',
    message: reply,
    provider: data.provider || OXALPHA_DEFAULT_PROVIDER,
    model: data.model || OXALPHA_DEFAULT_MODEL,
    sourceModel: data.inference_model || data.model || OXALPHA_DEFAULT_MODEL,
    profileId: `portable:oxalpha:${data.provider || OXALPHA_DEFAULT_PROVIDER}:${data.model || OXALPHA_DEFAULT_MODEL}`,
    citedSources: data.cited_sources || [],
    usage: data.usage || null,
    latencyMs,
    firstTokenMs: null,
    runtimeWorldContextId: metadata.world_context?.context_id || null,
    executionPath: data.execution_path || OXALPHA_EDGE_EXECUTION_PATH,
    bufferedCompatibility: true,
  });
}
