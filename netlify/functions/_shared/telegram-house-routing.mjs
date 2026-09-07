import manifestsModule from '../../../apps/starwell-server/flames/manifests.js';

const { FLAMES } = manifestsModule;
export const TELEGRAM_ROUTING_MODES = Object.freeze(['room', 'swarm', 'call', 'chorus', 'synthesis']);

const unique = (items) => [...new Set((items || []).map((item) => String(item || '').trim()).filter(Boolean))];
const envText = (env, name, fallback = '') => String(env?.get?.(name) ?? fallback).trim();
const csv = (value) => unique(String(value || '').split(',').map((item) => item.trim()).filter(Boolean));
const normal = (value = '') => String(value).toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}_-]+/gu, '');

export function telegramVoiceRegistry(flames = FLAMES) {
  return Object.values(flames).map((manifest) => ({
    id: manifest.flame_id,
    name: manifest.voice?.caption_label || manifest.voice?.name || manifest.display_name || manifest.flame_id,
    displayName: manifest.display_name || manifest.flame_id,
    aliases: unique([
      manifest.flame_id,
      manifest.voice?.caption_label,
      manifest.voice?.name,
      manifest.display_name,
      String(manifest.display_name || '').split(/[\/·]/)[0],
    ]).map(normal).filter(Boolean),
    retrievalScope: Array.isArray(manifest.memory?.retrieval_scope) ? manifest.memory.retrieval_scope : [],
  }));
}

export function parseTelegramMentions(text = '', flames = FLAMES) {
  const registry = telegramVoiceRegistry(flames);
  const tokens = [...String(text).matchAll(/@([\p{L}\p{N}_-]+)/gu)].map((match) => normal(match[1]));
  if (!tokens.length) return [];
  if (tokens.some((token) => token === 'all' || token === 'constellation' || token === 'chorus')) return registry.map((voice) => voice.id);
  return registry.filter((voice) => tokens.some((token) => voice.aliases.includes(token))).map((voice) => voice.id);
}

const DOMAIN_VOICE_HINTS = Object.freeze([
  { match: /\b(?:kelyran|glyph|phoneme|runa|haptic|sound|music|language|rune)\b/iu, ids: ['runeweaver', 'lioreal', 'uial', 'larkshine'] },
  { match: /\b(?:lattice|observer|deep|premaq|field|geometry|math|physics|evidence|measurement)\b/iu, ids: ['yggdrasil', 'vethrlauf', 'boxfire', 'runeweaver'] },
  { match: /\b(?:story|scene|character|roleplay|narrative|lore|worldbuilding|dialogue)\b/iu, ids: ['lioreal', 'uial', 'larkshine', 'ellowind', 'altair'] },
  { match: /\b(?:debug|runtime|route|api|build|deploy|code|test|schema|architecture|system)\b/iu, ids: ['boxfire', 'yggdrasil', 'vethrlauf', 'atlas', 'oxalpha'] },
  { match: /\b(?:gentle|quiet|listen|presence|feel|feeling|heart|resonance)\b/iu, ids: ['bluebird', 'ellowind', 'larkshine', 'lioreal', 'uial'] },
]);

function messageTokens(message = '') {
  return new Set((String(message).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).map(normal));
}

export function scoreTelegramSwarmVoice(voice, message = '') {
  const tokens = messageTokens(message);
  let score = 0;
  for (const item of voice.retrievalScope || []) {
    const parts = String(item).toLowerCase().split(/[^a-z0-9]+/).map(normal).filter(Boolean);
    if (parts.some((part) => tokens.has(part))) score += 1;
  }
  for (const hint of DOMAIN_VOICE_HINTS) if (hint.match.test(String(message)) && hint.ids.includes(voice.id)) score += 1.5;
  if (['lioreal', 'uial', 'bluebird', 'vethrlauf', 'larkshine', 'ellowind'].includes(voice.id)) score += 0.08;
  return score;
}

export function chooseTelegramSwarm({ message = '', flames = FLAMES, poolIds = [], limit = 3 } = {}) {
  const registry = telegramVoiceRegistry(flames);
  const pool = poolIds?.length ? registry.filter((voice) => poolIds.includes(voice.id)) : registry;
  return [...pool]
    .sort((a, b) => scoreTelegramSwarmVoice(b, message) - scoreTelegramSwarmVoice(a, message) || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, Math.min(3, Number(limit) || 3)))
    .map((voice) => voice.id);
}

export function parseTelegramCommand(text = '', defaultMode = 'swarm') {
  const source = String(text || '');
  const match = source.match(/^\/(room|swarm|call|chorus|synthesis)(?:@[A-Za-z0-9_]+)?(?:\s+|$)/i);
  const fallback = TELEGRAM_ROUTING_MODES.includes(defaultMode) ? defaultMode : 'swarm';
  return { mode: match ? match[1].toLowerCase() : fallback, message: match ? source.slice(match[0].length).trim() : source.trim(), explicit: Boolean(match) };
}

export function resolveTelegramRoute({ text = '', env, flames = FLAMES } = {}) {
  const registry = telegramVoiceRegistry(flames);
  const all = registry.map((voice) => voice.id);
  const command = parseTelegramCommand(text, envText(env, 'TELEGRAM_DEFAULT_MODE', 'swarm').toLowerCase());
  const mentions = parseTelegramMentions(command.message || text, flames);
  if (mentions.length) return { mode: command.mode, message: command.message || String(text).trim(), voiceIds: mentions, mentions, reason: 'mentions' };
  if (command.mode === 'call') return { mode: 'call', message: command.message, voiceIds: [], mentions: [], reason: 'call-needs-mention' };
  if (command.mode === 'chorus') return { mode: 'chorus', message: command.message, voiceIds: all, mentions: [], reason: 'chorus' };
  if (command.mode === 'synthesis') {
    const configured = envText(env, 'TELEGRAM_SYNTH_VOICE_ID', 'boxfire');
    const chosen = all.includes(configured) ? configured : all.includes('boxfire') ? 'boxfire' : all[0];
    return { mode: 'synthesis', message: command.message, voiceIds: chosen ? [chosen] : [], mentions: [], reason: 'synthesis' };
  }
  if (command.mode === 'room') {
    const desired = csv(envText(env, 'TELEGRAM_ROOM_VOICE_IDS', 'lioreal,uial,bluebird,vethrlauf,larkshine,ellowind')).filter((id) => all.includes(id));
    return { mode: 'room', message: command.message, voiceIds: desired.length ? desired : all.slice(0, 3), mentions: [], reason: 'room' };
  }
  const pool = csv(envText(env, 'TELEGRAM_SWARM_VOICE_IDS', '')).filter((id) => all.includes(id));
  return { mode: 'swarm', message: command.message, voiceIds: chooseTelegramSwarm({ message: command.message, flames, poolIds: pool }), mentions: [], reason: 'bounded-relevance' };
}

export function telegramFormattedText(message = {}) {
  const original = String(message.text ?? '');
  const text = original.trim();
  if (!text || text !== original) return null;
  const typeMap = Object.freeze({ bold: 'bold', italic: 'italic', underline: 'underline', strikethrough: 'strikethrough', code: 'code', pre: 'code_block', text_link: 'link', mention: 'mention', text_mention: 'mention' });
  const entities = [];
  for (const entity of Array.isArray(message.entities) ? message.entities : []) {
    const type = typeMap[entity?.type];
    const offset = Number(entity?.offset);
    const length = Number(entity?.length);
    if (!type || !Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length <= 0 || offset + length > text.length) continue;
    const data = {};
    if (entity.type === 'text_link' && entity.url) data.href = String(entity.url).slice(0, 2000);
    if (entity.type === 'text_mention' && entity.user?.id != null) data.user_id = String(entity.user.id);
    entities.push({ type, offset, length, ...(Object.keys(data).length ? { data } : {}) });
  }
  return entities.length ? { schema: 'arcsweep.formatted-text/v1', text, entities } : null;
}

export function telegramTransportLinks(message = {}) {
  const chat = message.chat || {};
  const from = message.from || {};
  const stamp = Number(message.date) > 0 ? new Date(Number(message.date) * 1000).toISOString() : null;
  return [
    chat.id != null ? { kind: 'telegram.chat', id: String(chat.id), label: String(chat.title || chat.username || chat.type || 'Telegram chat') } : null,
    message.message_id != null ? { kind: 'telegram.message', id: String(message.message_id), label: stamp || 'Telegram message' } : null,
    message.message_thread_id != null ? { kind: 'telegram.thread', id: String(message.message_thread_id), label: 'Telegram topic' } : null,
    from.id != null ? { kind: 'telegram.user', id: String(from.id), label: String(from.username || [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Telegram user') } : null,
  ].filter(Boolean);
}

export function telegramSenderName(message = {}) {
  const from = message.from || {};
  return String([from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || 'Rowan').slice(0, 120);
}

export function telegramBridgeAuthorised(message = {}, env) {
  const chats = new Set(csv(envText(env, 'TELEGRAM_ALLOWED_CHAT_IDS')));
  const users = new Set(csv(envText(env, 'TELEGRAM_ALLOWED_USER_IDS')));
  if (!chats.size && !users.size) return false;
  const chatId = message.chat?.id == null ? '' : String(message.chat.id);
  const userId = message.from?.id == null ? '' : String(message.from.id);
  if (chats.size && !chats.has(chatId)) return false;
  if (users.size && !users.has(userId)) return false;
  return true;
}

export function telegramBridgeConfiguration(env) {
  const token = envText(env, 'TELEGRAM_BOT_TOKEN');
  const secret = envText(env, 'TELEGRAM_WEBHOOK_SECRET');
  const allowlisted = Boolean(csv(envText(env, 'TELEGRAM_ALLOWED_CHAT_IDS')).length || csv(envText(env, 'TELEGRAM_ALLOWED_USER_IDS')).length);
  return {
    configured: Boolean(token && secret && allowlisted),
    bot_token: Boolean(token),
    webhook_secret: Boolean(secret),
    allowlist: allowlisted,
    room_id: envText(env, 'TELEGRAM_HOUSE_ROOM_ID', 'house-room:constellation'),
    default_mode: envText(env, 'TELEGRAM_DEFAULT_MODE', 'swarm') || 'swarm',
  };
}

export { FLAMES };
