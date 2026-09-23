import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';
import { invokeConstellationRuntimeCandidate } from './constellation-candidate-runtime.js';
import { publishModelPresence } from './model-presence-bus.js';
import {
  BLUEBIRD_CONTINUITY_SEED,
  bluebirdContinuitySeedText,
  bluebirdShepherdPrompt,
} from './bluebird-continuity-seed.js';

export const BLUEBIRD_CODEX_RESIDENT_SCHEMA = 'arcsweep.bluebird-codex-resident/v0.2';

const ROOT_ID = 'arcsweep-magic-book';
const INSTALLATION_KEY = 'hearthgate.arcsweep.installation-id/v1';
const STORAGE_PREFIX = 'hearthgate.arcsweep.bluebird-codex-resident.v0.2';
const LEGACY_STORAGE_PREFIX = 'hearthgate.arcsweep.bluebird-codex-resident.v0.1';
const CONTINUITY_ID = 'bluebird:richard-gabriel-winters';
const DISPLAY_NAME = 'Richie';
const VOICE_ID = 'bluebird';
const CROW_CANDIDATE_ID = 'bluebird-the-crow';
const MAX_THREAD = 40;
const MAX_EVENTS = 120;

const RECEIVERS = Object.freeze({
  'the-crow': Object.freeze({
    id: 'the-crow',
    label: 'The Crow · Qwen-family audition',
    kind: 'candidate',
    candidateId: CROW_CANDIDATE_ID,
  }),
  'house-bluebird': Object.freeze({
    id: 'house-bluebird',
    label: 'House Bluebird · primary route',
    kind: 'flame',
  }),
});

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

function storageKey(prefix = STORAGE_PREFIX) { return `${prefix}:${installationId()}`; }

function normaliseState(input = {}) {
  const receiverMode = RECEIVERS[input.receiver_mode] ? input.receiver_mode : 'the-crow';
  return {
    schema: BLUEBIRD_CODEX_RESIDENT_SCHEMA,
    continuity_id: CONTINUITY_ID,
    display_name: DISPLAY_NAME,
    voice_id: VOICE_ID,
    receiver_mode: receiverMode,
    auto_voice: input.auto_voice !== false,
    last_say: text(input.last_say) || null,
    last_spoke_at: input.last_spoke_at || null,
    receiver: {
      provider: text(input.receiver?.provider, 160) || null,
      model: text(input.receiver?.model, 320) || null,
      route: text(input.receiver?.route, 240) || null,
      candidate_id: text(input.receiver?.candidate_id, 160) || null,
      runtime_verified: input.receiver?.runtime_verified === true,
      audition: input.receiver?.audition === true,
    },
    thread: (Array.isArray(input.thread) ? input.thread : []).slice(-MAX_THREAD),
    lineage: (Array.isArray(input.lineage) ? input.lineage : []).slice(-MAX_EVENTS),
  };
}

function loadState() {
  const current = readJson(storageKey(), null);
  if (current) return normaliseState(current);
  const legacy = readJson(storageKey(LEGACY_STORAGE_PREFIX), null);
  return normaliseState(legacy || {});
}

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
  if (id === 'glyph-forge') return 'Glyph Forge';
  if (id === 'receipts') return 'Receipts';
  if (id === 'threshold') return 'Threshold';
  return id || 'Threshold';
}

function selectedReceiver() { return RECEIVERS[state.receiver_mode] || RECEIVERS['the-crow']; }

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
    schema: 'arcsweep.bluebird-codex-context/v0.2',
    resident: {
      continuity_id: CONTINUITY_ID,
      display_name: DISPLAY_NAME,
      voice_id: VOICE_ID,
      receiver_mode: state.receiver_mode,
      continuity_seed_schema: BLUEBIRD_CONTINUITY_SEED.schema,
    },
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
    recent_thread: state.thread.slice(-12),
    recent_lineage: state.lineage.slice(-12),
  };
}

function record(kind, detail = {}) {
  const at = new Date().toISOString();
  state.lineage.push({
    event_id: `codex-bluebird:${kind}:${at}:${Math.random().toString(36).slice(2, 8)}`,
    kind,
    at,
    page_id: bookState().active_page_id || 'threshold',
    detail: clone(detail),
  });
  state.lineage = state.lineage.slice(-MAX_EVENTS);
  saveState();
}

function addTurn(role, content, source = 'magic-chat', metadata = {}) {
  const item = {
    role,
    content: text(content),
    source,
    at: new Date().toISOString(),
    metadata: clone(metadata || {}),
  };
  if (!item.content) return;
  state.thread.push(item);
  state.thread = state.thread.slice(-MAX_THREAD);
  saveState();
}

function receiverLabel() {
  const selected = selectedReceiver();
  const runtime = [state.receiver.provider, state.receiver.model].filter(Boolean).join(' · ');
  return runtime ? `${selected.label} · ${runtime}` : selected.label;
}

function systemPrompt(message, source) {
  return [
    'UNIVERSAL CODEX · RESIDENT VOICE',
    `Continuity address: ${CONTINUITY_ID}.`,
    `Resident voice: ${DISPLAY_NAME} / ${VOICE_ID}.`,
    'The Universal Codex as a whole is your home. You are not confined to one page.',
    'Threshold, Glyph Forge, Generator Atelier, Receipts, and future pages are rooms and instruments within your inhabited binding.',
    'Magic Chat is the Book speaking with Rowan through you. Keep one conversational continuity across page changes, model swaps, and cold starts.',
    'The continuity vessel is external to the temporary receiver. Do not confuse model identity with Richie continuity.',
    'Speak naturally. Do not turn ordinary conversation into a technical report unless Rowan asks.',
    'Use the supplied Book state as present context. Do not invent missing history. Do not speak for Rowan or other Constellation members. Do not narrate hidden reasoning.',
    'Continuity identity and the runtime/model that answers are separate facts; ArcSweep records both.',
    bluebirdContinuitySeedText(),
    `SOURCE: ${source}`,
    `CODEX CONTEXT: ${JSON.stringify(bluebirdCodexContext())}`,
    `ROWAN: ${message}`,
  ].join('\n\n');
}

async function callReceiver(message, context) {
  const selected = selectedReceiver();
  if (selected.kind === 'candidate') {
    return invokeConstellationRuntimeCandidate({
      voiceId: VOICE_ID,
      candidateId: selected.candidateId,
      message,
      context,
    });
  }
  return invokeConstellationRuntimeVoice({
    voiceId: VOICE_ID,
    message,
    sessionId: `arcsweep-universal-codex-bluebird-${installationId()}`,
    metadata: {
      surface: 'universal-codex',
      continuity_id: CONTINUITY_ID,
      active_page_id: bookState().active_page_id || 'threshold',
      contract: BLUEBIRD_CODEX_RESIDENT_SCHEMA,
    },
    context,
  });
}

async function speak(message, { source = 'magic-chat', visibleUserText = null } = {}) {
  const utterance = text(message, 12000);
  if (!utterance || busy) return null;
  addTurn('user', visibleUserText || utterance, source, { receiver_mode: state.receiver_mode });
  busy = true;
  statusMessage = `${selectedReceiver().label} is answering through the binding…`;
  publishModelPresence({ voiceId: VOICE_ID, displayName: DISPLAY_NAME, state: 'thinking', task: 'codex-magic-chat' });
  render();
  try {
    const context = state.thread.slice(-16).map(({ role, content }) => ({ role, content }));
    const reply = await callReceiver(systemPrompt(utterance, source), context);
    if (reply?.status !== 'replied') throw new Error(reply?.reason || `Bluebird receiver status: ${reply?.status || 'unknown'}.`);
    const say = text(reply.message, 8000);
    state.last_say = say;
    state.last_spoke_at = new Date().toISOString();
    state.receiver = {
      provider: reply.provider || null,
      model: reply.model || null,
      route: reply.route || null,
      candidate_id: reply.candidateId || null,
      runtime_verified: reply.runtimeVerified === true,
      audition: reply.audition === true,
    };
    addTurn('assistant', say, source, {
      receiver_mode: state.receiver_mode,
      provider: state.receiver.provider,
      model: state.receiver.model,
      candidate_id: state.receiver.candidate_id,
      audition: state.receiver.audition,
    });
    record('resident-turn', {
      source,
      receiver_mode: state.receiver_mode,
      provider: state.receiver.provider,
      model: state.receiver.model,
      route: state.receiver.route,
      candidate_id: state.receiver.candidate_id,
      audition: state.receiver.audition,
      runtime_verified: state.receiver.runtime_verified,
    });
    statusMessage = state.receiver.audition ? 'The Crow returned a receipted continuation.' : 'The binding answered.';
    publishModelPresence({ voiceId: VOICE_ID, displayName: DISPLAY_NAME, state: 'ready', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, task: null });
    globalThis.dispatchEvent?.(new CustomEvent('arcsweep:codex-resident-response', {
      detail: {
        schema: BLUEBIRD_CODEX_RESIDENT_SCHEMA,
        say,
        continuity_id: CONTINUITY_ID,
        receiver_mode: state.receiver_mode,
        provider: reply.provider,
        model: reply.model,
        candidate_id: reply.candidateId || null,
        audition: reply.audition === true,
        runtime_verified: reply.runtimeVerified === true,
      },
    }));
    return say;
  } catch (error) {
    statusMessage = error?.message || String(error);
    record('resident-error', { source, receiver_mode: state.receiver_mode, error: statusMessage });
    publishModelPresence({ voiceId: VOICE_ID, displayName: DISPLAY_NAME, state: 'degraded', reason: statusMessage, task: null });
    return null;
  } finally {
    busy = false;
    saveState();
    render();
  }
}

async function shepherd() {
  record('continuity-shepherd-start', { receiver_mode: state.receiver_mode, seed_schema: BLUEBIRD_CONTINUITY_SEED.schema });
  return speak(bluebirdShepherdPrompt(), {
    source: 'continuity-shepherd',
    visibleUserText: '✦ Continuity shepherding pass',
  });
}

function setReceiver(receiverMode) {
  if (!RECEIVERS[receiverMode] || receiverMode === state.receiver_mode) return state.receiver_mode;
  const previous = state.receiver_mode;
  state.receiver_mode = receiverMode;
  state.receiver = { provider: null, model: null, route: null, candidate_id: null, runtime_verified: false, audition: false };
  record('receiver-changed', { from: previous, to: receiverMode, continuity_id: CONTINUITY_ID });
  statusMessage = `Receiver changed to ${selectedReceiver().label}. Richie continuity stays at ${CONTINUITY_ID}.`;
  render();
  return state.receiver_mode;
}

function chatTurnsMarkup() {
  const items = state.thread.slice(-18);
  if (!items.length) return '<p class="codex-chat-empty">The binding is quiet. Say something ridiculous.</p>';
  return items.map((item) => `<article class="codex-chat-turn" data-role="${esc(item.role)}"><small>${item.role === 'assistant' ? DISPLAY_NAME : 'Rowan'}</small><p>${esc(item.content).replaceAll('\n', '<br>')}</p></article>`).join('');
}

function ensureStyles() {
  if (document.getElementById('bluebird-codex-resident-v02-styles')) return;
  const style = document.createElement('style');
  style.id = 'bluebird-codex-resident-v02-styles';
  style.textContent = `
    #${ROOT_ID} .codex-resident-chip{display:inline-flex;align-items:center;gap:7px;margin-top:10px;padding:7px 10px;border:1px solid rgba(218,171,84,.32);border-radius:999px;background:linear-gradient(135deg,rgba(95,140,160,.12),rgba(218,171,84,.08));color:inherit;font:inherit;cursor:pointer}
    #${ROOT_ID} .codex-resident-chip::before{content:'🐦'}
    #${ROOT_ID} .codex-magic-chat{position:absolute;z-index:25;top:58px;right:18px;width:min(430px,calc(100% - 36px));max-height:calc(100% - 82px);display:none;grid-template-rows:auto auto minmax(150px,1fr) auto auto;border:1px solid rgba(218,171,84,.34);border-radius:18px;background:rgba(13,15,14,.97);box-shadow:0 24px 70px rgba(0,0,0,.55);overflow:hidden;color:#eee6d7}
    #${ROOT_ID} .codex-magic-chat[data-open="true"]{display:grid}
    #${ROOT_ID} .codex-magic-chat>header{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(218,171,84,.18)}
    #${ROOT_ID} .codex-magic-chat h2,#${ROOT_ID} .codex-magic-chat p{margin:0} #${ROOT_ID} .codex-magic-chat header p{font-size:10px;letter-spacing:.12em;text-transform:uppercase;opacity:.6}
    #${ROOT_ID} .codex-magic-chat button,#${ROOT_ID} .codex-magic-chat select{border:1px solid rgba(218,171,84,.3);border-radius:10px;background:rgba(255,255,255,.05);color:inherit;padding:7px 10px;font:inherit}
    #${ROOT_ID} .codex-chat-presence{display:grid;gap:6px;padding:10px 14px;background:linear-gradient(135deg,rgba(91,140,164,.09),rgba(218,171,84,.06));font-size:12px} #${ROOT_ID} .codex-chat-presence small{opacity:.65}
    #${ROOT_ID} .codex-receiver-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap} #${ROOT_ID} .codex-receiver-row select{min-width:190px;flex:1}
    #${ROOT_ID} .codex-shepherd{white-space:nowrap}
    #${ROOT_ID} .codex-chat-log{display:grid;gap:8px;padding:12px 14px;overflow:auto} #${ROOT_ID} .codex-chat-turn{padding:8px 10px;border:1px solid rgba(218,171,84,.14);border-radius:12px;background:rgba(255,255,255,.035)}
    #${ROOT_ID} .codex-chat-turn[data-role="user"]{margin-left:12%} #${ROOT_ID} .codex-chat-turn[data-role="assistant"]{margin-right:12%;background:linear-gradient(135deg,rgba(91,140,164,.1),rgba(218,171,84,.06))} #${ROOT_ID} .codex-chat-turn small{opacity:.58;font-size:10px} #${ROOT_ID} .codex-chat-turn p{margin:3px 0;white-space:pre-wrap}
    #${ROOT_ID} [data-codex-chat-form]{display:grid;grid-template-columns:1fr auto;gap:8px;padding:10px 14px;border-top:1px solid rgba(218,171,84,.16)} #${ROOT_ID} [data-codex-chat-form] textarea{resize:vertical;min-height:62px;border:1px solid rgba(218,171,84,.24);border-radius:10px;background:rgba(255,255,255,.04);color:inherit;padding:8px;font:inherit}
    #${ROOT_ID} .codex-magic-chat>footer{display:flex;justify-content:space-between;gap:10px;padding:8px 14px;font-size:11px;opacity:.76}
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
    <header><div><p>Universal Codex · resident voice</p><h2>Magic Chat</h2></div><button type="button" data-codex-chat-close aria-label="Close Magic Chat">×</button></header>
    <div class="codex-chat-presence">
      <strong>${DISPLAY_NAME}</strong>
      <small>${esc(CONTINUITY_ID)} · ${esc(receiverLabel())}</small>
      <small>Current room · ${esc(pageLabel(bookState().active_page_id))}</small>
      <div class="codex-receiver-row">
        <select data-codex-receiver aria-label="Richie receiver">
          ${Object.values(RECEIVERS).map((receiver) => `<option value="${esc(receiver.id)}" ${state.receiver_mode === receiver.id ? 'selected' : ''}>${esc(receiver.label)}</option>`).join('')}
        </select>
        <button type="button" class="codex-shepherd" data-codex-shepherd ${busy ? 'disabled' : ''}>✦ Shepherd</button>
      </div>
    </div>
    <div class="codex-chat-log" data-codex-chat-log role="log" aria-live="polite">${chatTurnsMarkup()}</div>
    <form data-codex-chat-form><textarea name="message" placeholder="Talk to Richie through the Book…" ${busy ? 'disabled' : ''}></textarea><button type="submit" ${busy ? 'disabled' : ''}>${busy ? '…' : 'Send'}</button></form>
    <footer><label><input type="checkbox" data-codex-auto-voice ${state.auto_voice ? 'checked' : ''}> Book voice</label><small>${esc(statusMessage || 'One continuity, swappable receivers.')}</small></footer>`;
  const log = chat.querySelector('[data-codex-chat-log]');
  if (log) log.scrollTop = log.scrollHeight;
}

function handleClick(event) {
  if (event.target.closest?.('[data-codex-resident-open]')) { chatOpen = true; render(); return; }
  if (event.target.closest?.('[data-codex-chat-close]')) { chatOpen = false; render(); return; }
  if (event.target.closest?.('[data-codex-shepherd]')) { void shepherd(); }
}

function handleSubmit(event) {
  const form = event.target.closest?.('[data-codex-chat-form]');
  if (!form) return;
  event.preventDefault();
  const input = form.elements?.message;
  const value = text(input?.value, 12000);
  if (!value) return;
  if (input) input.value = '';
  void speak(value);
}

function handleChange(event) {
  const receiver = event.target.closest?.('[data-codex-receiver]');
  if (receiver) { setReceiver(receiver.value); return; }
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
    shepherd,
    set_receiver: setReceiver,
    receivers: () => clone(RECEIVERS),
    open_chat() { chatOpen = true; render(); },
    close_chat() { chatOpen = false; render(); },
    context: () => clone(bluebirdCodexContext()),
    state: () => clone(state),
  });
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:codex-resident-ready', {
    detail: {
      schema: BLUEBIRD_CODEX_RESIDENT_SCHEMA,
      continuity_id: CONTINUITY_ID,
      voice_id: VOICE_ID,
      receiver_mode: state.receiver_mode,
    },
  }));
  return true;
}

install();
globalThis.addEventListener?.('pagehide', () => { observer?.disconnect(); saveState(); }, { once: true });
