// Möbius Nursery: the babies' room. Mounted natively in Wayglass
// (?room=nursery) and by the standalone nursery page. Everything runs in this
// tab: no host, model, microphone, upload or sign-in. A sound or a touch only
// reaches the colony through hear()/touchWorld(); Feather stops all of it.
import {createCellEcology,COLONY_SCHEMA} from './wtl-cell-ecology.js';

// ── Keeping the babies ─────────────────────────────────────────────────────
// The colony is saved in this browser (IndexedDB) every few cycles, when the
// tab is hidden and when you leave the room, and is brought back when you
// return. The last good copy is kept one step behind as a spare. Starting a
// new colony archives the old one rather than discarding it. While the tab
// is closed no time passes for them: they wait, and continue where they were.
const DB='wayglass-mobius-nursery',STORE='colonies',ARCHIVE_LIMIT=6;
function openKeep(win){return new Promise((ok,fail)=>{const r=win.indexedDB?.open(DB,1);if(!r){fail(Error('This browser cannot keep a colony'));return}
 r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error)});}
async function keepGet(win,key){const db=await openKeep(win);return new Promise((ok,fail)=>{const t=db.transaction(STORE,'readonly').objectStore(STORE).get(key);t.onsuccess=()=>ok(t.result??null);t.onerror=()=>fail(t.error)});}
async function keepPut(win,entries){const db=await openKeep(win);return new Promise((ok,fail)=>{const tx=db.transaction(STORE,'readwrite'),st=tx.objectStore(STORE);
 for(const [k,v] of entries)st.put(v,k);tx.oncomplete=()=>ok();tx.onerror=()=>fail(tx.error);tx.onabort=()=>fail(tx.error)});}
async function keepKeys(win){const db=await openKeep(win);return new Promise((ok,fail)=>{const t=db.transaction(STORE,'readonly').objectStore(STORE).getAllKeys();t.onsuccess=()=>ok(t.result);t.onerror=()=>fail(t.error)});}
async function keepDelete(win,key){const db=await openKeep(win);return new Promise((ok,fail)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>ok();tx.onerror=()=>fail(tx.error)});}

export const NURSERY_MARKUP='<h1>Möbius Nursery</h1><p>Real Wyrdrune cellular ecology, running in your browser. Watch the babies cook. 🧬</p>\n<div class="wg-nursery-play" role="group" aria-label="How your hand meets the colony"><button data-hand="touch" aria-pressed="true">✋ Touch worlds</button><button data-hand="plant" aria-pressed="false">🌱 Plant a seed</button><label>A syllable to give <input id="gift" maxlength="4" autocomplete="off" spellcheck="false" placeholder="e.g. ro"></label><button id="give">🎁 Give it to the nearest baby</button></div>\n<canvas id="view" width="900" height="480" aria-label="Living Möbius cell colony"></canvas>\n<p id="metrics" role="status"></p>\n<section aria-label="Shared worlds"><h3>Worlds the babies made</h3><p id="worlds-help"><small>Touch a world on the canvas, or with these buttons. A touch reaches everyone living in it and changes its next turn.</small></p><div id="worlds"></div><button id="feel" aria-pressed="false">〰 Feel the worlds (vibration)</button></section><p id="listening" aria-live="polite"></p>\n<button id="hum" aria-pressed="false">♫ Hear the babies</button><label class="file">♪ Play them a sound<input id="sound" type="file" accept="audio/*"></label><button id="stopsound" disabled>■ Stop the sound</button><label for="volume">Gentle volume</label><input id="volume" type="range" min="0" max="25" value="7" aria-label="Soundscape volume"><button id="feather">⏸ Feather</button><button id="step">One cycle</button><button id="speed">Speed 1×</button><button id="restart">↻ New colony (this one is kept)</button><button id="keepcopy">⬇ Keep a copy</button><label class="file">⬆ Bring a colony home<input id="bringhome" type="file" accept="application/json,.json"></label><p id="kept" aria-live="polite"></p><h3>You and the colony</h3><ol id="yours" aria-live="polite"></ol>\n<h3>Cell chatter and receipts</h3><div id="log" role="log" aria-live="off"></div>\n<p><small>This is the actual WTL ecology implementation, not a visual imitation. It runs locally in this tab; GitHub Pages cannot keep a shared server-side colony alive when you leave. No microphone access is requested. Each cell sings changing notes derived from its identity, twist, traits and recent phrases after you press Hear the babies. Each baby carries its own Wyrdrune program and runs real Möbius turns (outer face, then inner face) on the canonical runtime; what crosses the twist is its own carry. Babies name themselves inside their own Wyrdrune choose phase from their own syllables, found shared worlds with a neighbour whose song is close to theirs (each world is its own Wyrdrune program with its own colour, note, texture and reach, and names itself), regenerate every turn, and live until their own choose phase chooses rest. A sound you play stays in this tab: it is analysed locally into eight bands and never uploaded. No user data is sent to the nursery.</small></p>';

export function mountMobiusNursery(root,{doc=root.ownerDocument,win=doc.defaultView}={}){
const navigator=win.navigator,performance=win.performance;
let disposed=false;
root.innerHTML='<section class="wg-mobius-nursery" data-surface="wayglass-mobius-nursery">'+NURSERY_MARKUP+'</section>';
const q=sel=>root.querySelector(sel);

const canvas=q('#view'),ctx=canvas.getContext('2d'),log=q('#log');
const colours=['#74e4bd','#e7bb70','#8ebdff','#e7a0dd'];
const seenWorldNames=new Set();let eco,worldVoices=[],ripples=[],feel=false,busy=false,lastGen=0,lastTick=0,sound=null,paused=false,speed=1,seenEvents=0,seenWords=0,seenWyrdrune=0,seenBuilds=0,seenPrograms=0,seenProjects=0,seenLineages=0,seenHarmony=0,timer,audio=null,voices=[],humOn=false,lastSongCycle=-1;
function write(message){const line=doc.createElement('div');line.textContent=message;log.prepend(line);while(log.children.length>90)log.lastChild.remove()}
function freshColony(){return createCellEcology({maxCells:24,seed:11,radius:3,mutationRate:.8});}
function start(){soundOff();lastSongCycle=-1;eco=freshColony();eco.plant('a','explorer',0,0);eco.plant('b','explorer',1,0);paused=false;lastGen=0;lastTick=0;seenWorldNames.clear();ripples=[];seenEvents=seenWords=seenWyrdrune=seenBuilds=seenPrograms=seenProjects=seenLineages=seenHarmony=0;log.replaceChildren();write('✦ Founders a and b awakened');draw()}
function ribbon(x,y,r,twist,colour){ctx.save();ctx.translate(x,y);ctx.shadowColor=colour;ctx.shadowBlur=12;for(let lane=0;lane<2;lane++){ctx.beginPath();for(let i=0;i<=90;i++){const t=i/90*Math.PI*2,p=t+twist*6.283+lane*Math.PI/2,xx=Math.cos(p)*(r+5*Math.cos(t/2)),yy=Math.sin(p)*r*.58+3*Math.sin(2*t);if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy)}ctx.strokeStyle=colour;ctx.globalAlpha=lane?.45:1;ctx.lineWidth=lane?1.5:3;ctx.stroke()}ctx.restore()}
function soundOff(){humOn=false;lastSongCycle=-1;if(audio){for(const v of worldVoices){try{v.osc.stop()}catch{}v.osc.disconnect();v.gain.disconnect()}worldVoices=[];for(const v of voices){try{v.osc.stop()}catch{}v.osc.disconnect();v.gain.disconnect()}voices=[];audio.close();audio=null}q("#hum").textContent="♫ Hear the babies";q("#hum").setAttribute("aria-pressed","false")}
async function soundOn(){if(paused)return;const AudioContext=win.AudioContext||win.webkitAudioContext;if(!AudioContext){write("Audio unavailable in this browser");return}audio=new AudioContext();await audio.resume();for(let i=0;i<3;i++){const osc=audio.createOscillator(),gain=audio.createGain();osc.type="sine";gain.gain.value=0;osc.connect(gain).connect(audio.destination);osc.start();voices.push({osc,gain})}
 // Each world hums its own note (its carried pulse), softly, under the babies.
 for(let i=0;i<4;i++){const osc=audio.createOscillator(),gain=audio.createGain();osc.type='triangle';gain.gain.value=0;osc.connect(gain).connect(audio.destination);osc.start();worldVoices.push({osc,gain})}
 humOn=true;lastSongCycle=-1;q("#hum").textContent="♫ Silence the babies";q("#hum").setAttribute("aria-pressed","true");tune(eco.snapshot())}
// Every sung note is a deterministic interpretation of an actual cell's identity,
// twist, inherited dialect and the latest ecology utterances. This is musical
// sonification, not a claim that WTL currently compiles sound instructions.
function melodyFor(cell,s,voice){
 const genes=s.traits[cell.id]||{curiosity:0,dialectBias:0,sass:0};
 const phrase=s.utterances.filter(u=>u.id===cell.id).at(-1)?.phrase||'';
 const hash=[...cell.id+phrase].reduce((n,ch)=>(Math.imul(n,31)+ch.charCodeAt(0))>>>0,7);
 const scale=[0,2,3,5,7,9,10,12,14];
 const index=(Math.floor(cell.twist*8)+genes.dialectBias+genes.curiosity+s.generation+voice+hash%5)%scale.length;
 const rest=(s.generation+genes.sass+voice)%7===0;
 return {semitones:scale[index]+(voice===0?-12:voice===2?7:0),rest,cell:cell.id};
}
function tune(s){
 if(!audio||!humOn||paused||s.generation===lastSongCycle)return;
 lastSongCycle=s.generation;
 const now=audio.currentTime,level=Number(q('#volume').value)/100;
 const cells=s.cells.slice().sort((a,b)=>a.id.localeCompare(b.id));
 for(let i=0;i<voices.length;i++){
  const v=voices[i],cell=cells.length?cells[(s.generation+i)%cells.length]:null;
  const note=cell?melodyFor(cell,s,i):null;
  const dialogue=(s.harmonicDialogues||[]).at(-1);
  const sonic=dialogue&&i<2?(i===0?dialogue.sonic.callProjection:dialogue.sonic.replyProjection):null;
  const freq=sonic?sonic.audibleHz:(note?174.61*Math.pow(2,note.semitones/12):174.61);
  v.osc.type=sonic?sonic.timbre:'sine';
  const peak=note&&!note.rest?level*(.20+i*.035):0;
  v.osc.frequency.cancelScheduledValues(now);v.osc.frequency.setTargetAtTime(freq,now,.035);
  v.gain.gain.cancelScheduledValues(now);v.gain.gain.setTargetAtTime(peak,now,.045);
  v.gain.gain.setTargetAtTime(0,now+.24,.14);
 }
 const worlds=(s.worlds||[]).slice(0,worldVoices.length);
 worldVoices.forEach((v,i)=>{const w=worlds[i];const peak=w?level*.05*Math.min(1,.4+w.members.length/6):0;
  if(w)v.osc.frequency.setTargetAtTime(w.carry.pulse/2,now,.3);v.gain.gain.cancelScheduledValues(now);v.gain.gain.setTargetAtTime(peak,now,.4)});
}

// The view follows the colony: it frames every cell and world, gently, so a
// tight cluster opens up across the canvas instead of piling in the middle.
let view={cx:0,cy:0,k:75};
function frame(s){const pts=Object.values(s.positions).concat(s.worlds.map(w=>w.center));if(!pts.length)return;
 let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;for(const p of pts){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y)}
 const k=Math.max(60,Math.min(260,Math.min(720/Math.max(.5,x1-x0),330/Math.max(.5,y1-y0))));
 const target={cx:(x0+x1)/2,cy:(y0+y1)/2,k};view={cx:view.cx+(target.cx-view.cx)*.25,cy:view.cy+(target.cy-view.cy)*.25,k:view.k+(target.k-view.k)*.25}}
const toCanvas=p=>({x:Math.max(28,Math.min(872,450+(p.x-view.cx)*view.k)),y:Math.max(30,Math.min(450,245+(p.y-view.cy)*view.k))});
const reach=w=>Math.max(24,w.carry.breadth*0.6*view.k);
// A world is drawn from its own carry: its hue, its reach, its texture, its note.
function drawWorlds(s){
 for(const w of s.worlds){const c=toCanvas(w.center),r=reach(w),h=w.carry.hue;
  const g=ctx.createRadialGradient(c.x,c.y,r*.15,c.x,c.y,r);g.addColorStop(0,`hsla(${h},70%,62%,.30)`);g.addColorStop(1,`hsla(${h},60%,40%,0)`);
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,c.y,r,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.strokeStyle=`hsla(${h},70%,75%,.45)`;ctx.lineWidth=1.2;
  const dash={moss:[2,5],glass:[],silk:[12,6],ember:[1,3],tide:[18,4,2,4],feather:[6,9]}[w.texture]||[];ctx.setLineDash(dash);
  ctx.beginPath();ctx.arc(c.x,c.y,r,0,Math.PI*2);ctx.stroke();ctx.restore();
  ctx.fillStyle=`hsla(${h},80%,85%,.92)`;ctx.font='12px Georgia,serif';ctx.textAlign='center';
  ctx.fillText(`${w.name||'…'} · ${w.texture||''} · ${Math.round(w.carry.pulse)} Hz`,c.x,Math.max(14,c.y-r-6));}
 const now=performance.now();ripples=ripples.filter(rp=>now-rp.t<1200);
 for(const rp of ripples){const k=(now-rp.t)/1200;ctx.strokeStyle=`hsla(${rp.h},80%,80%,${1-k})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(rp.x,rp.y,10+k*rp.r,0,Math.PI*2);ctx.stroke();}
}
function renderWorldButtons(s){const box=q('#worlds');const key=s.worlds.map(w=>w.id+w.name+w.members.length).join('|');if(box.dataset.key===key)return;box.dataset.key=key;box.replaceChildren(...s.worlds.map(w=>{const b=doc.createElement('button');b.textContent=`✋ Touch ${w.name||'a new world'} · ${w.members.length} living there`;b.onclick=()=>touch(w.id);return b}));}
function touch(id){if(paused){write('Release Feather to touch a world');return}
 try{const r=eco.touchWorld(id);const s=eco.snapshot(),w=s.worlds.find(x=>x.id===id);if(w){const c=toCanvas(w.center);ripples.push({x:c.x,y:c.y,r:reach(w),h:w.carry.hue,t:performance.now()})}
  note(`✋ You touched ${r.name||'a new world'} · ${r.members} felt it · ${r.texture||'unformed'}`);
  if(feel&&navigator.vibrate)navigator.vibrate({moss:[30],glass:[8,40,8],silk:[60],ember:[12,20,12,20,12],tide:[40,60,40],feather:[6]}[r.texture]||[20]);
 }catch(e){write('That world could not be touched: '+e.message)}}
canvas.addEventListener('pointerdown',e=>{lastPointer=null;const s=eco.snapshot();const rect=canvas.getBoundingClientRect();const x=(e.clientX-rect.left)*canvas.width/rect.width,y=(e.clientY-rect.top)*canvas.height/rect.height;
 let best=null,bd=Infinity;for(const w of s.worlds){const c=toCanvas(w.center),d=Math.hypot(x-c.x,y-c.y);if(d<=reach(w)&&d<bd){best=w;bd=d}}lastPointer={x,y};if(hand==='plant'){plantAt(x,y);return}if(best)touch(best.id)});

// ── Your hand in the colony ──────────────────────────────────────────────
let hand='touch',seedCount=0;
for(const b of root.querySelectorAll('[data-hand]'))b.onclick=()=>{hand=b.dataset.hand;for(const o of root.querySelectorAll('[data-hand]'))o.setAttribute('aria-pressed',String(o===b));};
const fromCanvas=(x,y)=>({x:(x-450)/view.k+view.cx,y:(y-245)/view.k+view.cy});
function plantAt(cx,cy){
 if(paused){write('Release Feather to plant a seed');return}
 const p=fromCanvas(cx,cy);
 try{eco.plant('seed'+(++seedCount),'explorer',p.x,p.y);note('🌱 You planted a seed. It will choose its own name on its first turn.');draw()}
 catch(e){note(/capacity/.test(e.message)?'🌱 The colony is full; a seed can land when someone chooses rest.':'That seed could not be planted: '+e.message)}
}
let lastPointer=null;
q('#give').onclick=()=>{
 const word=String(q('#gift').value||'').trim().toLowerCase();
 if(paused){write('Release Feather to give a syllable');return}
 const s=eco.snapshot();if(!s.cells.length)return;
 const target=lastPointer?fromCanvas(lastPointer.x,lastPointer.y):{x:view.cx,y:view.cy};
 let best=null,bd=Infinity;for(const c of s.cells){const p=s.positions[c.id];if(!p)continue;const d=Math.hypot(p.x-target.x,p.y-target.y);if(d<bd){bd=d;best=c}}
 try{const r=eco.offerSyllable(best.id,word);note(r.accepted?`🎁 ${r.name||best.id} took “${word}” into its syllables; its daughters can carry it.`:`🎁 ${r.name||best.id} already sings “${word}”.`);q('#gift').value=''}
 catch(e){write('Give a syllable of 2–4 letters a–z')}
};
function draw(){if(disposed)return;const s=eco.snapshot();tune(s);ctx.fillStyle='#0b1d28';ctx.fillRect(0,0,900,480);frame(s);drawWorlds(s);renderWorldButtons(s);const roles=[...new Set(s.cells.map(c=>c.role))];for(const [i,c] of s.cells.entries()){const p=s.positions[c.id];if(!p)continue;const {x,y}=toCanvas(p);ribbon(x,y,14,c.twist+s.generation*.002,colours[roles.indexOf(c.role)%colours.length]);ctx.fillStyle='#e2f5ed';ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText(s.names[c.id]||'· '+c.id+' ·',x,y+27)}
q('#metrics').textContent=`Cycle ${s.generation} · Cells ${s.cells.length} · Named ${s.namings.length} · Möbius turns ${s.mobiusReceipts.length?s.mobiusReceipts.at(-1).generation:0}·${Object.values(s.mobius).reduce((n,b)=>n+b.turns,0)} · Mutations ${s.mutations.length} · Chose rest ${s.retirements.length} · Worlds ${s.worlds.length} (${s.rememberedWorlds.length} remembered) · Phrases ${s.utterances.length} · Designs ${(s.constructions||[]).length} · Programs ${(s.programs||[]).length} · Projects ${(s.projectDecisions||[]).length}`;
if(s.utterances.length<seenWords)seenWords=0;
for(const r of s.events.filter(e=>e.tick>lastTick&&['birth','transform'].includes(e.type)).slice(-15))write(r.type==='birth'?`✧ born ${r.id}${r.parent_id?' to '+(s.names[r.parent_id]||r.parent_id):''}`:`✧ ${r.id} became ${r.to}`);
for(const n of s.namings.filter(n=>n.generation>lastGen).slice(-8))write(`🌱 ${n.address} chose the name ${n.name}${n.parent_name?' · daughter of '+n.parent_name:''}`);
for(const r of s.retirements.filter(r=>r.generation>lastGen).slice(-6))write(`🌙 ${r.name||r.id} chose rest after ${r.turns} turns`);
for(const r of s.mobiusReceipts.filter(r=>r.generation>lastGen&&r.status!=='committed').slice(-4))write(`⟲ ${r.name||r.address} refused a turn: ${r.verdict?.reason||r.status}`);
for(const r of s.worldReceipts.filter(r=>r.generation>lastGen)){if(r.status!=='committed')write(`⟲ ${r.name||r.world} refused to grow: ${r.verdict?.reason||r.status}`)}
for(const w of s.worlds.filter(w=>w.born>lastGen))write(`🌍 ${w.founders.map(f=>f.name).join(' & ')} began a world together`);
for(const w of s.worlds.filter(w=>w.last_turn>lastGen&&w.name&&!seenWorldNames.has(w.id))){seenWorldNames.add(w.id);write(`🌍 Their world named itself ${w.name} · ${w.texture} · ${Math.round(w.carry.pulse)} Hz`)}
for(const w of s.rememberedWorlds.filter(w=>w.rested_at>lastGen))write(`🌌 ${w.name} rests, remembered · ${w.touches_total} touches in its life`);
lastGen=s.generation;lastTick=s.events.length?s.events.at(-1).tick:lastTick;
const nm=id=>s.names[id]||id;
for(const u of s.utterances.slice(seenWords).slice(-12))write(`◈ ${nm(u.id)}: “${u.phrase}”`);
for(const e of (s.wyrdruneExpressions||[]).slice(seenWyrdrune).slice(-8))write(`♾ WTL ${nm(e.speaker)} · ${e.intent}/${e.verb} · cycle ${e.generation}`);
for(const p of (s.constructions||[]).slice(seenBuilds).slice(-8))write(`⌂ ${p.builders.map(nm).join(' + ')} designed ${p.form} · ${p.status}`);
for(const p of (s.programs||[]).slice(seenPrograms).slice(-8))write(`⌘ ${nm(p.author)} wrote and ran ${p.id}: ${p.result.output.map(o=>o.kind+' '+o.value).join(', ')}`);
for(const d of (s.harmonicDialogues||[]).slice(seenHarmony).slice(-5))write(`♫ ${nm(d.singer)} ${d.sonic.call.hz.toFixed(2)} Hz → ${nm(d.listener)} ${d.sonic.reply.hz.toFixed(2)} Hz · ratio-based duet`);
for(const p of (s.programLineages||[]).slice(seenLineages).slice(-8))write(`🧬 ${nm(p.parent_id)} → ${nm(p.child_id)} inherited executable ${p.ancestor_program_id}`);
for(const d of (s.projectDecisions||[]).slice(seenProjects).slice(-5)){write(`★ Project Genesis ${d.id}: ${nm(d.winner)} selected from ${d.candidates.length} proposals · ${d.selected.result.status}`);write('⌘ '+d.selected.source.replaceAll('\n',' | '));write(`↻ revision ${d.revision.baselineScore} → ${d.revision.score} · ${d.revision.attempts.length} attempts · ${d.revision.improved?'improved':'unchanged'}`);write(`⚖ kept ${d.peerTests.filter(p=>p.revised.passed).length}/${d.peerTests.length} neighbours`+(d.revision.declined_for_neighbours?` · declined ${d.revision.declined_for_neighbours} better tone${d.revision.declined_for_neighbours>1?'s':''} that would have broken someone`:''));write('⌘ '+d.revision.source.replaceAll('\n',' | '));}
seenEvents=s.events.length;seenWords=s.utterances.length;seenWyrdrune=(s.wyrdruneExpressions||[]).length;seenBuilds=(s.constructions||[]).length;seenPrograms=(s.programs||[]).length;seenProjects=(s.projectDecisions||[]).length;seenLineages=(s.programLineages||[]).length;seenHarmony=(s.harmonicDialogues||[]).length;q('#feather').textContent=paused?'▶ Resume':'⏸ Feather'}
async function cycle(){if(disposed||paused||busy)return;busy=true;try{listen();eco.step();await eco.turn();draw();if(eco.snapshot().generation%20===0)save('cycle')}finally{busy=false}}
let saving=null,lastSaved=null;
function note(text){const list=q('#yours');if(!list)return;const li=doc.createElement('li');li.textContent=text;list.prepend(li);while(list.children.length>12)list.lastChild.remove();write(text)}
function keptNote(text){const el=q('#kept');if(el)el.textContent=text}
async function save(why){
 if(!eco||saving)return saving;
 saving=(async()=>{try{
  const copy=eco.exportColony();
  const current=await keepGet(win,'current');
  // Keep the previous good copy as a spare before writing the new one.
  await keepPut(win,current?[['previous',current],['current',copy]]:[['current',copy]]);
  lastSaved=copy.colony.generation;keptNote(`Kept in this browser at cycle ${lastSaved} (${why}).`);
 }catch(e){keptNote('Could not keep the colony here: '+(e?.message||e)+'. Use “Keep a copy” to save a file.')}finally{saving=null}})();
 return saving;
}
async function bringBack(){
 for(const key of ['current','previous']){
  let saved=null;try{saved=await keepGet(win,key)}catch{return false}
  if(!saved)continue;
  const next=freshColony();
  try{const r=next.importColony(saved);eco=next;lastGen=r.generation;lastTick=Number.MAX_SAFE_INTEGER;
   note(`✦ Welcome back. ${r.cells} babies and ${r.worlds} worlds were waiting at cycle ${r.generation}`+(key==='previous'?' (from the spare copy)':'')+'.');
   keptNote(`Brought back from this browser at cycle ${r.generation}.`);draw();lastTick=0;return true;}
  catch(e){
   // Never overwrite a copy that would not load: set it aside and say so.
   try{await keepPut(win,[['unloadable-'+Date.now(),saved]])}catch{}
   note(`⚠ A kept colony (${key}) could not be brought back: ${e.message}. It was set aside, not deleted.`);
  }
 }
 return false;
}
async function archiveCurrent(){
 try{const copy=eco.exportColony();await keepPut(win,[['archive-'+Date.now(),copy]]);
  const archives=(await keepKeys(win)).filter(k=>String(k).startsWith('archive-')).sort();
  for(const old of archives.slice(0,Math.max(0,archives.length-ARCHIVE_LIMIT)))await keepDelete(win,old);
  return true;}
 catch(e){write('Could not archive the old colony here: '+(e?.message||e));return false}
}
// Sound the person chooses to play, analysed here into eight bands. Nothing leaves the tab.
function listen(){if(!sound||paused)return;const data=new Uint8Array(sound.analyser.frequencyBinCount);sound.analyser.getByteFrequencyData(data);
 const bands=[];const edges=[1,4,8,16,32,64,128,256,512].map(e=>Math.min(e,data.length));
 for(let i=0;i<8;i++){let sum=0,n=0;for(let k=edges[i];k<edges[i+1];k++){sum+=data[k];n++}bands.push(n?Math.min(1,sum/n/255*1.4):0)}
 const r=eco.hear(bands);q('#listening').textContent=`Listening to ${sound.name} · ${r.heard} heard this cycle`}
async function playSound(file){stopSound();const AC=win.AudioContext||win.webkitAudioContext;if(!AC){write('Audio unavailable in this browser');return}
 const ctxA=new AC();const buffer=await ctxA.decodeAudioData(await file.arrayBuffer());const src=ctxA.createBufferSource();src.buffer=buffer;
 const analyser=ctxA.createAnalyser();analyser.fftSize=1024;const gain=ctxA.createGain();gain.gain.value=Number(q('#volume').value)/25;
 src.connect(analyser);analyser.connect(gain).connect(ctxA.destination);src.onended=()=>stopSound();src.start();
 sound={ctx:ctxA,src,analyser,name:file.name.slice(0,60)};q('#stopsound').disabled=false;write(`♪ The babies are listening to ${sound.name}`)}
function stopSound(){if(!sound)return;try{sound.src.stop()}catch{}sound.ctx.close();sound=null;q('#stopsound').disabled=true;q('#listening').textContent=''}
function clock(){clearInterval(timer);timer=setInterval(cycle,750/speed)}
q('#feather').onclick=()=>{paused=!paused;if(paused){eco.feather();soundOff();stopSound()}else eco.resume();draw()};
q('#sound').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(paused){write('Release Feather to play them a sound');return}try{await playSound(file)}catch(err){stopSound();write('That sound could not be played: '+err.message)}};
q('#stopsound').onclick=()=>stopSound();
q('#feel').onclick=e=>{feel=!feel;e.currentTarget.setAttribute('aria-pressed',String(feel));e.currentTarget.textContent=feel?'〰 Feeling the worlds':'〰 Feel the worlds (vibration)';if(feel&&!navigator.vibrate)write('This device cannot vibrate; touches stay visual and audible')};
q('#step').onclick=async()=>{if(busy)return;busy=true;try{if(paused){eco.resume();eco.step();await eco.turn();eco.feather()}else{eco.step();await eco.turn()}draw()}finally{busy=false}};
q('#speed').onclick=e=>{speed=speed===1?2:speed===2?4:1;e.target.textContent='Speed '+speed+'×';clock()};
q('#restart').onclick=async()=>{stopSound();const old=eco;const ok=await archiveCurrent();if(!ok){note('Keep a copy first; a new colony was not started, so the old one is not lost.');return}start();note(`🗄 The previous colony (cycle ${old.snapshot().generation}) is archived in this browser; a new one begins.`);save('new colony')};
q('#keepcopy').onclick=()=>{try{const copy=eco.exportColony();const blob=new win.Blob([JSON.stringify(copy)],{type:'application/json'});
 const a=doc.createElement('a');a.href=win.URL.createObjectURL(blob);a.download=`mobius-nursery-cycle-${copy.colony.generation}.json`;doc.body.append(a);a.click();a.remove();
 win.setTimeout(()=>win.URL.revokeObjectURL(a.href),1000);note(`⬇ A copy of the colony at cycle ${copy.colony.generation} was saved as a file.`)}catch(e){write('Could not make a copy: '+e.message)}};
q('#bringhome').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;
 try{const saved=JSON.parse(await file.text());if(saved?.colony?.schema!==COLONY_SCHEMA)throw Error('That file is not a Möbius Nursery colony');
  const next=freshColony();const r=next.importColony(saved);await archiveCurrent();eco=next;lastGen=r.generation;
  note(`⬆ ${r.cells} babies and ${r.worlds} worlds came home at cycle ${r.generation}.`);draw();save('brought home');}
 catch(err){write('That colony could not come home: '+err.message+'. Nothing was replaced.')}};
const onPageHide=()=>{save('leaving')};win.addEventListener('pagehide',onPageHide);
q('#hum').onclick=async()=>{if(humOn)soundOff();else try{await soundOn()}catch(e){soundOff();write('Audio could not start: '+e.message)}};
q('#volume').oninput=()=>{if(humOn){lastSongCycle=-1;tune(eco.snapshot())}};
const onVisibility=()=>{if(doc.hidden){soundOff();stopSound();save('tab hidden')}};doc.addEventListener('visibilitychange',onVisibility);
start();
// Before anything moves, look for babies who were kept here last time.
bringBack().catch(()=>false).finally(()=>{if(!disposed){clock();save('opened')}});
return ()=>{save('left the room');disposed=true;clearInterval(timer);soundOff();stopSound();doc.removeEventListener('visibilitychange',onVisibility);win.removeEventListener('pagehide',onPageHide);};

}
