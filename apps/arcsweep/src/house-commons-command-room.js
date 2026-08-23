import { readHouseCommons, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import { currentModelPresence, MODEL_PRESENCE_EVENT } from './model-presence-bus.js';

export const COMMONS_THREAD_TITLES_KEY = 'arcsweep.house-commons-thread-titles/v1';
export const COMMONS_ARCHIVE_KEY = 'arcsweep.house-commons-archive/v1';
export const COMMONS_PINS_KEY = 'arcsweep.house-commons-pins/v1';
export const COMMONS_SEEN_KEY = 'arcsweep.house-commons-seen/v1';

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
const writeJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
const threadId = (entry) => entry?.thread_id || entry?.turn_id || entry?.id || null;

export function suggestThreadTitle(entries = []) {
  const root = entries.find((entry) => entry.kind === 'steward') || entries[0];
  const text = String(root?.text || 'New Commons thread').replace(/@[\w/-]+/g, '').replace(/\s+/g, ' ').trim();
  return text.length > 52 ? `${text.slice(0, 49)}…` : text || 'New Commons thread';
}

export function buildCommonsThreads(entries = [], { titles = {}, pinned = [], archived = [], seenAt = '' } = {}) {
  const map = new Map();
  const cutoff = Date.parse(seenAt || 0);
  const pins = new Set(pinned);
  const archive = new Set(archived);
  for (const entry of entries) {
    const id = threadId(entry);
    if (!id) continue;
    const item = map.get(id) || { id, entries: [], participants: new Set(), world: null, summary: null, last_at: '', unread: 0 };
    item.entries.push(entry);
    if (entry.author) item.participants.add(entry.author);
    if (entry.world) item.world = entry.world;
    if (entry.summary_of === id) item.summary = entry.text;
    if ((entry.created_at || '') > item.last_at) item.last_at = entry.created_at || '';
    if (Date.parse(entry.created_at || 0) > cutoff) item.unread += 1;
    map.set(id, item);
  }
  return [...map.values()]
    .map((item) => ({ ...item, participants: [...item.participants], pinned: pins.has(item.id), archived: archive.has(item.id), title: titles[item.id] || suggestThreadTitle(item.entries) }))
    .sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.last_at.localeCompare(left.last_at));
}

async function session() { return readHouseRuntimeToken() || await restoreHouseRuntimeSession(); }
function statusText() {
  const active = currentModelPresence().filter((item) => ['waking', 'thinking', 'speaking', 'degraded', 'error'].includes(item.state));
  return active.length ? active.map((item) => `${item.display_name || item.voice_id} ${item.state}`).join(' · ') : 'Constellation ready';
}

function openThread(id) {
  const selector = document.querySelector('[data-commons-thread]');
  if (!selector) return;
  selector.value = id;
  selector.dispatchEvent(new Event('change', { bubbles: true }));
}

function beginNewThread() {
  const selector = document.querySelector('[data-commons-thread]');
  if (selector) {
    selector.value = '';
    selector.dispatchEvent(new Event('change', { bubbles: true }));
  }
  document.querySelector('#commons-form textarea[name="message"]')?.focus();
}

function render(host, entries) {
  const titles = readJson(COMMONS_THREAD_TITLES_KEY, {});
  const pinned = readJson(COMMONS_PINS_KEY, []);
  const archived = readJson(COMMONS_ARCHIVE_KEY, []);
  const seenAt = localStorage.getItem(COMMONS_SEEN_KEY) || '';
  const threads = buildCommonsThreads(entries, { titles, pinned, archived, seenAt }).filter((thread) => !thread.archived);

  host.innerHTML = `<aside class="commons-command-room"><header><strong>Command Room</strong><button type="button" class="quiet mini" data-new-thread>New thread</button></header><div data-live-answering>${esc(statusText())}</div>${threads.map((thread) => `<article><button type="button" data-open-thread="${esc(thread.id)}"><strong>${thread.pinned ? '★ ' : ''}${esc(thread.title)}</strong><small>${esc([thread.world?.name, thread.participants.join(', '), thread.unread ? `${thread.unread} unread` : null].filter(Boolean).join(' · '))}</small>${thread.summary ? `<em>${esc(thread.summary.slice(0, 120))}</em>` : ''}</button><div><button class="quiet mini" data-pin-command-thread="${esc(thread.id)}">${thread.pinned ? 'Unpin' : 'Pin'}</button><button class="quiet mini" data-rename-thread="${esc(thread.id)}">Rename</button><button class="quiet mini" data-archive-thread="${esc(thread.id)}">Archive</button></div></article>`).join('') || '<p class="muted">No Commons threads yet.</p>'}</aside>`;

  host.querySelectorAll('[data-open-thread]').forEach((button) => { button.onclick = () => openThread(button.dataset.openThread); });
  host.querySelectorAll('[data-pin-command-thread]').forEach((button) => {
    button.onclick = () => {
      const id = button.dataset.pinCommandThread;
      const set = new Set(readJson(COMMONS_PINS_KEY, []));
      set.has(id) ? set.delete(id) : set.add(id);
      writeJson(COMMONS_PINS_KEY, [...set]);
      render(host, entries);
    };
  });
  host.querySelectorAll('[data-rename-thread]').forEach((button) => {
    button.onclick = () => {
      const thread = threads.find((item) => item.id === button.dataset.renameThread);
      const name = prompt('Thread title', thread?.title || '');
      if (name?.trim()) {
        titles[thread.id] = name.trim().slice(0, 120);
        writeJson(COMMONS_THREAD_TITLES_KEY, titles);
        render(host, entries);
      }
    };
  });
  host.querySelectorAll('[data-archive-thread]').forEach((button) => {
    button.onclick = () => {
      writeJson(COMMONS_ARCHIVE_KEY, [...new Set([...archived, button.dataset.archiveThread])]);
      render(host, entries);
    };
  });
  host.querySelector('[data-new-thread]')?.addEventListener('click', beginNewThread);
}

async function refresh() {
  const form = document.querySelector('#commons-form');
  if (!form) return;
  let host = document.querySelector('[data-commons-command-room]');
  if (!host) {
    host = document.createElement('div');
    host.dataset.commonsCommandRoom = 'true';
    (form.closest('.commons-layout') || form.parentElement)?.prepend(host);
  }
  const token = await session();
  if (!token) {
    host.innerHTML = '<aside class="commons-command-room"><strong>Command Room</strong><p class="muted">House Runtime offline.</p></aside>';
    return;
  }
  try {
    const data = await readHouseCommons(token);
    render(host, Array.isArray(data?.entries) ? data.entries : []);
  } catch (error) {
    host.innerHTML = `<aside class="commons-command-room"><p>${esc(error.message)}</p></aside>`;
  }
}

function mutationIntroducedCommons(mutations) {
  return mutations.some((mutation) => [...mutation.addedNodes].some((node) => node?.nodeType === 1 && (node.matches?.('#commons-form') || node.querySelector?.('#commons-form'))));
}

export function installHouseCommonsCommandRoom() {
  if (typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = '.commons-command-room{display:grid;gap:.7rem;padding:.8rem;border:1px solid var(--line-soft);border-radius:.8rem}.commons-command-room article{display:grid;gap:.35rem;padding:.55rem;border:1px solid var(--line-soft);border-radius:.65rem}.commons-command-room article>button{display:grid;text-align:left;background:transparent;border:0;color:inherit}.commons-command-room small,.commons-command-room em{color:var(--muted);font-size:.72rem}';
  document.head.append(style);
  new MutationObserver((mutations) => { if (mutationIntroducedCommons(mutations)) void refresh(); }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener(MODEL_PRESENCE_EVENT, () => { const node = document.querySelector('[data-live-answering]'); if (node) node.textContent = statusText(); });
  document.addEventListener('arcsweep:commons-attachment-saved', () => void refresh());
  void refresh();
  setInterval(() => { if (document.querySelector('#commons-form')) void refresh(); }, 10000);
}

if (typeof document !== 'undefined') installHouseCommonsCommandRoom();
