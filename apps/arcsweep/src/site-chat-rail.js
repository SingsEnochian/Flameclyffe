import { CONSTELLATION_VOICES } from './feedback-loop.js';
import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';

const CHAT_KEY = 'arcsweep.site-chat-rail/v1';
const MAX_MESSAGES = 80;
let installed = false;
let sending = false;

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function readHistory() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CHAT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-MAX_MESSAGES) : [];
  } catch { return []; }
}

function writeHistory(history) {
  try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(history.slice(-MAX_MESSAGES))); } catch {}
}

function activeContext() {
  const content = document.querySelector('.content[data-houseglass-room]');
  const room = content?.dataset.houseglassRoom || 'portal';
  const world = document.querySelector('.sidebar-world strong')?.textContent?.trim() || 'Active World';
  return { room, world };
}

function renderHistory(host) {
  const log = host.querySelector('[data-site-chat-log]');
  if (!log) return;
  const history = readHistory();
  log.innerHTML = history.length
    ? history.map((item) => `<article data-kind="${esc(item.kind)}"><header><strong>${esc(item.author)}</strong><small>${esc(item.room || '')}</small></header><p>${esc(item.text)}</p></article>`).join('')
    : '<p class="muted">The rail is open. Ask from any room.</p>';
  log.scrollTop = log.scrollHeight;
}

function syncContext(host) {
  const { room, world } = activeContext();
  const badge = host.querySelector('[data-site-chat-context]');
  if (badge) badge.textContent = `${world} · ${room}`;
}

function addMessage(host, message) {
  const history = readHistory();
  history.push(message);
  writeHistory(history);
  renderHistory(host);
}

async function send(host) {
  if (sending) return;
  const textarea = host.querySelector('textarea');
  const select = host.querySelector('select');
  const message = String(textarea?.value || '').trim();
  const voiceId = select?.value || 'boxfire';
  if (!message) return;
  const { room, world } = activeContext();
  addMessage(host, { kind: 'steward', author: 'Rowan', text: message, room, world, at: new Date().toISOString() });
  if (textarea) textarea.value = '';
  sending = true;
  const sendButton = host.querySelector('[data-site-chat-send]');
  if (sendButton) { sendButton.disabled = true; sendButton.textContent = 'Answering…'; }
  try {
    const reply = await invokeConstellationRuntimeVoice({
      voiceId,
      message,
      sessionId: `arcsweep-site-chat-${world}-${room}-${voiceId}`,
      metadata: { surface: 'site-chat-rail', room, world_name: world },
    });
    const voice = CONSTELLATION_VOICES.find((item) => item.id === voiceId);
    const text = reply.status === 'replied' ? reply.message : `[${reply.status}] ${reply.reason || 'No reply returned.'}`;
    addMessage(host, { kind: 'voice', author: voice?.name || voiceId, text, room, world, at: new Date().toISOString() });
  } catch (error) {
    addMessage(host, { kind: 'system', author: 'House', text: `Chat route error: ${error?.message || error}`, room, world, at: new Date().toISOString() });
  } finally {
    sending = false;
    if (sendButton) { sendButton.disabled = false; sendButton.textContent = 'Send'; }
  }
}

function injectStyles() {
  if (document.getElementById('arcsweep-site-chat-rail-styles')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-site-chat-rail-styles';
  style.textContent = `
    .site-chat-launch{position:fixed;right:1rem;bottom:1rem;z-index:80;border:1px solid var(--gold,#d8b56a);background:#13201d;color:#f3d48e;border-radius:999px;padding:.7rem 1rem;font-weight:800;box-shadow:0 10px 36px rgba(0,0,0,.32)}
    .site-chat-rail{position:fixed;right:1rem;bottom:4.6rem;z-index:79;width:min(27rem,calc(100vw - 2rem));max-height:min(72vh,46rem);display:none;grid-template-rows:auto minmax(9rem,1fr) auto;gap:.7rem;padding:.8rem;border:1px solid var(--gold,#d8b56a);border-radius:1rem;background:#0f1917;color:var(--text,#f0eadb);box-shadow:0 18px 54px rgba(0,0,0,.46)}
    .site-chat-rail[data-open="true"]{display:grid}.site-chat-rail header{display:flex;align-items:center;gap:.6rem}.site-chat-rail header strong{font-size:1rem}.site-chat-rail header small{margin-left:auto;color:var(--green,#8ebca6);max-width:13rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .site-chat-log{overflow:auto;display:grid;gap:.55rem;align-content:start}.site-chat-log article{padding:.55rem .65rem;border:1px solid rgba(216,181,106,.18);border-radius:.7rem;background:rgba(255,255,255,.018)}.site-chat-log article header{display:flex;justify-content:space-between}.site-chat-log article p{margin:.35rem 0 0;white-space:pre-wrap;overflow-wrap:anywhere}.site-chat-log small{color:var(--muted,#98a39e);font-size:.7rem}
    .site-chat-compose{display:grid;grid-template-columns:1fr auto;gap:.45rem}.site-chat-compose select{grid-column:1/-1}.site-chat-compose textarea{min-height:5.2rem;resize:vertical}.site-chat-compose button{align-self:end}
    @media(max-width:700px){.site-chat-launch{right:.65rem;bottom:.65rem}.site-chat-rail{right:.65rem;bottom:4.2rem;width:calc(100vw - 1.3rem);max-height:72dvh}}
  `;
  document.head.append(style);
}

export function installSiteChatRail() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  injectStyles();
  const host = document.createElement('aside');
  host.className = 'site-chat-rail';
  host.dataset.open = 'false';
  host.innerHTML = `<header><strong>House Chat</strong><small data-site-chat-context></small></header><div class="site-chat-log" data-site-chat-log></div><div class="site-chat-compose"><select aria-label="Constellation voice">${CONSTELLATION_VOICES.map((voice) => `<option value="${esc(voice.id)}" ${voice.id === 'boxfire' ? 'selected' : ''}>${esc(voice.name)}</option>`).join('')}</select><textarea aria-label="Chat message" placeholder="Ask from this room…"></textarea><button type="button" data-site-chat-send>Send</button></div>`;
  const launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'site-chat-launch';
  launch.textContent = 'Chat ∞';
  launch.setAttribute('aria-expanded', 'false');
  document.body.append(host, launch);
  launch.addEventListener('click', () => {
    const open = host.dataset.open !== 'true';
    host.dataset.open = String(open);
    launch.setAttribute('aria-expanded', String(open));
    if (open) host.querySelector('textarea')?.focus();
  });
  host.querySelector('[data-site-chat-send]')?.addEventListener('click', () => void send(host));
  host.querySelector('textarea')?.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void send(host); }
  });
  renderHistory(host);
  syncContext(host);
  const app = document.querySelector('#app');
  if (app) new MutationObserver(() => syncContext(host)).observe(app, { childList: true, subtree: false });
}

if (typeof document !== 'undefined') installSiteChatRail();
