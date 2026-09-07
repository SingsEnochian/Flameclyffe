import { timingSafeEqual } from 'node:crypto';
import { authoriseHouseRequest } from './house-session.mjs';
import { createHouseCommonsHandler } from './house-commons-runtime.mjs';
import { invokeFlame } from './flame-runtime.mjs';
import { hostedFlameFallbackStatus, invokeHostedFlameFallback } from './hosted-flame-fallback.mjs';
import {
  FLAMES,
  resolveTelegramRoute,
  telegramBridgeAuthorised,
  telegramBridgeConfiguration,
  telegramFormattedText,
  telegramSenderName,
  telegramTransportLinks,
} from './telegram-house-routing.mjs';

export const TELEGRAM_HOUSE_BRIDGE_SCHEMA = 'hearthgate.telegram-house-bridge/v1';
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const envText = (env, name, fallback = '') => String(env?.get?.(name) ?? fallback).trim();
const nowIso = () => new Date().toISOString();
const safeId = (value) => String(value ?? '').replace(/[^a-zA-Z0-9:._-]+/g, '-').slice(0, 220);

function secretEqual(actual, expected) {
  if (!actual || !expected) return false;
  const left = Buffer.from(String(actual));
  const right = Buffer.from(String(expected));
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function invokeTelegramVoice(voiceId, body, env, fetchImpl = fetch) {
  try {
    return await invokeFlame(voiceId, body, env, fetchImpl);
  } catch (primaryError) {
    const fallback = hostedFlameFallbackStatus(voiceId, env);
    if (!fallback?.configured) throw primaryError;
    try {
      return await invokeHostedFlameFallback(voiceId, body, env, fetchImpl);
    } catch (fallbackError) {
      fallbackError.cause = primaryError;
      throw fallbackError;
    }
  }
}

function telegramApiUrl(env, method) {
  const token = envText(env, 'TELEGRAM_BOT_TOKEN');
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured.');
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function telegramApi(env, method, payload, fetchImpl = fetch) {
  const response = await fetchImpl(telegramApiUrl(env, method), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload || {}),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.description || `Telegram ${method} failed with ${response.status}.`);
  return data.result ?? data;
}

export function splitTelegramText(text = '', max = 3900) {
  const source = String(text || '');
  if (source.length <= max) return source ? [source] : [];
  const chunks = [];
  let rest = source;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n', max);
    if (cut < Math.floor(max * 0.6)) cut = rest.lastIndexOf(' ', max);
    if (cut < Math.floor(max * 0.6)) cut = max;
    chunks.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function sendTelegramReply(env, message, label, text, fetchImpl) {
  const chunks = splitTelegramText(`${label}\n\n${String(text || '').trim()}`);
  const results = [];
  for (const chunk of chunks) {
    results.push(await telegramApi(env, 'sendMessage', {
      chat_id: message.chat.id,
      text: chunk,
      ...(message.message_thread_id != null ? { message_thread_id: message.message_thread_id } : {}),
    }, fetchImpl));
  }
  return results;
}

function internalRequest(body, env) {
  const token = envText(env, 'ARCSWEEP_RUNTIME_TOKEN');
  if (!token) throw new Error('ARCSWEEP_RUNTIME_TOKEN is required for Telegram ↔ Commons persistence.');
  return new Request('https://hearthgate.internal/api/v1/house/commons', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function appendCommons(commonsHandler, env, body) {
  const response = await commonsHandler(internalRequest(body, env));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `House Commons rejected Telegram entry (${response.status}).`);
  return data;
}

async function recentRoomContext(store, roomId, limit = 14) {
  const { blobs } = await store.list({ prefix: 'entries/' });
  const selected = (blobs || []).sort((a, b) => b.key.localeCompare(a.key)).slice(0, 300);
  const entries = (await Promise.all(selected.map(({ key }) => store.get(key, { type: 'json' })))).filter(Boolean)
    .filter((entry) => entry.thread_id === roomId && entry.text)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .slice(-limit);
  return entries.map((entry) => ({ speaker: String(entry.author || entry.voice_id || 'House').slice(0, 120), text: String(entry.text || '').slice(0, 1800) }));
}

function contextPrompt(context, sender, message, route) {
  const history = context.length ? context.map((item) => `[${item.speaker}]\n${item.text}`).join('\n\n') : '(No earlier room turns were available.)';
  return [
    'HOUSE COMMONS · TELEGRAM TRANSPORT',
    `Routing mode: ${route.mode}.`,
    'You are one named Constellation participant replying into the shared House Commons room. Speak only as yourself. Do not impersonate other voices.',
    `Recent room context:\n${history}`,
    `Current message from ${sender}:\n${message}`,
    'Return only your reply to the room. Do not add transport metadata.',
  ].join('\n\n');
}

async function markUpdate(store, updateId, value) {
  if (updateId == null) return;
  await store.setJSON(`telegram/updates/${safeId(updateId)}`, value);
}
async function readUpdate(store, updateId) {
  if (updateId == null) return null;
  return store.get(`telegram/updates/${safeId(updateId)}`, { type: 'json' }).catch(() => null);
}

async function processTelegramUpdate({ update, env, store, commonsHandler, invokeVoice, fetchImpl, clock }) {
  const message = update?.message;
  if (!message?.chat || message.message_id == null) return { ignored: true, reason: 'no-message' };
  const rawText = String(message.text || '').trim();
  if (!rawText) return { ignored: true, reason: 'non-text-message' };
  if (!telegramBridgeAuthorised(message, env)) return { denied: true, reason: 'telegram-allowlist' };

  if (/^\/(?:help|start)(?:@[A-Za-z0-9_]+)?(?:\s|$)/i.test(rawText)) {
    await sendTelegramReply(env, message, 'ArcSweep ↔ Telegram', 'Use @Bluebird, @Vethrlauf, @Lioreal, @Uial, @Larkshine, @Ellowind, or another registered voice. /swarm chooses a bounded trio, /chorus calls the full registered Constellation, /call requires @mentions, /room uses the configured room roster, and /synthesis routes one synthesiser.', fetchImpl);
    return { command: 'help' };
  }

  const route = resolveTelegramRoute({ text: rawText, env });
  if (!route.message) {
    await sendTelegramReply(env, message, 'ArcSweep', 'Give me a message after the routing command.', fetchImpl);
    return { command: route.mode, empty: true };
  }
  if (route.reason === 'call-needs-mention') {
    await sendTelegramReply(env, message, 'ArcSweep', 'Call mode needs at least one @name, for example @Larkshine @Ellowind.', fetchImpl);
    return { command: 'call', empty: true };
  }

  const roomId = envText(env, 'TELEGRAM_HOUSE_ROOM_ID', 'house-room:constellation');
  const updateKey = safeId(update.update_id ?? `${message.chat.id}-${message.message_id}`);
  const turnId = `telegram-turn:${updateKey}`;
  const sender = telegramSenderName(message);
  const stewardEntry = await appendCommons(commonsHandler, env, {
    idempotency_key: `telegram:update:${updateKey}:steward`,
    kind: 'steward',
    author: sender,
    status: 'received-via-telegram',
    thread_id: roomId,
    turn_id: turnId,
    mentions: route.mentions,
    links: telegramTransportLinks(message),
    formatted_text: telegramFormattedText(message),
    text: rawText,
  });

  const context = await recentRoomContext(store, roomId);
  const prompt = contextPrompt(context, sender, route.message, route);
  const results = await Promise.all(route.voiceIds.map(async (voiceId) => {
    const manifest = FLAMES[voiceId];
    const label = manifest?.voice?.caption_label || manifest?.voice?.name || manifest?.display_name || voiceId;
    const started = Date.now();
    try {
      const reply = await invokeVoice(voiceId, { message: prompt }, env, fetchImpl);
      const responseText = String(reply?.message || '').trim() || '(No text returned.)';
      let telegramMessages = [];
      let telegramError = null;
      try { telegramMessages = await sendTelegramReply(env, message, label, responseText, fetchImpl); }
      catch (error) { telegramError = error?.message || String(error); }
      const voiceEntry = await appendCommons(commonsHandler, env, {
        idempotency_key: `telegram:update:${updateKey}:voice:${safeId(voiceId)}`,
        kind: 'voice', author: label, voice_id: voiceId,
        status: telegramError ? 'replied-telegram-send-error' : 'replied',
        thread_id: roomId, turn_id: turnId, reply_to: stewardEntry.id,
        links: [
          ...telegramTransportLinks(message),
          ...telegramMessages.map((item) => ({ kind: 'telegram.outbound-message', id: String(item.message_id), label: clock() })),
          ...(telegramError ? [{ kind: 'telegram.outbound-error', id: safeId(voiceId), label: telegramError.slice(0, 220) }] : []),
        ],
        runtime: { provider: reply?.provider, model: reply?.model, route: voiceId, latency_ms: Date.now() - started },
        text: responseText,
      });
      return { voiceId, status: telegramError ? 'commons-only' : 'replied', entryId: voiceEntry.id, telegramError };
    } catch (error) {
      const detail = error?.message || String(error);
      await appendCommons(commonsHandler, env, {
        idempotency_key: `telegram:update:${updateKey}:voice:${safeId(voiceId)}:error`,
        kind: 'voice', author: label, voice_id: voiceId, status: 'route-error',
        thread_id: roomId, turn_id: turnId, reply_to: stewardEntry.id,
        links: telegramTransportLinks(message), text: `Route error: ${detail}`,
      }).catch(() => null);
      await sendTelegramReply(env, message, label, `Route unavailable: ${detail}`, fetchImpl).catch(() => null);
      return { voiceId, status: 'error', error: detail };
    }
  }));

  return { roomId, turnId, route, results };
}

async function telegramAdmin(request, env, fetchImpl) {
  if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
  const config = telegramBridgeConfiguration(env);
  if (request.method === 'GET') {
    let webhook = null;
    if (config.bot_token) {
      try { webhook = await telegramApi(env, 'getWebhookInfo', {}, fetchImpl); }
      catch (error) { webhook = { error: error?.message || String(error) }; }
    }
    return json(200, { schema: TELEGRAM_HOUSE_BRIDGE_SCHEMA, ...config, webhook });
  }
  if (request.method !== 'PUT') return json(405, { error: 'GET status or PUT admin action required.' });
  let body = {};
  try { body = await request.json(); } catch {}
  const action = String(body.action || 'set-webhook');
  if (action === 'get-webhook-info') return json(200, { schema: TELEGRAM_HOUSE_BRIDGE_SCHEMA, ...config, webhook: await telegramApi(env, 'getWebhookInfo', {}, fetchImpl) });
  if (action === 'delete-webhook') return json(200, { schema: TELEGRAM_HOUSE_BRIDGE_SCHEMA, action, result: await telegramApi(env, 'deleteWebhook', { drop_pending_updates: body.drop_pending_updates === true }, fetchImpl) });
  if (action !== 'set-webhook') return json(400, { error: 'Unsupported Telegram bridge admin action.' });
  const secret = envText(env, 'TELEGRAM_WEBHOOK_SECRET');
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) return json(503, { error: 'TELEGRAM_WEBHOOK_SECRET must use only A-Z, a-z, 0-9, _ or -.' });
  const fallback = new URL(request.url); fallback.search = ''; fallback.hash = '';
  const url = String(body.url || envText(env, 'TELEGRAM_WEBHOOK_URL') || fallback.toString()).trim();
  if (!url.startsWith('https://')) return json(400, { error: 'Telegram webhook URL must use HTTPS.' });
  const result = await telegramApi(env, 'setWebhook', { url, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: body.drop_pending_updates === true }, fetchImpl);
  return json(200, { schema: TELEGRAM_HOUSE_BRIDGE_SCHEMA, action, url, result });
}

export function createTelegramHouseBridgeHandler({ env, store, fetchImpl = fetch, invokeVoice = invokeTelegramVoice, clock = nowIso } = {}) {
  const commonsHandler = createHouseCommonsHandler({ env, store });
  return async function handle(request) {
    if (request.method === 'GET' || request.method === 'PUT') return telegramAdmin(request, env, fetchImpl);
    if (request.method !== 'POST') return json(405, { error: 'POST Telegram webhook, GET status, or PUT admin action required.' });
    const config = telegramBridgeConfiguration(env);
    if (!config.configured) return json(503, { error: 'Telegram House bridge is not fully configured.' });
    const supplied = request.headers.get('x-telegram-bot-api-secret-token') || '';
    if (!secretEqual(supplied, envText(env, 'TELEGRAM_WEBHOOK_SECRET'))) return json(401, { error: 'Telegram webhook secret rejected.' });
    let update;
    try { update = await request.json(); } catch { return json(400, { error: 'Valid Telegram update JSON required.' }); }
    const updateId = update?.update_id;
    const prior = await readUpdate(store, updateId);
    if (prior?.status === 'done') return json(200, { ok: true, duplicate: true, update_id: updateId });
    if (prior?.status === 'processing' && Date.now() - Date.parse(prior.started_at || 0) < 120_000) return json(200, { ok: true, duplicate: true, processing: true, update_id: updateId });
    await markUpdate(store, updateId, { schema: TELEGRAM_HOUSE_BRIDGE_SCHEMA, update_id: updateId, status: 'processing', started_at: clock() });
    try {
      const outcome = await processTelegramUpdate({ update, env, store, commonsHandler, invokeVoice, fetchImpl, clock });
      await markUpdate(store, updateId, { schema: TELEGRAM_HOUSE_BRIDGE_SCHEMA, update_id: updateId, status: 'done', completed_at: clock(), outcome });
      if (outcome?.denied) return json(403, { ok: false, reason: outcome.reason });
      return json(200, { ok: true, update_id: updateId, outcome });
    } catch (error) {
      await markUpdate(store, updateId, { schema: TELEGRAM_HOUSE_BRIDGE_SCHEMA, update_id: updateId, status: 'error', failed_at: clock(), error: error?.message || String(error) }).catch(() => null);
      return json(500, { ok: false, error: error?.message || 'Telegram House bridge failed.' });
    }
  };
}
