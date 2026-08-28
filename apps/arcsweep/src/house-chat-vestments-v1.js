const ROOM_ICON_MAP = Object.freeze({
  'house-room:constellation': '✦',
  'house-room:arcsweep': '⌘',
  'house-room:terra-aeterna': 'ᛉ',
  'house-room:luna': '☾',
});

const PORTRAIT_TONES = Object.freeze({
  rowan: ['copper', 'violet'], lioreal: ['gold', 'copper'], uial: ['seaglass', 'moss'], larkshine: ['sky', 'gold'],
  ellowind: ['moss', 'seaglass'], altair: ['violet', 'gold'], atlas: ['slate', 'copper'], runeweaver: ['copper', 'violet'],
  boxfire: ['slate', 'gold'], yggdrasil: ['moss', 'gold'], bluebird: ['sky', 'seaglass'], vethrlauf: ['slate', 'seaglass'],
});

let installed = false;
let observer = null;
let decorateQueued = false;
let lastRailFingerprint = '';

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function roomIconForId(id = '', label = '') {
  if (ROOM_ICON_MAP[id]) return ROOM_ICON_MAP[id];
  if (String(id).includes(':direct:')) return '@';
  if (String(id).includes(':conversation:')) return '◇';
  if (String(label).trim().startsWith('@')) return '@';
  return '#';
}

export function compactRoomLabel(label = '') {
  return String(label).replace(/^\s*[#@✦⌘ᛉ☾◇]+\s*/, '').replace(/\s+·\s+\d+\s+unread\s*$/i, '').trim() || 'Room';
}

export function roomRailModel(options = [], active = '') {
  return (options || []).map((option) => ({
    id: String(option?.value || ''),
    label: compactRoomLabel(option?.label || option?.textContent || option?.text || ''),
    icon: roomIconForId(option?.value || '', option?.label || option?.textContent || option?.text || ''),
    active: String(option?.value || '') === String(active || ''),
    unread: /\b\d+\s+unread\b/i.test(String(option?.label || option?.textContent || option?.text || '')),
  })).filter((room) => room.id);
}

export function roomRailFingerprint(rooms = []) {
  return JSON.stringify((rooms || []).map((room) => [room.id, room.label, room.active, room.unread]));
}

export function portraitToneForId(id = '') {
  return PORTRAIT_TONES[String(id || '').toLowerCase()] || ['gold', 'seaglass'];
}

function currentRoomSelect() {
  return document.querySelector('.commons-log [data-house-room-select], .commons-log [data-commons-thread]');
}

function ensureRoomRail() {
  const form = document.querySelector('#commons-form');
  if (form?.dataset.commonsEnhanced !== 'v5') return null;
  const layout = form.closest('.commons-layout') || form.parentElement;
  if (!layout) return null;
  layout.classList.add('house-vestments-layout');
  let rail = layout.querySelector('[data-house-vestments-room-rail]');
  if (!rail) {
    rail = document.createElement('aside');
    rail.className = 'house-vestments-room-rail';
    rail.dataset.houseVestmentsRoomRail = 'true';
    const chrome = layout.querySelector('[data-house-room-chrome]');
    chrome?.insertAdjacentElement('afterend', rail);
    if (!rail.isConnected) layout.prepend(rail);
  }
  return rail;
}

function renderRoomRail() {
  const select = currentRoomSelect();
  const rail = ensureRoomRail();
  if (!select || !rail) return;
  const rooms = roomRailModel([...select.options], select.value);
  const fingerprint = roomRailFingerprint(rooms);
  if (fingerprint === lastRailFingerprint && rail.dataset.ready === 'true') return;
  lastRailFingerprint = fingerprint;
  rail.dataset.ready = 'true';
  const channels = rooms.filter((room) => room.icon !== '@');
  const direct = rooms.filter((room) => room.icon === '@');
  const roomButton = (room) => `<button type="button" class="house-vestments-room ${room.active ? 'active' : ''}" data-vestments-room="${esc(room.id)}" aria-current="${room.active ? 'page' : 'false'}"><span class="house-vestments-room-icon" aria-hidden="true">${esc(room.icon)}</span><span><strong>${esc(room.label)}</strong>${room.unread ? '<small>new activity</small>' : '<small>room</small>'}</span>${room.unread ? '<i aria-label="Unread"></i>' : ''}</button>`;
  rail.innerHTML = `<header><span aria-hidden="true">∞</span><div><strong>House</strong><small>Constellation rooms</small></div></header><section><p>Channels</p>${channels.map(roomButton).join('') || '<small class="muted">No channels yet.</small>'}</section>${direct.length ? `<section><p>Direct</p>${direct.map(roomButton).join('')}</section>` : ''}<footer><button type="button" class="quiet mini" data-vestments-new-room>＋ New room</button></footer>`;
  rail.querySelectorAll('[data-vestments-room]').forEach((button) => {
    button.onclick = () => {
      const next = button.dataset.vestmentsRoom;
      if (!next || select.value === next) return;
      select.value = next;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    };
  });
  rail.querySelector('[data-vestments-new-room]')?.addEventListener('click', () => document.querySelector('.commons-log [data-new-room]')?.click());
}

function decoratePortraits() {
  document.querySelectorAll('[data-room-participant], [data-house-room-author]').forEach((node) => {
    const id = node.dataset.roomParticipant || node.dataset.houseRoomAuthor || '';
    const [toneA, toneB] = portraitToneForId(id);
    node.style.setProperty('--house-portrait-a', `var(--house-tone-${toneA})`);
    node.style.setProperty('--house-portrait-b', `var(--house-tone-${toneB})`);
  });
}

function decorateRoomScene() {
  const log = document.querySelector('.commons-log');
  const select = currentRoomSelect();
  if (!log || !select) return;
  const head = log.querySelector('.commons-chat-log-head');
  if (!head) return;
  const room = roomRailModel([...select.options], select.value).find((item) => item.active);
  if (!room) return;
  head.dataset.houseRoomIcon = room.icon;
  head.style.setProperty('--house-room-icon', `'${room.icon.replaceAll("'", '')}'`);
}

function decorate() {
  decorateQueued = false;
  renderRoomRail();
  decoratePortraits();
  decorateRoomScene();
}

function scheduleDecorate() {
  if (decorateQueued) return;
  decorateQueued = true;
  requestAnimationFrame(decorate);
}

function styles() {
  if (document.getElementById('house-chat-vestments-v1-styles')) return;
  const style = document.createElement('style');
  style.id = 'house-chat-vestments-v1-styles';
  style.textContent = `
  :root{
    --house-tone-copper:#b86f43;--house-tone-gold:#c9a85f;--house-tone-seaglass:#67a9a1;--house-tone-moss:#71835e;
    --house-tone-violet:#86679b;--house-tone-sky:#6f9fbd;--house-tone-slate:#65717d;
  }
  .house-room-mode.house-vestments-layout{grid-template-columns:minmax(12.5rem,15rem) minmax(0,1fr)!important;gap:1rem!important;position:relative}
  .house-vestments-layout>[data-house-room-chrome]{grid-column:1/-1}
  .house-vestments-room-rail{grid-column:1;grid-row:2/span 12;align-self:start;position:sticky;top:.8rem;max-height:calc(100vh - 7rem);overflow:auto;padding:.7rem;border:1px solid color-mix(in srgb,var(--gold) 20%,var(--line-soft));border-radius:1rem;background:linear-gradient(180deg,color-mix(in srgb,var(--panel-solid) 96%,var(--gold) 4%),color-mix(in srgb,var(--panel-solid) 94%,var(--green) 3%));box-shadow:0 14px 36px rgba(0,0,0,.12)}
  .house-vestments-room-rail header{display:flex;gap:.65rem;align-items:center;padding:.35rem .35rem .8rem;margin-bottom:.55rem;border-bottom:1px solid var(--line-soft)}
  .house-vestments-room-rail header>span{display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:.72rem;border:1px solid color-mix(in srgb,var(--gold) 35%,transparent);background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--gold) 35%,transparent),transparent 58%),color-mix(in srgb,var(--bg) 70%,var(--panel-solid));color:var(--gold);font-size:1.15rem}
  .house-vestments-room-rail header div{display:grid}.house-vestments-room-rail header small,.house-vestments-room-rail section>p{color:var(--muted);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase}
  .house-vestments-room-rail section{display:grid;gap:.28rem;margin:.55rem 0 1rem}.house-vestments-room-rail section>p{margin:.1rem .4rem .35rem}
  .house-vestments-room{appearance:none;width:100%;display:grid;grid-template-columns:1.9rem minmax(0,1fr) auto;align-items:center;gap:.5rem;padding:.5rem .55rem;border:1px solid transparent;border-radius:.72rem;background:transparent;color:inherit;text-align:left;cursor:pointer;transition:background .16s ease,border-color .16s ease,transform .16s ease}
  .house-vestments-room:hover{background:color-mix(in srgb,var(--gold) 7%,transparent);border-color:color-mix(in srgb,var(--gold) 12%,transparent)}
  .house-vestments-room.active{background:linear-gradient(90deg,color-mix(in srgb,var(--gold) 13%,transparent),color-mix(in srgb,var(--green) 5%,transparent));border-color:color-mix(in srgb,var(--gold) 28%,var(--line-soft));box-shadow:inset 3px 0 0 var(--gold)}
  .house-vestments-room-icon{display:grid;place-items:center;width:1.8rem;height:1.8rem;border-radius:.55rem;background:color-mix(in srgb,var(--bg) 72%,var(--panel-solid));border:1px solid var(--line-soft);color:var(--gold)}
  .house-vestments-room>span:nth-child(2){display:grid;min-width:0}.house-vestments-room strong{font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.house-vestments-room small{font-size:.62rem;color:var(--muted)}.house-vestments-room i{width:.45rem;height:.45rem;border-radius:50%;background:var(--gold);box-shadow:0 0 .65rem color-mix(in srgb,var(--gold) 60%,transparent)}
  .house-vestments-room-rail footer{padding:.25rem}.house-vestments-room-rail footer button{width:100%}
  .house-vestments-layout>.commons-log,.house-vestments-layout>#commons-form,.house-vestments-layout>[data-commons-command-room],.house-vestments-layout>fieldset{grid-column:2}
  .house-room-chrome{border:1px solid color-mix(in srgb,var(--gold) 18%,var(--line-soft))!important;border-radius:1.1rem!important;background:linear-gradient(110deg,color-mix(in srgb,var(--panel-solid) 97%,var(--gold) 3%),color-mix(in srgb,var(--panel-solid) 96%,var(--green) 4%))!important;box-shadow:0 16px 42px rgba(0,0,0,.1)!important;overflow:hidden}
  .house-room-header{padding:.85rem 1rem!important;border-bottom:1px solid var(--line-soft)}.house-room-mark{width:2.5rem!important;height:2.5rem!important;border-radius:.82rem!important;background:radial-gradient(circle at 35% 25%,color-mix(in srgb,var(--gold) 35%,transparent),transparent 58%),color-mix(in srgb,var(--bg) 68%,var(--panel-solid))!important;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--gold) 35%,transparent),0 8px 20px rgba(0,0,0,.12)}
  .house-room-participants{padding:.65rem .8rem!important;gap:.45rem!important;background:color-mix(in srgb,var(--bg) 16%,transparent)}
  .house-room-participant{--house-portrait-a:var(--gold);--house-portrait-b:var(--green);border-radius:.78rem!important;border:1px solid transparent!important;background:transparent!important;padding:.35rem .45rem!important;transition:background .16s ease,border-color .16s ease,transform .16s ease!important}
  .house-room-participant:hover,.house-room-participant[aria-pressed="true"]{background:color-mix(in srgb,var(--gold) 7%,transparent)!important;border-color:color-mix(in srgb,var(--gold) 18%,transparent)!important}
  .house-room-avatar{position:relative!important;display:grid!important;place-items:center!important;flex:0 0 auto!important;width:2.45rem!important;height:2.45rem!important;border-radius:.82rem!important;color:var(--text)!important;font-size:.72rem!important;font-weight:800!important;letter-spacing:.03em!important;background:radial-gradient(circle at 32% 24%,color-mix(in srgb,var(--house-portrait-a) 48%,white 8%),transparent 28%),linear-gradient(145deg,color-mix(in srgb,var(--house-portrait-a) 72%,var(--panel-solid)),color-mix(in srgb,var(--house-portrait-b) 70%,var(--bg)))!important;border:1px solid color-mix(in srgb,var(--house-portrait-a) 55%,var(--line-soft))!important;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--panel-solid) 62%,transparent),0 5px 15px rgba(0,0,0,.18)!important}
  .house-room-avatar:after{content:'';position:absolute;inset:3px;border-radius:.63rem;border:1px solid color-mix(in srgb,var(--house-portrait-b) 28%,transparent);pointer-events:none}
  [data-room-participant="lioreal"],[data-house-room-author="lioreal"]{--house-portrait-a:var(--house-tone-gold);--house-portrait-b:var(--house-tone-copper)}
  [data-room-participant="uial"],[data-house-room-author="uial"]{--house-portrait-a:var(--house-tone-seaglass);--house-portrait-b:var(--house-tone-moss)}
  [data-room-participant="larkshine"],[data-house-room-author="larkshine"]{--house-portrait-a:var(--house-tone-sky);--house-portrait-b:var(--house-tone-gold)}
  [data-room-participant="ellowind"],[data-house-room-author="ellowind"]{--house-portrait-a:var(--house-tone-moss);--house-portrait-b:var(--house-tone-seaglass)}
  [data-room-participant="altair"],[data-house-room-author="altair"]{--house-portrait-a:var(--house-tone-violet);--house-portrait-b:var(--house-tone-gold)}
  [data-room-participant="atlas"],[data-house-room-author="atlas"]{--house-portrait-a:var(--house-tone-slate);--house-portrait-b:var(--house-tone-copper)}
  [data-room-participant="runeweaver"],[data-house-room-author="runeweaver"]{--house-portrait-a:var(--house-tone-copper);--house-portrait-b:var(--house-tone-violet)}
  [data-room-participant="boxfire"],[data-house-room-author="boxfire"]{--house-portrait-a:var(--house-tone-slate);--house-portrait-b:var(--house-tone-gold)}
  [data-room-participant="yggdrasil"],[data-house-room-author="yggdrasil"]{--house-portrait-a:var(--house-tone-moss);--house-portrait-b:var(--house-tone-gold)}
  [data-room-participant="bluebird"],[data-house-room-author="bluebird"]{--house-portrait-a:var(--house-tone-sky);--house-portrait-b:var(--house-tone-seaglass)}
  [data-room-participant="vethrlauf"],[data-house-room-author="vethrlauf"]{--house-portrait-a:var(--house-tone-slate);--house-portrait-b:var(--house-tone-seaglass)}
  [data-house-room-author="rowan"],.house-room-participant-self{--house-portrait-a:var(--house-tone-copper);--house-portrait-b:var(--house-tone-violet)}
  .commons-log{border:1px solid color-mix(in srgb,var(--gold) 12%,var(--line-soft));border-radius:1rem;background:radial-gradient(circle at 92% 4%,color-mix(in srgb,var(--gold) 6%,transparent),transparent 22rem),radial-gradient(circle at 8% 92%,color-mix(in srgb,var(--green) 5%,transparent),transparent 24rem),color-mix(in srgb,var(--panel-solid) 84%,var(--bg));box-shadow:0 18px 48px rgba(0,0,0,.09)}
  .commons-chat-log-head{padding:.8rem .9rem!important;margin:-.2rem -.4rem .65rem!important;border-bottom:1px solid var(--line-soft);background:color-mix(in srgb,var(--panel-solid) 88%,transparent)!important;backdrop-filter:blur(14px)}
  .commons-chat-log-head h2:before{content:var(--house-room-icon,'#');display:inline-grid;place-items:center;width:1.9rem;height:1.9rem;margin-right:.48rem;border-radius:.56rem;background:color-mix(in srgb,var(--gold) 9%,transparent);border:1px solid color-mix(in srgb,var(--gold) 20%,transparent);color:var(--gold);font-size:.9rem;vertical-align:middle}
  .commons-chat-log-head [data-house-room-select]{display:none}
  .commons-chat-entry{position:relative!important;border-radius:1.05rem!important;border-color:color-mix(in srgb,var(--text) 10%,var(--line-soft))!important;box-shadow:0 7px 22px rgba(0,0,0,.08)!important;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease!important}
  .commons-chat-entry:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--gold) 22%,var(--line-soft))!important;box-shadow:0 10px 28px rgba(0,0,0,.12)!important}
  .commons-chat-entry[data-kind="steward"]{background:linear-gradient(145deg,color-mix(in srgb,var(--green) 9%,var(--panel-solid)),color-mix(in srgb,var(--panel-solid) 98%,var(--bg)))!important}
  .commons-chat-entry[data-kind="voice"]{background:linear-gradient(145deg,color-mix(in srgb,var(--gold) 6%,var(--panel-solid)),color-mix(in srgb,var(--panel-solid) 98%,var(--bg)))!important}
  .commons-chat-entry header>span{opacity:.56;font-size:.64rem!important;transition:opacity .15s ease}.commons-chat-entry:hover header>span,.commons-chat-entry:focus-within header>span{opacity:.9}
  .commons-chat-entry header>div{opacity:.48;transition:opacity .15s ease}.commons-chat-entry:hover header>div,.commons-chat-entry:focus-within header>div{opacity:1}
  .house-room-entry-author .house-room-entry-avatar{width:2rem!important;height:2rem!important;border-radius:.68rem!important}.house-room-entry-author .house-room-nameplate>span{font-weight:760}.house-room-entry-author .house-room-nameplate small{opacity:.6}
  #commons-form{position:sticky;bottom:.45rem;z-index:5;padding:.7rem;border:1px solid color-mix(in srgb,var(--gold) 16%,var(--line-soft));border-radius:1rem;background:color-mix(in srgb,var(--panel-solid) 90%,transparent);backdrop-filter:blur(16px);box-shadow:0 16px 42px rgba(0,0,0,.16)}
  .commons-native-toolbar{border:0!important;background:transparent!important;padding:.1rem!important}.commons-native-tool,.commons-native-toolbar>[data-commons-attach-files]{min-width:2.15rem;height:2rem;border-radius:.58rem!important}
  .commons-native-editor{min-height:6.3rem!important;border-radius:.78rem!important;background:color-mix(in srgb,var(--bg) 66%,var(--panel-solid))!important}
  .commons-native-editor:focus{box-shadow:0 0 0 2px color-mix(in srgb,var(--gold) 20%,transparent),0 8px 24px rgba(0,0,0,.08)!important}
  .commons-reply-banner{border-radius:.6rem;background:color-mix(in srgb,var(--gold) 7%,var(--panel-solid))!important}
  .house-room-typing{margin-left:.45rem!important;margin-bottom:.45rem!important}
  @media(max-width:980px){.house-room-mode.house-vestments-layout{grid-template-columns:minmax(0,1fr)!important}.house-vestments-room-rail{display:none}.house-vestments-layout>.commons-log,.house-vestments-layout>#commons-form,.house-vestments-layout>[data-commons-command-room],.house-vestments-layout>fieldset{grid-column:1}.commons-chat-log-head [data-house-room-select]{display:block}.house-room-participants{overflow-x:auto}.house-room-participant{min-width:max-content}}
  @media(max-width:650px){#commons-form{bottom:.2rem;padding:.5rem;border-radius:.78rem}.house-room-avatar{width:2.15rem!important;height:2.15rem!important}.house-room-nameplate small{display:none}.commons-chat-log-head{padding:.65rem!important}.commons-chat-entry{width:96%!important}.commons-chat-entry header>div{opacity:.85}}
  @media(prefers-reduced-motion:reduce){.house-vestments-room,.commons-chat-entry{transition:none!important}.commons-chat-entry:hover{transform:none}}
  `;
  document.head.append(style);
}

export function installHouseChatVestmentsV1() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  styles();
  observer = new MutationObserver(scheduleDecorate);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-house-room-author', 'aria-pressed'] });
  document.addEventListener('change', (event) => { if (event.target.closest?.('[data-house-room-select], [data-commons-thread]')) scheduleDecorate(); }, true);
  document.addEventListener('arcsweep:house-room-metadata-changed', scheduleDecorate);
  scheduleDecorate();
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installHouseChatVestmentsV1();
