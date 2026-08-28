import { appendHouseCommons, readHouseCommons, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import { streamConstellationRuntimeVoice } from './flame-chat-stream-client.js';
import { publishModelPresence } from './model-presence-bus.js';
import { renderHouseModelRichText, houseModelPlainText } from './house-chat-rich-text.js';

let installed = false;
let observer = null;
let entries = [];
let refreshInFlight = null;

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const uuid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const threadId = (entry) => entry?.thread_id || entry?.turn_id || entry?.id || null;
async function session() { return readHouseRuntimeToken() || await restoreHouseRuntimeSession(); }

async function refreshEntries() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const token = await session(); if (!token) return;
    const data = await readHouseCommons(token); entries = Array.isArray(data?.entries) ? data.entries : [];
  })().catch(() => {}).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

function openCrossLink(kind, id) {
  const room = ({ world: 'worlds', canon: 'records', script: 'scripts', record: 'records', feedback: 'feedback' })[kind];
  if (room) document.querySelector(`[data-room="${room}"]`)?.click();
  document.dispatchEvent(new CustomEvent('arcsweep:commons-cross-link-open', { detail: { kind, id } }));
}

function linkPanel(article, entry) {
  article.querySelector('[data-v5-link-panel]')?.remove();
  const panel = document.createElement('div'); panel.dataset.v5LinkPanel = 'true'; panel.className = 'commons-link-panel';
  panel.innerHTML = `<strong>Cross-link</strong><select data-link-kind><option value="world">World</option><option value="canon">Canon</option><option value="script">Script / Scene</option><option value="record">Record</option><option value="feedback">Feedback receipt</option></select><input data-link-id placeholder="Target id / reference"/><input data-link-label placeholder="Label (optional)"/><button type="button" data-link-save>Save</button><button type="button" class="quiet" data-link-cancel>Cancel</button>`;
  article.append(panel);
  panel.querySelector('[data-link-cancel]').onclick = () => panel.remove();
  panel.querySelector('[data-link-save]').onclick = async () => {
    const token = await session(); if (!token) return;
    const kind = panel.querySelector('[data-link-kind]').value;
    const id = String(panel.querySelector('[data-link-id]').value || '').trim();
    const label = String(panel.querySelector('[data-link-label]').value || '').trim();
    if (!id) return;
    await appendHouseCommons(token, {
      idempotency_key: `commons-link:${entry.id}:${kind}:${id.replace(/[^a-zA-Z0-9:._-]/g, '_').slice(0, 80)}`,
      kind: 'system', author: 'House Commons', status: 'linked', thread_id: threadId(entry),
      turn_id: `commons-link:${uuid()}`, reply_to: entry.id, links: [{ kind, id, label }],
      text: `Linked this room to ${label || `${kind}:${id}`}.`,
    });
    panel.remove(); document.dispatchEvent(new CustomEvent('arcsweep:commons-tools-updated')); await refreshEntries(); decorate();
  };
}

async function summariseRoom(roomId, button) {
  const token = await session(); if (!token || !roomId) return;
  await refreshEntries();
  const roomEntries = entries.filter((entry) => threadId(entry) === roomId && entry.text).slice(-40);
  if (!roomEntries.length) return;
  button.disabled = true; button.textContent = 'Summarising…';
  publishModelPresence({ voiceId: 'atlas', displayName: 'Atlas', state: 'thinking', task: 'house-commons-summary' });
  try {
    const prompt = ['HOUSE CHAT · ROOM SUMMARY', 'Summarise the visible room faithfully. Preserve disagreements, decisions, open questions, and provenance-significant facts. Do not invent canon or hidden reasoning.', ...roomEntries.map((entry) => `${entry.author || 'House'}: ${entry.text || ''}`)].join('\n\n');
    let visible = '';
    const reply = await streamConstellationRuntimeVoice({
      voiceId: 'atlas', message: prompt, sessionId: `house-commons-summary-${roomId}`,
      context: roomEntries.slice(-24).map((entry) => ({ speaker: entry.author || 'House', text: entry.text || '' })),
      metadata: { surface: 'house-commons', summary_of: roomId, request_id: `summary:${roomId}:${Date.now()}` },
      onDelta(event) { visible = event.message || visible; button.textContent = `Summarising… ${visible.length}`; },
    });
    const text = houseModelPlainText(reply.message);
    await appendHouseCommons(token, {
      idempotency_key: `commons-summary:${roomId}:${Date.now()}`,
      kind: 'voice', author: 'Atlas', voice_id: 'atlas', status: 'summary', thread_id: roomId,
      turn_id: `commons-summary:${uuid()}`, summary_of: roomId,
      runtime: { provider: reply.provider, model: reply.model, route: reply.route, profile_id: reply.profileId, latency_ms: reply.latencyMs, runtime_world_context_id: reply.runtimeWorldContextId },
      rich_text_html: renderHouseModelRichText(reply.message), text,
    });
    publishModelPresence({ voiceId: 'atlas', displayName: 'Atlas', state: 'ready', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, task: null });
    document.dispatchEvent(new CustomEvent('arcsweep:commons-tools-updated'));
  } catch (error) {
    publishModelPresence({ voiceId: 'atlas', displayName: 'Atlas', state: 'degraded', task: null, reason: error.message });
  } finally { button.disabled = false; button.textContent = 'Summarise'; }
}

function renderLinks(article, entry) {
  if (!entry?.links?.length) return;
  let host = article.querySelector('[data-v5-cross-links]');
  if (!host) { host = document.createElement('div'); host.dataset.v5CrossLinks = 'true'; host.className = 'commons-links'; article.append(host); }
  host.innerHTML = entry.links.map((link) => `<button type="button" class="commons-link-chip" data-cross-kind="${esc(link.kind)}" data-cross-id="${esc(link.id)}">${esc(link.label || `${link.kind}:${link.id}`)}</button>`).join('');
  host.querySelectorAll('[data-cross-kind]').forEach((button) => button.onclick = () => openCrossLink(button.dataset.crossKind, button.dataset.crossId));
}

function decorate() {
  if (document.querySelector('#commons-form')?.dataset.commonsEnhanced !== 'v5') return;
  document.querySelectorAll('.commons-chat-entry[data-entry-id]').forEach((article) => {
    const entry = entries.find((item) => item.id === article.dataset.entryId); if (!entry) return;
    const controls = article.querySelector('header>div');
    if (controls && !controls.querySelector('[data-v5-summary]')) {
      const summary = document.createElement('button'); summary.type = 'button'; summary.className = 'quiet mini'; summary.dataset.v5Summary = 'true'; summary.textContent = 'Summarise'; summary.onclick = () => void summariseRoom(threadId(entry), summary);
      const link = document.createElement('button'); link.type = 'button'; link.className = 'quiet mini'; link.dataset.v5Link = 'true'; link.textContent = 'Link'; link.onclick = () => linkPanel(article, entry);
      controls.prepend(link); controls.prepend(summary);
    }
    renderLinks(article, entry);
  });
}

async function refreshAndDecorate() { await refreshEntries(); decorate(); }

export function installHouseChatToolsV5() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const style = document.createElement('style'); style.textContent = '.commons-link-panel{display:flex;align-items:center;flex-wrap:wrap;gap:.45rem;margin:.55rem 0;padding:.55rem .65rem;border-left:3px solid var(--gold);background:color-mix(in srgb,var(--gold) 7%,transparent)}.commons-link-panel input,.commons-link-panel select{min-width:10rem;flex:1}'; document.head.append(style);
  observer = new MutationObserver(() => decorate()); observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('arcsweep:commons-tools-updated', () => void refreshAndDecorate());
  void refreshAndDecorate(); setInterval(() => { if (document.querySelector('#commons-form')) void refreshAndDecorate(); }, 8000);
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installHouseChatToolsV5();
