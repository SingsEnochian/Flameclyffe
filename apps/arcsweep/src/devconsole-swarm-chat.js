import { CONSTELLATION_VOICES } from './feedback-loop.js';
import { readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';

export const DEVCONSOLE_SWARM_MODE_KEY = 'arcsweep.devconsole-swarm-mode/v1';
export const DEVCONSOLE_SYNTH_VOICE_KEY = 'arcsweep.devconsole-synth-voice/v1';
export const DEVCONSOLE_SWARM_MODES = Object.freeze(['room', 'swarm', 'call', 'chorus', 'synthesis']);

const MODE_LABELS = Object.freeze({
  room: 'Room',
  swarm: 'Swarm',
  call: 'Call',
  chorus: 'Chorus',
  synthesis: 'Synthesis',
});

const ROLE_HINTS = Object.freeze([
  { match: /\b(?:code|runtime|route|bug|debug|dev|console|schema|api|build|deploy|test|system|architecture)\b/iu, roles: ['structure', 'systems', 'science', 'review', 'continuity'] },
  { match: /\b(?:observer|lattice|field|premaq|science|physics|math|geometry|measurement|evidence)\b/iu, roles: ['science', 'observation', 'structure', 'continuity', 'review'] },
  { match: /\b(?:kelyran|glyph|canon|language|word|phoneme|haptic|runa|sound|music)\b/iu, roles: ['canon', 'continuity', 'science', 'writing', 'structure'] },
  { match: /\b(?:story|scene|character|write|writing|roleplay|narrative|world|lore)\b/iu, roles: ['story', 'writing', 'roleplay', 'canon', 'continuity'] },
]);

const ANCHOR_BONUS = Object.freeze({
  runeweaver: 0.7,
  yggdrasil: 0.55,
  boxfire: 0.45,
  lioreal: 0.35,
  uial: 0.3,
  bluebird: 0.2,
  vethrlauf: 0.2,
  larkshine: 0.15,
  ellowind: 0.15,
});

const readLocal = (key, fallback = '') => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};
const writeLocal = (key, value) => {
  try { localStorage.setItem(key, String(value)); } catch {}
};

export function normaliseDevConsoleSwarmMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  return DEVCONSOLE_SWARM_MODES.includes(mode) ? mode : 'room';
}

export function readDevConsoleSwarmMode() {
  return normaliseDevConsoleSwarmMode(readLocal(DEVCONSOLE_SWARM_MODE_KEY, 'room'));
}

export function writeDevConsoleSwarmMode(value) {
  const mode = normaliseDevConsoleSwarmMode(value);
  writeLocal(DEVCONSOLE_SWARM_MODE_KEY, mode);
  return mode;
}

export function roleHintsForMessage(message = '') {
  const roles = new Set();
  for (const hint of ROLE_HINTS) if (hint.match.test(String(message))) hint.roles.forEach((role) => roles.add(role));
  if (!roles.size) ['continuity', 'writing', 'science'].forEach((role) => roles.add(role));
  return [...roles];
}

export function scoreSwarmVoice(voice, roles = []) {
  const voiceRoles = new Set(Array.isArray(voice?.roles) ? voice.roles : []);
  const overlap = roles.reduce((score, role) => score + (voiceRoles.has(role) ? 1 : 0), 0);
  return overlap + (ANCHOR_BONUS[voice?.id] || 0);
}

export function chooseDevConsoleSwarm({ message = '', selectedVoiceIds = [], voices = CONSTELLATION_VOICES, limit = 3 } = {}) {
  const allowed = new Set(voices.map((voice) => voice.id));
  const selected = [...new Set((selectedVoiceIds || []).map((id) => String(id || '').trim()).filter((id) => allowed.has(id)))];
  const pool = selected.length >= 2 ? voices.filter((voice) => selected.includes(voice.id)) : voices;
  const roles = roleHintsForMessage(message);
  return [...pool]
    .sort((a, b) => scoreSwarmVoice(b, roles) - scoreSwarmVoice(a, roles) || a.name.localeCompare(b.name))
    .slice(0, Math.max(1, Math.min(3, Number(limit) || 3)))
    .map((voice) => voice.id);
}

export function resolveDevConsoleRoute({
  mode = 'room',
  message = '',
  mentions = [],
  selectedVoiceIds = [],
  roomVoiceIds = [],
  voices = CONSTELLATION_VOICES,
  synthesisVoiceId = 'boxfire',
} = {}) {
  const safeMode = normaliseDevConsoleSwarmMode(mode);
  const all = voices.map((voice) => voice.id);
  const allowed = new Set(all);
  const mentioned = [...new Set((mentions || []).filter((id) => allowed.has(id)))];
  const selected = [...new Set((selectedVoiceIds || []).filter((id) => allowed.has(id)))];
  const room = [...new Set((roomVoiceIds || []).filter((id) => allowed.has(id)))];

  if (mentioned.length) return { mode: safeMode, voiceIds: mentioned, reason: 'mentions' };
  if (safeMode === 'call') return { mode: safeMode, voiceIds: [], reason: 'call-needs-mention' };
  if (safeMode === 'chorus') return { mode: safeMode, voiceIds: all, reason: 'chorus' };
  if (safeMode === 'swarm') return { mode: safeMode, voiceIds: chooseDevConsoleSwarm({ message, selectedVoiceIds: selected, voices }), reason: 'bounded-relevance' };
  if (safeMode === 'synthesis') {
    const chosen = allowed.has(synthesisVoiceId) ? synthesisVoiceId : allowed.has('boxfire') ? 'boxfire' : all[0];
    return { mode: safeMode, voiceIds: chosen ? [chosen] : [], reason: 'synthesis' };
  }
  return { mode: safeMode, voiceIds: room.length ? room : selected, reason: room.length ? 'room-participants' : 'selection' };
}

function parseMentions(text = '') {
  const tokens = [...String(text).matchAll(/@([\p{L}\p{N}_-]+)/gu)].map((match) => match[1].toLowerCase());
  if (tokens.some((token) => token === 'all' || token === 'constellation')) return CONSTELLATION_VOICES.map((voice) => voice.id);
  return CONSTELLATION_VOICES.filter((voice) => {
    const aliases = [voice.id, voice.name, voice.route].filter(Boolean).map((value) => String(value).toLowerCase().replaceAll(' ', ''));
    return tokens.some((token) => aliases.includes(token.replaceAll(' ', '')));
  }).map((voice) => voice.id);
}

function voiceCheckboxes(form) {
  return [...form.querySelectorAll('input[name="voiceIds"]')];
}

function currentMessage(form) {
  const editor = form?.querySelector('[data-commons-native-editor]');
  if (editor) return String(editor.innerText || '').trim();
  return String(form?.elements?.namedItem?.('message')?.value || '').trim();
}

function selectedVoiceIds(form) {
  return voiceCheckboxes(form).filter((input) => input.checked).map((input) => input.value);
}

function applyTurnSelection(form, ids) {
  const checks = voiceCheckboxes(form);
  const previous = checks.map((input) => [input, input.checked]);
  const chosen = new Set(ids);
  checks.forEach((input) => { input.checked = chosen.has(input.value); });
  return () => previous.forEach(([input, checked]) => { if (input.isConnected) input.checked = checked; });
}

function synthesisVoice() {
  const saved = readLocal(DEVCONSOLE_SYNTH_VOICE_KEY, 'boxfire');
  return CONSTELLATION_VOICES.some((voice) => voice.id === saved) ? saved : 'boxfire';
}

function statusSentence(form) {
  const mode = readDevConsoleSwarmMode();
  const message = currentMessage(form);
  const route = resolveDevConsoleRoute({ mode, message, mentions: parseMentions(message), selectedVoiceIds: selectedVoiceIds(form), synthesisVoiceId: synthesisVoice() });
  if (route.reason === 'call-needs-mention') return 'Call mode · use @name to summon one or more voices.';
  const names = route.voiceIds.map((id) => CONSTELLATION_VOICES.find((voice) => voice.id === id)?.name || id);
  if (mode === 'synthesis') return `Synthesis · ${names[0] || 'no synthesiser'} receives the room context.`;
  return `${MODE_LABELS[mode]} · ${names.join(' · ') || 'no route selected'}`;
}

function modeButtons() {
  return DEVCONSOLE_SWARM_MODES.map((mode) => `<button type="button" class="quiet mini dev-swarm-mode" data-dev-swarm-mode="${mode}" aria-pressed="false">${MODE_LABELS[mode]}</button>`).join('');
}

function synthOptions() {
  const current = synthesisVoice();
  return CONSTELLATION_VOICES.map((voice) => `<option value="${voice.id}" ${voice.id === current ? 'selected' : ''}>${voice.name}</option>`).join('');
}

async function houseRuntimeToken() {
  return readHouseRuntimeToken() || await restoreHouseRuntimeSession();
}

async function telegramBridgeRequest(method = 'GET', body = null) {
  const token = await houseRuntimeToken();
  if (!token) throw new Error('House Runtime offline. Connect once in Settings.');
  const response = await fetch('/api/v1/telegram/house', {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Telegram bridge returned ${response.status}.`);
  return data;
}

export function telegramBridgeStatusSentence(status) {
  if (!status) return 'Telegram · checking transport…';
  const pieces = [
    status.bot_token ? 'token ✓' : 'token missing',
    status.webhook_secret ? 'secret ✓' : 'secret missing',
    status.allowlist ? 'allowlist ✓' : 'allowlist missing',
  ];
  const webhookUrl = String(status.webhook?.url || '');
  const armed = Boolean(webhookUrl);
  return `Telegram · ${pieces.join(' · ')} · ${armed ? 'webhook armed' : 'webhook not armed'}`;
}

async function refreshTelegramPanel(panel) {
  const statusNode = panel?.querySelector('[data-telegram-bridge-status]');
  const arm = panel?.querySelector('[data-telegram-arm]');
  const disarm = panel?.querySelector('[data-telegram-disarm]');
  if (!statusNode) return null;
  statusNode.textContent = 'Telegram · checking transport…';
  try {
    const status = await telegramBridgeRequest('GET');
    panel.dataset.telegramConfigured = String(Boolean(status.configured));
    statusNode.textContent = telegramBridgeStatusSentence(status);
    if (arm) arm.disabled = !status.configured;
    if (disarm) disarm.disabled = !status.bot_token || !status.webhook?.url;
    return status;
  } catch (error) {
    panel.dataset.telegramConfigured = 'false';
    statusNode.textContent = `Telegram · ${error?.message || 'status unavailable'}`;
    if (arm) arm.disabled = true;
    if (disarm) disarm.disabled = true;
    return null;
  }
}

async function setTelegramWebhook(panel, armed) {
  const statusNode = panel?.querySelector('[data-telegram-bridge-status]');
  if (statusNode) statusNode.textContent = armed ? 'Telegram · arming webhook…' : 'Telegram · disarming webhook…';
  try {
    const body = armed
      ? { action: 'set-webhook', url: new URL('/api/v1/telegram/house', location.origin).toString() }
      : { action: 'delete-webhook' };
    await telegramBridgeRequest('PUT', body);
    return await refreshTelegramPanel(panel);
  } catch (error) {
    if (statusNode) statusNode.textContent = `Telegram · ${error?.message || 'webhook action failed'}`;
    return null;
  }
}

function ensurePanel(form) {
  if (!form || document.querySelector('[data-devconsole-swarm-chat]')) return;
  const chrome = document.querySelector('[data-house-room-chrome]') || form.closest('.commons-layout') || form.parentElement;
  if (!chrome) return;
  const panel = document.createElement('section');
  panel.className = 'devconsole-swarm-chat';
  panel.dataset.devconsoleSwarmChat = 'true';
  panel.innerHTML = `<div class="devconsole-swarm-head"><div><p class="eyebrow">DEVCONSOLE · Constellation routing</p><h3>Swarm Chat</h3></div><span class="devconsole-swarm-live" data-dev-swarm-status></span></div><div class="devconsole-swarm-controls" role="toolbar" aria-label="Swarm chat mode">${modeButtons()}<label class="devconsole-synth-select">Synthesiser <select data-dev-synth-voice>${synthOptions()}</select></label></div><p class="muted devconsole-swarm-note">Room keeps normal routing. Swarm chooses up to three relevant voices. Call requires @mentions. Chorus opens the full registered Constellation. Synthesis routes one voice without erasing the raw room transcript.</p><div class="devconsole-telegram"><div><strong>Telegram doorway</strong><span data-telegram-bridge-status>Telegram · checking transport…</span></div><div class="devconsole-telegram-actions"><button type="button" class="quiet mini" data-telegram-refresh>Refresh</button><button type="button" class="quiet mini" data-telegram-arm disabled>Arm webhook</button><button type="button" class="quiet mini" data-telegram-disarm disabled>Disarm</button></div></div>`;
  chrome.insertAdjacentElement('afterend', panel);

  const refresh = () => {
    const mode = readDevConsoleSwarmMode();
    panel.querySelectorAll('[data-dev-swarm-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.devSwarmMode === mode)));
    const status = panel.querySelector('[data-dev-swarm-status]');
    if (status) status.textContent = statusSentence(form);
    panel.dataset.mode = mode;
  };

  panel.querySelectorAll('[data-dev-swarm-mode]').forEach((button) => button.addEventListener('click', () => {
    writeDevConsoleSwarmMode(button.dataset.devSwarmMode);
    refresh();
  }));
  panel.querySelector('[data-dev-synth-voice]')?.addEventListener('change', (event) => {
    writeLocal(DEVCONSOLE_SYNTH_VOICE_KEY, event.target.value);
    refresh();
  });
  panel.querySelector('[data-telegram-refresh]')?.addEventListener('click', () => void refreshTelegramPanel(panel));
  panel.querySelector('[data-telegram-arm]')?.addEventListener('click', () => void setTelegramWebhook(panel, true));
  panel.querySelector('[data-telegram-disarm]')?.addEventListener('click', () => void setTelegramWebhook(panel, false));
  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);
  refresh();
  void refreshTelegramPanel(panel);
}

function routeBeforeSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'commons-form') return;
  const mode = readDevConsoleSwarmMode();
  if (mode === 'room') return;
  const message = currentMessage(form);
  const route = resolveDevConsoleRoute({
    mode,
    message,
    mentions: parseMentions(message),
    selectedVoiceIds: selectedVoiceIds(form),
    synthesisVoiceId: synthesisVoice(),
  });
  const restore = applyTurnSelection(form, route.voiceIds);
  queueMicrotask(restore);
  const panel = document.querySelector('[data-devconsole-swarm-chat]');
  if (panel?.querySelector('[data-dev-swarm-status]')) panel.querySelector('[data-dev-swarm-status]').textContent = route.reason === 'call-needs-mention' ? 'Call blocked · add @name.' : statusSentence(form);
}

function styles() {
  if (document.getElementById('devconsole-swarm-chat-styles')) return;
  const style = document.createElement('style');
  style.id = 'devconsole-swarm-chat-styles';
  style.textContent = `.devconsole-swarm-chat{display:grid;gap:.55rem;margin:.65rem 0;padding:.75rem .85rem;border:1px solid color-mix(in srgb,var(--sea) 34%,var(--line-soft));border-radius:.85rem;background:color-mix(in srgb,var(--panel-solid) 91%,var(--sea) 4%)}.devconsole-swarm-head{display:flex;justify-content:space-between;align-items:flex-start;gap:.8rem}.devconsole-swarm-head h3{margin:.05rem 0}.devconsole-swarm-head .eyebrow{margin:0}.devconsole-swarm-live{font-size:.74rem;color:var(--green);text-align:right}.devconsole-swarm-controls{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap}.dev-swarm-mode[aria-pressed="true"]{border-color:var(--gold);color:var(--gold);box-shadow:0 0 0 1px color-mix(in srgb,var(--gold) 35%,transparent)}.devconsole-synth-select{display:flex;align-items:center;gap:.35rem;margin-left:auto;font-size:.72rem;color:var(--muted)}.devconsole-synth-select select{min-width:8.5rem}.devconsole-swarm-note{margin:0;font-size:.72rem;line-height:1.45}.devconsole-telegram{display:flex;align-items:center;justify-content:space-between;gap:.7rem;padding:.55rem .65rem;border-top:1px solid color-mix(in srgb,var(--sea) 22%,var(--line-soft));margin-top:.15rem}.devconsole-telegram>div:first-child{display:grid;gap:.12rem}.devconsole-telegram strong{font-size:.76rem}.devconsole-telegram span{font-size:.7rem;color:var(--muted)}.devconsole-telegram-actions{display:flex;gap:.3rem;flex-wrap:wrap;justify-content:flex-end}@media(max-width:700px){.devconsole-swarm-head{display:grid}.devconsole-swarm-live{text-align:left}.devconsole-synth-select{margin-left:0;width:100%}.devconsole-synth-select select{flex:1}.devconsole-telegram{display:grid}.devconsole-telegram-actions{justify-content:flex-start}}`;
  document.head.append(style);
}

let installed = false;
let observer = null;

function enhance() {
  const form = document.querySelector('#commons-form');
  if (form) ensurePanel(form);
}

export function installDevConsoleSwarmChat() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  styles();
  document.addEventListener('submit', routeBeforeSubmit, true);
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  enhance();
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installDevConsoleSwarmChat();
