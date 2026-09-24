import { MODEL_PRESENCE_EVENT, currentModelPresence } from './model-presence-bus.js';
import { readHouseRooms } from './house-room-client.js';
import { directRoomId, runtimeHouseVoices } from './house-commons-chat-v5-core.js';

export const HOUSE_CHAT_CHANNEL_RAIL_MARKER = 'house-chat-channel-rail/v1';

const CORE = new Set(['house-room:constellation', 'house-room:action', 'house-room:roleplay']);
const CHATTER = new Set(['house-room:agent-chatter']);
let rooms = [];
let installed = false;
let queued = false;
let loading = false;
let observer = null;

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function selectNode() {
  return document.querySelector('[data-house-room-select], .commons-log [data-commons-thread]');
}

function activeRoomId() {
  return selectNode()?.value || '';
}

function unread(roomId) {
  const option = [...(selectNode()?.options || [])].find((item) => item.value === roomId);
  return Number(option?.textContent?.match(/\((\d+)\)\s*$/)?.[1] || 0);
}

function roomName(room) {
  if (room.id === 'house-room:constellation') return 'general';
  return room.slug || room.title || room.id.replace(/^house-room:/, '');
}

function roomRow(room, sigil = '#') {
  const count = unread(room.id);
  return `<button type="button" class="house-channel-row" data-open-house-room="${esc(room.id)}" aria-current="${room.id === activeRoomId() ? 'page' : 'false'}"><span>${esc(sigil)}</span><strong>${esc(roomName(room))}</strong>${count ? `<small>${count}</small>` : ''}</button>`;
}

function voiceInitials(voice) {
  return String(voice?.name || voice?.id || '?').split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function directRow(voice, presence) {
  const roomId = directRoomId(voice.id);
  const room = rooms.find((item) => item.id === roomId && !item.archived);
  const count = room ? unread(roomId) : 0;
  const state = presence.get(voice.id)?.state || voice.state || 'offline';
  return `<button type="button" class="house-direct-row" data-open-house-direct="${esc(voice.id)}" data-state="${esc(state)}" aria-current="${roomId === activeRoomId() ? 'page' : 'false'}"><span class="house-direct-glyph">${esc(voiceInitials(voice))}</span><span><strong>${esc(voice.name || voice.id)}</strong><small>${room ? 'direct conversation' : 'start conversation'} · ${esc(state)}</small></span><i aria-hidden="true"></i>${count ? `<em>${count}</em>` : ''}</button>`;
}

function section(title, content) {
  return `<section class="house-channel-section"><header>${esc(title)}</header>${content || '<p>Quiet.</p>'}</section>`;
}

function liveLabel() {
  const text = document.querySelector('[data-commons-connection]')?.textContent || '';
  const saved = text.match(/(\d+) saved turns/)?.[1];
  const streams = document.querySelectorAll('[data-stream-key]').length;
  if (/offline|error/i.test(text)) return 'CAPTURE OFFLINE';
  if (streams) return `LIVE CAPTURE · ${streams} streaming`;
  return `LIVE CAPTURE${saved ? ` · ${saved} saved` : ''}`;
}

function ensureRail() {
  const layout = document.querySelector('.house-chat-native-layout');
  if (!layout) return null;
  let rail = layout.querySelector(`[data-house-channel-rail="${HOUSE_CHAT_CHANNEL_RAIL_MARKER}"]`);
  if (!rail) {
    rail = document.createElement('aside');
    rail.className = 'house-channel-rail';
    rail.dataset.houseChannelRail = HOUSE_CHAT_CHANNEL_RAIL_MARKER;
    layout.prepend(rail);
  }
  return rail;
}

function openRoom(roomId) {
  const select = selectNode();
  if (!select || ![...select.options].some((option) => option.value === roomId)) return false;
  select.value = roomId;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  scheduleRender();
  return true;
}

function openDirect(voiceId) {
  const roomId = directRoomId(voiceId);
  if (openRoom(roomId)) return;

  const inputs = [...document.querySelectorAll('#commons-form input[name="voiceIds"]')];
  for (const input of inputs) {
    const next = input.value === voiceId;
    if (input.checked === next) continue;
    input.checked = next;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  document.querySelector('[data-direct-room]')?.click();
  globalThis.setTimeout?.(() => void refreshRooms(), 180);
}

function render() {
  queued = false;
  const rail = ensureRail();
  if (!rail) return;
  const visible = rooms.filter((room) => !room.archived);
  const core = visible.filter((room) => CORE.has(room.id));
  const chatter = visible.filter((room) => CHATTER.has(room.id) || /^agent[-_:]/i.test(room.slug || ''));
  const direct = visible.filter((room) => room.kind === 'direct');
  const claimed = new Set([...core, ...chatter, ...direct].map((room) => room.id));
  const projects = visible.filter((room) => room.kind !== 'direct' && !claimed.has(room.id));
  const presenceRows = currentModelPresence();
  const presence = new Map(presenceRows.map((item) => [item.voice_id, item]));
  const roster = runtimeHouseVoices(presenceRows);
  const available = roster.filter((item) => ['ready', 'thinking', 'speaking'].includes(item?.state)).length;

  rail.innerHTML = `<div class="house-channel-brand"><div><b>∞</b><span><strong>House Commons</strong><small>Discord bones · Telegram flow · IRC soul</small></span></div><em>${esc(liveLabel())}</em></div>${section('Commons', core.map((room) => roomRow(room)).join(''))}${section('Agent chatter', chatter.map((room) => roomRow(room, '◌')).join(''))}${projects.length ? section('Projects', projects.map((room) => roomRow(room)).join('')) : ''}${section(`Conversations · ${available} available`, roster.map((voice) => directRow(voice, presence)).join(''))}`;

  rail.querySelectorAll('[data-open-house-room]').forEach((button) => {
    button.addEventListener('click', () => openRoom(button.dataset.openHouseRoom));
  });
  rail.querySelectorAll('[data-open-house-direct]').forEach((button) => {
    button.addEventListener('click', () => openDirect(button.dataset.openHouseDirect));
  });
}

function scheduleRender() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(render);
}

async function refreshRooms() {
  if (loading) return;
  loading = true;
  try {
    const data = await readHouseRooms();
    rooms = Array.isArray(data?.rooms) ? data.rooms : [];
    scheduleRender();
  } catch {
    scheduleRender();
  } finally {
    loading = false;
  }
}

function installStyles() {
  if (document.getElementById('house-chat-channel-rail-styles')) return;
  const style = document.createElement('style');
  style.id = 'house-chat-channel-rail-styles';
  style.textContent = `.house-chat-native-layout{display:grid!important;grid-template-columns:minmax(12rem,14rem) minmax(0,1fr) minmax(18rem,.58fr)!important;gap:.7rem!important;align-items:start}.house-channel-rail{position:sticky;top:.55rem;max-height:78vh;overflow:auto;display:grid;align-content:start;gap:.72rem;padding:.7rem .58rem;border:1px solid var(--line-soft);border-radius:1rem;background:color-mix(in srgb,var(--panel-solid) 96%,var(--bg));scrollbar-width:thin}.house-channel-brand{display:grid;gap:.4rem;padding:.08rem .2rem .45rem;border-bottom:1px solid var(--line-soft)}.house-channel-brand>div{display:flex;align-items:center;gap:.48rem}.house-channel-brand>div>b{display:grid;place-items:center;width:1.85rem;height:1.85rem;border:1px solid color-mix(in srgb,var(--gold) 40%,var(--line-soft));border-radius:.55rem}.house-channel-brand>div>span{display:grid;line-height:1.08}.house-channel-brand strong{font-size:.82rem}.house-channel-brand small{margin-top:.12rem;color:var(--muted);font-size:.53rem}.house-channel-brand>em{color:var(--green);font:700 .56rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.house-channel-section{display:grid;gap:.2rem}.house-channel-section>header{padding:0 .34rem;color:var(--muted);font:750 .56rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.11em;text-transform:uppercase}.house-channel-section>p{margin:.2rem .35rem;color:var(--muted);font-size:.64rem}.house-channel-row,.house-direct-row{width:100%;border:0;background:transparent;color:inherit;text-align:left}.house-channel-row{display:grid;grid-template-columns:1rem minmax(0,1fr) auto;align-items:center;gap:.3rem;padding:.38rem .4rem;border-radius:.48rem;font:560 .72rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace}.house-channel-row>span{color:var(--muted)}.house-channel-row>strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.house-channel-row>small,.house-direct-row>em{min-width:1.05rem;padding:.06rem .28rem;border-radius:999px;background:color-mix(in srgb,var(--green) 78%,black);color:white;font-size:.54rem;font-style:normal;text-align:center}.house-channel-row:hover,.house-direct-row:hover{background:color-mix(in srgb,var(--gold) 6%,transparent)}.house-channel-row[aria-current="page"],.house-direct-row[aria-current="page"]{background:color-mix(in srgb,var(--gold) 10%,var(--panel-solid));box-shadow:inset 2px 0 0 var(--gold)}.house-direct-row{display:grid;grid-template-columns:1.65rem minmax(0,1fr) .42rem auto;align-items:center;gap:.38rem;padding:.34rem .38rem;border-radius:.5rem}.house-direct-glyph{display:grid;place-items:center;width:1.6rem;height:1.6rem;border:1px solid var(--line-soft);border-radius:50%;font-size:.52rem;font-weight:800}.house-direct-row>span:nth-child(2){display:grid;min-width:0;line-height:1.08}.house-direct-row strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.68rem}.house-direct-row small{margin-top:.1rem;color:var(--muted);font-size:.52rem}.house-direct-row>i{width:.42rem;height:.42rem;border-radius:50%;background:color-mix(in srgb,var(--muted) 55%,transparent)}.house-direct-row[data-state="ready"]>i{background:var(--green)}.house-direct-row[data-state="thinking"]>i,.house-direct-row[data-state="speaking"]>i{background:var(--gold);box-shadow:0 0 0 .16rem color-mix(in srgb,var(--gold) 12%,transparent)}.house-chat-native .commons-chat-log-head [data-house-room-select]{position:absolute!important;width:1px!important;height:1px!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important}@media(max-width:1100px){.house-chat-native-layout{grid-template-columns:minmax(11rem,13rem) minmax(0,1fr)!important}.house-chat-native-compose{grid-column:2}.house-channel-rail{grid-row:1 / span 2}}@media(max-width:760px){.house-chat-native-layout{grid-template-columns:1fr!important}.house-channel-rail{position:relative;top:auto;grid-row:auto;max-height:none}.house-chat-native-compose{grid-column:auto}}`;
  document.head.append(style);
}

export function installHouseChatChannelRail() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installStyles();
  document.addEventListener(MODEL_PRESENCE_EVENT, scheduleRender);
  document.addEventListener('change', (event) => {
    if (event.target?.matches?.('[data-house-room-select], .commons-log [data-commons-thread], #commons-form input[name="voiceIds"]')) scheduleRender();
  }, true);
  observer = new MutationObserver(scheduleRender);
  observer.observe(document.body, { childList: true, subtree: true });
  void refreshRooms();
  globalThis.addEventListener?.('arcsweep:house-chat-surface-mounted', () => { void refreshRooms(); });
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installHouseChatChannelRail();
