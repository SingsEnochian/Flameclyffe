import './acoustic-room.css';
import {initialState,transition,bearing,receipt,recover} from '../acoustic-marker-model.js';

const STORAGE_KEY='wayglass.acoustic-marker.return/v0.1';
export function mountWayglassAcousticRoom(root){
 let state=initialState(),audio=null,osc=null,gain=null,pan=null,raf=0,disposed=false;
 root.innerHTML=`
 <section class="wg-surface wg-acoustic-room" data-surface="wayglass-acoustic-room">
 <nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms">
 <button type="button" class="glass-chip" data-wayglass-room="arcsweep:writing-room">Writing Room</button>
 <button type="button" class="glass-chip" data-wayglass-room="wayglass:living-observer">Living Observer</button>
 <button type="button" class="glass-chip" data-wayglass-room="wayglass:toybox">Toybox</button>
 <button type="button" class="glass-chip active" aria-current="page">Acoustic Room</button>
 </nav>
 <header class="glass-panel acoustic-heading"><p class="eyebrow">Wayglass · Living Acoustic Architecture</p><h1>The Audible Return Marker</h1><p>Hear the room. Follow a bearing. Choose your own gate.</p><small>Simulated Writing Room · prototype · sound starts muted</small></header>
 <div class="acoustic-layout">
 <section class="glass-panel acoustic-map-panel" aria-label="Interactive room">
 <div class="acoustic-stage" role="img" aria-label="Top-down simulated Writing Room with listener and Return Marker">
 <div class="acoustic-orbit" aria-hidden="true"></div><div class="acoustic-path" data-path></div>
 <div class="acoustic-marker" data-marker><span>✧</span><small>RETURN MARKER</small></div>
 <div class="acoustic-listener" data-listener><span>▲</span></div>
 <span class="acoustic-room-label">THE WRITING ROOM</span></div>
 <p class="acoustic-readout" data-bearing aria-live="polite"></p>
 <div class="acoustic-controls">
 <button type="button" class="glass-chip" data-intent="turn" data-value="-0.261799">↶ Turn 15°</button>
 <button type="button" class="glass-chip" data-intent="turn" data-value="0.261799">Turn 15° ↷</button>
 <button type="button" class="glass-chip" data-intent="move" data-value="0.1">Step forward</button>
 <button type="button" class="glass-chip" data-intent="move" data-value="-0.1">Step back</button></div>
 </section>
 <aside class="glass-panel acoustic-console"><h2>Lantern · Compass · Key</h2>
 <p class="acoustic-readout" data-status aria-live="polite"></p>
 <div class="acoustic-actions"><button type="button" class="glass-chip" data-intent="select">Select marker</button>
 <button type="button" class="glass-chip" data-intent="orient">Compass · Orient</button>
 <button type="button" class="glass-chip" data-intent="request-traverse">Key · Request crossing</button>
 <button type="button" class="glass-chip" data-intent="decline">Decline crossing</button></div>
 <div class="acoustic-options">
 <label><input type="checkbox" data-audio> Enable sound</label>
 <label><input type="checkbox" data-mono> Mono-safe</label>
 <label><input type="checkbox" data-ambience> Room ambience</label>
 <label><input type="checkbox" data-motion> Reduce motion</label>
 </div>
 <div class="acoustic-actions"><button type="button" class="glass-chip" data-save>Leave · Save return</button>
 <button type="button" class="glass-chip" data-return>Recover return</button>
 <button type="button" class="glass-chip" data-intent="feather">🪽 Feather · Stop</button>
 <button type="button" class="glass-chip" data-intent="reset">Reset</button></div>
 <p class="acoustic-receipt" data-receipt aria-live="polite">No saved return in this session.</p>
 <p class="acoustic-note">Compass shows a bearing; Key requests crossing. This prototype never executes a route.</p>
 </aside></div></section>`;
 const $=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)];
 let reduced=Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
 $('[data-motion]').checked=reduced;
 function stopAudio(){try{osc?.stop();}catch{}try{osc?.disconnect();gain?.disconnect();pan?.disconnect();}catch{}osc=null;gain=null;pan=null;}
 async function startAudio(){
  if(disposed||state.muted)return;
  const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Context)return;
  try{
   if(!audio)audio=new Context({latencyHint:'interactive'});
   await audio.resume();if(disposed||state.muted)return;
   if(!osc){osc=audio.createOscillator();gain=audio.createGain();pan=audio.createStereoPanner();osc.type='sine';osc.frequency.value=176;gain.gain.value=0;osc.connect(gain);gain.connect(pan);pan.connect(audio.destination);osc.start();}
   updateAudio();
  }catch{stopAudio();}
 }
 function updateAudio(){
  if(!audio||!gain||!pan)return;
  const b=bearing(state),t=audio.currentTime;
  pan.pan.setTargetAtTime(state.mono?0:b.pan,t,0.08);
  gain.gain.setTargetAtTime(state.muted?0:Math.min(0.045,0.035*b.gain),t,0.09);
  osc.frequency.setTargetAtTime(176+(state.ambience?22:0)+(b.distance<0.25?44:0),t,0.12);
 }
 function render(){
  if(disposed)return;
  const b=bearing(state),l=state.listener,m=state.marker;
  $('[data-listener]').style.left=(50+l.x*38)+'%';$('[data-listener]').style.top=(50+l.y*38)+'%';
  $('[data-listener]').style.transform='translate(-50%,-50%) rotate('+(l.heading*180/Math.PI+90)+'deg)';
  $('[data-marker]').style.left=(50+m.x*38)+'%';$('[data-marker]').style.top=(50+m.y*38)+'%';
  const path=$('[data-path]');path.style.left=(50+l.x*38)+'%';path.style.top=(50+l.y*38)+'%';
  path.style.width=(b.distance*38)+'%';path.style.transform='rotate('+(Math.atan2(m.y-l.y,m.x-l.x)*180/Math.PI)+'deg)';
  $('[data-bearing]').textContent='Compass bearing: '+(b.degrees>0?'+':'')+b.degrees+'° · distance '+b.distance.toFixed(2)+' · '+(b.degrees<0?'left':b.degrees>0?'right':'ahead');
  $('[data-status]').textContent=state.status==='traverse-requested'?'Crossing requested. Awaiting an authorised Wayglass route. No crossing performed.':'State: '+state.status+' · revision '+state.revision;
  $('[data-audio]').checked=!state.muted;$('[data-mono]').checked=state.mono;$('[data-ambience]').checked=state.ambience;
  root.classList.toggle('acoustic-reduced',reduced);
  updateAudio();
 }
 function act(intent){state=transition(state,intent);if(intent.type==='feather'||intent.type==='reset'||(intent.type==='mute'&&intent.value))stopAudio();render();}
 function onClick(e){
  const b=e.target.closest('[data-intent]');
  if(b&&root.contains(b)){act({type:b.dataset.intent,value:b.dataset.value});return;}
  if(e.target.closest('[data-save]')){try{globalThis.localStorage?.setItem(STORAGE_KEY,JSON.stringify(receipt(state)));$('[data-receipt]').textContent='Return saved · revision '+state.revision;}catch{$('[data-receipt]').textContent='Storage unavailable; return not saved.';}}
  if(e.target.closest('[data-return]')){try{const saved=globalThis.localStorage?.getItem(STORAGE_KEY);if(!saved)throw Error('No return');state=recover(JSON.parse(saved));stopAudio();render();$('[data-receipt]').textContent='Returned to saved coordinates · revision '+state.revision;}catch{$('[data-receipt]').textContent='No valid saved return found.';}}
 }
 function onChange(e){
  if(e.target.matches('[data-audio]')){act({type:'mute',value:!e.target.checked});if(e.target.checked)void startAudio();}
  if(e.target.matches('[data-mono]'))act({type:'mono',value:e.target.checked});
  if(e.target.matches('[data-ambience]'))act({type:'ambience',value:e.target.checked});
  if(e.target.matches('[data-motion]')){reduced=e.target.checked;render();}
 }
 function onKey(e){if(e.target.closest('input,button,textarea'))return;if(e.key==='ArrowLeft'){e.preventDefault();act({type:'turn',value:-Math.PI/12});}if(e.key==='ArrowRight'){e.preventDefault();act({type:'turn',value:Math.PI/12});}if(e.key==='ArrowUp'){e.preventDefault();act({type:'move',value:0.1});}if(e.key==='ArrowDown'){e.preventDefault();act({type:'move',value:-0.1});}}
 root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('keydown',onKey);
 root.tabIndex=0;render();
 return ()=>{disposed=true;root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);root.removeEventListener('keydown',onKey);stopAudio();void audio?.close().catch(()=>{});};
}
