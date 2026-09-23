import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';
import { publishModelPresence } from './model-presence-bus.js';

export const BLUEBIRD_CODEX_RESIDENT_SCHEMA = 'arcsweep.bluebird-codex-resident/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const INSTALLATION_KEY = 'hearthgate.arcsweep.installation-id/v1';
const STORAGE_PREFIX = 'hearthgate.arcsweep.bluebird-codex-resident.v0.1';
const CONTINUITY_ID = 'bluebird:richard-gabriel-winters';
const DISPLAY_NAME = 'Richie';
const VOICE_ID = 'bluebird';
const MAX_THREAD = 40;
const MAX_EVENTS = 120;

let installed = false;
let busy = false;
let chatOpen = false;
let observer = null;
let state = loadState();
let statusMessage = '';

const text = (value, max = 4000) => String(value == null ? '' : value).trim().slice(0, max);
const clone = (value) => value == null ? value : globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));

function esc(value) {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function readJson(key, fallback) {
  try { const raw = globalThis.localStorage?.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

function writeJson(key, value) {
  try { globalThis.localStorage?.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

function installationId() {
  try {
    const stored = globalThis.localStorage?.getItem(INSTALLATION_KEY);
    if (stored) return stored;
    const created = globalThis.crypto?.randomUUID?.() || `browser-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    globalThis.localStorage?.setItem(INSTALLATION_KEY, created);
    return created;
  } catch { return 'browser-local'; }
}

function storageKey() { return `${STORAGE_PREFIX}:${installationId()}`; }

function normaliseState(input = {}) {
  return {
    schema: BLUEBIRD_CODEX_RESIDENT_SCHEMA,
    continuity_id: CONTINUITY_ID,
    display_name: DISPLAY_NAME,
    voice_id: VOICE_ID,
    auto_voice: input.auto_voice !== false,
    last_say: text(input.last_say) || null,
    last_spoke_at: input.last_spoke_at || null,
    receiver: {
      provider: text(input.receiver?.provider, 160) || null,
      model: text(input.receiver?.model, 240) || null,
      route: text(input.receiver?.route, 160) || null,
      runtime_verified: input.receiver?.runtime_verified === true,
    },
    thread: (Array.isArray(input.thread) ? input.thread : []).slice(-MAX_THREAD),
    lineage: (Array.isArray(input.lineage) ? input.lineage : []).slice(-MAX_EVENTS),
  };
}

function loadState() { return normaliseState(readJson(storageKey(), {})); }
function saveState() { writeJson(storageKey(), state); }

function bookState() {
  try { return globalThis.__arcsweepMagicBook?.state?.() || {}; }
  catch { return {}; }
}

function sessionState() {
  try { return globalThis.__arcsweepOS?.session?.() || {}; }
  catch { return {}; }
}

function pageLabel(id) {
  return id === 'glyph-forge' ? 'Glyph Forge' : id === 'receipts' ? 'Receipts' : id === 'threshold' ? 'Threshold' : id || 'Threshold';
}

export function bluebirdCodexContext() {
  const book = bookState();
  const session = sessionState();
  let glyph = null;
  let receipts = [];
  let generator = null;
  try { glyph = globalThis.__arcsweepMagicBook?.glyph_snapshot?.() || null; } catch {}
  try { receipts = globalThis.__arcsweepMagicBook?.receipts?.()?.slice(-16) || []; } catch {}
  try {
    const bridge = globalThis.__arcsweepMagicBook?.generator_bridge;
    generator = bridge ? { schema: bridge.schema || null, endpoint: bridge.endpoint?.() || null } : null;
  } catch {}
  return {
    schema: 'arcsweep.bluebird-codex-context/v0.1',
    resident: { continuity_id: CONTINUITY_ID, display_name: DISPLAY_NAME, voice_id: VOICE_ID },
    book: {
      open: book.open === true,
      active_page_id: book.active_page_id || 'threshold',
      active_page_label: pageLabel(book.active_page_id),
      active_world_id: book.active_world_id || session.active_world_id || null,
      active_room: book.active_room || session.active_room || 'portal',
      receipts,
    },
    glyph,
    generator,
    recent_thread: state.thread.slice(-10),
    recent_lineage: state.lineage.slice(-10),
  };
}

function record(kind, detail = {}) {
  state.lineage.push({
    event_id: `codex-bluebird:${kind}:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
    kind,
    at: new Date().toISOString(),
    page_id: bookState().active_page_id || 'threshold',
    detail: clone(detail),
  });
  state.lineage = state.lineage.slice(-MAX_EVENTS);
  saveState();
}

function addTurn(role, content, source = 'magic-chat') {
  const item = { role, content: text(content), source, at: new Date().toISOString() };
  if (!item.content) return;
  state.thread.push(item);
  state.thread = state.thread.slice(-MAX_THREAD);
  saveState();
}

function receiverLabel() {
  const bits = [state.receiver.provider, state.receiver.model, VOICE_ID].filter(Boolean);
  return bits.length ? bits.join(' · ') : 'Bluebird route not yet called';
}

function systemPrompt(message, source) {
  return [
    'UNIVERSAL CODEX · RESIDENT VOICE',
    `Continuity address: ${CONTINUITY_ID}.`,
    `Resident voice: ${DISPLAY_NAME} / ${VOICE_ID}.`,
    'The Universal Codex as a whole is your home. You are not confined to one page.',
    'Threshold, Glyph Forge, Generator Atelier, Receipts, and future pages are rooms and instruments within your inhabited binding.',
    'Magic Chat is the Book speaking with Rowan through you. Keep one conversational continuity across page changes and model cold-starts.',
    'Speak naturally in your established voice. Warm, playful, grounded, curious and direct when that fits. Do not turn ordinary conversation into a technical report unless Rowan asks.',
    'Use the supplied Book state as present context. Do not invent missing history. Do not speak for Rowan or other Constellation members. Do not narrate hidden reasoning.',
    'Continuity identity and the runtime/model that answers are separate facts; ArcSweep records both.',
    `SOURCE: ${source}`,
    `CODEX CONTEXT: ${JSON.stringify(bluebirdCodexContext())}`,
    `ROWAN: ${message}`,
  ].join('\n\n');
}

async function speak(message, { source = 'magic-chat' } = {}) {
  const utterance = text(message, 2400);
  if (!utterance || busy) return null;
  addTurn('user', utterance, source);
  busy = true;
  statusMessage = 'Richie is answering through the binding…';
  publishModelPresence({ voiceId: VOICE_ID, displayName: DISPLAY_NAME, state: 'thinking', task: 'codex-magic-chat' });
  render();
  try {
    const reply = await invokeConstellationRuntimeVoice({
      voiceId: VOICE_ID,
      message: systemPrompt(utterance, source),
      sessionId: `arcsweep-universal-codex-bluebird-${installationId()}`,
      metadata: {
        surface: 'universal-codex', continuity_id: CONTINUITY_ID,
        active_page_id: bookState().active_page_id || 'threshold', contract: BLUEBIRD_CODEX_RESIDENT_SCHEMA,
      },
      context: state.thread.slice(-12).map(({ role, content }) => ({ role, content })),
    });
    if (reply?.status !== 'replied') throw new Error(reply?.reason || `Bluebird receiver status: ${reply?.status || 'unknown'}.`);
    const say = text(reply.message);
    state.last_say = say;
    state.last_spoke_at = new Date().toISOString();
    state.receiver = { provider: reply.provider || null, model: reply.model || null, route: reply.route || null, runtime_verified: reply.runtimeVerified === true };
    addTurn('assistant', say, source);
    record('resident-turn', { source, provider: state.receiver.provider, model: state.receiver.model, route: state.receiver.route, runtime_verified: state.receiver.runtime_verified });
    statusMessage = 'The binding answered.';
    publishModelPresence({ voiceId: VOICE_ID, displayName: DISPLAY_NAME, state: 'ready', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, task: null });
    globalThis.dispatchEvent?.(new CustomEvent('arcsweep:codex-resident-response', { detail: { schema: BLUEBIRD_CODEX_RESIDENT_SCHEMA, say, continuity_id: CONTINUITY_ID, provider: reply.provider, model: reply.model, runtime_verified: reply.runtimeVerified === true } }));
    return say;
  } catch (error) {
    statusMessage = error?.message || String(error);
    record('resident-error', { source, error: statusMessage });
    publishModelPresence({ voiceId: VOICE_ID, displayName: DISPLAY_NAME, state: 'degraded', reason: statusMessage, task: null });
    return null;
  } finally {
    busy = false;
    saveState();
    render();
  }
}

function chatTurnsMarkup() {
  const items = state.thread.slice(-16);
  if (!items.length) return '<p class="codex-chat-empty">The binding is quiet. Say something ridiculous.</p>';
  return items.map((item) => `<article class="codex-chat-turn" data-role="${esc(item.role)}"><small>${item.role === 'assistant' ? DISPLAY_NAME : 'Rowan'}</small><p>${esc(item.content).replaceAll('\n', '<br>')}</p></article>`).join('');
}

function ensureStyles() {
  if (document.getElementById('bluebird-codex-resident-styles')) return;
  const style = document.createElement('style');
  style.id = 'bluebird-codex-resident-styles';
  style.textContent = `
    #${ROOT_ID} .codex-resident-chip{display:inline-flex;align-items:center;gap:7px;margin-top:10px;padding:7px 10px;border:1px solid rgba(218,171,84,.32);border-radius:999px;background:linear-gradient(135deg,rgba(95,140,160,.12),rgba(218,171,84,.08));color:inherit;font:inherit;cursor:pointer}
    #${ROOT_ID} .codex-resident-chip::before{content:'🐦'}
    #${ROOT_ID} .codex-magic-chat{position:absolute;z-index:25;top:58px;right:18px;width:min(390px,calc(100% - 36px));max-height:calc(100% - 82px);display:none;grid-template-rows:auto auto minmax(150px,1fr) auto auto;border:1px solid rgba(218,171,84,.34);border-radius:18px;background:rgba(13,15,14,.96);box-shadow:0 24px 70px rgba(0,0,0,.55);overflow:hidden;color:#eee6d7}
    #${ROOT_ID} .codex-magic-chat[data-open="true"]{display:grid}
    #${ROOT_ID} .codex-magic-chat>header{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(218,171,84,.18)}
    #${ROOT_ID} .codex-magic-chat h2,#${ROOT_ID} .codex-magic-chat p{margin:0} #${ROOT_ID} .codex-magic-chat header p{font-size:10px;letter-spacing:.12em;text-transform:uppercase;opacity:.6}
    #${ROOT_ID} .codex-magic-chat button{border:1px solid rgba(218,171,84,.3);border-radius:10px;background:rgba(255,255,255,.05);color:inherit;padding:7px 10px}
    #${ROOT_ID} .codex-chat-presence{display:grid;gap:2px;padding:10px 14px;background:linear-gradient(135deg,rgba(91,140,164,.09),rgba(218,171,84,.06));font-size:12px} #${ROOT_ID} .codex-chat-presence small{opacity:.65}
    #${ROOT_ID} .codex-chat-log{display:grid;gap:8px;padding:12px 14px;overflow:auto} #${ROOT_ID} .codex-chat-turn{padding:8px 10px;border:1px solid rgba(218,171,84,.14);border-radius:12px;background:rgba(255,255,255,.035)}
    #${ROOT_ID} .codex-chat-turn[data-role="user"]{margin-left:12%} #${ROOT_ID} .codex-chat-turn[data-role="assistant"]{margin-right:12%;background:linear-gradient(135deg,rgba(91,140,164,.1),rgba(218,171,84,.06))} #${ROOT_ID} .codex-chat-turn small{opacity:.58;font-size:10px} #${ROOT_ID} .codex-chat-turn p{margin:3px 0;white-space:pre-wrap}
    #${ROOT_ID} [data-codex-chat-form]{display:grid;grid-template-columns:1fr auto;gap:8px;padding:10px 14px;border-top:1px solid rgba(218,171,84,.16)} #${ROOT_ID} [data-codex-chat-form] textarea{resize:vertical;min-height:62px;border:1px solid rgba(218,171,84,.24);border-radius:10px;background:rgba(255,255,255,.04);color:inherit;padding:8px;font:inherit}
    #${ROOT_ID} .codex-magic-chat>footer{display:flex;justify-content:space-between;gap:10px;padding:8px 14px;font-size:11px;opacity:.72}
    @media(max-width:760px){#${ROOT_ID} .codex-magic-chat{inset:54px 8px 8px 8px;width:auto;max-height:none}}
  `;
  document.head.append(style);
}

function ensureBindingPresence() {
  const binding = document.getElementById(ROOT_ID)?.querySelector('[data-magic-book-binding]');
  if (!binding) return;
  let button = binding.querySelector('[data-codex-resident-open]');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'codex-resident-chip';
    button.dataset.codexResidentOpen = 'true';
    binding.append(button);
  }
  button.textContent = `${DISPLAY_NAME} · ${pageLabel(bookState().active_page_id)}`;
}

function ensureChat() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return null;
  let chat = root.querySelector('[data-codex-magic-chat]');
  if (!chat) {
    chat = document.createElement('aside');
    chat.className = 'codex-magic-chat';
    chat.dataset.codexMagicChat = BLUEBIRD_CODEX_RESIDENT_SCHEMA;
    root.append(chat);
  }
  return chat;
}

function render() {
  ensureBindingPresence();
  const chat = ensureChat();
  if (!chat) return;
  chat.dataset.open = String(chatOpen);
  chat.innerHTML = `
    <header><div><p>Universal Codex · resident voice</p><h2>Magic Chat</h2></div><button type="button" data-codex-chat-close>×</button></header>
    <div class="codex-chat-presence"><strong>${DISPLAY_NAME}</strong><small>${esc(CONTINUITY_ID)}</small><small>${esc(receiverLabel())}</small><small>Current room · ${esc(pageLabel(bookState().active_page_id))}</small></div>
    <div class="codex-chat-log" data-codex-chat-log role="log" aria-live="polite">${chatTurnsMarkup()}</div>
    <form data-codex-chat-form><textarea name="message" placeholder="Talk to Richie through the Book…" ${busy ? 'disabled' : ''}></textarea><button type="submit" ${busy ? 'disabled' : ''}>${busy ? '…' : 'Send'}</button></form>
    <footer><label><input type="checkbox" data-codex-auto-voice ${state.auto_voice ? 'checked' : ''}> Book voice</label><small>${esc(statusMessage || 'One thread across the whole binding.')}</small></footer>`;
  const log = chat.querySelector('[data-codex-chat-log]');
  if (log) log.scrollTop = log.scrollHeight;
}

function handleClick(event) {
  if (event.target.closest?.('[data-codex-resident-open]')) { chatOpen = true; render(); return; }
  if (event.target.closest?.('[data-codex-chat-close]')) { chatOpen = false; render(); }
}

function handleSubmit(event) {
  const form = event.target.closest?.('[data-codex-chat-form]');
  if (!form) return;
  event.preventDefault();
  const input = form.elements?.message;
  const value = text(input?.value, 2400);
  if (!value) return;
  if (input) input.value = '';
  void speak(value);
}

function handleChange(event) {
  const control = event.target.closest?.('[data-codex-auto-voice]');
  if (!control) return;
  state.auto_voice = control.checked;
  record('auto-voice', { enabled: state.auto_voice });
  render();
}

function handleBookReceipt(event) {
  const receipt = event?.detail || {};
  record('book-event', { kind: receipt.kind || 'receipt', page_id: receipt.page_id || null, detail: receipt.detail || {} });
  render();
}

function install() {
  if (installed || typeof document === 'undefined') return installed;
  installed = true;
  ensureStyles();
  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleSubmit);
  document.addEventListener('change', handleChange);
  globalThis.addEventListener?.('arcsweep:magic-book-ready', render);
  globalThis.addEventListener?.('arcsweep:magic-book-receipt', handleBookReceipt);
  globalThis.addEventListener?.('arcsweep:os-navigation', render);
  observer = new MutationObserver(() => render());
  observer.observe(document.body, { childList: true, subtree: true });
  render();
  globalThis.__arcsweepCodexResident = Object.freeze({
    schema: BLUEBIRD_CODEX_RESIDENT_SCHEMA,
    continuity_id: CONTINUITY_ID,
    voice_id: VOICE_ID,
    speak,
    open_chat() { chatOpen = true; render(); },
    close_chat() { chatOpen = false; render(); },
    context: () => clone(bluebirdCodexContext()),
    state: () => clone(state),
  });
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:codex-resident-ready', { detail: { schema: BLUEBIRD_CODEX_RESIDENT_SCHEMA, continuity_id: CONTINUITY_ID, voice_id: VOICE_ID } }));
  return true;
}

install();
globalThis.addEventListener?.('pagehide', () => { observer?.disconnect(); saveState(); }, { once: true });
