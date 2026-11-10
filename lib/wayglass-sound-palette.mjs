// Original synthesis recipes and explicitly chosen musical vocabulary.
// Wyrdrune retains score/root/gain ownership; this module instruments those notes.
const freeze=value=>Object.freeze(value);
export const SOUND_PALETTE_SOURCE='lib/wayglass-sound-palette.mjs';
export const SOUND_VOICES=freeze([
 ...['sine','triangle','sawtooth','square'].flatMap(wave=>['pad','pluck','pulse'].map(shape=>freeze({id:wave+'-'+shape,name:wave[0].toUpperCase()+wave.slice(1)+' '+shape,kind:'tone',wave,shape}))),
 ...[['bell',[1,.15,.42,.05,.2]],['organ',[1,.5,.33,.25,.2,.16]],['glass',[1,0,.35,0,.12,0,.08]],['reed',[1,.7,.4,.3,.1]],['strings',[1,.5,.33,.25,.2,.16,.14,.12]],['brass',[1,.9,.6,.3,.12]]].map(([id,partials])=>freeze({id,name:id[0].toUpperCase()+id.slice(1),kind:'tone',wave:'triangle',shape:'pad',partials:freeze(partials)})),
 ...[['rain','lowpass',1900,'pad'],['wind','lowpass',650,'pad'],['surf','lowpass',380,'pad'],['shaker','highpass',4300,'pluck'],['snare','bandpass',1500,'pluck'],['hi-hat','highpass',6500,'pluck']].map(([id,filter,cutoff,shape])=>freeze({id,name:id[0].toUpperCase()+id.slice(1),kind:'noise',filter,cutoff,shape})),
 freeze({id:'kick',name:'Kick drum',kind:'tone',wave:'sine',shape:'pluck',fixed_hz:58}),
 freeze({id:'tom',name:'Tom drum',kind:'tone',wave:'triangle',shape:'pluck',fixed_hz:125}),
 freeze({id:'rim',name:'Rim percussion',kind:'tone',wave:'square',shape:'pluck',fixed_hz:850}),
]);
export const SOUND_CHORDS=freeze(Object.fromEntries(Object.entries({
 single:[0],octaves:[0,12],fifth:[0,7],major:[0,4,7],minor:[0,3,7],diminished:[0,3,6],augmented:[0,4,8],sus2:[0,2,7],sus4:[0,5,7],major6:[0,4,7,9],minor6:[0,3,7,9],dominant7:[0,4,7,10],major7:[0,4,7,11],minor7:[0,3,7,10],add9:[0,4,7,14],minor9:[0,3,7,10,14],quartal:[0,5,10],cluster:[0,2,4],openMajor:[0,7,16],openMinor:[0,7,15],
}).map(([k,v])=>[k,freeze(v)])));
export const SOUND_RHYTHMS=freeze(Object.fromEntries(Object.entries({
 sustained:null,quarters:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],eighths:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],sixteenths:Array(16).fill(1),backbeat:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],offbeat:[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0],halfTime:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],clave:[1,0,0,1,0,0,1,0,0,0,1,0,1,0,0,0],tresillo:[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0],waltz:[1,0,0,0,.6,0,0,0,.6,0,0,0],five:[1,0,0,0,.7,0,0,0,.7,0,0,0,.7,0,0,0,.7,0,0,0],seven:[1,0,0,0,.6,0,0,0,.6,0,0,0,.6,0,0,0,.6,0,0,0,.6,0,0,0,.6,0,0,0],
}).map(([k,v])=>[k,v?freeze(v):null])));
export const DEFAULT_SOUND_PALETTE=freeze({voice:'sine-pad',chord:'single',rhythm:'sustained',bpm:90});
export function validSoundPalette(value){return !!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.keys(value).length===4||Object.keys(value).length===5&&Object.hasOwn(value,'root_hz')&&Number.isFinite(value.root_hz)&&value.root_hz>=20&&value.root_hz<=4800)&&['voice','chord','rhythm','bpm'].every(k=>Object.hasOwn(value,k))&&(SOUND_VOICES.some(v=>v.id===value.voice)||/^sample:[a-f0-9]{64}$/.test(value.voice||''))&&Object.hasOwn(SOUND_CHORDS,value.chord)&&Object.hasOwn(SOUND_RHYTHMS,value.rhythm)&&Number.isFinite(value.bpm)&&value.bpm>=20&&value.bpm<=240;}
export function paletteFrequencies(root,palette){if(!validSoundPalette(palette)||!Number.isFinite(root)||root<20||root>4800)throw new TypeError('Valid palette and score root required');return SOUND_CHORDS[palette.chord].map(n=>(palette.root_hz??root)*2**(n/12)).filter(hz=>hz<=12000);}
export function paletteBeatEvents(palette,{start=0,duration=8,origin=0,maxEvents=1024}={}){
 if(!validSoundPalette(palette)||![start,duration,origin].every(Number.isFinite)||start<0||duration<=0||duration>40||!Number.isInteger(maxEvents)||maxEvents<1||maxEvents>1024)throw new TypeError('Bounded musical phrase required');
 const pattern=SOUND_RHYTHMS[palette.rhythm];if(!pattern)return [];
 const tick=60/palette.bpm/4,events=[];
 for(let step=Math.ceil((start-origin)/tick);origin+step*tick<start+duration&&events.length<maxEvents;step++){
  const velocity=pattern[((step%pattern.length)+pattern.length)%pattern.length];if(velocity)events.push({at:origin+step*tick,velocity,duration:tick*.82});
 }
 return events;
}
