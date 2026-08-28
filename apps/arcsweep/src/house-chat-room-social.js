import { CONSTELLATION_VOICES } from './feedback-loop.js';
import { MODEL_PRESENCE_EVENT, currentModelPresence } from './model-presence-bus.js';

export const HOUSE_CHAT_HOME_THREAD_KEY = 'arcsweep.house-chat-home-thread/v1';
export const HOUSE_CHAT_THREAD_TITLES_KEY = 'arcsweep.house-commons-thread-titles/v1';

const PORTRAIT_GLYPHS = Object.freeze({
  lioreal: 'VL',
  uial: 'FU',
  larkshine: '✦',
  ellowind: '◌',
  altair: 'A',
  atlas: 'AT',
  runeweaver: 'ᚱ',
  boxfire: '▣',
  yggdrasil: 'Y',
  bluebird: 'B',
  vethrlauf: 'V',
  rowan: 'R',
});

let installed = false;
let observer = null;
let decorateScheduled = false;
let initialLogReady = false;
let drawerOpen = false;
let routingOpen = false;
const seenEntryIds = new Set();

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
const writeJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

export function initialsForName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
}

export function voiceIdentityForLabel(label = '', voices = CONSTELLATION_VOICES) {
  const normal = String(label).trim().toLowerCase();
  if (!normal) return null;
  if (normal === 'rowan') return { id: 'rowan', name: 'Rowan', glyph: PORTRAIT_GLYPHS.rowan, roles: ['Steward'] };
  const voice = voices.find((item) => [item.id, item.name, item.route].filter(Boolean).some((value) => String(value).trim().toLowerCase() === normal));
  if (!voice) return null;
  return {
    id: voice.id,
    name: voice.name,
    glyph: PORTRAIT_GLYPHS[voice.id] || initialsForName(voice.name),
    roles: Array.isArray(voice.roles) ? voice.roles : [],
  };
}

export function chooseHomeThread({ saved = '', current = '', available = [] } = {}) {
  const options = [...new Set((available || []).map((value) => String(value || '').trim()).filter(Boolean))];
  if (current && options.includes(current)) return current;
  if (saved && options.includes(saved)) return saved;
  return options.at(-1) || '';
}

export function activePresenceSentence(records = []) {
  const active = (records || []).filter((record) => record && ['thinking', 'speaking'].includes(record.state));
  if (!active.length) return '';
  const names = active.map((record) => record.display_name || record.voice_id).filter(Boolean);
  const speaking = active.some((record) => record.state === 'speaking');
  const verb = speaking ? 'answering' : 'thinking';
  if (names.length === 1) return `${names[0]} is ${verb}…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are ${verb}…`;
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more are ${verb}…`;
}

export function presenceCounts(records = []) {
  return (records || []).reduce((counts, record) => {
    const state = record?.state || 'offline';
    counts.total += 1;
    if (['ready', 'thinking', 'speaking'].includes(state)) counts.available += 1;
    if (['thinking', 'speaking'].includes(state)) counts.active += 1;
    return counts;
  }, { total: 0, available: 0, active: 0 });
}

function readHomeThread() { try { return localStorage.getItem(HOUSE_CHAT_HOME_THREAD_KEY) || ''; } catch { return ''; } }
function writeHomeThread(value) { const id = String(value || '').trim(); try { id ? localStorage.setItem(HOUSE_CHAT_HOME_THREAD_KEY, id) : localStorage.removeItem(HOUSE_CHAT_HOME_THREAD_KEY); } catch {} return id; }
function titles() { return readJson(HOUSE_CHAT_THREAD_TITLES_KEY, {}); }
function ensureHomeTitle(threadId) {
  if (!threadId) return;
  const value = titles();
  if (!value[threadId]) { value[threadId] = 'Constellation Room'; writeJson(HOUSE_CHAT_THREAD_TITLES_KEY, value); }
}

function voiceRecords() {
  const map = new Map(currentModelPresence().map((record) => [record.voice_id, record]));
  return CONSTELLATION_VOICES.map((voice) => ({ voice, presence: map.get(voice.id) || null }));
}

function participantMarkup() {
  const selected = new Set([...document.querySelectorAll('#commons-form input[name="voiceIds"]:checked')].map((input) => input.value));
  const rows = voiceRecords();
  const voiceButtons = rows.map(({ voice, presence }) => {
    const identity = voiceIdentityForLabel(voice.id);
    const state = presence?.state || 'offline';
    const role = identity.roles[0] || 'Constellation';
    return `<button type="button" class="house-room-participant" data-room-participant="${esc(voice.id)}" data-state="${esc(state)}" aria-pressed="${selected.has(voice.id) ? 'true' : 'false'}" title="Route next unmentioned turn to ${esc(voice.name)}"><span class="house-room-avatar" aria-hidden="true">${esc(identity.glyph)}</span><span class="house-room-nameplate"><strong>${esc(voice.name)}</strong><small>${esc(role)} · ${esc(state)}</small></span><span class="house-room-presence-dot" aria-hidden="true"></span></button>`;
  }).join('');
  return `<div class="house-room-participant house-room-participant-self" data-state="ready"><span class="house-room-avatar" aria-hidden="true">R</span><span class="house-room-nameplate"><strong>Rowan</strong><small>Steward · you</small></span><span class="house-room-presence-dot" aria-hidden="true"></span></div>${voiceButtons}`;
}

function chromeMarkup() {
  return `<header class="house-room-header"><div class="house-room-heading"><span class="house-room-mark" aria-hidden="true">∞</span><div><strong data-house-room-title>Constellation Room</strong><small data-house-room-subtitle>House Chat · persistent room</small></div></div><div class="house-room-actions"><span class="house-room-online" data-house-room-online></span><button type="button" class="quiet mini" data-house-room-home>Home</button><button type="button" class="quiet mini" data-house-room-rooms aria-expanded="false">Rooms</button><button type="button" class="quiet mini" data-house-room-routing aria-expanded="false">Routing</button></div></header><nav class="house-room-participants" data-house-room-participants aria-label="House Chat participants">${participantMarkup()}</nav>`;
}

function ensureChrome(form) {
  const layout = form.closest('.commons-layout') || form.parentElement;
  if (!layout) return null;
  layout.classList.add('house-room-mode');
  let chrome = layout.querySelector('[data-house-room-chrome]');
  if (!chrome) {
    chrome = document.createElement('section');
    chrome.dataset.houseRoomChrome = 'true';
    chrome.className = 'house-room-chrome';
    chrome.innerHTML = chromeMarkup();
    layout.prepend(chrome);
  }
  return chrome;
}

function syncParticipantSelection(chrome, form) {
  const selected = new Set([...form.querySelectorAll('input[name="voiceIds"]:checked')].map((input) => input.value));
  chrome.querySelectorAll('[data-room-participant]').forEach((button) => button.setAttribute('aria-pressed', selected.has(button.dataset.roomParticipant) ? 'true' : 'false'));
}

function renderParticipants(chrome, form) {
  const nav = chrome.querySelector('[data-house-room-participants]');
  if (!nav) return;
  const scroll = nav.scrollLeft;
  nav.innerHTML = participantMarkup();
  nav.scrollLeft = scroll;
  nav.querySelectorAll('[data-room-participant]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = form.querySelector(`input[name="voiceIds"][value="${CSS.escape(button.dataset.roomParticipant)}"]`);
      if (!input) return;
      input.checked = !input.checked;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      syncParticipantSelection(chrome, form);
    });
  });
}

function currentThreadSelect() { return document.querySelector('.commons-log [data-commons-thread]'); }
function availableThreads(select = currentThreadSelect()) { return select ? [...select.options].map((option) => option.value).filter(Boolean) : []; }

function updateRoomHeading(chrome) {
  const select = currentThreadSelect();
  const current = select?.value || '';
  const home = readHomeThread();
  const named = current && titles()[current];
  const title = current ? (current === home ? 'Constellation Room' : named || select?.selectedOptions?.[0]?.textContent || 'House Chat') : 'New conversation';
  const titleNode = chrome.querySelector('[data-house-room-title]');
  const subtitle = chrome.querySelector('[data-house-room-subtitle]');
  if (titleNode) titleNode.textContent = title;
  if (subtitle) subtitle.textContent = current === home ? 'House Chat · persistent home room' : current ? 'House Chat · conversation' : 'House Chat · first message opens a new room';
}

function restoreOrClaimHome(chrome) {
  const select = currentThreadSelect();
  if (!select) return;
  const available = availableThreads(select);
  const saved = readHomeThread();
  const current = select.value;
  if (!saved && current) { writeHomeThread(current); ensureHomeTitle(current); }
  else if (!saved && !current && available.length) {
    const chosen = chooseHomeThread({ available });
    if (chosen) { writeHomeThread(chosen); ensureHomeTitle(chosen); select.value = chosen; select.dispatchEvent(new Event('change', { bubbles: true })); return; }
  } else if (!current && saved && available.includes(saved)) {
    select.value = saved;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  updateRoomHeading(chrome);
}

function jumpHome() {
  const select = currentThreadSelect();
  const home = readHomeThread();
  if (!select || !home || !availableThreads(select).includes(home)) return false;
  if (select.value !== home) { select.value = home; select.dispatchEvent(new Event('change', { bubbles: true })); }
  return true;
}

function syncDrawers(form, chrome) {
  const fieldset = form.querySelector('fieldset');
  if (fieldset) { fieldset.dataset.houseRoomRouting = 'true'; fieldset.hidden = !routingOpen; }
  const drawer = document.querySelector('[data-commons-command-room]');
  if (drawer) { drawer.classList.add('house-room-drawer'); drawer.hidden = !drawerOpen; }
  const rooms = chrome.querySelector('[data-house-room-rooms]');
  const routing = chrome.querySelector('[data-house-room-routing]');
  rooms?.setAttribute('aria-expanded', drawerOpen ? 'true' : 'false');
  routing?.setAttribute('aria-expanded', routingOpen ? 'true' : 'false');
}

function wireChrome(chrome, form) {
  if (chrome.dataset.houseRoomWired === 'true') return;
  chrome.dataset.houseRoomWired = 'true';
  chrome.addEventListener('click', (event) => {
    if (event.target.closest('[data-house-room-home]')) { if (!jumpHome()) document.querySelector('[data-new-thread]')?.click(); return; }
    if (event.target.closest('[data-house-room-rooms]')) { drawerOpen = !drawerOpen; syncDrawers(form, chrome); return; }
    if (event.target.closest('[data-house-room-routing]')) { routingOpen = !routingOpen; syncDrawers(form, chrome); }
  });
}

function decorateEntry(article) {
  if (!article || article.dataset.houseRoomDecorated === 'true') return;
  const strong = article.querySelector('header>strong');
  if (!strong) return;
  const author = strong.textContent.trim();
  const identity = voiceIdentityForLabel(author) || { id: 'house', name: author || 'House', glyph: initialsForName(author || 'House'), roles: ['House'] };
  article.dataset.houseRoomDecorated = 'true';
  article.dataset.houseRoomAuthor = identity.id;
  strong.dataset.houseRoomAuthor = author;
  strong.classList.add('house-room-entry-author');
  strong.innerHTML = `<span class="house-room-avatar house-room-entry-avatar" aria-hidden="true">${esc(identity.glyph)}</span><span class="house-room-nameplate"><span>${esc(identity.name)}</span><small>${esc(identity.roles[0] || 'House')}</small></span>`;
}

function revealNewVoiceEntry(article) {
  if (!article || article.dataset.kind !== 'voice' || article.dataset.houseRoomRevealed === 'true') return;
  const body = article.querySelector('.commons-chat-body');
  if (!body) return;
  article.dataset.houseRoomRevealed = 'true';
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
  const plain = String(body.innerText || '').trim();
  if (!plain || plain.length < 28) return;
  const finalHtml = body.innerHTML;
  const tokens = plain.split(/(\s+)/).filter((token) => token.length);
  body.textContent = '';
  article.classList.add('house-room-revealing');
  let index = 0;
  const chunk = Math.max(1, Math.ceil(tokens.length / 90));
  const paint = () => {
    if (!body.isConnected) return;
    index = Math.min(tokens.length, index + chunk);
    body.textContent = tokens.slice(0, index).join('');
    body.closest('.commons-log')?.scrollTo?.({ top: body.closest('.commons-log').scrollHeight, behavior: 'auto' });
    if (index < tokens.length) setTimeout(paint, 22);
    else { body.innerHTML = finalHtml; article.classList.remove('house-room-revealing'); }
  };
  paint();
}

function decorateLog() {
  const log = document.querySelector('.commons-log');
  if (!log) return;
  const articles = [...log.querySelectorAll('.commons-chat-entry')];
  if (!initialLogReady) {
    if (!log.querySelector('.commons-chat-log-head')) return;
    articles.forEach((article) => { decorateEntry(article); if (article.dataset.entryId) seenEntryIds.add(article.dataset.entryId); });
    initialLogReady = true;
    return;
  }
  for (const article of articles) {
    const id = article.dataset.entryId || '';
    const isNew = Boolean(id && !seenEntryIds.has(id));
    decorateEntry(article);
    if (isNew) { seenEntryIds.add(id); revealNewVoiceEntry(article); }
  }
}

function renderLivePresence(chrome) {
  const records = currentModelPresence();
  const counts = presenceCounts(records);
  const online = chrome.querySelector('[data-house-room-online]');
  if (online) online.textContent = counts.active ? `${counts.active} active · ${counts.available} available` : `${counts.available} available`;
  const active = records.filter((record) => ['thinking', 'speaking'].includes(record.state) && String(record.task || '').startsWith('house-commons'));
  const sentence = activePresenceSentence(active);
  const log = document.querySelector('.commons-log');
  if (!log) return;
  let typing = log.querySelector('[data-house-room-typing]');
  if (!sentence) { typing?.remove(); return; }
  if (!typing) {
    typing = document.createElement('div');
    typing.dataset.houseRoomTyping = 'true';
    typing.className = 'house-room-typing';
    log.append(typing);
  }
  const first = voiceIdentityForLabel(active[0]?.voice_id || '') || { glyph: '∞' };
  typing.innerHTML = `<span class="house-room-avatar" aria-hidden="true">${esc(first.glyph)}</span><span><strong>${esc(sentence)}</strong><span class="house-room-typing-dots" aria-hidden="true"><i></i><i></i><i></i></span></span>`;
  log.scrollTop = log.scrollHeight;
}

function wireComposer(form) {
  const editor = form.querySelector('[data-commons-native-editor]');
  if (!editor || editor.dataset.houseRoomKeys === 'true') return;
  editor.dataset.houseRoomKeys = 'true';
  editor.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    form.requestSubmit();
  });
  const hint = form.querySelector('.commons-native-composer>small.muted');
  if (hint) hint.textContent = 'Enter sends · Shift+Enter adds a line · native rich text · @name routes directly.';
}

function decorate() {
  decorateScheduled = false;
  const form = document.querySelector('#commons-form');
  if (!form) return;
  const chrome = ensureChrome(form);
  if (!chrome) return;
  wireChrome(chrome, form);
  renderParticipants(chrome, form);
  syncParticipantSelection(chrome, form);
  restoreOrClaimHome(chrome);
  syncDrawers(form, chrome);
  wireComposer(form);
  decorateLog();
  renderLivePresence(chrome);
  updateRoomHeading(chrome);
}

function scheduleDecorate() {
  if (decorateScheduled) return;
  decorateScheduled = true;
  queueMicrotask(decorate);
}

function styles() {
  if (document.getElementById('house-chat-room-social-styles')) return;
  const style = document.createElement('style');
  style.id = 'house-chat-room-social-styles';
  style.textContent = `.commons-layout.house-room-mode{grid-template-columns:minmax(0,1fr)!important;gap:.75rem}.house-room-chrome{display:grid;gap:.7rem;padding:.8rem .9rem;border:1px solid var(--line-soft);border-radius:1rem;background:color-mix(in srgb,var(--panel-solid) 92%,transparent)}.house-room-header{display:flex;align-items:center;justify-content:space-between;gap:.8rem}.house-room-heading{display:flex;align-items:center;gap:.65rem;min-width:0}.house-room-heading>div{display:grid;min-width:0}.house-room-heading strong{font-size:1.05rem}.house-room-heading small{color:var(--muted)}.house-room-mark{display:grid;place-items:center;width:2.35rem;height:2.35rem;border:1px solid color-mix(in srgb,var(--gold) 45%,transparent);border-radius:50%;font-size:1.25rem}.house-room-actions{display:flex;align-items:center;justify-content:flex-end;gap:.35rem;flex-wrap:wrap}.house-room-online{font-size:.72rem;color:var(--green);white-space:nowrap}.house-room-participants{display:flex;gap:.42rem;overflow:auto;padding:.15rem 0 .3rem;scrollbar-width:thin}.house-room-participant{display:flex;align-items:center;gap:.45rem;min-width:max-content;padding:.38rem .5rem;border:1px solid var(--line-soft);border-radius:.8rem;background:transparent;color:inherit;text-align:left}.house-room-participant[aria-pressed="true"]{border-color:color-mix(in srgb,var(--gold) 55%,var(--line-soft));background:color-mix(in srgb,var(--gold) 6%,transparent)}.house-room-participant-self{padding-right:.65rem}.house-room-avatar{display:grid;place-items:center;flex:0 0 auto;width:2rem;height:2rem;border-radius:50%;border:1px solid color-mix(in srgb,var(--gold) 35%,var(--line-soft));background:color-mix(in srgb,var(--panel-solid) 72%,var(--bg));font-size:.72rem;font-weight:800;letter-spacing:.02em}.house-room-nameplate{display:grid;line-height:1.15}.house-room-nameplate strong,.house-room-nameplate>span{font-size:.78rem;font-weight:750}.house-room-nameplate small{margin-top:.12rem;color:var(--muted);font-size:.62rem;text-transform:capitalize}.house-room-presence-dot{width:.48rem;height:.48rem;margin-left:.1rem;border-radius:50%;background:color-mix(in srgb,var(--muted) 55%,transparent)}.house-room-participant[data-state="ready"] .house-room-presence-dot{background:var(--green)}.house-room-participant[data-state="thinking"] .house-room-presence-dot,.house-room-participant[data-state="speaking"] .house-room-presence-dot{background:var(--gold);box-shadow:0 0 0 .2rem color-mix(in srgb,var(--gold) 12%,transparent)}.house-room-participant[data-state="degraded"] .house-room-presence-dot,.house-room-participant[data-state="error"] .house-room-presence-dot{background:color-mix(in srgb,var(--text) 38%,transparent)}.house-room-mode .commons-log{min-height:22rem;max-height:58vh!important;padding:.35rem .6rem 1rem!important;border:1px solid var(--line-soft);border-radius:1rem;background:color-mix(in srgb,var(--bg) 55%,transparent)}.house-room-mode #commons-form{position:sticky;bottom:.4rem;z-index:4;padding:.7rem .8rem;border:1px solid var(--line-soft);border-radius:1rem;background:color-mix(in srgb,var(--panel-solid) 96%,var(--bg));box-shadow:0 -.45rem 1.6rem rgba(0,0,0,.12)}.house-room-mode [data-house-room-routing][hidden],.house-room-drawer[hidden]{display:none!important}.house-room-drawer{order:-1}.house-room-entry-author{display:flex!important;align-items:center;gap:.45rem}.house-room-entry-avatar{width:1.9rem;height:1.9rem}.house-room-entry-author .house-room-nameplate small{display:block}.house-room-typing{display:flex;align-items:center;gap:.55rem;width:max-content;max-width:80%;margin:.65rem 0;padding:.55rem .75rem;border:1px solid color-mix(in srgb,var(--gold) 22%,var(--line-soft));border-radius:1rem;background:color-mix(in srgb,var(--gold) 5%,var(--panel-solid));font-size:.76rem}.house-room-typing>span:last-child{display:flex;align-items:center;gap:.5rem}.house-room-typing-dots{display:inline-flex;gap:.16rem}.house-room-typing-dots i{width:.3rem;height:.3rem;border-radius:50%;background:var(--muted);animation:house-room-dot 1s infinite ease-in-out}.house-room-typing-dots i:nth-child(2){animation-delay:.14s}.house-room-typing-dots i:nth-child(3){animation-delay:.28s}.house-room-revealing .commons-chat-body:after{content:'▍';display:inline-block;margin-left:.12rem;animation:house-room-cursor .7s infinite step-end}@keyframes house-room-dot{0%,70%,100%{transform:translateY(0);opacity:.4}35%{transform:translateY(-.22rem);opacity:1}}@keyframes house-room-cursor{0%,49%{opacity:1}50%,100%{opacity:0}}@media(max-width:720px){.house-room-header{align-items:flex-start;flex-direction:column}.house-room-actions{justify-content:flex-start}.house-room-mode .commons-log{min-height:18rem;max-height:54vh!important}.house-room-mode #commons-form{bottom:.2rem}.house-room-participant{padding:.34rem .42rem}}@media(prefers-reduced-motion:reduce){.house-room-typing-dots i,.house-room-revealing .commons-chat-body:after{animation:none}}`;
  document.head.append(style);
}

export function installHouseChatRoomSocial() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  styles();
  document.addEventListener(MODEL_PRESENCE_EVENT, scheduleDecorate);
  document.addEventListener('change', (event) => { if (event.target?.matches?.('#commons-form input[name="voiceIds"], .commons-log [data-commons-thread]')) scheduleDecorate(); }, true);
  observer = new MutationObserver(scheduleDecorate);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleDecorate();
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installHouseChatRoomSocial();
