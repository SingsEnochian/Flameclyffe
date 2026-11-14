// WAYGLASS · inhabited Threefold Möbius Lift.
// One spatial chamber with three Wyrdrune stations, never three page-cards.
// Only user actions change stations, start audio, or enter a real ship surface.
// The browser renders acoustics; Wyrdrune supplies frequencies and topology.
import {wayglassSomaticSound} from './somatic-sound.js';
import {LIFT_ROOMS,liftStep,liftSelection} from './triptych-lift-state.mjs';
import './triptych-lift-journey.css';

const DESCRIPTIONS=Object.freeze([
  'A vast mineral shaft wakes beneath your feet. Down is a promise, not a prison.',
  'The chamber turns along a curved ribbon. The horizon moves; your place remains yours.',
  'Light opens across a new frame. The Observer is ahead, and the return passage remains.',
]);
const ORIENTATIONS=Object.freeze(['Vertical ascent','Reciprocal turn','Reframed arrival']);
const clampIndex=value=>Math.max(0,Math.min(2,value));

function makeScene(){
  return [
    '<section class="wg-lift" data-wg-triptych-lift data-station="monolith" aria-labelledby="wg-lift-title">',
      '<div class="wg-lift-membrane" aria-hidden="true"></div>',
      '<header class="wg-lift-mast">',
        '<div><span class="wg-lift-kicker">WAYGLASS · WYRDRUNE TRANSPORT</span>',
          '<h1 id="wg-lift-title">The Möbius Lift</h1>',
          '<p class="wg-lift-subhead">One continuous room. Three altered orientations.</p></div>',
        '<div class="wg-lift-bearing" aria-label="Current orientation">',
          '<span class="wg-lift-bearing-mark" aria-hidden="true">✧</span>',
          '<div><span class="wg-lift-kicker">ORIENTATION</span><strong data-lift-bearing>Vertical ascent</strong></div>',
        '</div>',
      '</header>',
      '<div class="wg-lift-world" data-lift-world tabindex="0" role="group" ',
        'aria-label="Spatial lift chamber. Use left and right arrows to change station, Home or End to jump, Enter to enter the selected room. Swipe on touchscreens.">',
        '<div class="wg-lift-stars" aria-hidden="true"></div>',
        '<div class="wg-lift-shaft" aria-hidden="true">',
          '<i class="wg-lift-rib"></i><i class="wg-lift-rib"></i><i class="wg-lift-rib"></i><i class="wg-lift-rib"></i>',
        '</div>',
        '<div class="wg-lift-vault" aria-hidden="true">',
          '<svg viewBox="0 0 900 640" preserveAspectRatio="xMidYMid meet" class="wg-lift-architecture" aria-hidden="true">',
            '<defs>',
              '<linearGradient id="wg-lift-opal" x1="0" y1="0" x2="1" y2="1">',
                '<stop offset="0" stop-color="#dfcfb3" stop-opacity=".03"/>',
                '<stop offset=".25" stop-color="#67beb5" stop-opacity=".85"/>',
                '<stop offset=".53" stop-color="#d4b5ae" stop-opacity=".3"/>',
                '<stop offset=".84" stop-color="#a1dfcc" stop-opacity=".88"/>',
                '<stop offset="1" stop-color="#d8b97d" stop-opacity=".15"/>',
              '</linearGradient>',
              '<linearGradient id="wg-lift-copper" x1="0" y1="0" x2="1" y2="0">',
                '<stop offset="0" stop-color="#96624f"/><stop offset=".5" stop-color="#e2b689"/>',
                '<stop offset="1" stop-color="#705a58"/>',
              '</linearGradient>',
            '</defs>',
            '<path class="wg-lift-arch-outer" d="M135 635 L135 234 Q135 38 450 38 Q765 38 765 234 L765 635"/>',
            '<path class="wg-lift-arch-inner" d="M215 635 L215 248 Q215 119 450 119 Q685 119 685 248 L685 635"/>',
            '<path class="wg-lift-arch-filament" d="M300 635 L300 282 Q300 190 450 190 Q600 190 600 282 L600 635"/>',
            '<path class="wg-lift-filament" d="M146 485 C290 320 350 570 484 370 S740 170 780 300"/>',
            '<path class="wg-lift-filament second" d="M125 435 C300 160 410 570 565 302 S740 270 783 200"/>',
          '</svg>',
          '<div class="wg-lift-portal"><div class="wg-lift-portal-depth"></div></div>',
          '<div class="wg-lift-iris" aria-hidden="true"><span></span><span></span><span></span></div>',
        '</div>',
        '<div class="wg-lift-floor" aria-hidden="true"></div>',
        '<div class="wg-lift-spindle" aria-hidden="true"></div>',
        '<span class="wg-lift-direction" aria-hidden="true">↟ <span>WAYGLASS / INNER FACE</span> ↟</span>',
      '</div>',
      '<div class="wg-lift-console">',
        '<div class="wg-lift-description" aria-live="off">',
          '<span class="wg-lift-count" data-lift-count>01 / 03 · THE MONOLITH</span>',
          '<h2 data-lift-name>The Monolith</h2>',
          '<p data-lift-description>A vast mineral shaft wakes beneath your feet.</p>',
        '</div>',
        '<nav class="wg-lift-stations" aria-label="Lift stations">',
          '<button type="button" data-lift-go="0" aria-current="step" aria-label="Station 1: The Monolith">',
            '<span class="wg-lift-station-dot" aria-hidden="true"></span><span>Monolith</span></button>',
          '<button type="button" data-lift-go="1" aria-label="Station 2: The Twist">',
            '<span class="wg-lift-station-dot" aria-hidden="true"></span><span>Twist</span></button>',
          '<button type="button" data-lift-go="2" aria-label="Station 3: The Arrival">',
            '<span class="wg-lift-station-dot" aria-hidden="true"></span><span>Arrival</span></button>',
        '</nav>',
        '<div class="wg-lift-controls">',
          '<button type="button" data-lift-action="back" aria-label="Travel to previous chamber">← Back</button>',
          '<button type="button" data-lift-action="forward" class="wg-lift-primary">Ascend into the twist →</button>',
          '<button type="button" data-lift-action="enter" class="wg-lift-enter">Enter Watercolour ↗</button>',
          '<label class="wg-lift-audio-label"><input type="checkbox" data-lift-audio> <span>Enable spatial sound</span></label>',
          '<button type="button" data-lift-action="feather" class="wg-lift-feather">Feather · stop</button>',
        '</div>',
      '</div>',
      '<footer class="wg-lift-keel">',
        '<span data-lift-status role="status" aria-live="polite">Reading the Wyrdrune passage…</span>',
        '<span class="wg-lift-source" data-lift-source>Sound off · No autoplay</span>',
      '</footer>',
    '</section>'
  ].join('');
}

function makeSound({scope,alive}){
  let context=null,output=null,voices=[],enabled=false,run=0;
  const Context=scope.AudioContext||scope.webkitAudioContext;
  function disconnect(){
    for(const voice of voices){
      try{voice.stop?.();}catch{}
      try{voice.disconnect?.();}catch{}
    }
    voices=[];
    if(output){try{output.disconnect();}catch{}output=null;}
  }
  function stop({close=false}={}){
    ++run;disconnect();enabled=false;
    if(close&&context){const old=context;context=null;Promise.resolve(old.close()).catch(()=>{});}
  }
  async function enable(){
    if(!alive()||wayglassSomaticSound.snapshot().feather_stopped)return false;
    if(!Context)return false;
    if(!context||context.state==='closed')context=new Context({latencyHint:'interactive'});
    if(context.state==='suspended')await context.resume();
    enabled=context.state==='running'&&alive()&&!wayglassSomaticSound.snapshot().feather_stopped;
    return enabled;
  }
  function sound(panel){
    if(!enabled||!alive()||!context||context.state!=='running')return false;
    disconnect();const serial=++run,now=context.currentTime;
    output=context.createGain();output.gain.setValueAtTime(0,now);
    const ceiling=Math.min(.045,panel.gain*.4);
    output.gain.linearRampToValueAtTime(ceiling,now+.18);
    output.gain.setValueAtTime(ceiling,now+1.35);
    output.gain.linearRampToValueAtTime(0,now+2.8);
    output.connect(context.destination);
    for(const [frequency,gain] of [[panel.root_hz,1],[panel.upper_hz,.36]]){
      const oscillator=context.createOscillator(),level=context.createGain();
      oscillator.type='sine';oscillator.frequency.value=frequency;
      level.gain.value=gain;oscillator.connect(level).connect(output);
      oscillator.start(now);oscillator.stop(now+2.85);
      voices.push(oscillator,level);
    }
    // Filtered sea/stone breath. Source pitch and gain remain Wyrdrune-authored.
    if(typeof context.createBiquadFilter==='function'){
      const rate=context.sampleRate;
      const buffer=context.createBuffer(1,Math.floor(rate*2.85),rate);
      const data=buffer.getChannelData(0);
      // Deterministic local noise envelope. No recorded input or microphone.
      let seed=136930739;
      for(let i=0;i<data.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=((seed>>>0)/2147483648-1)*.15;}
      const noise=context.createBufferSource(),filter=context.createBiquadFilter();
      noise.buffer=buffer;filter.type='lowpass';filter.frequency.value=Math.min(900,panel.upper_hz*3);
      noise.connect(filter).connect(output);noise.start(now);noise.stop(now+2.85);
      voices.push(noise,filter);
    }
    return serial===run;
  }
  return Object.freeze({enable,sound,stop,get enabled(){return enabled;},get available(){return !!Context;}});
}

export function mountTriptychJourney(root,{navigate,compile,scope=globalThis}={}){
  if(typeof navigate!=='function'||typeof compile!=='function')
    throw new TypeError('Lift requires native Wyrdrune compilation and a real ship navigator.');
  root.innerHTML=makeScene();
  const section=root.querySelector('[data-wg-triptych-lift]');
  const world=root.querySelector('[data-lift-world]');
  const status=root.querySelector('[data-lift-status]');
  const source=root.querySelector('[data-lift-source]');
  const bearing=root.querySelector('[data-lift-bearing]');
  const count=root.querySelector('[data-lift-count]');
  const name=root.querySelector('[data-lift-name]');
  const description=root.querySelector('[data-lift-description]');
  const back=root.querySelector('[data-lift-action="back"]');
  const forward=root.querySelector('[data-lift-action="forward"]');
  const enter=root.querySelector('[data-lift-action="enter"]');
  const audioToggle=root.querySelector('[data-lift-audio]');
  let position=0,receipt=null,disposed=false,featherHeld=wayglassSomaticSound.snapshot().feather_stopped;
  const voice=makeSound({scope,alive:()=>!disposed&&!featherHeld});
  const settings=scope.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduced=()=>settings?.matches||scope.document?.documentElement?.dataset?.wgMotion==='off';
  function update(label){
    if(disposed||!receipt)return;
    const panel=liftSelection(receipt.plan,position);
    section.dataset.station=panel.id;
    section.dataset.reducedMotion=reduced()?'true':'false';
    section.dataset.feather=featherHeld?'held':'clear';
    count.textContent=String(position+1).padStart(2,'0')+' / 03 · '+panel.label.toUpperCase();
    name.textContent=panel.label;
    description.textContent=DESCRIPTIONS[position];
    bearing.textContent=ORIENTATIONS[position];
    back.disabled=featherHeld||position===0;
    forward.disabled=featherHeld||position===2;
    forward.textContent=position===0?'Ascend into the twist →':'Arrive beyond the twist →';
    enter.disabled=featherHeld;
    enter.textContent=['Enter Watercolour ↗','Enter Journey ↗','Enter Observer ↗'][position];
    for(const [i,button] of [...root.querySelectorAll('[data-lift-go]')].entries()){
      button.disabled=featherHeld;
      if(i===position)button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    }
    if(label)status.textContent=label;
  }
  const promise=Promise.resolve().then(()=>compile()).then(value=>{
    if(disposed)return null;
    // Fail closed: the scene may not navigate or synthesize from an unchecked WTL plan.
    for(let i=0;i<3;i++)liftSelection(value.plan,i);
    if(value.plan.autoplay!==false||value.receipts?.length!==16)
      throw new TypeError('Two native Eightfold cycles and no autoplay are mandatory.');
    receipt=value;
    source.textContent='WTL '+value.source_sha256.slice(0,12)+' · Audio opt-in';
    update(featherHeld?'Feather held. Release using the ship controls before travel.':'Lift ready. Arrow keys or swipe to explore; choose Enter to cross.');
    return value;
  }).catch(error=>{if(!disposed){status.textContent='Lift unavailable: '+error.message;source.textContent='Wyrdrune check failed';}return null;});
  function goto(index){
    if(disposed||featherHeld||!receipt)return false;
    const next=clampIndex(index);
    if(next===position)return true;
    position=next;
    update('Station '+(position+1)+' of 3: '+receipt.plan.panels[position].label+'.');
    if(voice.enabled)voice.sound(liftSelection(receipt.plan,position));
    return true;
  }
  function stop(){
    voice.stop({close:true});
    audioToggle.checked=false;
  }
  function feather(event){
    if(event?.detail?.stopped===true){
      featherHeld=true;stop();
      if(receipt)update('Feather held: travel and sound stopped. Release with the ship control.');
    }else if(event?.detail?.stopped===false&&event?.detail?.confirmed===true){
      featherHeld=false;
      if(receipt)update('Feather released. Sound remains off until you enable it.');
    }
  }
  async function click(event){
    const target=event.target.closest('[data-lift-action], [data-lift-go]');
    if(!target||!root.contains(target))return;
    if(target.dataset.liftAction==='feather'){
      voice.stop({close:true});
      audioToggle.checked=false;
      wayglassSomaticSound.feather();
      return;
    }
    if(featherHeld)return;
    if(!receipt){await promise;if(!receipt)return;}
    if(target.hasAttribute('data-lift-go')){goto(Number(target.dataset.liftGo));return;}
    const action=target.dataset.liftAction;
    if(action==='back')goto(liftStep(position,-1));
    if(action==='forward')goto(liftStep(position,1));
    if(action==='enter'){
      const panel=liftSelection(receipt.plan,position);
      stop();
      status.textContent='Crossing within Wayglass to '+panel.label+'.';
      navigate(panel.destination);
    }
  }
  async function toggleSound(){
    if(!audioToggle.checked){stop();if(receipt)update('Sound disabled. The passage remains navigable.');return;}
    if(featherHeld){audioToggle.checked=false;return;}
    // This handler runs directly from a user gesture, including iOS audio permission.
    const allowed=await voice.enable();
    if(!allowed){audioToggle.checked=false;update('Audio unavailable or Feather held; travelling silently.');return;}
    if(receipt){voice.sound(liftSelection(receipt.plan,position));update('Sound enabled by your choice. A short Wyrdrune chamber voice is playing.');}
  }
  function keydown(event){
    if(event.target?.closest('input,textarea,select'))return;
    if(!root.contains(event.target)||event.altKey||event.metaKey||event.ctrlKey)return;
    if(event.key==='Escape'){event.preventDefault();wayglassSomaticSound.feather();return;}
    if(!receipt||featherHeld)return;
    const actions={'ArrowRight':1,'ArrowDown':1,'ArrowLeft':-1,'ArrowUp':-1};
    if(Object.hasOwn(actions,event.key)){event.preventDefault();goto(liftStep(position,actions[event.key]));}
    else if(event.key==='Home'){event.preventDefault();goto(0);}
    else if(event.key==='End'){event.preventDefault();goto(2);}
    else if(event.key==='Enter'&&event.target===world){
      event.preventDefault();
      const panel=liftSelection(receipt.plan,position);
      stop();navigate(panel.destination);
    }
  }
  let finger=null;
  function touchStart(event){
    if(event.pointerType!=='touch'||featherHeld)return;
    finger={id:event.pointerId,x:event.clientX,y:event.clientY};
  }
  function touchEnd(event){
    if(!finger||event.pointerId!==finger.id)return;
    const dx=event.clientX-finger.x,dy=event.clientY-finger.y;
    finger=null;
    const delta=Math.abs(dx)>=Math.abs(dy)?-dx:-dy;
    if(Math.abs(delta)<48)return;
    goto(liftStep(position,delta>0?1:-1));
  }
  function motion(){if(receipt)update();}
  root.addEventListener('click',click);
  root.addEventListener('keydown',keydown);
  audioToggle.addEventListener('change',toggleSound);
  world.addEventListener('pointerdown',touchStart);
  world.addEventListener('pointerup',touchEnd);
  world.addEventListener('pointercancel',()=>{finger=null;});
  scope.addEventListener?.('wayglass:feather',feather);
  scope.addEventListener?.('wayglass:motion',motion);
  settings?.addEventListener?.('change',motion);
  return ()=>{
    disposed=true;stop();root.removeEventListener('click',click);
    root.removeEventListener('keydown',keydown);
    audioToggle.removeEventListener('change',toggleSound);
    world.removeEventListener('pointerdown',touchStart);
    world.removeEventListener('pointerup',touchEnd);
    scope.removeEventListener?.('wayglass:feather',feather);
    scope.removeEventListener?.('wayglass:motion',motion);
    settings?.removeEventListener?.('change',motion);
    root.replaceChildren();
  };
}
