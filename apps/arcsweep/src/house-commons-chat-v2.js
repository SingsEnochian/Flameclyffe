import { CONSTELLATION_VOICES } from './feedback-loop.js';
import { appendHouseCommons, readHouseCommons, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';
import { publishModelPresence } from './model-presence-bus.js';

export const COMMONS_SELECTION_KEY = 'arcsweep.house-commons-selection/v1';
export const COMMONS_DRAFT_KEY = 'arcsweep.house-commons-draft/v1';
export const COMMONS_REPLY_KEY = 'arcsweep.house-commons-reply/v1';
const REFRESH_MS = 5000;
let refreshTimer = null;
let observer = null;
let installed = false;
let sending = false;
let entries = [];
let searchText = '';
let threadFilter = '';
let replyTarget = null;

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const uuid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function defaultCommonsVoiceIds(voices = CONSTELLATION_VOICES) { return voices.map((voice) => voice.id); }
export function normaliseCommonsSelection(value, voices = CONSTELLATION_VOICES) {
  const allowed = new Set(voices.map((voice) => voice.id));
  const selected = [...new Set((Array.isArray(value) ? value : []).map((item) => String(item).trim().toLowerCase()).filter((id) => allowed.has(id)))];
  return selected.length ? selected : defaultCommonsVoiceIds(voices);
}
export function renderCommonsMarkdown(value = '') {
  let text = esc(value);
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/_([^_\n]+)_/g, '<em>$1</em>');
  text = text.replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>').replace(/^[-*]\s+(.*)$/gm, '<div class="commons-bullet">• $1</div>');
  return text.split(/\n{2,}/).map((block) => block.startsWith('<blockquote>') || block.startsWith('<div class="commons-bullet">') ? block : `<p>${block.replaceAll('\n', '<br>')}</p>`).join('');
}
export function commonsThreadId(entry) { return entry?.thread_id || entry?.turn_id || entry?.id || null; }
export function filterCommonsEntries(source, query = '', threadId = '') {
  const needle = String(query || '').trim().toLowerCase();
  return (source || []).filter((entry) => (!threadId || commonsThreadId(entry) === threadId) && (!needle || [entry.author, entry.text, entry.status, entry.voice_id, entry.world?.name].some((value) => String(value || '').toLowerCase().includes(needle))));
}
export function exportCommonsMarkdown(source) {
  return (source || []).map((entry) => {
    const meta = [entry.created_at, entry.status, entry.thread_id ? `thread:${entry.thread_id}` : null, entry.reply_to ? `reply:${entry.reply_to}` : null].filter(Boolean).join(' · ');
    return `### ${entry.author || 'House'}\n${meta}\n\n${entry.text || ''}`;
  }).join('\n\n---\n\n');
}

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
function readSelection() { return normaliseCommonsSelection(readJson(COMMONS_SELECTION_KEY, null)); }
function writeSelection(ids) { const value = normaliseCommonsSelection(ids); try { localStorage.setItem(COMMONS_SELECTION_KEY, JSON.stringify(value)); } catch {} return value; }
function readDraft() { try { return localStorage.getItem(COMMONS_DRAFT_KEY) || ''; } catch { return ''; } }
function writeDraft(value) { try { value ? localStorage.setItem(COMMONS_DRAFT_KEY, value) : localStorage.removeItem(COMMONS_DRAFT_KEY); } catch {} }
function rememberReply(target) { replyTarget = target || null; try { replyTarget ? localStorage.setItem(COMMONS_REPLY_KEY, JSON.stringify({ id: replyTarget.id, thread_id: commonsThreadId(replyTarget), author: replyTarget.author, text: replyTarget.text })) : localStorage.removeItem(COMMONS_REPLY_KEY); } catch {} }
function restoreReply() { const saved = readJson(COMMONS_REPLY_KEY, null); if (!saved?.id) return; replyTarget = entries.find((entry) => entry.id === saved.id) || saved; }
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
  textarea.addEventListener('input', () => writeDraft(textarea.value), { once: false });
  if (!form.querySelector('[data-commons-toolbar]')) {
    const toolbar = document.createElement('div'); toolbar.className = 'commons-toolbar'; toolbar.dataset.commonsToolbar = 'true';
    toolbar.innerHTML = [['B','**','**'],['I','_','_'],['</>','`','`'],['❯','> ',''],['•','- ','']].map(([label,before,after]) => `<button type="button" class="quiet mini" data-before="${esc(before)}" data-after="${esc(after)}">${label}</button>`).join('');
    textarea.parentElement?.insertBefore(toolbar, textarea);
    toolbar.addEventListener('click', (event) => { const button = event.target.closest('[data-before]'); if (button) wrapSelection(textarea, button.dataset.before || '', button.dataset.after || ''); });
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
  banner.hidden = !replyTarget; if (!replyTarget) return;
  banner.querySelector('[data-commons-reply-text]').textContent = `Replying to ${replyTarget.author || 'House'} · ${String(replyTarget.text || '').slice(0, 140)}`;
}

function renderEntry(entry) {
  const stamp = entry.created_at ? new Date(entry.created_at).toLocaleString() : '';
  const parent = entry.reply_to ? entries.find((item) => item.id === entry.reply_to) : null;
  const runtime = entry.runtime ? [entry.runtime.provider, entry.runtime.model, entry.runtime.latency_ms != null ? `${entry.runtime.latency_ms} ms` : null].filter(Boolean).join(' · ') : '';
  return `<article class="commons-chat-entry" data-entry-id="${esc(entry.id || '')}" data-thread-id="${esc(commonsThreadId(entry) || '')}" data-kind="${esc(entry.kind || 'system')}">
    ${parent ? `<div class="commons-reply-context">↳ ${esc(parent.author || 'House')}: ${esc(String(parent.text || '').slice(0, 120))}</div>` : ''}
    <header><strong>${esc(entry.author || 'House')}</strong><span>${esc([stamp, entry.status, runtime].filter(Boolean).join(' · '))}</span><div><button type="button" class="quiet mini" data-reply-entry="${esc(entry.id || '')}">Reply</button><button type="button" class="quiet mini" data-copy-entry="${esc(entry.id || '')}">Copy</button></div></header>
    <div class="commons-chat-body">${renderCommonsMarkdown(entry.text || '')}</div>
  </article>`;
}
function threadOptions() {
  const roots = new Map();
  for (const entry of entries) { const id = commonsThreadId(entry); if (id && !roots.has(id)) roots.set(id, entry); }
  return [...roots].map(([id, entry]) => `<option value="${esc(id)}" ${threadFilter === id ? 'selected' : ''}>${esc(`${entry.author || 'House'} · ${String(entry.text || '').replace(/\s+/g, ' ').slice(0, 52)}`)}</option>`).join('');
}
function renderLog() {
  const log = document.querySelector('.commons-log'); if (!log) return;
  const visible = filterCommonsEntries(entries, searchText, threadFilter);
  log.innerHTML = `<div class="commons-chat-log-head"><div><h2>Conversation</h2><span>${visible.length} shown · ${entries.length} saved</span></div><div class="commons-log-tools"><input type="search" data-commons-search value="${esc(searchText)}" placeholder="Search Commons…" aria-label="Search House Commons"/><select data-commons-thread aria-label="Filter conversation thread"><option value="">All threads</option>${threadOptions()}</select><button type="button" class="quiet mini" data-commons-export="md">Export .md</button><button type="button" class="quiet mini" data-commons-export="json">Export .json</button></div></div>${visible.length ? visible.map(renderEntry).join('') : '<p class="muted">No Commons turns match this view.</p>'}`;
  log.querySelector('[data-commons-search]')?.addEventListener('input', (event) => { searchText = event.target.value; renderLog(); });
  log.querySelector('[data-commons-thread]')?.addEventListener('change', (event) => { threadFilter = event.target.value; renderLog(); });
  log.querySelectorAll('[data-copy-entry]').forEach((button) => button.addEventListener('click', async () => { const entry = entries.find((item) => item.id === button.dataset.copyEntry); if (!entry) return; try { await navigator.clipboard.writeText(entry.text || ''); button.textContent = 'Copied'; } catch { button.textContent = 'Copy unavailable'; } }));
  log.querySelectorAll('[data-reply-entry]').forEach((button) => button.addEventListener('click', () => { rememberReply(entries.find((item) => item.id === button.dataset.replyEntry)); renderReplyBanner(document.querySelector('#commons-form')); document.querySelector('#commons-form textarea[name="message"]')?.focus(); }));
  log.querySelectorAll('[data-commons-export]').forEach((button) => button.addEventListener('click', () => exportVisible(button.dataset.commonsExport)));
}
function downloadText(name, type, text) { const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function exportVisible(format) { const visible = filterCommonsEntries(entries, searchText, threadFilter); const stamp = new Date().toISOString().slice(0, 10); if (format === 'json') downloadText(`house-commons-${stamp}.json`, 'application/json', JSON.stringify({ schema: 'hearthgate.house-commons-export/v1', exported_at: new Date().toISOString(), entries: visible }, null, 2)); else downloadText(`house-commons-${stamp}.md`, 'text/markdown', exportCommonsMarkdown(visible)); }

async function refreshLog() {
  const connection = document.querySelector('[data-commons-connection]'); const token = await activeSession();
  if (!token) { if (connection) connection.textContent = 'House Runtime offline · connect once in Settings'; return; }
  try { const data = await readHouseCommons(token); entries = Array.isArray(data?.entries) ? data.entries : []; restoreReply(); if (connection) connection.textContent = `House Runtime connected · ${entries.length} saved turns loaded`; renderLog(); renderReplyBanner(document.querySelector('#commons-form')); }
  catch (error) { if (connection) connection.textContent = `House Runtime error · ${error.message}`; }
}
function enhance(form) {
  if (!form || form.dataset.commonsEnhanced === 'v2') return; form.dataset.commonsEnhanced = 'v2';
  const selected = new Set(readSelection()); voiceCheckboxes(form).forEach((input) => { input.checked = selected.has(input.value); input.addEventListener('change', () => { writeSelection(voiceCheckboxes(form).filter((item) => item.checked).map((item) => item.value)); syncAll(form); }); });
  installAll(form); syncAll(form); installComposer(form); renderReplyBanner(form);
  const heading = document.querySelector('.section-heading'); if (heading && !heading.querySelector('[data-commons-connection]')) { const state = document.createElement('p'); state.className = 'commons-connection-state'; state.dataset.commonsConnection = 'true'; state.textContent = 'Restoring House Runtime session…'; heading.querySelector('div')?.append(state); }
  void refreshLog();
}
function threadPrompt(message, threadId) {
  const history = entries.filter((entry) => commonsThreadId(entry) === threadId).slice(-16);
  if (!history.length) return message;
  return ['HOUSE COMMONS · VISIBLE THREAD CONTEXT', ...history.map((entry) => `${entry.author || 'House'}: ${entry.text || ''}`), '', "ROWAN'S NEW MESSAGE", message].join('\n\n');
}
async function handleSubmit(event) {
  const form = event.target; if (!(form instanceof HTMLFormElement) || form.id !== 'commons-form') return;
  event.preventDefault(); event.stopImmediatePropagation(); if (sending) return;
  const textarea = form.elements?.namedItem?.('message'); const message = String(textarea?.value || '').trim(); if (!message) return;
  const voiceIds = voiceCheckboxes(form).filter((input) => input.checked).map((input) => input.value); if (!voiceIds.length) return;
  const token = await activeSession(); const connection = document.querySelector('[data-commons-connection]'); if (!token) { if (connection) connection.textContent = 'House Runtime offline · connect once in Settings'; return; }
  sending = true; const submit = form.querySelector('button[type="submit"]'); if (submit) { submit.disabled = true; submit.textContent = 'Constellation answering…'; }
  const worldName = document.querySelector('.sidebar-world strong')?.textContent?.trim() || 'Active World'; const worldId = document.body?.dataset.worldId || document.body?.dataset.activeWorldId || null;
  const turnId = `commons-turn:${uuid()}`; const threadId = replyTarget?.thread_id || replyTarget?.id || turnId; const replyTo = replyTarget?.id || null;
  try {
    const stewardEntry = await appendHouseCommons(token, { kind: 'steward', author: 'Rowan', status: 'sent', world: worldId ? { id: worldId, name: worldName } : null, turn_id: turnId, thread_id: threadId, reply_to: replyTo, text: message });
    writeDraft(''); if (textarea) textarea.value = ''; rememberReply(null); await refreshLog();
    const runtimeMessage = threadPrompt(message, threadId);
    await Promise.all(voiceIds.map(async (voiceId) => {
      publishModelPresence({ voiceId, displayName: voiceName(voiceId), state: 'thinking', worldId, task: 'house-commons' });
      let reply; try { reply = await invokeConstellationRuntimeVoice({ voiceId, message: runtimeMessage, sessionId: `house-commons-${threadId}-${voiceId}`, metadata: { surface: 'house-commons', world_name: worldName, commons_thread_id: threadId, commons_turn_id: turnId, commons_reply_to: replyTo } }); } catch (error) { reply = { status: 'route-error', reason: error?.message || String(error), voiceId }; }
      const successful = reply.status === 'replied'; const text = successful ? reply.message : `[${reply.status}] ${reply.reason || 'No reply returned.'}`;
      publishModelPresence({ voiceId, displayName: voiceName(voiceId), state: successful ? 'speaking' : 'degraded', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, worldId: reply.worldId || worldId, runtimeWorldContextId: reply.runtimeWorldContextId, task: successful ? 'house-commons-reply' : null, reason: successful ? null : reply.reason });
      await appendHouseCommons(token, { kind: 'voice', author: voiceName(voiceId), voice_id: voiceId, status: reply.status, world: (reply.worldId || worldId) ? { id: reply.worldId || worldId, name: worldName } : null, turn_id: turnId, thread_id: threadId, reply_to: stewardEntry.id, runtime: { provider: reply.provider, model: reply.model, route: reply.route, profile_id: reply.profileId, latency_ms: reply.latencyMs, runtime_world_context_id: reply.runtimeWorldContextId }, text });
      if (successful) queueMicrotask(() => publishModelPresence({ voiceId, state: 'ready', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, worldId: reply.worldId || worldId, runtimeWorldContextId: reply.runtimeWorldContextId, task: null }));
      await refreshLog();
    }));
  } finally { sending = false; if (submit) { submit.disabled = false; submit.textContent = 'Send to the Commons ∞'; } }
}
function styles() {
  if (document.getElementById('house-commons-chat-v2-styles')) return; const style = document.createElement('style'); style.id = 'house-commons-chat-v2-styles';
  style.textContent = `.commons-layout{grid-template-columns:minmax(0,1.45fr) minmax(20rem,.75fr);align-items:start}.commons-log{max-height:72vh;overflow:auto}.commons-chat-log-head{position:sticky;top:0;z-index:3;display:grid;gap:.6rem;padding-bottom:.75rem;background:var(--panel)}.commons-chat-log-head>div:first-child,.commons-chat-entry header{display:flex;align-items:center;gap:.6rem;justify-content:space-between}.commons-log-tools{display:grid;grid-template-columns:minmax(10rem,1fr) minmax(10rem,.7fr) auto auto;gap:.4rem}.commons-log-tools input,.commons-log-tools select{padding:.5rem}.commons-chat-entry{padding:.8rem 0;border-top:1px solid var(--line-soft)}.commons-chat-entry header span{margin-left:auto;color:var(--muted);font-size:.7rem}.commons-chat-entry header>div{display:flex;gap:.3rem}.commons-reply-context,.commons-reply-banner{margin:.25rem 0 .55rem;padding:.45rem .6rem;border-left:3px solid var(--gold);background:color-mix(in srgb,var(--gold) 7%,transparent);font-size:.78rem}.commons-reply-banner{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.commons-reply-banner[hidden]{display:none}.commons-chat-body{overflow-wrap:anywhere}.commons-chat-body p{margin:.45rem 0}.commons-chat-body blockquote{margin:.55rem 0;padding:.45rem .7rem;border-left:3px solid var(--gold);background:color-mix(in srgb,var(--gold) 7%,transparent)}.commons-chat-body code{padding:.12rem .28rem;border-radius:.3rem;background:rgba(0,0,0,.35)}.commons-bullet{margin:.2rem 0}.commons-toolbar{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.4rem}.commons-all-control{padding:.5rem .6rem;border:1px solid color-mix(in srgb,var(--gold) 30%,transparent);border-radius:.65rem}.commons-all-control span{display:grid}.commons-all-control small{color:var(--muted);font-weight:400}.commons-connection-state{margin:.5rem 0 0;color:var(--green);font-size:.8rem}@media(max-width:1000px){.commons-log-tools{grid-template-columns:1fr 1fr}.commons-layout{grid-template-columns:1fr}.commons-log{max-height:none}}@media(max-width:600px){.commons-log-tools{grid-template-columns:1fr}.commons-chat-entry header{align-items:flex-start;flex-wrap:wrap}.commons-chat-entry header span{margin-left:0;width:100%}}`;
  document.head.append(style);
}
export function installHouseCommonsChatV2() {
  if (installed || typeof document === 'undefined') return; installed = true; styles(); document.addEventListener('submit', handleSubmit, true);
  observer = new MutationObserver(() => enhance(document.querySelector('#commons-form'))); observer.observe(document.body, { childList: true, subtree: true }); enhance(document.querySelector('#commons-form'));
  refreshTimer = setInterval(() => { if (document.querySelector('#commons-form')) void refreshLog(); }, REFRESH_MS); globalThis.addEventListener?.('beforeunload', () => { if (refreshTimer) clearInterval(refreshTimer); observer?.disconnect(); }, { once: true });
}
if (typeof document !== 'undefined') installHouseCommonsChatV2();
