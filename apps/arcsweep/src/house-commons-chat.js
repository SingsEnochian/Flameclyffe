import { CONSTELLATION_VOICES } from './feedback-loop.js';
import {
  HOUSE_COOKIE_SESSION,
  appendHouseCommons,
  readHouseCommons,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
} from './house-runtime.js';
import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';
import { publishModelPresence } from './model-presence-bus.js';

export const COMMONS_SELECTION_KEY = 'arcsweep.house-commons-selection/v1';
export const COMMONS_DRAFT_KEY = 'arcsweep.house-commons-draft/v1';
const REFRESH_MS = 5000;
let refreshTimer = null;
let observer = null;
let installed = false;
let sending = false;

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function defaultCommonsVoiceIds(voices = CONSTELLATION_VOICES) {
  return voices.map((voice) => voice.id);
}

export function normaliseCommonsSelection(value, voices = CONSTELLATION_VOICES) {
  const allowed = new Set(voices.map((voice) => voice.id));
  const ids = Array.isArray(value) ? value : [];
  const selected = [...new Set(ids.map((item) => String(item).trim().toLowerCase()).filter((id) => allowed.has(id)))];
  return selected.length ? selected : defaultCommonsVoiceIds(voices);
}

function readSelection(storage = globalThis.localStorage) {
  try { return normaliseCommonsSelection(JSON.parse(storage?.getItem(COMMONS_SELECTION_KEY) || 'null')); }
  catch { return defaultCommonsVoiceIds(); }
}

function writeSelection(ids, storage = globalThis.localStorage) {
  const selected = normaliseCommonsSelection(ids);
  try { storage?.setItem(COMMONS_SELECTION_KEY, JSON.stringify(selected)); } catch {}
  return selected;
}

function readDraft(storage = globalThis.localStorage) {
  try { return storage?.getItem(COMMONS_DRAFT_KEY) || ''; } catch { return ''; }
}

function writeDraft(value, storage = globalThis.localStorage) {
  try {
    if (value) storage?.setItem(COMMONS_DRAFT_KEY, value);
    else storage?.removeItem(COMMONS_DRAFT_KEY);
  } catch {}
}

export function renderCommonsMarkdown(value = '') {
  let text = escapeHtml(value);
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  text = text.replace(/^&gt;\s?(.*)$/gm, '<blockquote>$1</blockquote>');
  text = text.replace(/^[-*]\s+(.*)$/gm, '<div class="commons-bullet">• $1</div>');
  return text.split(/\n{2,}/).map((block) => block.startsWith('<blockquote>') || block.startsWith('<div class="commons-bullet">') ? block : `<p>${block.replaceAll('\n', '<br>')}</p>`).join('');
}

async function activeSession() {
  return readHouseRuntimeToken() || await restoreHouseRuntimeSession();
}

function voiceName(voiceId) {
  return CONSTELLATION_VOICES.find((voice) => voice.id === voiceId)?.name || voiceId;
}

function voiceCheckboxes(form) {
  return [...form.querySelectorAll('input[name="voiceIds"]')];
}

function syncAllControl(form) {
  const all = form.querySelector('[data-commons-all]');
  const checks = voiceCheckboxes(form);
  if (!all || !checks.length) return;
  const checked = checks.filter((input) => input.checked).length;
  all.checked = checked === checks.length;
  all.indeterminate = checked > 0 && checked < checks.length;
}

function installAllControl(form) {
  const fieldset = form.querySelector('fieldset');
  if (!fieldset || fieldset.querySelector('[data-commons-all]')) return;
  const label = document.createElement('label');
  label.className = 'checkbox commons-all-control';
  label.innerHTML = '<input type="checkbox" data-commons-all /> <span><b>All Constellation</b><small>Everyone may answer this turn</small></span>';
  fieldset.insertBefore(label, fieldset.querySelector('.voice-grid') || fieldset.firstChild);
  const all = label.querySelector('input');
  all.addEventListener('change', () => {
    voiceCheckboxes(form).forEach((input) => { input.checked = all.checked; });
    writeSelection(voiceCheckboxes(form).filter((input) => input.checked).map((input) => input.value));
    syncAllControl(form);
  });
}

function wrapSelection(textarea, before, after = before) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const selected = textarea.value.slice(start, end);
  textarea.setRangeText(`${before}${selected}${after}`, start, end, 'select');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
}

function installToolbar(form) {
  const textarea = form.elements?.namedItem?.('message');
  if (!(textarea instanceof HTMLTextAreaElement) || form.querySelector('[data-commons-toolbar]')) return;
  const toolbar = document.createElement('div');
  toolbar.className = 'commons-toolbar';
  toolbar.dataset.commonsToolbar = 'true';
  toolbar.innerHTML = [
    ['bold', 'B', '**', '**'], ['italic', 'I', '_', '_'], ['code', '</>', '`', '`'], ['quote', '❯', '> ', ''], ['bullet', '•', '- ', ''],
  ].map(([kind, label, before, after]) => `<button type="button" class="quiet mini" data-format="${kind}" data-before="${escapeHtml(before)}" data-after="${escapeHtml(after)}">${label}</button>`).join('');
  textarea.parentElement?.insertBefore(toolbar, textarea);
  toolbar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-format]');
    if (!button) return;
    wrapSelection(textarea, button.dataset.before || '', button.dataset.after || '');
  });
  if (!textarea.value) textarea.value = readDraft();
  textarea.addEventListener('input', () => writeDraft(textarea.value));
}

function renderEntry(entry) {
  const stamp = entry.created_at ? new Date(entry.created_at).toLocaleString() : '';
  return `<article class="commons-chat-entry" data-kind="${escapeHtml(entry.kind || 'system')}">
    <header><strong>${escapeHtml(entry.author || 'House')}</strong><span>${escapeHtml([stamp, entry.status].filter(Boolean).join(' · '))}</span><button type="button" class="quiet mini" data-copy-entry="${escapeHtml(entry.id || '')}">Copy</button></header>
    <div class="commons-chat-body">${renderCommonsMarkdown(entry.text || '')}</div>
  </article>`;
}

async function refreshLog() {
  const log = document.querySelector('.commons-log');
  if (!log) return;
  const token = await activeSession();
  const connection = document.querySelector('[data-commons-connection]');
  if (!token) {
    if (connection) connection.textContent = 'House Runtime offline · connect once in Settings';
    return;
  }
  try {
    const data = await readHouseCommons(token);
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    if (connection) connection.textContent = `House Runtime connected · ${entries.length} saved turns loaded`;
    log.innerHTML = `<div class="commons-chat-log-head"><h2>Conversation</h2><span>${entries.length} saved turns</span></div>${entries.length ? entries.map(renderEntry).join('') : '<p class="muted">The Commons is quiet. Speak when ready.</p>'}`;
    log.querySelectorAll('[data-copy-entry]').forEach((button) => {
      button.addEventListener('click', async () => {
        const entry = entries.find((item) => item.id === button.dataset.copyEntry);
        if (!entry) return;
        try { await navigator.clipboard.writeText(entry.text || ''); button.textContent = 'Copied'; }
        catch { button.textContent = 'Copy unavailable'; }
      });
    });
    log.scrollTop = log.scrollHeight;
  } catch (error) {
    if (connection) connection.textContent = `House Runtime error · ${error.message}`;
  }
}

function enhanceCommons(form) {
  if (!form || form.dataset.commonsEnhanced === 'true') return;
  form.dataset.commonsEnhanced = 'true';
  const fieldset = form.querySelector('fieldset');
  const selected = new Set(readSelection());
  voiceCheckboxes(form).forEach((input) => {
    input.checked = selected.has(input.value);
    input.addEventListener('change', () => {
      const ids = voiceCheckboxes(form).filter((item) => item.checked).map((item) => item.value);
      writeSelection(ids);
      syncAllControl(form);
    });
  });
  installAllControl(form);
  syncAllControl(form);
  installToolbar(form);
  const heading = document.querySelector('.section-heading');
  if (heading && !heading.querySelector('[data-commons-connection]')) {
    const state = document.createElement('p');
    state.className = 'commons-connection-state';
    state.dataset.commonsConnection = 'true';
    state.textContent = 'Restoring House Runtime session…';
    heading.querySelector('div')?.append(state);
  }
  void refreshLog();
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'commons-form') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (sending) return;
  const message = String(form.elements?.namedItem?.('message')?.value || '').trim();
  if (!message) return;
  const voiceIds = voiceCheckboxes(form).filter((input) => input.checked).map((input) => input.value);
  if (!voiceIds.length) return;
  const token = await activeSession();
  if (!token) {
    const connection = document.querySelector('[data-commons-connection]');
    if (connection) connection.textContent = 'House Runtime offline · connect once in Settings';
    return;
  }
  sending = true;
  const submit = form.querySelector('button[type="submit"]');
  if (submit) { submit.disabled = true; submit.textContent = 'Constellation answering…'; }
  const worldName = document.querySelector('.sidebar-world strong')?.textContent?.trim() || 'Active World';
  const worldId = document.body?.dataset.worldId || document.body?.dataset.activeWorldId || null;
  try {
    await appendHouseCommons(token, { kind: 'steward', author: 'Rowan', status: 'sent', world: worldId ? { id: worldId, name: worldName } : null, text: message });
    writeDraft('');
    const textarea = form.elements?.namedItem?.('message');
    if (textarea) textarea.value = '';
    await refreshLog();
    await Promise.all(voiceIds.map(async (voiceId) => {
      publishModelPresence({ voiceId, displayName: voiceName(voiceId), state: 'thinking', worldId, task: 'house-commons' });
      let reply;
      try {
        reply = await invokeConstellationRuntimeVoice({
          voiceId,
          message,
          sessionId: `house-commons-${worldId || 'world'}-${voiceId}`,
          metadata: { surface: 'house-commons', world_name: worldName },
        });
      } catch (error) {
        reply = { status: 'route-error', reason: error?.message || String(error), voiceId };
      }
      const successful = reply.status === 'replied';
      const text = successful ? reply.message : `[${reply.status}] ${reply.reason || 'No reply returned.'}`;
      publishModelPresence({
        voiceId,
        displayName: voiceName(voiceId),
        state: successful ? 'speaking' : 'degraded',
        provider: reply.provider,
        model: reply.model,
        latencyMs: reply.latencyMs,
        worldId: reply.worldId || worldId,
        runtimeWorldContextId: reply.runtimeWorldContextId,
        task: successful ? 'house-commons-reply' : null,
        reason: successful ? null : reply.reason,
      });
      await appendHouseCommons(token, { kind: 'voice', author: voiceName(voiceId), voice_id: voiceId, status: reply.status, world: (reply.worldId || worldId) ? { id: reply.worldId || worldId, name: worldName } : null, text });
      if (successful) queueMicrotask(() => publishModelPresence({ voiceId, state: 'ready', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, worldId: reply.worldId || worldId, runtimeWorldContextId: reply.runtimeWorldContextId, task: null }));
      await refreshLog();
    }));
  } finally {
    sending = false;
    if (submit) { submit.disabled = false; submit.textContent = 'Send to the Commons ∞'; }
  }
}

function injectStyles() {
  if (document.getElementById('house-commons-chat-styles')) return;
  const style = document.createElement('style');
  style.id = 'house-commons-chat-styles';
  style.textContent = `.commons-layout{grid-template-columns:minmax(0,1.45fr) minmax(20rem,.75fr);align-items:start}.commons-log{max-height:70vh;overflow:auto}.commons-chat-log-head,.commons-chat-entry header{display:flex;align-items:center;gap:.6rem;justify-content:space-between}.commons-chat-log-head{position:sticky;top:0;z-index:2;padding-bottom:.75rem;background:var(--panel)}.commons-chat-entry{padding:.8rem 0;border-top:1px solid var(--line-soft)}.commons-chat-entry header span{margin-left:auto;color:var(--muted);font-size:.72rem}.commons-chat-body{overflow-wrap:anywhere}.commons-chat-body p{margin:.45rem 0}.commons-chat-body blockquote{margin:.55rem 0;padding:.45rem .7rem;border-left:3px solid var(--gold);background:color-mix(in srgb,var(--gold) 7%,transparent)}.commons-chat-body code{padding:.12rem .28rem;border-radius:.3rem;background:rgba(0,0,0,.35)}.commons-bullet{margin:.2rem 0}.commons-toolbar{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.4rem}.commons-all-control{padding:.5rem .6rem;border:1px solid color-mix(in srgb,var(--gold) 30%,transparent);border-radius:.65rem}.commons-all-control span{display:grid}.commons-all-control small{color:var(--muted);font-weight:400}.commons-connection-state{margin:.5rem 0 0;color:var(--green);font-size:.8rem}@media(max-width:900px){.commons-layout{grid-template-columns:1fr}.commons-log{max-height:none}}`;
  document.head.append(style);
}

export function installHouseCommonsChat() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  injectStyles();
  document.addEventListener('submit', handleSubmit, true);
  observer = new MutationObserver(() => enhanceCommons(document.querySelector('#commons-form')));
  observer.observe(document.body, { childList: true, subtree: true });
  enhanceCommons(document.querySelector('#commons-form'));
  refreshTimer = setInterval(() => { if (document.querySelector('#commons-form')) void refreshLog(); }, REFRESH_MS);
  globalThis.addEventListener?.('beforeunload', () => { if (refreshTimer) clearInterval(refreshTimer); observer?.disconnect(); }, { once: true });
}

if (typeof document !== 'undefined') installHouseCommonsChat();
