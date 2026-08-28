import { getKelyranSupabase } from './kelyran-supabase.js';

const HOUSE_URL = 'https://rufrmjyusalnifpegllj.supabase.co/functions/v1/lanternbridge-house';
export const LANTERNBRIDGE_SEEN_KEY = 'arcsweep.lanternbridge-seen/v1';
const REFRESH_MS = 5000;
let bridgeEntries = [];
let outbox = [];
let durableSeen = { last_seen_at: null, last_seen_bridge_id: null };
let replyTarget = null;
let refreshTimer = null;
let refreshInFlight = null;
let mutationObserver = null;
let markSeenTimer = null;
let installed = false;

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function lanternbridgeCreatedAt(entry) {
  return entry?.source_created_at || entry?.payload?.metadata?.created_at || null;
}

export function lanternbridgeBody(entry) {
  return String(entry?.payload?.body || '').trim();
}

export function lanternbridgeAuthor(entry) {
  const actor = entry?.authors?.[0] || entry?.origin || 'lanternbridge';
  const leaf = String(actor).split(':').filter(Boolean).at(-1) || String(actor);
  return leaf.split(/[-_/\s]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Lanternbridge';
}

export function lanternbridgeUnread(entries = [], seenAt = '') {
  const cutoff = seenAt ? Date.parse(seenAt) : 0;
  return entries.filter((entry) => Date.parse(lanternbridgeCreatedAt(entry) || 0) > cutoff);
}

function localSeenAt() {
  try { return localStorage.getItem(LANTERNBRIDGE_SEEN_KEY) || ''; } catch { return ''; }
}

function effectiveSeenAt() {
  const local = localSeenAt();
  const remote = durableSeen?.last_seen_at || '';
  return Date.parse(local || 0) > Date.parse(remote || 0) ? local : remote;
}

async function accessToken() {
  try {
    const client = await getKelyranSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) return '';
    return data.session?.access_token || '';
  } catch { return ''; }
}

async function houseRequest(options = {}) {
  const token = await accessToken();
  if (!token) throw new Error('Sign in to Flameclyffe cloud to use Lanternbridge House Chat.');
  const response = await fetch(HOUSE_URL, {
    ...options,
    cache: 'no-store',
    headers: { ...(options.headers || {}), authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Lanternbridge House ${response.status}`);
  return data;
}

export async function readLanternbridgeHouse() {
  return houseRequest({ method: 'GET' });
}

export async function enqueueLanternbridgeReply({ respondsTo, text, title = 'House Chat reply' } = {}) {
  return houseRequest({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'enqueue', responds_to: respondsTo, text, title }),
  });
}

export async function markLanternbridgeSeen({ lastSeenAt, lastSeenBridgeId = null } = {}) {
  return houseRequest({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'mark_seen', last_seen_at: lastSeenAt, last_seen_bridge_id: lastSeenBridgeId }),
  });
}

function bridgeMeta(entry) {
  return [
    entry.thread_id ? `thread ${entry.thread_id.replace(/^lanternbridge:/, '')}` : null,
    entry.status || null,
    entry.source_path || null,
  ].filter(Boolean).join(' · ');
}

function isReplyable(entry) {
  const addressed = Array.isArray(entry.addressed_to) ? entry.addressed_to : [];
  return String(entry.origin || '').toLowerCase() === 'nocturne' || addressed.some((value) => /rowan|vee/i.test(String(value)));
}

function addBridgeDecorations(article, entry) {
  if (!article || article.dataset.lanternbridgeEnhanced === entry.bridge_id) return;
  article.dataset.lanternbridgeEnhanced = entry.bridge_id;
  article.dataset.bridgeId = entry.bridge_id;
  article.classList.add('lanternbridge-chat-entry');
  const header = article.querySelector('header');
  const strong = header?.querySelector('strong');
  if (strong && !strong.querySelector('.lanternbridge-badge')) {
    strong.insertAdjacentHTML('beforeend', ' <span class="lanternbridge-badge">🏮 bridge</span>');
  }
  if (header && !header.querySelector('[data-lanternbridge-meta]')) {
    const meta = document.createElement('small');
    meta.dataset.lanternbridgeMeta = 'true';
    meta.className = 'lanternbridge-meta';
    meta.textContent = bridgeMeta(entry);
    header.insertAdjacentElement('afterend', meta);
  }
  if (header && isReplyable(entry) && !header.querySelector('[data-lanternbridge-reply]')) {
    const controls = header.querySelector('div') || header;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quiet mini lanternbridge-reply-button';
    button.dataset.lanternbridgeReply = entry.bridge_id;
    button.textContent = 'Reply over bridge';
    controls.append(button);
  }
  const unread = Date.parse(lanternbridgeCreatedAt(entry) || 0) > Date.parse(effectiveSeenAt() || 0);
  article.dataset.lanternbridgeUnread = unread ? 'true' : 'false';
}

function fallbackEntry(entry) {
  const stamp = lanternbridgeCreatedAt(entry) ? new Date(lanternbridgeCreatedAt(entry)).toLocaleString() : '';
  const unread = Date.parse(lanternbridgeCreatedAt(entry) || 0) > Date.parse(effectiveSeenAt() || 0);
  return `<article class="commons-chat-entry lanternbridge-chat-entry lanternbridge-fallback-entry" data-entry-id="${esc(entry.commons_entry_id || '')}" data-bridge-id="${esc(entry.bridge_id)}" data-lanternbridge-unread="${unread ? 'true' : 'false'}">
    <header><strong>${esc(lanternbridgeAuthor(entry))} <span class="lanternbridge-badge">🏮 bridge</span></strong><span>${esc([stamp, entry.status].filter(Boolean).join(' · '))}</span><div>${isReplyable(entry) ? `<button type="button" class="quiet mini lanternbridge-reply-button" data-lanternbridge-reply="${esc(entry.bridge_id)}">Reply over bridge</button>` : ''}</div></header>
    <small class="lanternbridge-meta">${esc(bridgeMeta(entry))}</small>
    <div class="commons-chat-body"><p>${esc(lanternbridgeBody(entry)).replaceAll('\n', '<br>')}</p></div>
  </article>`;
}

function renderFallback(log, missing) {
  log.querySelector('[data-lanternbridge-fallback]')?.remove();
  if (!missing.length) return;
  const section = document.createElement('section');
  section.dataset.lanternbridgeFallback = 'true';
  section.className = 'lanternbridge-fallback';
  section.innerHTML = `<div class="lanternbridge-fallback-head"><strong>Lanternbridge</strong><span>${missing.length} bridge turn${missing.length === 1 ? '' : 's'} available directly</span></div>${missing.map(fallbackEntry).join('')}`;
  log.append(section);
}

function renderOutbox(log) {
  log.querySelector('[data-lanternbridge-outbox]')?.remove();
  const pending = outbox.filter((item) => !['committed'].includes(item.state));
  if (!pending.length) return;
  const section = document.createElement('section');
  section.dataset.lanternbridgeOutbox = 'true';
  section.className = 'lanternbridge-outbox';
  section.innerHTML = `<strong>Outgoing bridge queue</strong>${pending.map((item) => `<div class="lanternbridge-outbox-item" data-state="${esc(item.state)}"><span>🔥 Vee → Twilight</span><span>${esc(item.state)}</span><small>${esc(String(item.body || '').slice(0, 160))}</small>${item.error ? `<small class="error">${esc(item.error)}</small>` : ''}</div>`).join('')}`;
  log.append(section);
}

function decorateLog() {
  const log = document.querySelector('.commons-log');
  if (!log || !bridgeEntries.length) return;
  const matched = new Set();
  for (const entry of bridgeEntries) {
    if (!entry.commons_entry_id) continue;
    const article = [...log.querySelectorAll('.commons-chat-entry')].find((node) => node.dataset.entryId === entry.commons_entry_id || node.querySelector(`[data-copy-entry="${CSS.escape(entry.commons_entry_id)}"]`));
    if (article) {
      matched.add(entry.bridge_id);
      addBridgeDecorations(article, entry);
    }
  }
  renderFallback(log, bridgeEntries.filter((entry) => !matched.has(entry.bridge_id)));
  renderOutbox(log);
  renderReplyComposer();
  scheduleSeenWrite();
}

function renderReplyComposer() {
  const form = document.querySelector('#commons-form');
  if (!form) return;
  let panel = form.querySelector('[data-lanternbridge-composer]');
  if (!replyTarget) { panel?.remove(); return; }
  if (!panel) {
    panel = document.createElement('div');
    panel.dataset.lanternbridgeComposer = 'true';
    panel.className = 'lanternbridge-composer';
    const textarea = form.elements?.namedItem?.('message');
    textarea?.parentElement?.insertBefore(panel, textarea);
  }
  panel.innerHTML = `<div><strong>🏮 Replying over Lanternbridge to ${esc(lanternbridgeAuthor(replyTarget))}</strong><small>${esc(replyTarget.bridge_id)} · ${esc(String(lanternbridgeBody(replyTarget)).slice(0, 140))}</small></div><div><button type="button" class="quiet mini" data-lanternbridge-cancel>Cancel</button><button type="button" data-lanternbridge-send>Send over Lanternbridge</button></div><small data-lanternbridge-send-state></small>`;
}

async function sendReply() {
  if (!replyTarget) return;
  const form = document.querySelector('#commons-form');
  const textarea = form?.elements?.namedItem?.('message');
  const text = String(textarea?.value || '').trim();
  const state = form?.querySelector('[data-lanternbridge-send-state]');
  const button = form?.querySelector('[data-lanternbridge-send]');
  if (!text) { if (state) state.textContent = 'Write a reply first.'; return; }
  if (button) button.disabled = true;
  if (state) state.textContent = 'Queuing bridge reply…';
  try {
    const titleSeed = text.split(/\n/).find((line) => line.trim())?.replace(/^#+\s*/, '').trim() || 'House Chat reply';
    const result = await enqueueLanternbridgeReply({ respondsTo: replyTarget.bridge_id, text, title: titleSeed.slice(0, 120) });
    if (textarea) { textarea.value = ''; textarea.dispatchEvent(new Event('input', { bubbles: true })); }
    replyTarget = null;
    if (state) state.textContent = `Queued ${result?.item?.bridge_id || 'reply'} for GitHub delivery.`;
    await refreshLanternbridge({ force: true });
  } catch (error) {
    if (state) state.textContent = error?.message || String(error);
  } finally {
    if (button) button.disabled = false;
    renderReplyComposer();
  }
}

function scheduleSeenWrite() {
  if (markSeenTimer || !bridgeEntries.length) return;
  const latest = [...bridgeEntries].sort((a, b) => Date.parse(lanternbridgeCreatedAt(a) || 0) - Date.parse(lanternbridgeCreatedAt(b) || 0)).at(-1);
  const at = lanternbridgeCreatedAt(latest);
  if (!at || Date.parse(at) <= Date.parse(effectiveSeenAt() || 0)) return;
  markSeenTimer = setTimeout(async () => {
    markSeenTimer = null;
    try {
      localStorage.setItem(LANTERNBRIDGE_SEEN_KEY, at);
      const result = await markLanternbridgeSeen({ lastSeenAt: at, lastSeenBridgeId: latest.bridge_id });
      durableSeen = result.seen || durableSeen;
      decorateLog();
    } catch {}
  }, 1200);
}

export async function refreshLanternbridge({ force = false } = {}) {
  if (refreshInFlight && !force) return refreshInFlight;
  refreshInFlight = readLanternbridgeHouse().then((data) => {
    bridgeEntries = Array.isArray(data.entries) ? data.entries : [];
    outbox = Array.isArray(data.outbox) ? data.outbox : [];
    durableSeen = data.seen || durableSeen;
    decorateLog();
    return data;
  }).catch((error) => {
    const state = document.querySelector('[data-commons-connection]');
    if (state && !/Sign in to Flameclyffe cloud/.test(error?.message || '')) state.textContent = `${state.textContent || 'House Chat'} · Lanternbridge: ${error.message}`;
    return null;
  }).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

function installStyles() {
  if (document.getElementById('house-lanternbridge-chat-styles')) return;
  const style = document.createElement('style');
  style.id = 'house-lanternbridge-chat-styles';
  style.textContent = `.lanternbridge-chat-entry{border-left:2px solid color-mix(in srgb,var(--gold) 62%,transparent);padding-left:.7rem}.lanternbridge-chat-entry[data-lanternbridge-unread="true"]{box-shadow:inset 3px 0 0 var(--green)}.lanternbridge-badge{font-size:.68rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--gold)}.lanternbridge-meta{display:block;color:var(--muted);font-size:.7rem;margin:.15rem 0 .35rem}.lanternbridge-fallback,.lanternbridge-outbox{margin-top:1rem;padding-top:.8rem;border-top:1px solid var(--line-soft)}.lanternbridge-fallback-head{display:flex;justify-content:space-between;gap:.5rem;color:var(--muted)}.lanternbridge-outbox-item{display:grid;grid-template-columns:auto auto;gap:.2rem .7rem;padding:.55rem 0;border-top:1px solid var(--line-soft)}.lanternbridge-outbox-item small{grid-column:1/-1;color:var(--muted)}.lanternbridge-outbox-item .error{color:#e4a4a4}.lanternbridge-composer{display:grid;gap:.55rem;margin:.6rem 0;padding:.65rem;border:1px solid color-mix(in srgb,var(--gold) 45%,transparent);border-radius:.65rem;background:color-mix(in srgb,var(--gold) 6%,transparent)}.lanternbridge-composer>div{display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap}.lanternbridge-composer strong,.lanternbridge-composer small{display:block}.lanternbridge-reply-button{white-space:nowrap}`;
  document.head.append(style);
}

function onClick(event) {
  const reply = event.target.closest?.('[data-lanternbridge-reply]');
  if (reply) {
    replyTarget = bridgeEntries.find((entry) => entry.bridge_id === reply.dataset.lanternbridgeReply) || null;
    renderReplyComposer();
    const textarea = document.querySelector('#commons-form textarea[name="message"]');
    textarea?.focus();
    textarea?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  }
  if (event.target.closest?.('[data-lanternbridge-cancel]')) { replyTarget = null; renderReplyComposer(); return; }
  if (event.target.closest?.('[data-lanternbridge-send]')) { void sendReply(); }
}

export function installHouseLanternbridgeChat() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installStyles();
  document.addEventListener('click', onClick, true);
  mutationObserver = new MutationObserver(() => decorateLog());
  mutationObserver.observe(document.body, { childList: true, subtree: true });
  void refreshLanternbridge({ force: true });
  refreshTimer = setInterval(() => void refreshLanternbridge(), REFRESH_MS);
  window.addEventListener('beforeunload', () => { if (refreshTimer) clearInterval(refreshTimer); mutationObserver?.disconnect(); });
}

if (typeof document !== 'undefined') installHouseLanternbridgeChat();
