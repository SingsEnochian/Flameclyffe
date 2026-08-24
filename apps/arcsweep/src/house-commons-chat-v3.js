import { CONSTELLATION_VOICES } from './feedback-loop.js';
import { appendHouseCommons, readHouseCommons, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';
import { publishModelPresence } from './model-presence-bus.js';
import { readActiveRuntimeWorldContext } from './runtime-world-context.js';

export const COMMONS_SELECTION_KEY = 'arcsweep.house-commons-selection/v1';
export const COMMONS_DRAFT_KEY = 'arcsweep.house-commons-draft/v1';
export const COMMONS_REPLY_KEY = 'arcsweep.house-commons-reply/v1';
export const COMMONS_PINS_KEY = 'arcsweep.house-commons-pins/v1';
export const COMMONS_SEEN_KEY = 'arcsweep.house-commons-seen/v1';
const REFRESH_MS = 5000;
let refreshTimer = null;
let observer = null;
let installed = false;
let sending = false;
let entries = [];
let searchText = '';
let threadFilter = '';
let replyTarget = null;
let pinsOnly = false;
let linkTarget = null;

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
export function parseCommonsMentions(message = '', voices = CONSTELLATION_VOICES) {
  const tokens = [...String(message).matchAll(/(^|\s)@([\w/-]+)/g)].map((match) => match[2].toLowerCase());
  if (tokens.some((token) => token === 'all' || token === 'constellation')) return defaultCommonsVoiceIds(voices);
  const ids = [];
  for (const voice of voices) {
    const aliases = [voice.id, voice.name, voice.route].filter(Boolean).map((value) => String(value).toLowerCase().replace(/\s+/g, ''));
    if (tokens.some((token) => aliases.includes(token.replace(/\s+/g, '')))) ids.push(voice.id);
  }
  return [...new Set(ids)];
}
export function filterCommonsEntries(source, query = '', threadId = '', pinnedThreadIds = [], pinnedOnly = false) {
  const needle = String(query || '').trim().toLowerCase();
  const pinned = new Set(pinnedThreadIds || []);
  return (source || []).filter((entry) => {
    const thread = commonsThreadId(entry);
    if (threadId && thread !== threadId) return false;
    if (pinnedOnly && !pinned.has(thread)) return false;
    if (!needle) return true;
    return [entry.author, entry.text, entry.status, entry.voice_id, entry.world?.name, ...(entry.mentions || []), ...(entry.links || []).flatMap((link) => [link.kind, link.id, link.label])]
      .some((value) => String(value || '').toLowerCase().includes(needle));
  });
}
export function unreadCommonsEntries(source, seenAt = '') {
  const cutoff = seenAt ? Date.parse(seenAt) : 0;
  return (source || []).filter((entry) => Date.parse(entry.created_at || 0) > cutoff);
}
export function renderCommonsMarkdown(value = '') {
  let text = esc(value);
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/_([^_\n]+)_/g, '<em>$1</em>');
  text = text.replace(/(^|\s)(@[\w/-]+)/g, '$1<mark class="commons-mention">$2</mark>');
  text = text.replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>').replace(/^[-*]\s+(.*)$/gm, '<div class="commons-bullet">• $1</div>');
  return text.split(/\n{2,}/).map((block) => block.startsWith('<blockquote>') || block.startsWith('<div class="commons-bullet">') ? block : `<p>${block.replaceAll('\n', '<br>')}</p>`).join('');
}
export function exportCommonsMarkdown(source) {
  return (source || []).map((entry) => {
    const meta = [entry.created_at, entry.status, entry.thread_id ? `thread:${entry.thread_id}` : null, entry.reply_to ? `reply:${entry.reply_to}` : null, entry.summary_of ? `summary:${entry.summary_of}` : null].filter(Boolean).join(' · ');
    const links = (entry.links || []).map((link) => `- link ${link.kind}:${link.id}${link.label ? ` — ${link.label}` : ''}`).join('\n');
    return `### ${entry.author || 'House'}\n${meta}\n\n${entry.text || ''}${links ? `\n\n${links}` : ''}`;
  }).join('\n\n---\n\n');
}

function readSelection() { return normaliseCommonsSelection(readJson(COMMONS_SELECTION_KEY, null)); }
function writeSelection(ids) { const value = normaliseCommonsSelection(ids); try { localStorage.setItem(COMMONS_SELECTION_KEY, JSON.stringify(value)); } catch {} return value; }
function readDraft() { try { return localStorage.getItem(COMMONS_DRAFT_KEY) || ''; } catch { return ''; } }
function writeDraft(value) { try { value ? localStorage.setItem(COMMONS_DRAFT_KEY, value) : localStorage.removeItem(COMMONS_DRAFT_KEY); } catch {} }
function readPins() { return [...new Set(readJson(COMMONS_PINS_KEY, []))]; }
function writePins(ids) { try { localStorage.setItem(COMMONS_PINS_KEY, JSON.stringify([...new Set(ids)])); } catch {} }
function seenAt() { try { return localStorage.getItem(COMMONS_SEEN_KEY) || ''; } catch { return ''; } }
function markRead() { const latest = entries.at(-1)?.created_at || new Date().toISOString(); try { localStorage.setItem(COMMONS_SEEN_KEY, latest); } catch {} renderLog(); }
function rememberReply(target) { replyTarget = target || null; try { replyTarget ? localStorage.setItem(COMMONS_REPLY_KEY, JSON.stringify({ id: replyTarget.id, thread_id: commonsThreadId(replyTarget), author: replyTarget.author, text: replyTarget.text })) : localStorage.removeItem(COMMONS_REPLY_KEY); } catch {} }
function restoreReply() { const saved = readJson(COMMONS_REPLY_KEY, null); if (saved?.id) replyTarget = entries.find((entry) => entry.id === saved.id) || saved; }
async function activeSession() { return readHouseRuntimeToken() || await restoreHouseRuntimeSession(); }
function voiceName(id) { return CONSTELLATION_VOICES.find((voice) => voice.id === id)?.name || id; }
function voiceCheckboxes(form) { return [...form.querySelectorAll('input[name="voiceIds"]')]; }

function syncAll(form) {
  const all = form.querySelector('[data-commons-all]'); const checks = voiceCheckboxes(form); if (!all || !checks.length) return;
  const count = checks.filter((input) => input.checked).length; all.checked = count === checks.length; all.indeterminate = count > 0 && count < checks.length;
}
function installAll(form) {
  const fieldset = form.querySelector('fieldset'); if (!fieldset || fieldset.querySelector('[data-commons-all]')) return;
  const label = document.createElement('label'); label.className = 'checkbox commons-all-control';
  label.innerHTML = '<input type="checkbox" data-commons-all /> <span><b>All Constellation</b><small>Everyone may answer this turn</small></span>';
  fieldset.insertBefore(label, fieldset.querySelector('.voice-grid') || fieldset.firstChild);
  label.querySelector('input').addEventListener('change', (event) => { voiceCheckboxes(form).forEach((input) => { input.checked = event.target.checked; }); writeSelection(voiceCheckboxes(form).filter((input) => input.checked).map((input) => input.value)); syncAll(form); });
}
function wrapSelection(textarea, before, after = before) {
  const start = textarea.selectionStart ?? textarea.value.length; const end = textarea.selectionEnd ?? start; const selected = textarea.value.slice(start, end);
  textarea.setRangeText(`${before}${selected}${after}`, start, end, 'select'); textarea.dispatchEvent(new Event('input', { bubbles: true })); textarea.focus();
}
function installComposer(form) {
  const textarea = form.elements?.namedItem?.('message'); if (!(textarea instanceof HTMLTextAreaElement)) return;
  if (!textarea.value) textarea.value = readDraft();
  textarea.addEventListener('input', () => writeDraft(textarea.value));
  if (!form.querySelector('[data-commons-toolbar]')) {
    const toolbar = document.createElement('div'); toolbar.className = 'commons-toolbar'; toolbar.dataset.commonsToolbar = 'true';
    toolbar.innerHTML = [['B','**','**'],['I','_','_'],['</>','`','`'],['❯','> ',''],['•','- ','']].map(([label,before,after]) => `<button type="button" class="quiet mini" data-before="${esc(before)}" data-after="${esc(after)}">${label}</button>`).join('');
    textarea.parentElement?.insertBefore(toolbar, textarea);
    toolbar.addEventListener('click', (event) => { const button = event.target.closest('[data-before]'); if (button) wrapSelection(textarea, button.dataset.before || '', button.dataset.after || ''); });
  }
  if (!form.querySelector('[data-commons-mention-help]')) {
    const help = document.createElement('small'); help.dataset.commonsMentionHelp = 'true'; help.className = 'muted'; help.textContent = 'Mention routing: @Atlas, @Altair, @Lioreal, etc. · @all reaches the whole Constellation.'; textarea.parentElement?.append(help);
  }
  if (!form.querySelector('[data-commons-reply-banner]')) {
    const banner = document.createElement('div'); banner.className = 'commons-reply-banner'; banner.dataset.commonsReplyBanner = 'true'; banner.hidden = true;
    banner.innerHTML = '<span data-commons-reply-text></span><button type="button" class="quiet mini" data-commons-reply-clear>Cancel reply</button>';
    textarea.parentElement?.insertBefore(banner, textarea);
    banner.querySelector('[data-commons-reply-clear]').addEventListener('click', () => { rememberReply(null); renderReplyBanner(form); });
  }
}
function renderReplyBanner(form) {
  const banner = form?.querySelector('[data-commons-reply-banner]'); if (!banner) return;
  banner.hidden = !replyTarget; if (replyTarget) banner.querySelector('[data-commons-reply-text]').textContent = `Replying to ${replyTarget.author || 'House'} · ${String(replyTarget.text || '').slice(0, 140)}`;
}

function linkChips(entry) {
  return (entry.links || []).map((link) => `<button type="button" class="commons-link-chip" data-open-link-kind="${esc(link.kind)}" data-open-link-id="${esc(link.id)}">${esc(link.label || `${link.kind}:${link.id}`)}</button>`).join('');
}
function renderEntry(entry) {
  const thread = commonsThreadId(entry); const pinned = readPins().includes(thread); const cutoff = Date.parse(seenAt() || 0); const unread = Date.parse(entry.created_at || 0) > cutoff;
  const stamp = entry.created_at ? new Date(entry.created_at).toLocaleString() : ''; const parent = entry.reply_to ? entries.find((item) => item.id === entry.reply_to) : null;
  const runtime = entry.runtime ? [entry.runtime.provider, entry.runtime.model, entry.runtime.latency_ms != null ? `${entry.runtime.latency_ms} ms` : null].filter(Boolean).join(' · ') : '';
  return `<article class="commons-chat-entry" data-entry-id="${esc(entry.id || '')}" data-thread-id="${esc(thread || '')}" data-kind="${esc(entry.kind || 'system')}" data-unread="${unread ? 'true' : 'false'}">
    ${parent ? `<div class="commons-reply-context">↳ ${esc(parent.author || 'House')}: ${esc(String(parent.text || '').slice(0, 120))}</div>` : ''}
    <header><strong>${unread ? '<span class="commons-unread-dot" aria-label="Unread">●</span> ' : ''}${esc(entry.author || 'House')}</strong><span>${esc([stamp, entry.status, runtime].filter(Boolean).join(' · '))}</span><div><button type="button" class="quiet mini" data-pin-thread="${esc(thread || '')}">${pinned ? 'Unpin' : 'Pin'}</button><button type="button" class="quiet mini" data-summary-thread="${esc(thread || '')}">Summarise</button><button type="button" class="quiet mini" data-link-entry="${esc(entry.id || '')}">Link</button><button type="button" class="quiet mini" data-reply-entry="${esc(entry.id || '')}">Reply</button><button type="button" class="quiet mini" data-copy-entry="${esc(entry.id || '')}">Copy</button></div></header>
    <div class="commons-chat-body">${renderCommonsMarkdown(entry.text || '')}</div>${linkChips(entry) ? `<div class="commons-links">${linkChips(entry)}</div>` : ''}
  </article>`;
}
function threadOptions() {
  const roots = new Map(); for (const entry of entries) { const id = commonsThreadId(entry); if (id && !roots.has(id)) roots.set(id, entry); }
  return [...roots].map(([id, entry]) => `<option value="${esc(id)}" ${threadFilter === id ? 'selected' : ''}>${esc(`${readPins().includes(id) ? '★ ' : ''}${entry.author || 'House'} · ${String(entry.text || '').replace(/\s+/g, ' ').slice(0, 52)}`)}</option>`).join('');
}
function installLinkPanel(log) {
  if (!linkTarget) return '';
  return `<div class="commons-link-panel"><strong>Cross-link thread</strong><select data-link-kind><option value="world">World</option><option value="canon">Canon</option><option value="script">Script / Scene</option><option value="record">Record</option><option value="feedback">Feedback receipt</option></select><input data-link-id placeholder="Target id / reference"/><input data-link-label placeholder="Label (optional)"/><button type="button" data-link-save>Save link</button><button type="button" class="quiet" data-link-cancel>Cancel</button></div>`;
}
function renderLog() {
  const log = document.querySelector('.commons-log'); if (!log) return;
  const unread = unreadCommonsEntries(entries, seenAt()).length; const pins = readPins(); const visible = filterCommonsEntries(entries, searchText, threadFilter, pins, pinsOnly);
  const searchFocus = document.activeElement?.matches?.('[data-commons-search]'); const searchPos = searchFocus ? document.activeElement.selectionStart : null;
  log.innerHTML = `<div class="commons-chat-log-head"><div><h2>Conversation</h2><span>${visible.length} shown · ${entries.length} saved · ${unread} unread</span></div><div class="commons-log-tools"><input type="search" data-commons-search value="${esc(searchText)}" placeholder="Search Commons…" aria-label="Search House Commons"/><select data-commons-thread aria-label="Filter conversation thread"><option value="">All threads</option>${threadOptions()}</select><button type="button" class="quiet mini" data-pins-only>${pinsOnly ? 'All threads' : 'Pinned'}</button><button type="button" class="quiet mini" data-mark-read>Mark read</button><button type="button" class="quiet mini" data-commons-export="md">Export .md</button><button type="button" class="quiet mini" data-commons-export="json">Export .json</button></div>${installLinkPanel(log)}</div>${visible.length ? visible.map(renderEntry).join('') : '<p class="muted">No Commons turns match this view.</p>'}`;
  const search = log.querySelector('[data-commons-search]'); search?.addEventListener('input', (event) => { searchText = event.target.value; renderLog(); });
  if (searchFocus && search) { search.focus(); const pos = Math.min(searchPos ?? search.value.length, search.value.length); search.setSelectionRange(pos, pos); }
  log.querySelector('[data-commons-thread]')?.addEventListener('change', (event) => { threadFilter = event.target.value; renderLog(); });
  log.querySelector('[data-pins-only]')?.addEventListener('click', () => { pinsOnly = !pinsOnly; renderLog(); });
  log.querySelector('[data-mark-read]')?.addEventListener('click', markRead);
  log.querySelectorAll('[data-pin-thread]').forEach((button) => button.addEventListener('click', () => { const set = new Set(readPins()); set.has(button.dataset.pinThread) ? set.delete(button.dataset.pinThread) : set.add(button.dataset.pinThread); writePins([...set]); renderLog(); }));
  log.querySelectorAll('[data-copy-entry]').forEach((button) => button.addEventListener('click', async () => { const entry = entries.find((item) => item.id === button.dataset.copyEntry); if (!entry) return; try { await navigator.clipboard.writeText(entry.text || ''); button.textContent = 'Copied'; } catch { button.textContent = 'Copy unavailable'; } }));
  log.querySelectorAll('[data-reply-entry]').forEach((button) => button.addEventListener('click', () => { rememberReply(entries.find((item) => item.id === button.dataset.replyEntry)); renderReplyBanner(document.querySelector('#commons-form')); document.querySelector('#commons-form textarea[name="message"]')?.focus(); }));
  log.querySelectorAll('[data-summary-thread]').forEach((button) => button.addEventListener('click', () => void summariseThread(button.dataset.summaryThread, button)));
  log.querySelectorAll('[data-link-entry]').forEach((button) => button.addEventListener('click', () => { linkTarget = entries.find((item) => item.id === button.dataset.linkEntry) || null; renderLog(); }));
  log.querySelector('[data-link-cancel]')?.addEventListener('click', () => { linkTarget = null; renderLog(); });
  log.querySelector('[data-link-save]')?.addEventListener('click', () => void saveCrossLink(log));
  log.querySelectorAll('[data-open-link-kind]').forEach((button) => button.addEventListener('click', () => openCrossLink(button.dataset.openLinkKind, button.dataset.openLinkId)));
  log.querySelectorAll('[data-commons-export]').forEach((button) => button.addEventListener('click', () => exportVisible(button.dataset.commonsExport)));
}
function downloadText(name, type, text) { const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function exportVisible(format) { const visible = filterCommonsEntries(entries, searchText, threadFilter, readPins(), pinsOnly); const stamp = new Date().toISOString().slice(0, 10); if (format === 'json') downloadText(`house-commons-${stamp}.json`, 'application/json', JSON.stringify({ schema: 'hearthgate.house-commons-export/v2', exported_at: new Date().toISOString(), entries: visible }, null, 2)); else downloadText(`house-commons-${stamp}.md`, 'text/markdown', exportCommonsMarkdown(visible)); }
function openCrossLink(kind, id) {
  const room = ({ world: 'worlds', canon: 'records', script: 'scripts', record: 'records', feedback: 'feedback' })[kind];
  if (room) document.querySelector(`[data-room="${room}"]`)?.click();
  document.dispatchEvent(new CustomEvent('arcsweep:commons-cross-link-open', { detail: { kind, id } }));
}
async function saveCrossLink(log) {
  if (!linkTarget) return; const token = await activeSession(); if (!token) return;
  const kind = log.querySelector('[data-link-kind]')?.value || 'record'; const id = String(log.querySelector('[data-link-id]')?.value || '').trim(); const label = String(log.querySelector('[data-link-label]')?.value || '').trim(); if (!id) return;
  const threadId = commonsThreadId(linkTarget); await appendHouseCommons(token, { kind: 'system', author: 'House Commons', status: 'linked', thread_id: threadId, turn_id: `commons-link:${uuid()}`, reply_to: linkTarget.id, links: [{ kind, id, label }], text: `Linked this thread to ${label || `${kind}:${id}`}.` }); linkTarget = null; await refreshLog();
}
async function summariseThread(threadId, button) {
  const token = await activeSession(); if (!token || !threadId) return; const thread = entries.filter((entry) => commonsThreadId(entry) === threadId); if (!thread.length) return;
  if (button) { button.disabled = true; button.textContent = 'Summarising…'; }
  publishModelPresence({ voiceId: 'atlas', displayName: 'Atlas', state: 'thinking', task: 'house-commons-summary' });
  try {
    const prompt = ['HOUSE COMMONS · THREAD SUMMARY', 'Summarise the visible thread faithfully. Preserve disagreements, decisions, open questions, and provenance-significant facts. Do not invent canon or hidden reasoning.', ...thread.slice(-40).map((entry) => `${entry.author || 'House'}: ${entry.text || ''}`)].join('\n\n');
    const reply = await invokeConstellationRuntimeVoice({ voiceId: 'atlas', message: prompt, sessionId: `house-commons-summary-${threadId}`, metadata: { surface: 'house-commons', summary_of: threadId } });
    const ok = reply.status === 'replied'; const text = ok ? reply.message : `[${reply.status}] ${reply.reason || 'Summary unavailable.'}`;
    await appendHouseCommons(token, { kind: 'voice', author: 'Atlas', voice_id: 'atlas', status: ok ? 'summary' : reply.status, thread_id: threadId, turn_id: `commons-summary:${uuid()}`, summary_of: threadId, runtime: { provider: reply.provider, model: reply.model, route: reply.route, profile_id: reply.profileId, latency_ms: reply.latencyMs, runtime_world_context_id: reply.runtimeWorldContextId }, text });
    publishModelPresence({ voiceId: 'atlas', displayName: 'Atlas', state: ok ? 'ready' : 'degraded', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, task: null, reason: ok ? null : reply.reason }); await refreshLog();
  } finally { if (button) { button.disabled = false; button.textContent = 'Summarise'; } }
}

async function refreshLog() {
  const connection = document.querySelector('[data-commons-connection]'); const token = await activeSession();
  if (!token) { if (connection) connection.textContent = 'House Runtime offline · connect once in Settings'; return; }
  try { const data = await readHouseCommons(token); entries = Array.isArray(data?.entries) ? data.entries : []; restoreReply(); if (connection) connection.textContent = `House Runtime connected · ${entries.length} saved turns loaded`; renderLog(); renderReplyBanner(document.querySelector('#commons-form')); }
  catch (error) { if (connection) connection.textContent = `House Runtime error · ${error.message}`; }
}
function enhance(form) {
  if (!form || form.dataset.commonsEnhanced === 'v3') return; form.dataset.commonsEnhanced = 'v3';
  const selected = new Set(readSelection()); voiceCheckboxes(form).forEach((input) => { input.checked = selected.has(input.value); input.addEventListener('change', () => { writeSelection(voiceCheckboxes(form).filter((item) => item.checked).map((item) => item.value)); syncAll(form); }); });
  installAll(form); syncAll(form); installComposer(form); renderReplyBanner(form);
  const heading = document.querySelector('.section-heading'); if (heading && !heading.querySelector('[data-commons-connection]')) { const state = document.createElement('p'); state.className = 'commons-connection-state'; state.dataset.commonsConnection = 'true'; state.textContent = 'Restoring House Runtime session…'; heading.querySelector('div')?.append(state); }
  void refreshLog();
}
function threadPrompt(message, threadId) {
  const history = entries.filter((entry) => commonsThreadId(entry) === threadId).slice(-16); if (!history.length) return message;
  return ['HOUSE COMMONS · VISIBLE THREAD CONTEXT', ...history.map((entry) => `${entry.author || 'House'}: ${entry.text || ''}`), '', "ROWAN'S NEW MESSAGE", message].join('\n\n');
}
async function activeWorld() {
  try { const context = await readActiveRuntimeWorldContext(); const anchor = context?.identity_anchor; return { id: anchor?.world_id || null, name: anchor?.world_name || document.querySelector('.sidebar-world strong')?.textContent?.trim() || 'Active World', context }; }
  catch { return { id: null, name: document.querySelector('.sidebar-world strong')?.textContent?.trim() || 'Active World', context: null }; }
}
async function handleSubmit(event) {
  const form = event.target; if (!(form instanceof HTMLFormElement) || form.id !== 'commons-form') return;
  event.preventDefault(); event.stopImmediatePropagation(); if (sending) return;
  const textarea = form.elements?.namedItem?.('message'); const message = String(textarea?.value || '').trim(); if (!message) return;
  const selectedIds = voiceCheckboxes(form).filter((input) => input.checked).map((input) => input.value); const mentions = parseCommonsMentions(message); const voiceIds = mentions.length ? mentions : selectedIds; if (!voiceIds.length) return;
  const token = await activeSession(); const connection = document.querySelector('[data-commons-connection]'); if (!token) { if (connection) connection.textContent = 'House Runtime offline · connect once in Settings'; return; }
  sending = true; const submit = form.querySelector('button[type="submit"]'); if (submit) { submit.disabled = true; submit.textContent = 'Constellation answering…'; }
  const world = await activeWorld(); const turnId = `commons-turn:${uuid()}`; const threadId = replyTarget?.thread_id || replyTarget?.id || turnId; const replyTo = replyTarget?.id || null; const runtimeMessage = threadPrompt(message, threadId);
  try {
    const stewardEntry = await appendHouseCommons(token, { kind: 'steward', author: 'Rowan', status: 'sent', world: world.id ? { id: world.id, name: world.name } : null, turn_id: turnId, thread_id: threadId, reply_to: replyTo, mentions, text: message });
    writeDraft(''); if (textarea) textarea.value = ''; rememberReply(null); await refreshLog();
    await Promise.all(voiceIds.map(async (voiceId) => {
      publishModelPresence({ voiceId, displayName: voiceName(voiceId), state: 'thinking', worldId: world.id, task: 'house-commons' });
      let reply; try { reply = await invokeConstellationRuntimeVoice({ voiceId, message: runtimeMessage, sessionId: `house-commons-${threadId}-${voiceId}`, metadata: { surface: 'house-commons', world_name: world.name, commons_thread_id: threadId, commons_turn_id: turnId, commons_reply_to: replyTo, mentions }, worldContext: world.context }); } catch (error) { reply = { status: 'route-error', reason: error?.message || String(error), voiceId }; }
      const successful = reply.status === 'replied'; const text = successful ? reply.message : `[${reply.status}] ${reply.reason || 'No reply returned.'}`;
      publishModelPresence({ voiceId, displayName: voiceName(voiceId), state: successful ? 'speaking' : 'degraded', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, worldId: reply.worldId || world.id, runtimeWorldContextId: reply.runtimeWorldContextId, task: successful ? 'house-commons-reply' : null, reason: successful ? null : reply.reason });
      await appendHouseCommons(token, { kind: 'voice', author: voiceName(voiceId), voice_id: voiceId, status: reply.status, world: (reply.worldId || world.id) ? { id: reply.worldId || world.id, name: world.name } : null, turn_id: turnId, thread_id: threadId, reply_to: stewardEntry.id, mentions, runtime: { provider: reply.provider, model: reply.model, route: reply.route, profile_id: reply.profileId, latency_ms: reply.latencyMs, runtime_world_context_id: reply.runtimeWorldContextId }, text });
      if (successful) queueMicrotask(() => publishModelPresence({ voiceId, state: 'ready', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, worldId: reply.worldId || world.id, runtimeWorldContextId: reply.runtimeWorldContextId, task: null })); await refreshLog();
    }));
  } finally { sending = false; if (submit) { submit.disabled = false; submit.textContent = 'Send to the Commons ∞'; } }
}
function styles() {
  if (document.getElementById('house-commons-chat-v3-styles')) return; const style = document.createElement('style'); style.id = 'house-commons-chat-v3-styles';
  style.textContent = `.commons-layout{grid-template-columns:minmax(0,1.45fr) minmax(20rem,.75fr);align-items:start}.commons-log{max-height:72vh;overflow:auto}.commons-chat-log-head{position:sticky;top:0;z-index:3;display:grid;gap:.6rem;padding-bottom:.75rem;background:var(--panel)}.commons-chat-log-head>div:first-child,.commons-chat-entry header{display:flex;align-items:center;gap:.6rem;justify-content:space-between}.commons-log-tools{display:flex;flex-wrap:wrap;gap:.4rem}.commons-log-tools input{min-width:14rem;flex:1}.commons-log-tools select{min-width:12rem}.commons-chat-entry{padding:.8rem 0;border-top:1px solid var(--line-soft)}.commons-chat-entry[data-unread="true"]{border-left:3px solid var(--gold);padding-left:.6rem}.commons-unread-dot{color:var(--gold);font-size:.65rem}.commons-chat-entry header span{margin-left:auto;color:var(--muted);font-size:.7rem}.commons-chat-entry header>div{display:flex;flex-wrap:wrap;gap:.3rem}.commons-reply-context,.commons-reply-banner,.commons-link-panel{margin:.25rem 0 .55rem;padding:.45rem .6rem;border-left:3px solid var(--gold);background:color-mix(in srgb,var(--gold) 7%,transparent);font-size:.78rem}.commons-reply-banner,.commons-link-panel{display:flex;align-items:center;flex-wrap:wrap;gap:.5rem}.commons-reply-banner[hidden]{display:none}.commons-link-panel input,.commons-link-panel select{width:auto;min-width:10rem;flex:1}.commons-chat-body{overflow-wrap:anywhere}.commons-chat-body p{margin:.45rem 0}.commons-chat-body blockquote{margin:.55rem 0;padding:.45rem .7rem;border-left:3px solid var(--gold);background:color-mix(in srgb,var(--gold) 7%,transparent)}.commons-chat-body code{padding:.12rem .28rem;border-radius:.3rem;background:rgba(0,0,0,.35)}.commons-mention{background:color-mix(in srgb,var(--green) 28%,transparent);color:var(--text);border-radius:.3rem;padding:.02rem .18rem}.commons-links{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.45rem}.commons-link-chip{padding:.3rem .5rem;font-size:.72rem;background:transparent;color:var(--green);border-color:var(--line)}.commons-bullet{margin:.2rem 0}.commons-toolbar{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.4rem}.commons-all-control{padding:.5rem .6rem;border:1px solid color-mix(in srgb,var(--gold) 30%,transparent);border-radius:.65rem}.commons-all-control span{display:grid}.commons-all-control small{color:var(--muted);font-weight:400}.commons-connection-state{margin:.5rem 0 0;color:var(--green);font-size:.8rem}@media(max-width:1000px){.commons-layout{grid-template-columns:1fr}.commons-log{max-height:none}}@media(max-width:600px){.commons-chat-entry header{align-items:flex-start;flex-wrap:wrap}.commons-chat-entry header span{margin-left:0;width:100%}.commons-log-tools>*{width:100%!important}}`;
  document.head.append(style);
}
export function installHouseCommonsChatV3() {
  if (installed || typeof document === 'undefined') return; installed = true; styles(); document.addEventListener('submit', handleSubmit, true);
  observer = new MutationObserver(() => enhance(document.querySelector('#commons-form'))); observer.observe(document.body, { childList: true, subtree: true }); enhance(document.querySelector('#commons-form'));
  refreshTimer = setInterval(() => { if (document.querySelector('#commons-form')) void refreshLog(); }, REFRESH_MS); globalThis.addEventListener?.('beforeunload', () => { if (refreshTimer) clearInterval(refreshTimer); observer?.disconnect(); }, { once: true });
}
if (typeof document !== 'undefined') installHouseCommonsChatV3();
