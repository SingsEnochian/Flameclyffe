import './acoustic-room.css';
import {transition,bearing} from '../acoustic-marker-model.js';
import {createAcousticAudioEngine} from '../acoustic-audio-engine.js';
import {createWorld,advanceWorld,forkWorld,worldReceipt,recoverWorld,compareWorlds} from '../acoustic-world-model.js';
import {displacement,instrumentSnapshot} from '../field-instrument-model.js';
import {createWayglassObservation} from '../living-observer-model.js';

const STORAGE_KEY='wayglass.acoustic-world.return/v0.1';
export function mountWayglassAcousticRoom(root){
 let world=createWorld(),mirror=null,disposed=false,eventSequence=0,interactions=0;
 const audio=createAcousticAudioEngine();
 root.innerHTML=`
 <section class="wg-surface wg-acoustic-room" data-surface="wayglass-acoustic-room">
 <nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms">
 <button type="button" class="glass-chip" data-wayglass-room="arcsweep:writing-room">Writing Room</button>
 <button type="button" class="glass-chip" data-wayglass-room="wayglass:living-observer">Living Observer</button>
 <button type="button" class="glass-chip" data-wayglass-room="wayglass:toybox">Toybox</button>
 <button type="button" class="glass-chip active" aria-current="page">Acoustic Room</button>
 </nav>
 <header class="glass-panel acoustic-heading"><p class="eyebrow">Wayglass · Living Acoustic Architecture</p><h1>The Audible Return Marker</h1><p>Hear the room. Reach into a field. Compare a possible future.</p><small>Simulated Writing Room · normalized scene coordinates · sound starts muted</small></header>
 <div class="acoustic-layout">
 <section class="glass-panel acoustic-map-panel" aria-label="Interactive room">
 <div class="acoustic-stage" data-stage tabindex="0" role="group" aria-label="Writing Room field. Arrow keys turn and move the listener. Select a point to place the instrument probe.">
 <canvas class="acoustic-field-canvas" data-field aria-hidden="true"></canvas><div class="acoustic-orbit" aria-hidden="true"></div><div class="acoustic-path" data-path></div>
 <div class="acoustic-marker" data-marker><span>✧</span><small>RETURN MARKER</small></div>
 <div class="acoustic-listener" data-listener><span>▲</span></div>
 <span class="acoustic-room-label">THE WRITING ROOM</span></div>
 <p class="acoustic-readout" data-bearing aria-live="polite"></p>
 <div class="acoustic-field-controls"><label>Field influence <input data-field-mass type="range" min="0" max="2" step="0.05" value="0.7"></label><output data-field-mass-output>0.70</output></div>
 <p class="acoustic-readout" data-field-metrics aria-live="off"></p>
 <div class="acoustic-controls">
 <button type="button" class="glass-chip" data-intent="turn" data-value="-0.261799">↶ Turn 15°</button>
 <button type="button" class="glass-chip" data-intent="turn" data-value="0.261799">Turn 15° ↷</button>
 <button type="button" class="glass-chip" data-intent="move" data-value="0.1">Step forward</button>
 <button type="button" class="glass-chip" data-intent="move" data-value="-0.1">Step back</button></div>
 <p class="acoustic-note">The probe follows the listener. Select the field to place it; arrow keys and step controls move it too.</p>
 <section class="acoustic-mirror" aria-label="Mirror branch experiment"><h2>Mirror · Compare a future</h2>
 <label>Alternate influence <input data-mirror-mass type="range" min="0" max="2" step="0.05" value="1.2"></label>
 <div class="acoustic-actions"><button type="button" class="glass-chip" data-fork>Create comparison branch</button><button type="button" class="glass-chip" data-clear-mirror>Clear comparison</button></div>
 <p class="acoustic-readout" data-comparison aria-live="polite">No comparison branch selected.</p></section>
 </section>
 <aside class="glass-panel acoustic-console"><h2>Lantern · Compass · Key</h2>
 <p class="acoustic-readout" data-status aria-live="polite"></p><p class="acoustic-snapshot" data-snapshot></p>
 <div class="acoustic-actions"><button type="button" class="glass-chip" data-intent="select">Select marker</button>
 <button type="button" class="glass-chip" data-intent="orient">Compass · Orient</button>
 <button type="button" class="glass-chip" data-intent="request-traverse">Key · Request crossing</button>
 <button type="button" class="glass-chip" data-intent="decline">Decline crossing</button></div>
 <div class="acoustic-options">
 <label><input type="checkbox" data-audio> Enable sound</label>
 <label><input type="checkbox" data-mono> Mono-safe</label>
 <label><input type="checkbox" data-ambience> Room ambience</label>
 <label><input type="checkbox" data-motion> Reduce motion</label>
 <button type="button" class="glass-chip" data-signal>Bell · Audition status cue</button>
 <p class="acoustic-note">Independent ambience, navigation and status buses. Mono keeps the visible bearing.</p>
 <p class="acoustic-note" data-audio-state aria-live="polite"></p>
 <button type="button" class="glass-chip" data-retry-audio hidden>Retry sound</button>
 </div>
 <div class="acoustic-actions"><button type="button" class="glass-chip" data-save>Stone · Save return</button>
 <button type="button" class="glass-chip" data-return>Recover return</button>
 <button type="button" class="glass-chip" data-intent="feather">🪽 Feather · Stop</button>
 <button type="button" class="glass-chip" data-intent="reset">Reset</button></div>
 <p class="acoustic-receipt" data-receipt aria-live="polite">No saved return in this session.</p>
 <details class="acoustic-inspector"><summary>Lantern · Inspect shared readings</summary><button type="button" class="glass-chip" data-export>Vessel · Export instrument packet</button><pre data-inspector></pre></details>
 <p class="acoustic-note">Compass shows a bearing; Key requests crossing. This prototype never executes a route.</p>
 </aside></div></section>`;
 const $=s=>root.querySelector(s);
 let reduced=Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
 $('[data-motion]').checked=reduced;
 function syncAudio(){
  const state=world.markerState;
  audio.update({muted:state.muted,mono:state.mono,ambience:state.ambience,bearing:bearing(state)});
  const status=audio.getState();
  $('[data-audio-state]').textContent=status.supported===false?'Audio unavailable here. Field and text instruments remain available.':state.muted?'Sound stopped. Enable sound to begin.':status.running?'Audio active · navigation, ambience and status.':status.status==='error'?'Audio could not start: '+(status.lastError||'device error')+'. Retry sound when ready.':status.status==='suspended'?'Audio suspended by the device. Retry sound to resume.':'Audio awaiting device start.';
  $('[data-retry-audio]').hidden=state.muted||status.supported===false||status.running;
 }
 async function startAudio(){try{await audio.start();}catch{}if(!disposed)syncAudio();}
 function sources(w=world){return w.sources;}
 function options(w=world){return {softening:w.model.softening,strength:w.model.strength,displacementScale:w.model.displacementScale};}
 function measure(w=world){const l=w.markerState.listener;return instrumentSnapshot({x:l.x,y:l.y,sources:sources(w),options:options(w)});}
 function metric(value,places){return Number.isFinite(value)?value.toFixed(places):'∞';}
 function instrumentPacket(){
  return {schema:'wayglass.acoustic-instrument-packet/v0.1',kind:'local-simulation',world:worldReceipt(world),field:{...measure(),world_id:world.world_id,snapshot_id:world.snapshot_id,tick:world.tick},comparison:mirror?{world:worldReceipt(mirror),difference:compareWorlds(world,mirror)}:null,observer:createWayglassObservation({surface:'wayglass:acoustic-room',touches:interactions,reducedMotion:reduced,sound:!world.markerState.muted,focus:'touch'})};
 }
 function drawField(){
  if(disposed)return;
  const canvas=$('[data-field]'),rect=canvas.getBoundingClientRect();
  const ratio=Math.min(2,globalThis.devicePixelRatio||1),w=Math.max(1,Math.round(rect.width*ratio)),h=Math.max(1,Math.round(rect.height*ratio));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const ctx=canvas.getContext('2d');
  if(ctx){
   ctx.clearRect(0,0,w,h);ctx.lineWidth=ratio;
   function grid(wd,color){
    ctx.strokeStyle=color;
    function project(x,y){const p=displacement(x,y,sources(wd),options(wd));return [(0.5+p.x*0.38)*w,(0.5+p.y*0.38)*h];}
    for(let axis=0;axis<2;axis++)for(let line=-1;line<=1.0001;line+=0.2){
     ctx.beginPath();for(let i=0;i<=64;i++){const t=-1+2*i/64,p=axis===0?project(line,t):project(t,line);if(i===0)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);}ctx.stroke();
    }
   }
   grid(world,'rgba(110,232,216,0.32)');if(mirror)grid(mirror,'rgba(241,196,109,0.32)');
  }
  const j=measure().jacobian;
  $('[data-field-metrics]').textContent='FIELD · tick '+world.tick+' | det J '+metric(j.determinant,3)+' | σ '+j.singularValues.map(v=>metric(v,3)).join(' / ')+' | κ '+metric(j.conditionNumber,2)+' | fold '+metric(j.foldIndex,3);
  $('[data-field-mass-output]').textContent=world.fieldMass.toFixed(2);
 }
 function render(){
  if(disposed)return;
  const state=world.markerState,b=bearing(state),l=state.listener,m=state.marker,rect=$('[data-stage]').getBoundingClientRect();
  $('[data-listener]').style.left=(50+l.x*38)+'%';$('[data-listener]').style.top=(50+l.y*38)+'%';
  const screenHeading=Math.atan2(Math.sin(l.heading)*rect.height,Math.cos(l.heading)*rect.width);
  $('[data-listener]').style.transform='translate(-50%,-50%) rotate('+(screenHeading*180/Math.PI+90)+'deg)';
  $('[data-marker]').style.left=(50+m.x*38)+'%';$('[data-marker]').style.top=(50+m.y*38)+'%';
  const path=$('[data-path]');path.style.left=(50+l.x*38)+'%';path.style.top=(50+l.y*38)+'%';
  const dx=(m.x-l.x)*0.38*rect.width,dy=(m.y-l.y)*0.38*rect.height;
  path.style.width=Math.hypot(dx,dy)+'px';path.style.transform='rotate('+(Math.atan2(dy,dx)*180/Math.PI)+'deg)';
  $('[data-bearing]').textContent='Compass bearing: '+(b.degrees>0?'+':'')+b.degrees+'° · distance '+b.distance.toFixed(2)+' scene units · '+(b.degrees<0?'left':b.degrees>0?'right':'ahead');
  $('[data-status]').textContent=state.status==='traverse-requested'?'Crossing requested. Awaiting an authorised Wayglass route. No crossing performed.':'State: '+state.status+' · revision '+state.revision;
  $('[data-audio]').checked=!state.muted;$('[data-mono]').checked=state.mono;$('[data-ambience]').checked=state.ambience;
  $('[data-snapshot]').textContent='Branch '+world.branch_id+' · tick '+world.tick+' · snapshot '+world.snapshot_id;
  $('[data-field-mass]').value=String(world.fieldMass);
  if(mirror){
   const comparison=compareWorlds(world,mirror),point=world.markerState.listener;
   const alternate=instrumentSnapshot({x:point.x,y:point.y,sources:sources(mirror),options:options(mirror)});
   const delta=alternate.potential-measure().potential;
   $('[data-comparison]').textContent='Gold: '+mirror.branch_id+' · parent '+mirror.parent_snapshot_id+' · influence '+mirror.fieldMass.toFixed(2)+' versus '+world.fieldMass.toFixed(2)+' · Δ potential '+delta.toFixed(3)+' at the same primary probe · '+comparison.changes.length+' state differences. Primary branch unchanged by comparison.';
  }else $('[data-comparison]').textContent='No comparison branch selected.';
  root.classList.toggle('acoustic-reduced',reduced);
  $('[data-inspector]').textContent=JSON.stringify(instrumentPacket(),null,2);
  drawField();syncAudio();
 }
 function advance(markerState=world.markerState,fieldMass=world.fieldMass){world=advanceWorld(world,{markerState,fieldMass});render();}
 function act(intent){
  const markerState=transition(world.markerState,intent);
  if(intent.type==='feather'||intent.type==='reset'||(intent.type==='mute'&&intent.value))audio.stop();
  if(intent.type==='reset'){mirror=null;world=createWorld({markerState});render();}else advance(markerState);
  if(['select','orient','request-traverse','decline'].includes(intent.type))audio.signal({eventId:world.snapshot_id+':'+intent.type+':'+(++eventSequence),kind:'status'});
 }
 function onClick(e){
  interactions++;
  const b=e.target.closest('[data-intent]');
  if(b&&root.contains(b)){act({type:b.dataset.intent,value:b.dataset.value});return;}
  if(e.target.closest('[data-fork]')){mirror=forkWorld(world,{branchId:'mirror-'+(++eventSequence),fieldMass:Number($('[data-mirror-mass]').value)});render();return;}
  if(e.target.closest('[data-clear-mirror]')){mirror=null;render();return;}
  if(e.target.closest('[data-signal]')){audio.signal({eventId:world.snapshot_id+':bell:'+ (++eventSequence),kind:'status'});return;}
  if(e.target.closest('[data-retry-audio]')){if(!world.markerState.muted)void startAudio();return;}
  if(e.target.closest('[data-export]')){
   let url;
   try{url=URL.createObjectURL(new Blob([JSON.stringify(instrumentPacket(),null,2)],{type:'application/json'}));const link=root.ownerDocument.createElement('a');link.href=url;link.download='wayglass-acoustic-instrument.json';link.click();$('[data-receipt]').textContent='Instrument packet exported · '+world.snapshot_id;}
   catch{$('[data-receipt]').textContent='Export unavailable. Shared readings remain inspectable below.';}
   finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),1000);}return;
  }
  if(e.target.closest('[data-save]')){
   try{globalThis.localStorage.setItem(STORAGE_KEY,JSON.stringify(worldReceipt(world)));$('[data-receipt]').textContent='Return saved · '+world.snapshot_id+' · field and listener preserved.';}
   catch{$('[data-receipt]').textContent='Storage unavailable; return not saved.';}return;
  }
  if(e.target.closest('[data-return]')){
   try{const saved=globalThis.localStorage.getItem(STORAGE_KEY);if(!saved)throw Error('No return');const restored=recoverWorld(JSON.parse(saved));audio.stop();world=restored;mirror=null;render();$('[data-receipt]').textContent='Returned · '+world.snapshot_id+' · audio muted.';}
   catch{$('[data-receipt]').textContent='No valid saved return found.';}return;
  }
  const stage=e.target.closest('[data-stage]');
  if(stage){
   const rect=stage.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;
   const x=Math.max(-1,Math.min(1,(e.clientX-rect.left-rect.width/2)/(rect.width*0.38))),y=Math.max(-1,Math.min(1,(e.clientY-rect.top-rect.height/2)/(rect.height*0.38)));
   act({type:'place',x,y});
  }
 }
 function onChange(e){
  interactions++;
  if(e.target.matches('[data-audio]')){act({type:'mute',value:!e.target.checked});if(e.target.checked)void startAudio();}
  if(e.target.matches('[data-mono]'))act({type:'mono',value:e.target.checked});
  if(e.target.matches('[data-ambience]'))act({type:'ambience',value:e.target.checked});
  if(e.target.matches('[data-motion]')){reduced=e.target.checked;render();}
  if(e.target.matches('[data-field-mass]')&&Number(e.target.value)!==world.fieldMass)advance(world.markerState,Number(e.target.value));
 }
 function onInput(e){if(e.target.matches('[data-field-mass]')){interactions++;if(Number(e.target.value)!==world.fieldMass)advance(world.markerState,Number(e.target.value));}}
 function onKey(e){if(e.target.closest('input,button,textarea,select'))return;if(e.key==='ArrowLeft'){e.preventDefault();act({type:'turn',value:-Math.PI/12});}if(e.key==='ArrowRight'){e.preventDefault();act({type:'turn',value:Math.PI/12});}if(e.key==='ArrowUp'){e.preventDefault();act({type:'move',value:0.1});}if(e.key==='ArrowDown'){e.preventDefault();act({type:'move',value:-0.1});}}
 const onResize=()=>{if(!disposed)render();};
 const observer=typeof globalThis.ResizeObserver==='function'?new globalThis.ResizeObserver(onResize):null;
 observer?.observe($('[data-stage]'));
 globalThis.addEventListener?.('resize',onResize);
 root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('input',onInput);root.addEventListener('keydown',onKey);
 root.tabIndex=0;render();
 return ()=>{disposed=true;observer?.disconnect();root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);root.removeEventListener('input',onInput);root.removeEventListener('keydown',onKey);globalThis.removeEventListener?.('resize',onResize);audio.dispose();};
}

