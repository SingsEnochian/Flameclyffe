import { CONSTELLATION_VOICES } from './feedback-loop.js';
import { appendHouseCommons, readHouseCommons, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';
import { publishModelPresence } from './model-presence-bus.js';
import { readActiveRuntimeWorldContext } from './runtime-world-context.js';

export const COMMONS_SELECTION_KEY = 'arcsweep.house-commons-selection/v1';
export const COMMONS_DRAFT_KEY = 'arcsweep.house-commons-draft/v1';
export const COMMONS_RICH_DRAFT_KEY = 'arcsweep.house-commons-rich-draft/v1';
export const COMMONS_REPLY_KEY = 'arcsweep.house-commons-reply/v1';

const REFRESH_MS = 5000;
const ALLOWED_TAGS = new Set(['A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'H1', 'H2', 'H3', 'I', 'LI', 'MARK', 'OL', 'P', 'PRE', 'S', 'SPAN', 'STRONG', 'U', 'UL']);
const TOOLBAR = Object.freeze([
  ['B', 'Bold', 'bold', '', 'bold'],
  ['I', 'Italic', 'italic', '', 'italic'],
  ['U', 'Underline', 'underline', '', 'underline'],
  ['Link', 'Add link', 'link', '', ''],
  ['H2', 'Heading', 'formatBlock', 'H2', ''],
  ['¶', 'Paragraph', 'formatBlock', 'P', ''],
  ['❝', 'Quote', 'formatBlock', 'BLOCKQUOTE', ''],
  ['Code', 'Code block', 'formatBlock', 'PRE', ''],
  ['• List', 'Bulleted list', 'insertUnorderedList', '', 'insertUnorderedList'],
  ['1. List', 'Numbered list', 'insertOrderedList', '', 'insertOrderedList'],
  ['↶', 'Undo', 'undo', '', ''],
  ['↷', 'Redo', 'redo', '', ''],
]);

let installed = false;
let observer = null;
let refreshTimer = null;
let refreshInFlight = null;
let sending = false;
let entries = [];
let threadFilter = '';
let replyTarget = null;
let lastSignature = '';
let lastLog = null;

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const uuid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };

export function defaultCommonsVoiceIds(voices = CONSTELLATION_VOICES) { return voices.map((voice) => voice.id); }
export function normaliseCommonsSelection(value, voices = CONSTELLATION_VOICES) {
  const allowed = new Set(voices.map((voice) => voice.id));
  const selected = [...new Set((Array.isArray(value) ? value : []).map((item) => String(item).trim().toLowerCase()).filter((id) => allowed.has(id)))];
  return selected.length ? selected : defaultCommonsVoiceIds(voices);
}
export function commonsThreadId(entry) { return entry?.thread_id || entry?.turn_id || entry?.id || null; }
export function resolveCommonsThreadId({ turnId, replyTarget: target = null, activeThreadId = '' } = {}) {
  return target?.thread_id || target?.id || String(activeThreadId || '').trim() || turnId || null;
}
export function parseCommonsMentions(message = '', voices = CONSTELLATION_VOICES) {
  const tokens = [...String(message).matchAll(/(^|\s)@([\w/-]+)/g)].map((match) => match[2].toLowerCase());
  if (tokens.some((token) => token === 'all' || token === 'constellation')) return defaultCommonsVoiceIds(voices);
  return voices.filter((voice) => {
    const aliases = [voice.id, voice.name, voice.route].filter(Boolean).map((value) => String(value).toLowerCase().replace(/\s+/g, ''));
    return tokens.some((token) => aliases.includes(token.replace(/\s+/g, '')));
  }).map((voice) => voice.id);
}
export function modelReplyPlainText(value = '') {
  return String(value)
    .replace(/```(?:[\w+-]+)?\n?([\s\S]*?)```/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/(^|[^\w])_([^_\n]+)_([^\w]|$)/g, '$1$2$3')
    .trim();
}
export function renderCommonsRichText(value = '') {
  let text = esc(value);
  text = text.replace(/^#{4,6}\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{1,2}\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/(^|\s)(@[\w/-]+)/g, '$1<mark class="commons-mention">$2</mark>')
    .replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^\s*[-*+]\s+(.*)$/gm, '<div class="commons-bullet">• $1</div>');
  return text.split(/\n{2,}/).map((block) => /^(?:<h[23]>|<blockquote>|<div class="commons-bullet">)/.test(block) ? block : `<p>${block.replaceAll('\n', '<br>')}</p>`).join('');
}
export function buildCommonsRuntimeContext(source = [], threadId = '', limit = 24) {
  if (!threadId) return [];
  return source.filter((entry) => commonsThreadId(entry) === threadId && entry?.text).slice(-limit).map((entry) => ({
    speaker: String(entry.author || 'House').slice(0, 120),
    text: String(entry.text || '').slice(0, 6000),
  }));
}
export function buildCommonsRuntimeMessage(message, context = []) {
  const current = String(message || '').trim();
  if (!context.length) return current;
  return ['HOUSE CHAT · VISIBLE ROOM HISTORY', 'These are prior visible turns from this same ArcSweep room. Use them as conversation history. Do not repeat the transcript unless Rowan asks.', ...context.map((item) => `[${item.speaker}]\n${item.text}`), 'CURRENT MESSAGE FROM ROWAN', current].join('\n\n');
}

function safeHref(value = '') {
  const href = String(value || '').trim();
  if (!href) return '';
  if (/^(?:#|\/|\.\/|\.\.\/)/.test(href)) return href;
  try { const parsed = new URL(href, globalThis.location?.href || 'https://arcsweep.invalid/'); return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? href : ''; }
  catch { return ''; }
}
function sanitizeRichHtml(html = '') {
  if (typeof document === 'undefined') return '';
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const element of nodes) {
    if (!ALLOWED_TAGS.has(element.tagName)) { element.replaceWith(...element.childNodes); continue; }
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      if (element.tagName === 'A' && name === 'href') continue;
      if (element.tagName === 'MARK' && name === 'class' && attribute.value === 'commons-mention') continue;
      element.removeAttribute(attribute.name);
    }
    if (element.tagName === 'A') {
      const href = safeHref(element.getAttribute('href'));
      href ? element.setAttribute('href', href) : element.removeAttribute('href');
    }
  }
  return template.innerHTML;
}
function activeSession() { return readHouseRuntimeToken() || restoreHouseRuntimeSession(); }
function voiceName(id) { return CONSTELLATION_VOICES.find((voice) => voice.id === id)?.name || id; }
function voiceCheckboxes(form) { return [...form.querySelectorAll('input[name="voiceIds"]')]; }
function readSelection() { return normaliseCommonsSelection(readJson(COMMONS_SELECTION_KEY, null)); }
function writeSelection(ids) { const value = normaliseCommonsSelection(ids); try { localStorage.setItem(COMMONS_SELECTION_KEY, JSON.stringify(value)); } catch {} return value; }
function readDraftText() { try { return localStorage.getItem(COMMONS_DRAFT_KEY) || ''; } catch { return ''; } }
function readDraftHtml() { try { return localStorage.getItem(COMMONS_RICH_DRAFT_KEY) || ''; } catch { return ''; } }
function writeDraft(text, html) {
  try {
    text ? localStorage.setItem(COMMONS_DRAFT_KEY, text) : localStorage.removeItem(COMMONS_DRAFT_KEY);
    text.trim() && html ? localStorage.setItem(COMMONS_RICH_DRAFT_KEY, html) : localStorage.removeItem(COMMONS_RICH_DRAFT_KEY);
  } catch {}
}
function rememberReply(target) {
  replyTarget = target || null;
  try { replyTarget ? localStorage.setItem(COMMONS_REPLY_KEY, JSON.stringify({ id: replyTarget.id, thread_id: commonsThreadId(replyTarget), author: replyTarget.author, text: replyTarget.text })) : localStorage.removeItem(COMMONS_REPLY_KEY); } catch {}
}
function restoreReply() { const saved = readJson(COMMONS_REPLY_KEY, null); if (saved?.id) replyTarget = entries.find((entry) => entry.id === saved.id) || saved; }

function syncAll(form) {
  const all = form.querySelector('[data-commons-all]');
  const checks = voiceCheckboxes(form);
  if (!all || !checks.length) return;
  const count = checks.filter((input) => input.checked).length;
  all.checked = count === checks.length;
  all.indeterminate = count > 0 && count < checks.length;
}
function installAll(form) {
  const fieldset = form.querySelector('fieldset');
  if (!fieldset || fieldset.querySelector('[data-commons-all]')) return;
  const label = document.createElement('label');
  label.className = 'checkbox commons-all-control';
  label.innerHTML = '<input type="checkbox" data-commons-all /> <span><b>All Constellation</b><small>Everyone may answer this turn</small></span>';
  fieldset.insertBefore(label, fieldset.querySelector('.voice-grid') || fieldset.firstChild);
  label.querySelector('input').addEventListener('change', (event) => {
    voiceCheckboxes(form).forEach((input) => { input.checked = event.target.checked; });
    writeSelection(voiceCheckboxes(form).filter((input) => input.checked).map((input) => input.value));
    syncAll(form);
  });
}
function toolbarMarkup() {
  return TOOLBAR.map(([label, title, command, value, state]) => `<button type="button" class="quiet mini commons-native-tool" data-rich-command="${command}"${value ? ` data-value="${value}"` : ''}${state ? ` data-state-command="${state}"` : ''} title="${esc(title)}" aria-label="${esc(title)}">${label}</button>`).join('');
}
function updateToolbar(shell) {
  if (!shell || document.activeElement !== shell.querySelector('[data-commons-native-editor]')) return;
  shell.querySelectorAll('[data-state-command]').forEach((button) => {
    let active = false; try { active = document.queryCommandState(button.dataset.stateCommand); } catch {}
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}
function promptLink(editor) {
  const entered = window.prompt('Link address');
  if (entered === null) return;
  const href = safeHref(entered);
  if (!href) return;
  editor.focus(); document.execCommand('createLink', false, href);
}
function composerParts(form) { return { textarea: form?.elements?.namedItem?.('message'), shell: form?.querySelector('[data-commons-native-composer]'), editor: form?.querySelector('[data-commons-native-editor]') }; }
function syncComposer(form) {
  const { textarea, editor } = composerParts(form);
  if (!(textarea instanceof HTMLTextAreaElement) || !editor) return { text: '', richTextHtml: '' };
  const text = String(editor.innerText || '').replaceAll('\u00a0', ' ').trimEnd();
  const richTextHtml = sanitizeRichHtml(editor.innerHTML);
  textarea.dataset.commonsSyncing = 'true'; textarea.value = text; delete textarea.dataset.commonsSyncing;
  writeDraft(text, richTextHtml);
  return { text: text.trim(), richTextHtml };
}
function setComposer(form, text = '', html = '') {
  const { textarea, editor } = composerParts(form);
  if (!(textarea instanceof HTMLTextAreaElement) || !editor) return;
  editor.innerHTML = html ? sanitizeRichHtml(html) : '';
  if (!html && text) editor.textContent = text;
  textarea.value = text;
  writeDraft(text, editor.innerHTML);
}
function focusComposer(form = document.querySelector('#commons-form')) {
  const editor = form?.querySelector('[data-commons-native-editor]'); editor?.focus(); editor?.scrollIntoView?.({ block: 'nearest' });
}
function installComposer(form) {
  const textarea = form.elements?.namedItem?.('message');
  if (!(textarea instanceof HTMLTextAreaElement) || form.querySelector('[data-commons-native-composer]')) return;
  textarea.classList.add('commons-native-source'); textarea.required = false;
  const shell = document.createElement('div'); shell.className = 'commons-native-composer'; shell.dataset.commonsNativeComposer = 'true';
  shell.innerHTML = `<div class="commons-reply-banner" data-commons-reply-banner hidden><span data-commons-reply-text></span><button type="button" class="quiet mini" data-commons-reply-clear>Cancel reply</button></div><div class="commons-native-toolbar" data-commons-toolbar role="toolbar" aria-label="Message formatting">${toolbarMarkup()}</div><div class="commons-native-editor" data-commons-native-editor contenteditable="true" role="textbox" aria-multiline="true" aria-label="Message" spellcheck="true"></div><small class="muted">Native rich text. @name routes a turn; @all calls the whole Constellation.</small>`;
  textarea.insertAdjacentElement('afterend', shell);
  const editor = shell.querySelector('[data-commons-native-editor]');
  const draftHtml = readDraftHtml(); const draftText = readDraftText() || textarea.value;
  draftHtml ? editor.insertAdjacentHTML('afterbegin', sanitizeRichHtml(draftHtml)) : editor.append(document.createTextNode(draftText));
  syncComposer(form);
  shell.querySelectorAll('[data-rich-command]').forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => {
      editor.focus();
      if (button.dataset.richCommand === 'link') promptLink(editor);
      else document.execCommand(button.dataset.richCommand, false, button.dataset.value || null);
      syncComposer(form); updateToolbar(shell);
    });
  });
  shell.querySelector('[data-commons-reply-clear]').onclick = () => { rememberReply(null); renderReplyBanner(form); focusComposer(form); };
  editor.addEventListener('input', () => { syncComposer(form); updateToolbar(shell); });
  editor.addEventListener('paste', (event) => {
    const clipboard = event.clipboardData; if (!clipboard) return;
    event.preventDefault(); const html = clipboard.getData('text/html'); const text = clipboard.getData('text/plain');
    document.execCommand(html ? 'insertHTML' : 'insertText', false, html ? sanitizeRichHtml(html) : text); queueMicrotask(() => syncComposer(form));
  });
  textarea.addEventListener('focus', () => queueMicrotask(() => focusComposer(form)));
  textarea.addEventListener('input', () => {
    if (textarea.dataset.commonsSyncing === 'true') return;
    if (!textarea.value) setComposer(form);
    else if (String(editor.innerText || '').trim() !== textarea.value.trim()) setComposer(form, textarea.value);
  });
}
function renderReplyBanner(form) {
  const banner = form?.querySelector('[data-commons-reply-banner]'); if (!banner) return;
  banner.hidden = !replyTarget;
  if (replyTarget) banner.querySelector('[data-commons-reply-text]').textContent = `Replying to ${replyTarget.author || 'House'} · ${String(replyTarget.text || '').slice(0, 140)}`;
}
function entryBody(entry) {
  if (entry?.rich_text_html) { const safe = sanitizeRichHtml(entry.rich_text_html); if (safe) return safe; }
  return renderCommonsRichText(entry?.text || '');
}
function renderEntry(entry) {
  const stamp = entry.created_at ? new Date(entry.created_at).toLocaleString() : '';
  const parent = entry.reply_to ? entries.find((item) => item.id === entry.reply_to) : null;
  const runtime = entry.runtime ? [entry.runtime.provider, entry.runtime.model, entry.runtime.latency_ms != null ? `${entry.runtime.latency_ms} ms` : null].filter(Boolean).join(' · ') : '';
  return `<article class="commons-chat-entry" data-entry-id="${esc(entry.id || '')}" data-thread-id="${esc(commonsThreadId(entry) || '')}" data-kind="${esc(entry.kind || 'system')}">${parent ? `<div class="commons-reply-context">↳ ${esc(parent.author || 'House')}: ${esc(String(parent.text || '').slice(0, 120))}</div>` : ''}<header><strong>${esc(entry.author || 'House')}</strong><span>${esc([stamp, entry.status, runtime].filter(Boolean).join(' · '))}</span><div><button type="button" class="quiet mini" data-reply-entry="${esc(entry.id || '')}">Reply</button><button type="button" class="quiet mini" data-copy-entry="${esc(entry.id || '')}">Copy</button></div></header><div class="commons-chat-body">${entryBody(entry)}</div></article>`;
}
function threadOptions() {
  const roots = new Map();
  for (const entry of entries) { const id = commonsThreadId(entry); if (id && !roots.has(id)) roots.set(id, entry); }
  return [...roots].map(([id, entry]) => `<option value="${esc(id)}" ${threadFilter === id ? 'selected' : ''}>${esc(`${entry.author || 'House'} · ${String(entry.text || '').replace(/\s+/g, ' ').slice(0, 58)}`)}</option>`).join('');
}
function renderLog({ scroll = false } = {}) {
  const log = document.querySelector('.commons-log'); if (!log) return;
  const visible = threadFilter ? entries.filter((entry) => commonsThreadId(entry) === threadFilter) : entries;
  log.innerHTML = `<div class="commons-chat-log-head"><div><h2>House Chat</h2><span>${visible.length} turns · ${entries.length} saved</span></div><div class="commons-log-tools"><select data-commons-thread aria-label="Conversation thread"><option value="">All conversations / new conversation</option>${threadOptions()}</select><button type="button" class="quiet mini" data-new-thread>New conversation</button></div></div>${visible.length ? visible.map(renderEntry).join('') : '<p class="muted">The room is quiet. Speak when ready.</p>'}`;
  log.querySelector('[data-commons-thread]')?.addEventListener('change', (event) => { threadFilter = event.target.value; rememberReply(null); renderReplyBanner(document.querySelector('#commons-form')); renderLog(); });
  log.querySelector('[data-new-thread]')?.addEventListener('click', () => { threadFilter = ''; rememberReply(null); renderLog(); focusComposer(); });
  log.querySelectorAll('[data-reply-entry]').forEach((button) => button.addEventListener('click', () => {
    replyTarget = entries.find((entry) => entry.id === button.dataset.replyEntry) || null;
    rememberReply(replyTarget); threadFilter = commonsThreadId(replyTarget) || threadFilter; renderReplyBanner(document.querySelector('#commons-form')); renderLog(); focusComposer();
  }));
  log.querySelectorAll('[data-copy-entry]').forEach((button) => button.addEventListener('click', async () => {
    const entry = entries.find((item) => item.id === button.dataset.copyEntry); if (!entry) return;
    try { await navigator.clipboard.writeText(entry.text || ''); button.textContent = 'Copied'; } catch { button.textContent = 'Copy unavailable'; }
  }));
  if (scroll) log.scrollTop = log.scrollHeight;
}
function signature(source) { return JSON.stringify(source.map((entry) => [entry.id, entry.created_at, entry.status, entry.text, entry.rich_text_html, entry.thread_id, entry.reply_to])); }
async function performRefresh({ force = false, scroll = false } = {}) {
  const connection = document.querySelector('[data-commons-connection]'); const token = await activeSession();
  if (!token) { if (connection) connection.textContent = 'House Runtime offline · connect once in Settings'; return; }
  try {
    const data = await readHouseCommons(token); const next = Array.isArray(data?.entries) ? data.entries : []; const log = document.querySelector('.commons-log'); const nextSignature = signature(next);
    entries = next; restoreReply(); if (connection) connection.textContent = `House Runtime connected · ${entries.length} saved turns`;
    if (!force && log === lastLog && nextSignature === lastSignature) { renderReplyBanner(document.querySelector('#commons-form')); return; }
    lastLog = log; lastSignature = nextSignature; renderLog({ scroll }); renderReplyBanner(document.querySelector('#commons-form'));
  } catch (error) { if (connection) connection.textContent = `House Runtime error · ${error.message}`; }
}
function refreshLog(options = {}) {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = performRefresh(options).finally(() => { refreshInFlight = null; }); return refreshInFlight;
}
function enhance(form) {
  if (!form || form.dataset.commonsEnhanced === 'v4') return;
  form.dataset.commonsEnhanced = 'v4';
  const selected = new Set(readSelection());
  voiceCheckboxes(form).forEach((input) => { input.checked = selected.has(input.value); input.addEventListener('change', () => { writeSelection(voiceCheckboxes(form).filter((item) => item.checked).map((item) => item.value)); syncAll(form); }); });
  installAll(form); syncAll(form); installComposer(form); renderReplyBanner(form);
  const heading = document.querySelector('.section-heading');
  if (heading && !heading.querySelector('[data-commons-connection]')) { const state = document.createElement('p'); state.className = 'commons-connection-state'; state.dataset.commonsConnection = 'true'; state.textContent = 'Restoring House Runtime session…'; heading.querySelector('div')?.append(state); }
  void refreshLog({ force: true });
}
async function activeWorld() {
  try { const context = await readActiveRuntimeWorldContext(); const anchor = context?.identity_anchor; return { id: anchor?.world_id || null, name: anchor?.world_name || document.querySelector('.sidebar-world strong')?.textContent?.trim() || 'Active World', context }; }
  catch { return { id: null, name: document.querySelector('.sidebar-world strong')?.textContent?.trim() || 'Active World', context: null }; }
}
async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'commons-form') return;
  event.preventDefault(); event.stopImmediatePropagation(); if (sending) return;
  const payload = syncComposer(form); const message = payload.text; if (!message) { focusComposer(form); return; }
  const selected = voiceCheckboxes(form).filter((input) => input.checked).map((input) => input.value); const mentions = parseCommonsMentions(message); const voiceIds = mentions.length ? mentions : selected; if (!voiceIds.length) return;
  const token = await activeSession(); const connection = document.querySelector('[data-commons-connection]'); if (!token) { if (connection) connection.textContent = 'House Runtime offline · connect once in Settings'; return; }
  sending = true; const submit = form.querySelector('button[type="submit"]'); if (submit) { submit.disabled = true; submit.textContent = 'Constellation answering…'; }
  const world = await activeWorld(); const turnId = `commons-turn:${uuid()}`; const threadId = resolveCommonsThreadId({ turnId, replyTarget, activeThreadId: threadFilter }); const replyTo = replyTarget?.id || null;
  const runtimeMessage = buildCommonsRuntimeMessage(message, buildCommonsRuntimeContext(entries, threadId));
  try {
    const stewardEntry = await appendHouseCommons(token, { kind: 'steward', author: 'Rowan', status: 'sent', world: world.id ? { id: world.id, name: world.name } : null, turn_id: turnId, thread_id: threadId, reply_to: replyTo, mentions, rich_text_html: payload.richTextHtml, text: message });
    threadFilter = threadId; setComposer(form); rememberReply(null); await refreshLog({ force: true, scroll: true });
    await Promise.all(voiceIds.map(async (voiceId) => {
      publishModelPresence({ voiceId, displayName: voiceName(voiceId), state: 'thinking', worldId: world.id, task: 'house-commons' });
      let reply;
      try { reply = await invokeConstellationRuntimeVoice({ voiceId, message: runtimeMessage, sessionId: `house-commons-${threadId}-${voiceId}`, metadata: { surface: 'house-commons', world_name: world.name, commons_thread_id: threadId, commons_turn_id: turnId, commons_reply_to: replyTo, visible_message: message, mentions }, worldContext: world.context }); }
      catch (error) { reply = { status: 'route-error', reason: error?.message || String(error), voiceId }; }
      const successful = reply.status === 'replied'; const raw = successful ? reply.message : `[${reply.status}] ${reply.reason || 'No reply returned.'}`; const text = successful ? modelReplyPlainText(raw) : raw; const richTextHtml = successful ? renderCommonsRichText(raw) : `<p>${esc(text)}</p>`;
      publishModelPresence({ voiceId, displayName: voiceName(voiceId), state: successful ? 'speaking' : 'degraded', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, worldId: reply.worldId || world.id, runtimeWorldContextId: reply.runtimeWorldContextId, task: successful ? 'house-commons-reply' : null, reason: successful ? null : reply.reason });
      await appendHouseCommons(token, { kind: 'voice', author: voiceName(voiceId), voice_id: voiceId, status: reply.status, world: (reply.worldId || world.id) ? { id: reply.worldId || world.id, name: world.name } : null, turn_id: turnId, thread_id: threadId, reply_to: stewardEntry.id, runtime: { provider: reply.provider, model: reply.model, route: reply.route, profile_id: reply.profileId, latency_ms: reply.latencyMs, runtime_world_context_id: reply.runtimeWorldContextId }, rich_text_html: richTextHtml, text });
      if (successful) queueMicrotask(() => publishModelPresence({ voiceId, state: 'ready', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, worldId: reply.worldId || world.id, runtimeWorldContextId: reply.runtimeWorldContextId, task: null }));
      await refreshLog({ force: true, scroll: true });
    }));
  } finally { sending = false; if (submit) { submit.disabled = false; submit.textContent = 'Send to House Chat ∞'; } focusComposer(form); }
}
function styles() {
  if (document.getElementById('house-commons-chat-v4-styles')) return;
  const style = document.createElement('style'); style.id = 'house-commons-chat-v4-styles';
  style.textContent = `.commons-layout{grid-template-columns:minmax(0,1.45fr) minmax(20rem,.75fr);align-items:start}.commons-log{max-height:72vh;overflow:auto;padding:.2rem .35rem 1rem}.commons-chat-log-head{position:sticky;top:0;z-index:3;display:grid;gap:.55rem;padding:.2rem 0 .7rem;background:var(--panel)}.commons-chat-log-head>div,.commons-chat-entry header{display:flex;align-items:center;gap:.6rem;justify-content:space-between}.commons-log-tools{display:flex;flex-wrap:wrap;gap:.4rem}.commons-log-tools select{min-width:16rem;flex:1}.commons-chat-entry{width:min(82%,52rem);margin:.7rem 0;padding:.8rem .95rem;border:1px solid var(--line-soft);border-radius:1rem;background:color-mix(in srgb,var(--panel-solid) 88%,transparent);box-shadow:0 5px 18px rgba(0,0,0,.08)}.commons-chat-entry[data-kind="steward"]{margin-left:auto;background:color-mix(in srgb,var(--green) 9%,var(--panel-solid));border-color:color-mix(in srgb,var(--green) 30%,var(--line-soft))}.commons-chat-entry[data-kind="voice"]{margin-right:auto;background:color-mix(in srgb,var(--gold) 6%,var(--panel-solid));border-color:color-mix(in srgb,var(--gold) 24%,var(--line-soft))}.commons-chat-entry[data-kind="system"]{width:min(92%,60rem);margin-left:auto;margin-right:auto}.commons-chat-entry header span{margin-left:auto;color:var(--muted);font-size:.7rem}.commons-chat-entry header>div{display:flex;gap:.3rem}.commons-chat-body{overflow-wrap:anywhere;line-height:1.62}.commons-chat-body p{margin:.45rem 0}.commons-chat-body blockquote{margin:.55rem 0;padding:.45rem .7rem;border-left:3px solid var(--gold);background:color-mix(in srgb,var(--gold) 7%,transparent)}.commons-chat-body code,.commons-chat-body pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:rgba(0,0,0,.25);border-radius:.35rem}.commons-chat-body code{padding:.12rem .28rem}.commons-chat-body pre{padding:.65rem;white-space:pre-wrap}.commons-chat-body a{color:var(--green);text-decoration:underline}.commons-reply-context,.commons-reply-banner{margin:.25rem 0 .55rem;padding:.45rem .6rem;border-left:3px solid var(--gold);background:color-mix(in srgb,var(--gold) 7%,transparent);font-size:.78rem}.commons-reply-banner{display:flex;justify-content:space-between;gap:.5rem}.commons-reply-banner[hidden]{display:none}.commons-mention{background:color-mix(in srgb,var(--green) 28%,transparent);color:var(--text);border-radius:.3rem;padding:.02rem .18rem}.commons-bullet{margin:.2rem 0}.commons-native-source{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;opacity:0!important;pointer-events:none!important}.commons-native-composer{display:grid;gap:.5rem;margin-top:.35rem}.commons-native-toolbar{display:flex;flex-wrap:wrap;gap:.32rem;padding:.42rem;border:1px solid color-mix(in srgb,var(--gold) 30%,transparent);border-radius:.7rem;background:color-mix(in srgb,var(--panel-solid) 86%,transparent)}.commons-native-tool.active{outline:2px solid var(--gold);outline-offset:1px}.commons-native-editor{box-sizing:border-box;width:100%;min-height:8.5rem;max-height:22rem;overflow:auto;padding:.85rem 1rem;border:1px solid color-mix(in srgb,var(--text) 22%,transparent);border-radius:.85rem;background:color-mix(in srgb,var(--bg) 72%,var(--panel-solid));color:var(--text);font:inherit;line-height:1.6;outline:none;overflow-wrap:anywhere}.commons-native-editor:focus{border-color:var(--gold);box-shadow:0 0 0 2px color-mix(in srgb,var(--gold) 24%,transparent)}.commons-native-editor:empty:before{content:'Message the room…';color:var(--muted);pointer-events:none}.commons-native-editor blockquote{padding-left:1rem;border-left:3px solid var(--gold)}.commons-native-editor pre{white-space:pre-wrap;padding:.55rem;background:rgba(0,0,0,.25);border-radius:.4rem}.commons-native-editor a{color:var(--green);text-decoration:underline}.commons-all-control{padding:.5rem .6rem;border:1px solid color-mix(in srgb,var(--gold) 30%,transparent);border-radius:.65rem}.commons-all-control span{display:grid}.commons-all-control small{color:var(--muted);font-weight:400}.commons-connection-state{margin:.5rem 0 0;color:var(--green);font-size:.8rem}@media(max-width:1000px){.commons-layout{grid-template-columns:1fr}.commons-log{max-height:none}}@media(max-width:600px){.commons-chat-entry{width:94%}.commons-chat-entry header{align-items:flex-start;flex-wrap:wrap}.commons-chat-entry header span{margin-left:0;width:100%}.commons-log-tools>*{width:100%!important}}`;
  document.head.append(style);
}
function mutationIntroducedCommons(mutations) { return mutations.some((mutation) => [...mutation.addedNodes].some((node) => node?.nodeType === 1 && (node.matches?.('#commons-form') || node.querySelector?.('#commons-form')))); }
export function installHouseCommonsChatV4() {
  if (installed || typeof document === 'undefined') return;
  installed = true; styles(); document.addEventListener('submit', handleSubmit, true);
  document.addEventListener('selectionchange', () => { const editor = document.activeElement?.closest?.('[data-commons-native-editor]'); if (editor) updateToolbar(editor.closest('[data-commons-native-composer]')); });
  document.addEventListener('click', (event) => { if (event.target.closest?.('[data-new-thread]')) queueMicrotask(() => focusComposer()); });
  observer = new MutationObserver((mutations) => { if (mutationIntroducedCommons(mutations)) enhance(document.querySelector('#commons-form')); }); observer.observe(document.body, { childList: true, subtree: true });
  enhance(document.querySelector('#commons-form')); refreshTimer = setInterval(() => { if (document.querySelector('#commons-form')) void refreshLog(); }, REFRESH_MS);
  globalThis.addEventListener?.('beforeunload', () => { if (refreshTimer) clearInterval(refreshTimer); observer?.disconnect(); }, { once: true });
}
if (typeof document !== 'undefined') installHouseCommonsChatV4();