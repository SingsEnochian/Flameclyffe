/**
 * SoundFont instrument adapter for Harmonic Observatory.
 * Reuses ArcSweep's StorySoundscape and its bundled SpessaSynth AudioWorklet.
 * Only one bank is mounted at a time: collisions between banks/program numbers
 * must not silently change an instrument's identity.
 */
import {MAX_BANKS,checkSoundfontFile,presetKey,buildSoundfontPerformance,createSoundfontTakeReceipt} from './soundfont-contract.js';

async function existingSoundscape(){
  const {StorySoundscape}=await import('../story-soundscape.js');
  await import('../soundfont-runtime-repair.js');
  return new StorySoundscape();
}
async function sha256File(file){
  if(!globalThis.crypto?.subtle?.digest)throw new Error('SHA-256 is required for SoundFont provenance.');
  const hash=await globalThis.crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
}
const nowIso=()=>new Date().toISOString();

export class HarmonicSoundfontRack {
  constructor({createSoundscape=existingSoundscape,hashFile=sha256File,setTimer=setTimeout,clearTimer=clearTimeout,now=nowIso}={}){
    this.createSoundscape=createSoundscape;
    this.hashFile=hashFile;
    this.setTimer=setTimer;
    this.clearTimer=clearTimer;
    this.now=now;
    this.files=[];
    this.bank=null;
    this.soundscape=null;
    this.presets=[];
    this.selectedKeys=[null,null,null];
    this.status='empty';
    this.activeTimer=null;
    this.generation=0;
    this.lastTake=null;
    this.loading=false;
  }
  addFiles(files){
    const incoming=Array.from(files||[]);
    const accepted=[];
    for(const file of incoming){
      const descriptor=checkSoundfontFile(file);
      if(this.files.some(existing=>existing.name===descriptor.name&&existing.size===descriptor.size&&existing.modified===descriptor.modified))continue;
      if(this.files.length>=MAX_BANKS)throw new RangeError(`At most ${MAX_BANKS} SoundFont banks may be selected.`);
      this.files.push({...descriptor,file});
      accepted.push(descriptor);
    }
    if(this.files.length && this.status==='empty')this.status='files-selected';
    return accepted;
  }
  snapshot(){
    return {
      schema:'wayglass.harmonic-observatory.soundfont-state/v1',status:this.status,
      files:this.files.map(({name,size,modified})=>({name,size,modified})),
      bank:this.bank?{...this.bank}:null,
      presets:this.presets.map(({name,isDrum,bankMSB,bankLSB,program})=>({name,isDrum,bankMSB,bankLSB,program,key:presetKey({name,isDrum,bankMSB,bankLSB,program})})),
      selected_keys:[...this.selectedKeys],has_take:Boolean(this.lastTake),
    };
  }
  async discardActive(){
    if(this.activeTimer!==null){this.clearTimer(this.activeTimer);this.activeTimer=null;}
    const previous=this.soundscape;
    this.soundscape=null;this.presets=[];this.selectedKeys=[null,null,null];this.bank=null;
    if(previous){
      try{previous.soundfontSynth?.stopAll(true);}catch{}
      try{previous.featherStop?.();}catch{}
      try{if(previous.context?.state!=='closed')await previous.context?.close?.();}catch{}
    }
  }
  async activateBank(index){
    if(this.loading)throw new Error('A SoundFont bank is already loading.');
    if(!Number.isInteger(index)||index<0||index>=this.files.length)throw new RangeError('Select a local bank first.');
    const entry=this.files[index];
    const ticket=++this.generation;
    this.loading=true;
    this.lastTake=null;
    this.status='loading-bank';
    await this.discardActive();
    let soundscape=null;
    try{
      // Called directly from Load Bank user gesture; WebAudio is not auto-armed.
      soundscape=await this.createSoundscape();
      if(ticket!==this.generation)throw new Error('SoundFont loading was cancelled.');
      await soundscape.arm({id:'terra-aeterna',name:'Terra Aeterna',soundscape:{rootHz:196}});
      soundscape.setBus('master',0.33);
      soundscape.setBus('tones',0.33);
      await soundscape.loadSoundfontFiles([entry.file]);
      const hash=await this.hashFile(entry.file);
      if(ticket!==this.generation)throw new Error('SoundFont loading was cancelled.');
      if(!/^[0-9a-f]{64}$/i.test(hash))throw new Error('Cannot verify local SoundFont hash.');
      const snapshot=soundscape.snapshot();
      const presets=(snapshot.soundfontPresets||[]).filter(p=>Number.isInteger(p.program)&&Number.isInteger(p.bankMSB)&&Number.isInteger(p.bankLSB));
      if(!presets.some(p=>!p.isDrum))throw new Error('This bank has no melodic SF2 presets for the three-voice desk.');
      this.soundscape=soundscape;
      this.bank={name:entry.name,size:entry.size,sha256:hash,preset_count:presets.length,loaded:true};
      this.presets=presets;
      const melodic=presets.filter(p=>!p.isDrum);
      this.selectedKeys=[0,1,2].map(i=>melodic[Math.min(i,melodic.length-1)]?presetKey(melodic[Math.min(i,melodic.length-1)]):null);
      this.status='ready';
      return this.snapshot();
    }catch(error){
      if(soundscape){try{soundscape.featherStop?.();}catch{} try{await soundscape.context?.close?.();}catch{}}
      this.status='error';
      this.bank=null;
      throw error;
    }finally{this.loading=false;}
  }
  choosePreset(stemIndex,key){
    if(this.status!=='ready')throw new Error('Load a SoundFont bank before selecting a preset.');
    if(!Number.isInteger(stemIndex)||stemIndex<0||stemIndex>2)throw new RangeError('Unknown voice stem.');
    if(!this.presets.some(p=>!p.isDrum&&presetKey(p)===key))throw new RangeError('Selected melodic preset is unavailable.');
    this.selectedKeys[stemIndex]=key;
    return key;
  }
  async audition(session){
    if(!this.soundscape || this.status!=='ready')throw new Error('A playable SF2 bank must be loaded first.');
    const selected=this.selectedKeys.map(key=>this.presets.find(p=>!p.isDrum&&presetKey(p)===key)||null);
    const performance=buildSoundfontPerformance(session,selected);
    if(this.activeTimer!==null){this.clearTimer(this.activeTimer);this.activeTimer=null;}
    const synth=this.soundscape.soundfontSynth;
    if(!synth)throw new Error('The existing SoundFont synthesizer is not ready.');
    // Exiting Feather resumes only after explicit user selection.
    if(this.soundscape.context.state==='suspended')await this.soundscape.context.resume();
    synth.stopAll(true);
    for(const voice of performance.voices){
      const ch=voice.channel;
      synth.midiChannels[ch]?.setDrums(false);
      synth.sendMessage([0xb0|ch,0,voice.bankMSB]);
      synth.sendMessage([0xb0|ch,32,voice.bankLSB]);
      synth.sendMessage([0xb0|ch,10,voice.pan]);
      synth.sendMessage([0xb0|ch,11,voice.expression]);
      synth.programChange(ch,voice.program);
      synth.noteOn(ch,voice.midi_note,voice.velocity);
    }
    this.status='auditioning';
    const ticket=++this.generation;
    this.lastTake=createSoundfontTakeReceipt({bank:this.bank,session,performance,createdAt:this.now()});
    this.activeTimer=this.setTimer(()=>{
      if(ticket!==this.generation)return;
      performance.voices.forEach(v=>synth.noteOff(v.channel,v.midi_note));
      this.activeTimer=null;
      this.status='ready';
    },Math.ceil(performance.duration_seconds*1000));
    return this.lastTake;
  }
  feather(){
    ++this.generation;
    if(this.activeTimer!==null){this.clearTimer(this.activeTimer);this.activeTimer=null;}
    try{this.soundscape?.soundfontSynth?.stopAll(true);}catch{}
    try{this.soundscape?.featherStop?.();}catch{}
    this.status=this.bank?'ready':(this.files.length?'files-selected':'empty');
    return this.status;
  }
  async close(){
    this.feather();
    await this.discardActive();
    this.files=[];this.lastTake=null;this.status='closed';
  }
}