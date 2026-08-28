const ROOM_SCENES = Object.freeze({
  'house-room:constellation': ['gold', 'violet', '✦'],
  'house-room:arcsweep': ['seaglass', 'copper', '⌘'],
  'house-room:terra-aeterna': ['moss', 'gold', 'ᛉ'],
  'house-room:luna': ['violet', 'sky', '☾'],
});

let installed = false;
let observer = null;
let queued = false;
let lastRoom = '';

export function prettyRoomScene(id = '') {
  return ROOM_SCENES[String(id)] || ['gold', 'seaglass', String(id).includes(':direct:') ? '@' : '◇'];
}

function activeSelect() {
  return document.querySelector('.commons-log [data-house-room-select], .commons-log [data-commons-thread]');
}

function applyScene() {
  queued = false;
  const form = document.querySelector('#commons-form');
  if (form?.dataset.commonsEnhanced !== 'v5') return;
  const layout = form.closest('.commons-layout') || form.parentElement;
  const select = activeSelect();
  if (!layout || !select) return;
  const roomId = select.value || 'house-room:constellation';
  if (roomId === lastRoom && layout.dataset.housePrettyReady === 'true') return;
  lastRoom = roomId;
  const [toneA, toneB, glyph] = prettyRoomScene(roomId);
  layout.dataset.housePrettyReady = 'true';
  layout.dataset.housePrettyRoom = roomId;
  layout.style.setProperty('--house-scene-a', `var(--house-tone-${toneA}, var(--gold))`);
  layout.style.setProperty('--house-scene-b', `var(--house-tone-${toneB}, var(--green))`);
  layout.style.setProperty('--house-scene-glyph', `'${String(glyph).replaceAll("'", '')}'`);

  const chrome = layout.querySelector('[data-house-room-chrome]');
  if (chrome && !chrome.querySelector('[data-house-pretty-kicker]')) {
    const kicker = document.createElement('div');
    kicker.className = 'house-pretty-kicker';
    kicker.dataset.housePrettyKicker = 'true';
    kicker.innerHTML = '<span></span><i></i><span></span>';
    chrome.append(kicker);
  }
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(applyScene);
}

function styles() {
  if (document.getElementById('house-chat-pretty-v2-styles')) return;
  const style = document.createElement('style');
  style.id = 'house-chat-pretty-v2-styles';
  style.textContent = `
  .house-vestments-layout{
    --house-scene-a:var(--gold);--house-scene-b:var(--green);
    isolation:isolate;position:relative;padding:.35rem;border-radius:1.45rem;
    background:
      radial-gradient(80rem 32rem at 18% -5%,color-mix(in srgb,var(--house-scene-a) 9%,transparent),transparent 58%),
      radial-gradient(70rem 28rem at 92% 8%,color-mix(in srgb,var(--house-scene-b) 8%,transparent),transparent 62%);
  }
  .house-vestments-layout:before{
    content:'';position:absolute;inset:-.2rem;z-index:-2;border-radius:1.65rem;pointer-events:none;
    background:linear-gradient(135deg,color-mix(in srgb,var(--house-scene-a) 22%,transparent),transparent 24%,transparent 73%,color-mix(in srgb,var(--house-scene-b) 18%,transparent));
    opacity:.7;filter:blur(18px);
  }
  .house-vestments-layout:after{
    content:'';position:absolute;inset:.45rem;z-index:-1;border-radius:1.2rem;pointer-events:none;
    border:1px solid color-mix(in srgb,var(--house-scene-a) 12%,transparent);
    box-shadow:inset 0 0 70px color-mix(in srgb,var(--house-scene-b) 2.5%,transparent);
  }

  .house-room-chrome{
    position:relative!important;overflow:hidden!important;
    background:
      radial-gradient(36rem 12rem at 15% -30%,color-mix(in srgb,var(--house-scene-a) 16%,transparent),transparent 68%),
      radial-gradient(32rem 14rem at 90% 0%,color-mix(in srgb,var(--house-scene-b) 11%,transparent),transparent 70%),
      linear-gradient(115deg,color-mix(in srgb,var(--panel-solid) 98%,var(--house-scene-a) 2%),color-mix(in srgb,var(--panel-solid) 97%,var(--house-scene-b) 3%))!important;
    border-color:color-mix(in srgb,var(--house-scene-a) 22%,var(--line-soft))!important;
    box-shadow:0 22px 55px rgba(0,0,0,.16),inset 0 1px 0 color-mix(in srgb,white 5%,transparent)!important;
  }
  .house-room-chrome:before{
    content:var(--house-scene-glyph);position:absolute;right:1.25rem;top:-1.35rem;pointer-events:none;
    font-size:7.5rem;line-height:1;color:color-mix(in srgb,var(--house-scene-a) 6%,transparent);transform:rotate(7deg);
  }
  .house-room-header{padding:1rem 1.15rem .9rem!important;position:relative;z-index:1}
  .house-room-heading strong{font-family:Cinzel,Georgia,serif!important;font-size:1.02rem!important;letter-spacing:.025em}
  .house-room-heading small{opacity:.72;letter-spacing:.035em}
  .house-room-actions{gap:.38rem!important}
  .house-room-actions .quiet.mini{border-radius:999px!important;padding:.38rem .65rem!important;border-color:color-mix(in srgb,var(--house-scene-a) 18%,var(--line-soft))!important;background:color-mix(in srgb,var(--panel-solid) 60%,transparent)!important;backdrop-filter:blur(12px)}
  .house-room-actions .quiet.mini:hover{transform:translateY(-1px);background:color-mix(in srgb,var(--house-scene-a) 9%,var(--panel-solid))!important}
  .house-room-online{display:inline-flex!important;align-items:center;gap:.38rem;padding:.34rem .62rem;border-radius:999px;border:1px solid color-mix(in srgb,var(--green) 26%,transparent);background:color-mix(in srgb,var(--green) 7%,transparent);font-size:.7rem!important}
  .house-room-online:before{content:'';width:.42rem;height:.42rem;border-radius:50%;background:var(--green);box-shadow:0 0 .65rem color-mix(in srgb,var(--green) 72%,transparent)}
  .house-pretty-kicker{height:1px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:.65rem;margin:0 1rem;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--house-scene-a) 24%,transparent),transparent)}
  .house-pretty-kicker i{display:block;width:.3rem;height:.3rem;transform:rotate(45deg);border:1px solid color-mix(in srgb,var(--house-scene-a) 65%,transparent);background:var(--panel-solid)}

  .house-room-participants{scrollbar-width:thin;mask-image:linear-gradient(90deg,transparent,#000 1.2rem,#000 calc(100% - 1.2rem),transparent);padding:.8rem 1.2rem .9rem!important}
  .house-room-participant{min-width:max-content;box-shadow:none!important}
  .house-room-participant:hover{transform:translateY(-2px)!important}
  .house-room-participant[aria-pressed="true"]{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--house-portrait-a) 22%,transparent),0 8px 22px rgba(0,0,0,.08)!important}
  .house-room-participant .house-room-presence-dot{box-shadow:0 0 .7rem currentColor!important}
  .house-room-avatar{width:2.7rem!important;height:2.7rem!important;border-radius:50%!important;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--panel-solid) 70%,transparent),0 7px 18px rgba(0,0,0,.2),0 0 0 1px color-mix(in srgb,var(--house-portrait-b) 18%,transparent)!important}
  .house-room-avatar:after{inset:4px!important;border-radius:50%!important}

  .house-vestments-room-rail{padding:.8rem!important;border-radius:1.2rem!important;background:
    radial-gradient(24rem 12rem at 20% -5%,color-mix(in srgb,var(--house-scene-a) 10%,transparent),transparent 72%),
    linear-gradient(180deg,color-mix(in srgb,var(--panel-solid) 98%,var(--house-scene-a) 2%),color-mix(in srgb,var(--panel-solid) 96%,var(--house-scene-b) 2%))!important;
    border-color:color-mix(in srgb,var(--house-scene-a) 18%,var(--line-soft))!important;box-shadow:0 18px 48px rgba(0,0,0,.13)!important}
  .house-vestments-room-rail header>span{border-radius:50%!important;box-shadow:0 0 0 4px color-mix(in srgb,var(--house-scene-a) 4%,transparent),0 8px 20px rgba(0,0,0,.14)}
  .house-vestments-room-rail section>p{letter-spacing:.14em!important;font-size:.61rem!important}
  .house-vestments-room{border-radius:.82rem!important;padding:.56rem .62rem!important}
  .house-vestments-room:hover{transform:translateX(2px)!important}
  .house-vestments-room.active{background:linear-gradient(100deg,color-mix(in srgb,var(--house-scene-a) 16%,transparent),color-mix(in srgb,var(--house-scene-b) 6%,transparent))!important;border-color:color-mix(in srgb,var(--house-scene-a) 32%,var(--line-soft))!important;box-shadow:inset 3px 0 0 var(--house-scene-a),0 6px 20px rgba(0,0,0,.08)!important}
  .house-vestments-room.active .house-vestments-room-icon{background:linear-gradient(145deg,color-mix(in srgb,var(--house-scene-a) 24%,var(--panel-solid)),color-mix(in srgb,var(--house-scene-b) 14%,var(--panel-solid)))!important;color:var(--text)!important}

  .commons-log{padding:.5rem .75rem 1.2rem!important;scroll-behavior:smooth}
  .commons-chat-log-head{border-radius:1rem!important;margin-bottom:.85rem!important;padding:.72rem .78rem!important;background:color-mix(in srgb,var(--panel-solid) 88%,transparent)!important;backdrop-filter:blur(16px);border:1px solid color-mix(in srgb,var(--house-scene-a) 12%,var(--line-soft));box-shadow:0 10px 28px rgba(0,0,0,.09)}
  .commons-chat-log-head h2{font-family:Cinzel,Georgia,serif!important;font-size:1.08rem!important;letter-spacing:.025em}
  .commons-chat-log-head h2:before{color:var(--house-scene-a)!important;filter:drop-shadow(0 0 .5rem color-mix(in srgb,var(--house-scene-a) 28%,transparent))}
  .commons-log-tools{gap:.35rem!important}.commons-log-tools .quiet.mini,.commons-log-tools select,.commons-log-tools input{border-radius:999px!important;background:color-mix(in srgb,var(--bg) 48%,var(--panel-solid))!important}
  .commons-log-tools input{padding-left:.75rem!important}

  .commons-chat-entry{position:relative!important;border-radius:1.15rem!important;padding:.85rem 1rem .9rem!important;margin:.82rem 0!important;box-shadow:0 10px 28px rgba(0,0,0,.095),inset 0 1px 0 color-mix(in srgb,white 3.5%,transparent)!important;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease!important}
  .commons-chat-entry:hover{transform:translateY(-1px);box-shadow:0 14px 34px rgba(0,0,0,.12),inset 0 1px 0 color-mix(in srgb,white 4%,transparent)!important}
  .commons-chat-entry[data-kind="voice"]{border-top-left-radius:.48rem!important;background:linear-gradient(135deg,color-mix(in srgb,var(--house-scene-a) 5%,var(--panel-solid)),color-mix(in srgb,var(--panel-solid) 98%,transparent))!important}
  .commons-chat-entry[data-kind="steward"]{border-top-right-radius:.48rem!important;background:linear-gradient(225deg,color-mix(in srgb,var(--green) 8%,var(--panel-solid)),color-mix(in srgb,var(--panel-solid) 98%,transparent))!important}
  .commons-chat-entry header{padding-bottom:.4rem;border-bottom:1px solid color-mix(in srgb,var(--line-soft) 72%,transparent)}
  .commons-chat-entry header>span{opacity:.58!important;font-size:.63rem!important;letter-spacing:.02em}
  .commons-chat-entry header>div{opacity:.34;transition:opacity .16s ease}.commons-chat-entry:hover header>div,.commons-chat-entry:focus-within header>div{opacity:1}
  .commons-chat-body{font-size:.94rem;line-height:1.72!important;letter-spacing:.006em}
  .commons-chat-body p{margin:.58rem 0!important}
  .commons-chat-body blockquote{border-radius:0 .65rem .65rem 0;background:linear-gradient(90deg,color-mix(in srgb,var(--house-scene-a) 8%,transparent),transparent)!important}
  .commons-reply-context{border-radius:.65rem!important;opacity:.82}
  .commons-streaming{border-color:color-mix(in srgb,var(--house-scene-a) 34%,var(--line-soft))!important;box-shadow:0 10px 32px rgba(0,0,0,.11),0 0 28px color-mix(in srgb,var(--house-scene-a) 5%,transparent)!important}
  .commons-stream-cursor{color:var(--house-scene-a)}

  #commons-form{position:sticky;bottom:.35rem;z-index:4;margin-top:.55rem;padding:.72rem!important;border:1px solid color-mix(in srgb,var(--house-scene-a) 20%,var(--line-soft));border-radius:1.1rem;background:color-mix(in srgb,var(--panel-solid) 82%,transparent)!important;backdrop-filter:blur(22px) saturate(1.12);box-shadow:0 18px 55px rgba(0,0,0,.18),inset 0 1px 0 color-mix(in srgb,white 5%,transparent)}
  .commons-native-toolbar{border:0!important;background:transparent!important;padding:.05rem .08rem .38rem!important}
  .commons-native-toolbar .quiet.mini{border-radius:.55rem!important;min-height:1.9rem;opacity:.68}.commons-native-toolbar .quiet.mini:hover{opacity:1;background:color-mix(in srgb,var(--house-scene-a) 9%,transparent)!important}
  .commons-native-editor{min-height:6.4rem!important;border-radius:.9rem!important;border-color:color-mix(in srgb,var(--house-scene-a) 16%,var(--line-soft))!important;background:linear-gradient(180deg,color-mix(in srgb,var(--bg) 58%,var(--panel-solid)),color-mix(in srgb,var(--bg) 72%,var(--panel-solid)))!important;box-shadow:inset 0 1px 10px rgba(0,0,0,.08);font-size:.96rem!important}
  .commons-native-editor:focus{border-color:color-mix(in srgb,var(--house-scene-a) 60%,var(--line-soft))!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--house-scene-a) 10%,transparent),inset 0 1px 10px rgba(0,0,0,.08)!important}
  #commons-form button[type="submit"]{border-radius:999px!important;padding:.65rem 1rem!important;background:linear-gradient(135deg,color-mix(in srgb,var(--house-scene-a) 52%,var(--gold)),color-mix(in srgb,var(--house-scene-b) 38%,var(--green)))!important;color:#111!important;border:1px solid color-mix(in srgb,white 18%,transparent)!important;box-shadow:0 8px 22px color-mix(in srgb,var(--house-scene-a) 13%,transparent);font-weight:750!important;letter-spacing:.01em}
  #commons-form button[type="submit"]:hover{transform:translateY(-1px);filter:brightness(1.06)}

  @media(max-width:900px){
    .house-vestments-layout{padding:0}.house-room-chrome:before{font-size:5rem;right:.4rem;top:-.5rem}.commons-chat-entry{width:92%!important}
    #commons-form{bottom:.15rem}
  }
  @media(max-width:650px){
    .house-room-header{padding:.78rem!important}.house-room-actions{width:100%;display:grid!important;grid-template-columns:repeat(3,1fr)}.house-room-online{grid-column:1/-1;width:max-content}
    .house-room-participants{mask-image:none;padding:.58rem .35rem .7rem!important}.house-room-participant{padding:.25rem!important}.house-room-nameplate{display:none!important}.house-room-avatar{width:2.5rem!important;height:2.5rem!important}
    .commons-log{padding:.25rem .12rem 1rem!important}.commons-chat-log-head{padding:.62rem!important}.commons-chat-entry{width:96%!important;padding:.78rem .85rem!important}
    .commons-chat-entry header>div{opacity:.72}.commons-log-tools .quiet.mini,.commons-log-tools select,.commons-log-tools input{border-radius:.7rem!important}
    #commons-form{margin-inline:-.15rem;padding:.55rem!important;border-radius:.92rem}.commons-native-editor{min-height:5.4rem!important}
  }
  @media(prefers-reduced-motion:reduce){.house-room-participant,.house-vestments-room,.commons-chat-entry,#commons-form button{transition:none!important;transform:none!important}}
  `;
  document.head.append(style);
}

export function installHouseChatPrettyV2() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  styles();
  observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('change', (event) => {
    if (event.target?.matches?.('[data-house-room-select], [data-commons-thread]')) schedule();
  });
  schedule();
  globalThis.addEventListener?.('beforeunload', () => observer?.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installHouseChatPrettyV2();
