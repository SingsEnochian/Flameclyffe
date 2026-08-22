import { readHouseCommons, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import { currentModelPresence, MODEL_PRESENCE_EVENT } from './model-presence-bus.js';
import { readRuntimeIntegrationEnvelope } from './runtime-integration-bridge.js';

export const COMMONS_THREAD_TITLES_KEY = 'arcsweep.house-commons-thread-titles/v1';
export const COMMONS_ARCHIVE_KEY = 'arcsweep.house-commons-archive/v1';
export const COMMONS_PINS_KEY = 'arcsweep.house-commons-pins/v1';
export const COMMONS_SEEN_KEY = 'arcsweep.house-commons-seen/v1';

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
const writeJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
const threadId = (entry) => entry?.thread_id || entry?.turn_id || entry?.id || null;

export function buildCommonsThreads(entries = [], { titles = {}, pinned = [], archived = [], seenAt = '' } = {}) {
  const map = new Map(); const cutoff = Date.parse(seenAt || 0); const pins = new Set(pinned); const archive = new Set(archived);
  for (const entry of entries) {
    const id = threadId(entry); if (!id) continue;
    const item = map.get(id) || { id, entries: [], participants: new Set(), world: null, summary: null, last_at: '', unread: 0 };
    item.entries.push(entry); if (entry.author) item.participants.add(entry.author); if (entry.world) item.world = entry.world;
    if (entry.summary_of === id) item.summary = entry.text; if ((entry.created_at || '') > item.last_at) item.last_at = entry.created_at || '';
    if (Date.parse(entry.created_at || 0) > cutoff) item.unread += 1; map.set(id, item);
  }
  return [...map.values()].map((item) => ({ ...item, participants: [...item.participants], pinned: pins.has(item.id), archived: archive.has(item.id), title: titles[item.id] || suggestThreadTitle(item.entries) }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.last_at.localeCompare(a.last_at));
}
export function suggestThreadTitle(entries = []) {
  const root = entries.find((entry) => entry.kind === 'steward') || entries[0]; const text = String(root?.text || 'New Commons thread').replace(/@[\w/-]+/g, '').replace(/\s+/g, ' ').trim();
  return text.length > 52 ? `${text.slice(0, 49)}…` : text || 'New Commons thread';
}
export function runtimeThreadContext(thread, envelope = null) {
  return { thread_id: thread?.id || null, world: thread?.world || envelope?.world || null, participants: thread?.participants || [], summary: thread?.summary || null, canon: envelope?.canon || null, premaq: envelope?.premaq || null, spiral: envelope?.spiral || null, ask: envelope?.ask || null, provenance: envelope?.provenance || [], runtime_session_id: envelope?.session_id || null };
}

async function session() { return readHouseRuntimeToken() || await restoreHouseRuntimeSession(); }
function statusText() {
  const active = currentModelPresence().filter((item) => ['waking','thinking','speaking','degraded','error'].includes(item.state));
  if (!active.length) return 'Constellation ready';
  return active.map((item) => `${item.display_name || item.voice_id} ${item.state}${item.task ? ` · ${item.task}` : ''}`).join(' · ');
}
function openThread(id) {
  const select = document.querySelector('[data-commons-thread]'); if (select) { select.value = id; select.dispatchEvent(new Event('change', { bubbles: true })); }
  document.querySelector('.commons-log')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function render(container, entries) {
  const titles = readJson(COMMONS_THREAD_TITLES_KEY, {}); const pinned = readJson(COMMONS_PINS_KEY, []); const archived = readJson(COMMONS_ARCHIVE_KEY, []); const seenAt = localStorage.getItem(COMMONS_SEEN_KEY) || '';
  const threads = buildCommonsThreads(entries, { titles, pinned, archived, seenAt }); const visible = threads.filter((thread) => !thread.archived);
  container.innerHTML = `<aside class="commons-command-room"><header><div><strong>Command Room</strong><small>${visible.length} active threads</small></div><button type="button" class="quiet mini" data-new-thread>New thread</button></header><div class="commons-live-answering" data-live-answering>${esc(statusText())}</div><div class="commons-thread-list">${visible.map((thread) => `<article class="commons-thread-card" data-thread-card="${esc(thread.id)}"><button type="button" class="commons-thread-open" data-open-thread="${esc(thread.id)}"><span>${thread.pinned ? '★ ' : ''}${esc(thread.title)}</span><small>${esc([thread.world?.name, thread.participants.join(', '), thread.unread ? `${thread.unread} unread` : null].filter(Boolean).join(' · '))}</small>${thread.summary ? `<em>${esc(thread.summary.slice(0, 120))}</em>` : ''}</button><div><button type="button" class="quiet mini" data-rename-thread="${esc(thread.id)}">Rename</button><button type="button" class="quiet mini" data-archive-thread="${esc(thread.id)}">Archive</button></div></article>`).join('') || '<p class="muted">No Commons threads yet.</p>'}</div></aside>`;
  container.querySelectorAll('[data-open-thread]').forEach((button) => button.addEventListener('click', () => openThread(button.dataset.openThread)));
  container.querySelectorAll('[data-rename-thread]').forEach((button) => button.addEventListener('click', () => { const thread = threads.find((item) => item.id === button.dataset.renameThread); const next = prompt('Thread title', thread?.title || ''); if (!next?.trim()) return; titles[thread.id] = next.trim().slice(0, 120); writeJson(COMMONS_THREAD_TITLES_KEY, titles); render(container, entries); }));
  container.querySelectorAll('[data-archive-thread]').forEach((button) => button.addEventListener('click', () => { writeJson(COMMONS_ARCHIVE_KEY, [...new Set([...archived, button.dataset.archiveThread])]); render(container, entries); }));
  container.querySelector('[data-new-thread]')?.addEventListener('click', () => { const select = document.querySelector('[data-commons-thread]'); if (select) { select.value = ''; select.dispatchEvent(new Event('change', { bubbles: true })); } const textarea = document.querySelector('#commons-form textarea[name="message"]'); textarea?.focus(); });
}
async function refresh() {
  const form = document.querySelector('#commons-form'); if (!form) return; let host = document.querySelector('[data-commons-command-room]');
  if (!host) { host = document.createElement('div'); host.dataset.commonsCommandRoom = 'true'; const layout = form.closest('.commons-layout') || form.parentElement; layout?.prepend(host); }
  const token = await session(); if (!token) { host.innerHTML = '<aside class="commons-command-room"><strong>Command Room</strong><p class="muted">House Runtime offline.</p></aside>'; return; }
  try { const data = await readHouseCommons(token); render(host, Array.isArray(data?.entries) ? data.entries : []); } catch (error) { host.innerHTML = `<aside class="commons-command-room"><strong>Command Room</strong><p class="muted">${esc(error.message)}</p></aside>`; }
}
function styles() { if (document.getElementById('commons-command-room-styles')) return; const style = document.createElement('style'); style.id = 'commons-command-room-styles'; style.textContent = `.commons-command-room{display:grid;gap:.7rem;padding:.8rem;border:1px solid var(--line-soft);border-radius:.8rem;background:color-mix(in srgb,var(--panel) 92%,black)}.commons-command-room header{display:flex;justify-content:space-between;gap:.6rem;align-items:center}.commons-command-room header>div{display:grid}.commons-command-room small,.commons-thread-card em{color:var(--muted);font-size:.72rem}.commons-live-answering{padding:.45rem .55rem;border-radius:.55rem;background:color-mix(in srgb,var(--green) 8%,transparent);font-size:.78rem}.commons-thread-list{display:grid;gap:.45rem;max-height:65vh;overflow:auto}.commons-thread-card{display:grid;gap:.35rem;padding:.55rem;border:1px solid var(--line-soft);border-radius:.65rem}.commons-thread-card>div{display:flex;gap:.3rem}.commons-thread-open{display:grid;gap:.25rem;text-align:left;border:0;background:transparent;color:inherit;cursor:pointer;padding:0}.commons-thread-open span{font-weight:700}.commons-thread-open em{font-style:normal;line-height:1.35}@media(min-width:1100px){.commons-layout{grid-template-columns:minmax(15rem,.55fr) minmax(0,1.35fr) minmax(20rem,.75fr)!important}}`; document.head.append(style); }
export function installHouseCommonsCommandRoom() { if (typeof document === 'undefined') return; styles(); const observer = new MutationObserver(() => { if (document.querySelector('#commons-form')) void refresh(); }); observer.observe(document.body, { childList: true, subtree: true }); document.addEventListener(MODEL_PRESENCE_EVENT, () => { const node = document.querySelector('[data-live-answering]'); if (node) node.textContent = statusText(); }); document.addEventListener('arcsweep:runtime-integration-changed', () => void refresh()); void refresh(); setInterval(() => { if (document.querySelector('#commons-form')) void refresh(); }, 10000); }
if (typeof document !== 'undefined') installHouseCommonsCommandRoom();
