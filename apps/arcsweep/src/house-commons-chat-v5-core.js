import { CONSTELLATION_VOICES } from './feedback-loop.js';

export const HOUSE_CHAT_HOME_ROOM_ID = 'house-room:constellation';
export const HOUSE_CHAT_SELECTION_KEY = 'arcsweep.house-chat-selection/v2';
export const HOUSE_CHAT_DRAFT_TEXT_KEY = 'arcsweep.house-chat-draft-text/v2';
export const HOUSE_CHAT_DRAFT_HTML_KEY = 'arcsweep.house-chat-draft-html/v2';
export const HOUSE_CHAT_REPLY_KEY = 'arcsweep.house-chat-reply/v2';
export const HOUSE_CHAT_ACTIVE_ROOM_KEY = 'arcsweep.house-chat-active-room/v2';

export const HOUSE_CHAT_VOICES = Object.freeze([
  ...CONSTELLATION_VOICES,
  ...(CONSTELLATION_VOICES.some((voice) => voice.id === 'oxalpha') ? [] : [{
    id: 'oxalpha', name: 'Ox Alpha', route: 'oxalpha', model: 'GLM-5.3-Flash', roles: ['story', 'writing', 'roleplay', 'observation', 'structure'],
  }]),
]);

export function runtimeHouseVoices(presence = [], fallback = HOUSE_CHAT_VOICES) {
  const known = new Map(fallback.map((voice) => [voice.id, voice]));
  const live = (Array.isArray(presence) ? presence : []).filter((item) => item?.voice_id && item.state !== 'offline').map((item) => ({
    ...(known.get(item.voice_id) || {}), id: item.voice_id, name: item.display_name || known.get(item.voice_id)?.name || item.voice_id,
    route: item.route || known.get(item.voice_id)?.route || item.voice_id, provider: item.provider || null, model: item.model || null, state: item.state,
  }));
  return live.length ? live : fallback;
}

export const uuid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const commonsThreadId = (entry) => entry?.thread_id || entry?.turn_id || entry?.id || null;
export const voiceName = (id, voices = HOUSE_CHAT_VOICES) => voices.find((voice) => voice.id === id)?.name || id;
export const defaultVoiceIds = (voices = HOUSE_CHAT_VOICES) => voices.map((voice) => voice.id);
export function normaliseVoiceSelection(value, voices = HOUSE_CHAT_VOICES) { const allowed = new Set(voices.map((voice) => voice.id)); const selected = [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || '').trim().toLowerCase()).filter((id) => allowed.has(id)))]; return selected.length ? selected : defaultVoiceIds(voices); }
export function parseHouseMentions(message = '', voices = HOUSE_CHAT_VOICES) { const tokens = [...String(message).matchAll(/(^|\s)@([\w/-]+)/g)].map((match) => match[2].toLowerCase()); if (tokens.some((token) => token === 'all' || token === 'constellation')) return defaultVoiceIds(voices); return voices.filter((voice) => { const aliases = [voice.id, voice.name, voice.route].filter(Boolean).map((value) => String(value).toLowerCase().replace(/\s+/g, '')); return tokens.some((token) => aliases.includes(token.replace(/\s+/g, ''))); }).map((voice) => voice.id); }
export function roomContext(entries = [], roomId = '', limit = 24) { if (!roomId) return []; return entries.filter((entry) => commonsThreadId(entry) === roomId && entry?.text && !String(entry.id || '').startsWith('optimistic:')).slice(-limit).map((entry) => ({ speaker: String(entry.author || 'House').slice(0, 120), text: String(entry.text || '').slice(0, 6000) })); }
export function roomEntries(entries = [], roomId = '', { search = '', pinnedIds = null } = {}) { const needle = String(search || '').trim().toLowerCase(); const pins = pinnedIds ? new Set(pinnedIds) : null; return entries.filter((entry) => { if (roomId && commonsThreadId(entry) !== roomId) return false; if (pins && !pins.has(entry.id)) return false; if (!needle) return true; return [entry.author, entry.text, entry.voice_id, entry.runtime?.model, entry.runtime?.provider].filter(Boolean).join(' ').toLowerCase().includes(needle); }); }
export function latestRoomEntry(entries = [], roomId = '') { return entries.filter((entry) => commonsThreadId(entry) === roomId).sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || ''))).at(-1) || null; }
export function createOptimisticStewardEntry({ roomId, turnId, text, formattedText = null, richTextHtml = null, replyTo = null, mentions = [], attachments = [], world = null, idempotencyKey = null } = {}) { const now = new Date().toISOString(); return { schema: 'hearthgate.house-commons-entry/v4', id: `optimistic:${turnId || uuid()}`, created_at: now, kind: 'steward', author: 'Rowan', status: 'sending', world, thread_id: roomId, turn_id: turnId, reply_to: replyTo, mentions, attachments, formatted_text: formattedText, rich_text_html: richTextHtml, idempotency_key: idempotencyKey, text, optimistic: true }; }
export function deliveryState(entry) { if (entry?.optimistic && entry?.status === 'failed') return 'failed'; if (entry?.optimistic) return 'sending'; if (entry?.kind === 'steward') return entry?.status === 'sent' ? 'sent' : entry?.status || 'delivered'; return entry?.status || 'received'; }
export function roomLabel(room, unread = 0) { const prefix = room?.kind === 'direct' ? '@' : '#'; return `${prefix}${room?.slug || room?.title || 'room'}${unread ? ` (${unread})` : ''}`; }
export function directRoomId(voiceId) { return `house-room:dm:${String(voiceId || '').trim().toLowerCase()}`; }
export function directRoomSeed(voiceId, voices = HOUSE_CHAT_VOICES) { const voice = voices.find((item) => item.id === voiceId); if (!voice) return null; return { id: directRoomId(voice.id), slug: voice.id, title: voice.name, topic: `Direct House room with ${voice.name}.`, kind: 'direct', participants: [voice.id], world_id: null, archived: false }; }
