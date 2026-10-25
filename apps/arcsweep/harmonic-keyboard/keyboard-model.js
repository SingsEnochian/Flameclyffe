/**
 * Shared Wayglass/ArcSweep Harmonic Keyboard model.
 * The keyboard is an input organ for ArcSweep's existing StorySoundscape output bus.
 * None of these pitches are proof of a physical inter-reality crossing, ship authority,
 * or the canonical Kelyran glyph/stroke system.
 */
import { keystrokeTone } from '../src/typing-sonification.js';

export const HARMONIC_KEYBOARD_SCHEMA = 'wayglass.harmonic-keyboard/v0.1';
export const KEYBOARD_MODES = Object.freeze(['chromatic','glyph','galdr']);
export const KEY_LAYOUT = Object.freeze([
  {key:'a', note:'C', semitones:0},{key:'w', note:'C♯', semitones:1,black:true},
  {key:'s', note:'D', semitones:2},{key:'e', note:'D♯', semitones:3,black:true},
  {key:'d', note:'E', semitones:4},{key:'f', note:'F', semitones:5},
  {key:'t', note:'F♯', semitones:6,black:true},{key:'g', note:'G', semitones:7},
  {key:'y', note:'G♯', semitones:8,black:true},{key:'h', note:'A', semitones:9},
  {key:'u', note:'A♯', semitones:10,black:true},{key:'j', note:'B', semitones:11},
  {key:'k', note:'C⁺', semitones:12},
].map(v=>Object.freeze(v)));
export const WORLD_ROOTS = Object.freeze({
  'terra-aeterna':Object.freeze({name:'Terra Aeterna',rootHz:220}),
  luna:Object.freeze({name:'Luna',rootHz:432}),
  starsong:Object.freeze({name:'Starsong / Equestria',rootHz:528}),
  'hearthweave-foundation':Object.freeze({name:'Hearthweave',rootHz:144}),
  kelyran:Object.freeze({name:'Kelyran study root',rootHz:369}),
});
export const GALDR_NOTES = Object.freeze([
  ['memory','Memory',369],['root','Root',415],['anchor','Anchor',440],
  ['warden','Whisper / Warden',554],['arc','Arc',659],['bridge','Bridge',739],
  ['wind','Wind Echo',880],['surge','Surge',987],['duet','The Duet',1179],
  ['spiral','Spiral',1318],
].map(([id,label,frequency])=>Object.freeze({id,label,frequency})));
const KEY_INDEX = new Map(KEY_LAYOUT.map((entry,index)=>[entry.key,index]));
const limitFrequency = value => Math.max(20,Math.min(8000,value));
export function keyboardWorld(worldId, customHz=220){
  if(worldId==='custom'){
    const hz=Number(customHz);
    if(!Number.isFinite(hz)||hz<20||hz>2000)throw new RangeError('Custom world root must be between 20 and 2000 Hz');
    return Object.freeze({worldId:'custom',name:'Custom world root',rootHz:hz});
  }
  const info=WORLD_ROOTS[worldId];
  if(!info)throw new TypeError('Unknown world tone profile');
  return Object.freeze({worldId,name:info.name,rootHz:info.rootHz});
}
export function keyboardNote(key,{mode='chromatic',rootHz=220}={}){
  if(!KEYBOARD_MODES.includes(mode))throw new TypeError('Unknown keyboard mode');
  const symbol=String(key||'').toLowerCase();
  const index=KEY_INDEX.get(symbol);
  if(index===undefined)return null;
  const base=Number(rootHz);
  if(!Number.isFinite(base)||base<20||base>2000)throw new RangeError('World root must be between 20 and 2000 Hz');
  const layout=KEY_LAYOUT[index];
  let frequency, label, source;
  if(mode==='chromatic'){
    frequency=base * 2 ** (layout.semitones/12);
    label=layout.note;source='world-chromatic-ratio';
  }else if(mode==='glyph'){
    const mapped=keystrokeTone(symbol,base);
    frequency=mapped.frequency_hz;label=symbol.toUpperCase();source='arcsweep.typing-sonification';
  }else{
    const galdr=GALDR_NOTES[index];
    if(!galdr)return null;
    frequency=galdr.frequency;label=galdr.label;source='kelyran.galdr-frequency-registry/v0.2';
  }
  return Object.freeze({
    schema:HARMONIC_KEYBOARD_SCHEMA,key:symbol,index,label,
    frequency_hz:limitFrequency(frequency),mode,source,root_hz:base,
    canon_effect:false,physical_crossing_claim:false,
  });
}
export function keyboardMidiNote(note,{mode='chromatic',rootHz=220}={}){
  if(!Number.isInteger(note)||note<0||note>127)throw new RangeError('MIDI note must be 0..127');
  if(!KEYBOARD_MODES.includes(mode))throw new TypeError('Unknown keyboard mode');
  if(mode==='chromatic'){
    const base=Number(rootHz);
    if(!Number.isFinite(base)||base<20||base>2000)throw new RangeError('World root must be between 20 and 2000 Hz');
    return Object.freeze({
      schema:HARMONIC_KEYBOARD_SCHEMA,key:null,index:note-60,label:'MIDI '+note,
      frequency_hz:limitFrequency(base * 2 ** ((note-60)/12)),mode,
      source:'midi-performance-mapped-to-world-root',root_hz:base,
      canon_effect:false,physical_crossing_claim:false,
    });
  }
  const key=KEY_LAYOUT[note-60]?.key;
  return key?keyboardNote(key,{mode,rootHz}):null;
}
export function keyboardEvent(note,{action,via,worldId,at,velocity=0}={}){
  if(!note||!['note-on','note-off'].includes(action))throw new TypeError('Note and note event required');
  if(!['onscreen','qwerty','midi-input','feather'].includes(via))throw new TypeError('Unknown input source');
  const speed=Number(velocity);
  return Object.freeze({
    schema:'wayglass.harmonic-keyboard-performance-event/v0.1',
    action,via,world_id:String(worldId||''),key:note.key,mode:note.mode,
    frequency_hz:note.frequency_hz,velocity:Number.isFinite(speed)?Math.max(0,Math.min(127,Math.round(speed))):0,
    timestamp:typeof at==='string'?at:null,verification:'local_input_only',
    canonical_receipt:false,ship_navigation:false,
  });
}
