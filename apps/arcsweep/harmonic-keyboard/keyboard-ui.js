import {StorySoundscape} from '../src/story-soundscape.js';
import {KEY_LAYOUT,KEYBOARD_MODES,keyboardWorld,keyboardNote,keyboardMidiNote,keyboardEvent}
from './keyboard-model.js';
import {ShipSensorySpine} from '../ship-ui/ship-sensory-spine.js';

// Instrument controller only. Audio and mixing belong to ArcSweep StorySoundscape.
const soundscape=new StorySoundscape();
const sensory=new ShipSensorySpine();
const ui=id=>document.getElementById(id);
const KEYS=new Map();
const held=new Map();
const trace=[];
const KEY_LIMIT=8;
let armed=false;
let midiAccess=null;
let selection={worldId:'terra-aeterna',mode:'chromatic',rootHz:220};
let saveSettings=()=>{};
function status(message){ui('status').textContent=message;}
function describe(){
 const info=selection.mode==='chromatic'
  ? 'One chromatic octave in world-root tuning. C begins at the selected world root.'
  : selection.mode==='glyph'
   ? 'Each physical key follows the existing ArcSweep writing-to-tone mapping, preserving the current world root.'
   : 'Existing experimental Kelyran Galdr frequency names. Canonical glyph strokes remain untouched.';
 ui('mode-description').textContent=info;
}
function worldObject(){
 const world=keyboardWorld(selection.worldId,selection.rootHz);
 return {id:world.worldId,name:world.name,soundscape:{rootHz:world.rootHz,waveform:'triangle',overtones:2}};
}
function syncWorld(){
 const world=keyboardWorld(selection.worldId,selection.rootHz);
 selection.rootHz=world.rootHz;
 soundscape.setWorld(worldObject());
 ui('root-hz').value=String(world.rootHz);
 ui('root-readout').textContent=world.rootHz.toFixed(2)+' Hz';
 ui('world-name').textContent=world.name;
 describe();drawKeyboard();
 saveSettings();
}
function drawKeyboard(){
 const surface=ui('keys');surface.replaceChildren();KEYS.clear();
 for(const entry of KEY_LAYOUT){
  const note=keyboardNote(entry.key,{mode:selection.mode,rootHz:selection.rootHz});
  const key=document.createElement('button');
  key.type='button';key.className='key '+(entry.black?'black':'white');
  key.dataset.key=entry.key;key.setAttribute('aria-pressed','false');
  key.disabled=!note;
  key.setAttribute('aria-label',note?entry.key.toUpperCase()+' '+note.label+', '+note.frequency_hz.toFixed(1)+' hertz':'Not mapped in this mode');
  const letter=document.createElement('span');letter.className='key-name';letter.textContent=entry.key.toUpperCase();
  const label=document.createElement('span');label.className='key-label';label.textContent=note?.label||'';
  const hz=document.createElement('span');hz.className='key-freq';hz.textContent=note?note.frequency_hz.toFixed(0)+' Hz':'';
  key.append(letter,label,hz);surface.append(key);KEYS.set(entry.key,key);
  key.addEventListener('pointerdown',e=>{
   if(!armed || !note){status('Arm audio before playing.');return;}
   e.preventDefault();
   try{key.setPointerCapture(e.pointerId);}catch{}
   startVoice('pointer:'+e.pointerId,note,'onscreen',95);
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture']){
   key.addEventListener(type,e=>releaseVoice('pointer:'+e.pointerId));
  }
 }
}
function reflectHeld(){
 for(const [key,node] of KEYS){
  const sounding=[...held.values()].some(voice=>voice.note.key===key);
  node.setAttribute('aria-pressed',String(sounding));
 }
}
function pushEvent(note,action,via,velocity=0){
 const event=keyboardEvent(note,{action,via,worldId:selection.worldId,at:new Date().toISOString(),velocity});
 trace.push(event);
 if(trace.length>256)trace.splice(0,trace.length-256);
 if(action==='note-on')ui('last-note').textContent=note.label+' · '+note.frequency_hz.toFixed(2)+' Hz · '+via+' · local observation only';
 if(armed)sensory.publish({kind:action,worldId:selection.worldId,mode:note.mode,frequencyHz:note.frequency_hz,velocity});
}
function startVoice(source,note,via,velocity=95){
 if(!armed||!note||held.has(source))return;
 if(held.size>=KEY_LIMIT){status('Polyphony limit reached (8 notes). Release a note to play another.');return;}
 const ctx=soundscape.context,bus=soundscape.buses?.tones;
 if(!ctx||ctx.state!=='running'||!bus){status('Audio engine is not active. Arm again.');return;}
 try{
  const now=ctx.currentTime;
  const oscillator=ctx.createOscillator(),gain=ctx.createGain();
  oscillator.type='triangle';oscillator.frequency.setValueAtTime(note.frequency_hz,now);
  gain.gain.setValueAtTime(.00001,now);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0001,.055*velocity/127),now+.018);
  oscillator.connect(gain);gain.connect(bus);
  oscillator.start(now);
  oscillator.stop(now+12); // bounded note lifetime, including missed keyup
  const v={note,oscillator,gain,via,velocity};
  held.set(source,v);
  oscillator.onended=()=>{
   if(held.get(source)===v){held.delete(source);reflectHeld();}
   try{oscillator.disconnect();gain.disconnect();}catch{}
  };
  pushEvent(note,'note-on',via,velocity);
  if(ui('haptics').checked&&via!=='midi-input'){
   try{navigator.vibrate?.(8);}catch{}
  }
  reflectHeld();
 }catch(error){status('Could not sound note: '+String(error?.message||error).slice(0,150));}
}
function releaseVoice(source,reason=null){
 const v=held.get(source);if(!v)return;
 held.delete(source);
 const ctx=soundscape.context;
 try{
  const now=ctx.currentTime;
  v.gain.gain.cancelScheduledValues(now);
  v.gain.gain.setValueAtTime(Math.max(.0001,v.gain.gain.value),now);
  v.gain.gain.exponentialRampToValueAtTime(.00001,now+.12);
  v.oscillator.stop(now+.14);
 }catch{}
 pushEvent(v.note,'note-off',reason||v.via,0);
 reflectHeld();
}
function releaseAll(reason='feather'){
 for(const source of [...held.keys()])releaseVoice(source,reason);
}
function hardStop(){
 releaseAll('feather');
 try{soundscape.featherStop();}catch{}
 sensory.publish({kind:'feather',worldId:selection.worldId,velocity:0});
 armed=false;
 ui('arm').textContent='Arm audio';
 ui('engine-state').textContent='Feather · silent';
 try{navigator.vibrate?.(0);}catch{}
 status('Feather Stop: keyboard voices released and shared StorySoundscape output suspended. Re-arm explicitly.');
}
ui('arm').addEventListener('click',async()=>{
 try{
  await soundscape.arm(worldObject());
  soundscape.setBus('master',Number(ui('volume').value));
  soundscape.setBus('tones',.45);
  armed=true;ui('arm').textContent='Re-arm audio';
  ui('engine-state').textContent='Armed';
  status('World Sound Mixer armed. Use touch, QWERTY, or optional MIDI input. Feather Stop remains available.');
 }catch(error){armed=false;status('Audio cannot be armed: '+String(error?.message||error).slice(0,160));}
});
ui('feather').addEventListener('click',hardStop);
ui('world').addEventListener('change',()=>{
 releaseAll();selection.worldId=ui('world').value;
 if(selection.worldId==='custom')selection.rootHz=Number(ui('root-hz').value)||220;
 syncWorld();
});
ui('root-hz').addEventListener('change',()=>{
 const number=Number(ui('root-hz').value);
 if(!Number.isFinite(number)||number<20||number>2000){
  status('Root frequency must be 20 to 2000 Hz.');ui('root-hz').value=String(selection.rootHz);return;
 }
 releaseAll();selection.worldId='custom';selection.rootHz=number;ui('world').value='custom';syncWorld();
});
ui('mode').addEventListener('change',()=>{
 releaseAll();selection.mode=ui('mode').value;describe();drawKeyboard();saveSettings();
});
ui('volume').addEventListener('input',()=>{
 const volume=Number(ui('volume').value);
 ui('volume-value').textContent=Math.round(volume*100)+'%';
 soundscape.setBus('master',volume);
 saveSettings();
});
ui('haptics').addEventListener('change',saveSettings);
document.addEventListener('keydown',e=>{
 if(e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
 if(e.target?.closest?.('input,textarea,select,[contenteditable=true]'))return;
 const symbol=e.key.toLowerCase();
 const note=keyboardNote(symbol,{mode:selection.mode,rootHz:selection.rootHz});
 if(!note)return;
 e.preventDefault();startVoice('key:'+symbol,note,'qwerty',98);
});
document.addEventListener('keyup',e=>{
 const symbol=e.key.toLowerCase();
 if(held.has('key:'+symbol)){e.preventDefault();releaseVoice('key:'+symbol);}
});
globalThis.addEventListener('blur',()=>releaseAll());
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();});
globalThis.addEventListener('pagehide',()=>{hardStop();sensory.close();},{once:true});
function connectMidiInput(input){
 input.onmidimessage=e=>{
  const bytes=e.data||[];
  const command=(bytes[0]||0)&0xf0;
  const number=bytes[1];
  const velocity=bytes[2]||0;
  if(command===0x90&&velocity>0){
   let note;try{note=keyboardMidiNote(number,{mode:selection.mode,rootHz:selection.rootHz});}catch{return;}
   startVoice('midi:'+input.id+':'+number,note,'midi-input',velocity);
  }else if(command===0x80||(command===0x90&&velocity===0)){
   releaseVoice('midi:'+input.id+':'+number);
  }
 };
}
ui('midi').addEventListener('click',async()=>{
 if(!navigator.requestMIDIAccess){status('Web MIDI input is unavailable in this browser. Touch and QWERTY still work.');return;}
 try{
  await soundscape.enableMidi(); // reuse StorySoundscape's Web MIDI host permission
  midiAccess=soundscape.midiAccess;
  for(const input of midiAccess.inputs.values())connectMidiInput(input);
  midiAccess.onstatechange=()=>{
   releaseAll();
   for(const input of midiAccess.inputs.values())connectMidiInput(input);
   status(midiAccess.inputs.size+' MIDI input(s) connected. MIDI output is not sent automatically.');
  };
  ui('midi').textContent='MIDI input connected';
  status(midiAccess.inputs.size+' MIDI input(s) available. MIDI output stays off; no loopback. Arm audio to hear input.');
 }catch(error){status('MIDI connection unavailable: '+String(error?.message||error).slice(0,160));}
});
ui('export').addEventListener('click',()=>{
 const payload={schema:'wayglass.harmonic-keyboard-trace/v0.1',status:'local_unverified_performance',
  world:selection.worldId,root_hz:selection.rootHz,mode:selection.mode,events:[...trace],
  not_claimed:['navigation authorisation','crossing evidence','canonical receipt','participant identity']};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='wayglass-harmonic-performance.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 status('Exported '+trace.length+' local note events, none presented as ship commands or canonical receipts.');
});
ui('clear').addEventListener('click',()=>{
 trace.length=0;ui('last-note').textContent='No notes yet.';status('Local note trace cleared. Audio routing unchanged.');
});
saveSettings=()=>{
 try{localStorage.setItem('wayglass.harmonic-keyboard.preferences/v0.1',JSON.stringify({
  worldId:selection.worldId,mode:selection.mode,rootHz:selection.rootHz,
  volume:Number(ui('volume').value),haptics:ui('haptics').checked
 }));}catch{}
};
try{
 const p=JSON.parse(localStorage.getItem('wayglass.harmonic-keyboard.preferences/v0.1')||'null');
 if(p){
  if([...Object.keys({ 'terra-aeterna':1,luna:1,starsong:1,'hearthweave-foundation':1,kelyran:1,custom:1 })].includes(p.worldId)) selection.worldId=p.worldId;
  if(KEYBOARD_MODES.includes(p.mode))selection.mode=p.mode;
  if(Number.isFinite(p.rootHz)&&p.rootHz>=20&&p.rootHz<=2000&&selection.worldId==='custom')selection.rootHz=p.rootHz;
  if(Number.isFinite(p.volume)&&p.volume>=0&&p.volume<=.35){ui('volume').value=String(p.volume);ui('volume-value').textContent=Math.round(p.volume*100)+'%';}
  ui('haptics').checked=p.haptics===true;
 }
}catch{}
ui('world').value=selection.worldId;ui('mode').value=selection.mode;
ui('sensory-link-state').textContent=sensory.available?'Available · other open ship pages':'Unavailable · local notes still work';
syncWorld();
