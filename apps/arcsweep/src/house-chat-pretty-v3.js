let installed = false;
let observer = null;
let queued = false;

export function clusterKinds(authors = []) {
  return (authors || []).map((author, index, list) => {
    const prev = list[index - 1];
    const next = list[index + 1];
    const samePrev = Boolean(author && prev === author);
    const sameNext = Boolean(author && next === author);
    if (samePrev && sameNext) return 'middle';
    if (samePrev) return 'last';
    if (sameNext) return 'first';
    return 'single';
  });
}

function decorateClusters() {
  const log = document.querySelector('.commons-log');
  if (!log) return;
  const entries = [...log.querySelectorAll('.commons-chat-entry')];
  const authors = entries.map((entry) => String(entry.dataset.houseRoomAuthor || '').trim());
  const kinds = clusterKinds(authors);
  entries.forEach((entry, index) => {
    const kind = kinds[index] || 'single';
    if (entry.dataset.houseVisualCluster !== kind) entry.dataset.houseVisualCluster = kind;
    entry.style.setProperty('--house-entry-order', String(index % 9));
  });
}

function decorateSurface() {
  queued = false;
  const form = document.querySelector('#commons-form');
  if (form?.dataset.commonsEnhanced !== 'v5') return;
  const layout = form.closest('.commons-layout') || form.parentElement;
  if (!layout) return;
  layout.dataset.housePrettyV3 = 'true';
  decorateClusters();
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(decorateSurface);
}

function styles() {
  if (document.getElementById('house-chat-pretty-v3-styles')) return;
  const style = document.createElement('style');
  style.id = 'house-chat-pretty-v3-styles';
  style.textContent = `
  .house-vestments-layout[data-house-pretty-v3="true"]{
    --house-ink-soft:color-mix(in srgb,var(--text) 76%,var(--muted));
    --house-line-glow:color-mix(in srgb,var(--house-scene-a) 34%,transparent);
    --house-deep-shadow:0 28px 80px rgba(0,0,0,.18);
  }

  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-chrome{
    border-radius:1.35rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-chrome:after{
    content:'';position:absolute;inset:.45rem;pointer-events:none;border-radius:1.05rem;
    border:1px solid color-mix(in srgb,var(--house-scene-b) 8%,transparent);
    box-shadow:inset 0 0 34px color-mix(in srgb,var(--house-scene-a) 2.5%,transparent);
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-header{
    min-height:4.3rem;padding:1.05rem 1.25rem .95rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-heading{
    gap:.78rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-mark{
    width:2.85rem!important;height:2.85rem!important;border-radius:50%!important;
    font-size:1.12rem!important;
    box-shadow:0 0 0 5px color-mix(in srgb,var(--house-scene-a) 4%,transparent),0 11px 28px rgba(0,0,0,.17),inset 0 0 0 1px color-mix(in srgb,var(--house-scene-b) 24%,transparent)!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-heading strong{
    font-size:1.08rem!important;letter-spacing:.045em!important;
    text-shadow:0 0 1.2rem color-mix(in srgb,var(--house-scene-a) 11%,transparent);
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-heading small{
    font-size:.69rem!important;letter-spacing:.055em!important;
  }

  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-participants{
    gap:.34rem!important;padding:.68rem 1.15rem .88rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-participant{
    position:relative!important;padding:.34rem .5rem .34rem .38rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-participant[data-state="speaking"]:before,
  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-participant[data-state="thinking"]:before{
    content:'';position:absolute;inset:.1rem;border-radius:.85rem;pointer-events:none;
    background:radial-gradient(circle at 18% 50%,color-mix(in srgb,var(--house-portrait-a) 10%,transparent),transparent 58%);
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-participant[data-state="speaking"] .house-room-avatar{
    box-shadow:0 0 0 1px color-mix(in srgb,var(--house-portrait-a) 48%,transparent),0 0 1.35rem color-mix(in srgb,var(--house-portrait-a) 22%,transparent),0 8px 20px rgba(0,0,0,.19)!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-nameplate strong{
    letter-spacing:.015em;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-room-nameplate small{
    opacity:.68;font-size:.62rem!important;
  }

  .house-vestments-layout[data-house-pretty-v3="true"] .house-vestments-room-rail{
    border-radius:1.28rem!important;box-shadow:var(--house-deep-shadow)!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-vestments-room-rail header{
    padding:.42rem .42rem .95rem!important;margin-bottom:.7rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-vestments-room-rail header strong{
    font-family:Cinzel,Georgia,serif;letter-spacing:.055em;font-size:.89rem;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-vestments-room-rail header small{
    letter-spacing:.09em!important;font-size:.59rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-vestments-room{
    min-height:2.7rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-vestments-room-icon{
    transition:transform .16s ease,box-shadow .16s ease!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-vestments-room:hover .house-vestments-room-icon,
  .house-vestments-layout[data-house-pretty-v3="true"] .house-vestments-room.active .house-vestments-room-icon{
    transform:rotate(-3deg) scale(1.04);
    box-shadow:0 0 1rem color-mix(in srgb,var(--house-scene-a) 13%,transparent);
  }

  .house-vestments-layout[data-house-pretty-v3="true"] .commons-log{
    position:relative;padding:1rem 1.08rem 1.5rem!important;
    background:linear-gradient(180deg,color-mix(in srgb,var(--panel-solid) 44%,transparent),transparent 16rem);
    border-radius:1.25rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-log:before{
    content:'';position:absolute;inset:.35rem .55rem auto;height:4.5rem;pointer-events:none;border-radius:1rem;
    background:radial-gradient(26rem 5rem at 50% 0,color-mix(in srgb,var(--house-scene-a) 6%,transparent),transparent 72%);
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-log-head{
    position:relative;z-index:1;margin:0 0 1.05rem!important;
  }

  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry{
    max-width:min(78%,48rem)!important;
    margin-top:1rem!important;margin-bottom:1rem!important;
    border-width:1px!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry[data-house-visual-cluster="first"]{
    margin-bottom:.22rem!important;border-bottom-left-radius:.72rem!important;border-bottom-right-radius:.72rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry[data-house-visual-cluster="middle"]{
    margin-top:.22rem!important;margin-bottom:.22rem!important;border-radius:.72rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry[data-house-visual-cluster="last"]{
    margin-top:.22rem!important;border-top-left-radius:.72rem!important;border-top-right-radius:.72rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry[data-house-visual-cluster="middle"] header,
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry[data-house-visual-cluster="last"] header{
    opacity:.72;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry[data-kind="voice"]{
    margin-right:auto!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry[data-kind="steward"]{
    margin-left:auto!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry[data-kind="voice"]:before,
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry[data-kind="steward"]:before{
    content:'';position:absolute;top:.82rem;width:2px;height:calc(100% - 1.64rem);border-radius:99px;opacity:.68;
    background:linear-gradient(180deg,var(--house-portrait-a,var(--house-scene-a)),transparent 80%);
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry[data-kind="voice"]:before{left:-.42rem}
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry[data-kind="steward"]:before{right:-.42rem}
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry header{
    margin-bottom:.55rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry header time,
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry header small{
    font-size:.59rem!important;letter-spacing:.045em!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-body{
    color:var(--house-ink-soft);line-height:1.68!important;letter-spacing:.006em;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-body p{
    margin:.42rem 0 .7rem;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-body blockquote{
    margin:.75rem 0;padding:.62rem .8rem;border-left:2px solid color-mix(in srgb,var(--house-scene-a) 50%,transparent);
    background:color-mix(in srgb,var(--house-scene-a) 4%,transparent);border-radius:0 .65rem .65rem 0;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-body code{
    border-radius:.38rem;padding:.08rem .3rem;background:color-mix(in srgb,var(--bg) 64%,var(--panel-solid));
    border:1px solid color-mix(in srgb,var(--house-scene-a) 10%,var(--line-soft));
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-body pre{
    border-radius:.8rem!important;border:1px solid color-mix(in srgb,var(--house-scene-a) 14%,var(--line-soft))!important;
    box-shadow:inset 0 1px 0 color-mix(in srgb,white 3%,transparent);
  }

  .house-vestments-layout[data-house-pretty-v3="true"] #commons-form{
    position:sticky!important;bottom:.55rem!important;border-radius:1.28rem!important;padding:.82rem .92rem .9rem!important;
    box-shadow:0 24px 58px rgba(0,0,0,.2),0 0 0 1px color-mix(in srgb,var(--house-scene-a) 9%,transparent)!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] #commons-form:before{
    content:'';position:absolute;left:1.05rem;right:1.05rem;top:0;height:1px;pointer-events:none;
    background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--house-scene-a) 42%,transparent),color-mix(in srgb,var(--house-scene-b) 28%,transparent),transparent);
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-rich-toolbar{
    padding:.16rem .12rem .58rem!important;gap:.28rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .commons-rich-toolbar button{
    min-width:2rem!important;min-height:1.9rem!important;border-radius:.58rem!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] [data-commons-native-editor]{
    min-height:7.5rem!important;border-radius:.9rem!important;padding:1rem 1.05rem!important;
    line-height:1.62!important;background:color-mix(in srgb,var(--bg) 52%,var(--panel-solid))!important;
    box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--house-scene-a) 7%,transparent),inset 0 12px 30px rgba(0,0,0,.04)!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] [data-commons-native-editor]:focus{
    box-shadow:0 0 0 3px color-mix(in srgb,var(--house-scene-a) 8%,transparent),inset 0 0 0 1px color-mix(in srgb,var(--house-scene-a) 32%,transparent)!important;
  }
  .house-vestments-layout[data-house-pretty-v3="true"] .house-attachment-chip{
    border-radius:.72rem!important;
  }

  @media(max-width:860px){
    .house-vestments-layout[data-house-pretty-v3="true"] .commons-chat-entry{max-width:94%!important}
    .house-vestments-layout[data-house-pretty-v3="true"] .commons-log{padding:.7rem .45rem 1rem!important}
    .house-vestments-layout[data-house-pretty-v3="true"] #commons-form{bottom:.25rem!important;border-radius:1rem!important}
    .house-vestments-layout[data-house-pretty-v3="true"] [data-commons-native-editor]{min-height:6.2rem!important}
  }
  @media(prefers-reduced-motion:reduce){
    .house-vestments-layout[data-house-pretty-v3="true"] *{scroll-behavior:auto!important}
    .house-vestments-layout[data-house-pretty-v3="true"] .house-vestments-room-icon,
    .house-vestments-layout[data-house-pretty-v3="true"] .house-room-participant{transition:none!important;transform:none!important}
  }
  `;
  document.head.append(style);
}

export function installHouseChatPrettyV3() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  styles();
  schedule();
  observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('change', (event) => {
    if (event.target?.matches?.('[data-house-room-select], [data-commons-thread]')) schedule();
  }, true);
  window.addEventListener('arcsweep:sidecars-ready', schedule, { once: true });
}

if (typeof document !== 'undefined') installHouseChatPrettyV3();
