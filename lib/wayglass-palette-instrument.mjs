import {SOUND_VOICES,validSoundPalette,paletteFrequencies,paletteBeatEvents} from './wayglass-sound-palette.mjs';
// Instruments sound a supplied score on its existing bus; no AudioContext or timer.
export function createPaletteInstrument({context,destination,palette,bank,origin:suppliedOrigin=null,onReady=()=>{},onEnded=()=>{}}){
 if(!validSoundPalette(palette))throw new TypeError('Known sound palette required');
 const recipe=SOUND_VOICES.find(v=>v.id===palette.voice),sources=[],nodes=[],envelopes=[];
 let disposed=false,ready=false,started=false,origin=Number.isFinite(suppliedOrigin)?suppliedOrigin:context.currentTime,sample=null,error=null;
 const own=node=>{nodes.push(node);return node;};
 const disconnect=node=>{try{node?.disconnect();}catch{}};
 function dispose(){if(disposed)return;disposed=true;for(const source of sources){source.onended=null;try{source.stop();}catch{}}for(const node of nodes)disconnect(node);}
 function allocate(buffer=null){
  try{
   const count=recipe?.kind==='noise'||recipe?.fixed_hz?1:paletteFrequencies(220,palette).length;
   for(let i=0;i<count;i++){
    const envelope=own(context.createGain());envelope.gain.value=0;envelope.connect(destination);let source;
    if(buffer){source=own(context.createBufferSource());source.buffer=buffer;source.loop=true;source.connect(envelope);}
    else if(recipe.kind==='noise'){
     source=own(context.createBufferSource());const length=Math.max(1,Math.floor(context.sampleRate));
     const noise=context.createBuffer(1,length,context.sampleRate),data=noise.getChannelData(0);let seed=369;
     for(let n=0;n<length;n++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[n]=((seed>>>0)/2147483648-1)*.6;}
     source.buffer=noise;source.loop=true;const filter=own(context.createBiquadFilter());filter.type=recipe.filter;filter.frequency.value=recipe.cutoff;filter.Q.value=.6;source.connect(filter);filter.connect(envelope);
    }else{
     source=own(context.createOscillator());source.type=recipe.wave;
     if(recipe.partials&&context.createPeriodicWave&&source.setPeriodicWave){const norm=Math.max(1,recipe.partials.reduce((sum,x)=>sum+Math.abs(x),0));const real=new Float32Array(recipe.partials.length+1),imag=new Float32Array([0,...recipe.partials.map(x=>x/norm)]);source.setPeriodicWave(context.createPeriodicWave(real,imag,{disableNormalization:true}));}
     source.connect(envelope);
    }
    sources.push(source);envelopes.push(envelope);source.onended=()=>{if(!disposed)onEnded();};
   }
   ready=true;
  }catch(failure){error=failure;dispose();throw failure;}
 }
 if(palette.voice.startsWith('sample:')){
  const id=palette.voice.slice(7);sample=bank?.metadata(id);
  if(!sample)throw Error('Imported sample is missing from this browser');
  bank.decode(context,id).then(buffer=>{if(disposed)return;allocate(buffer);onReady();}).catch(failure=>{error=failure;onReady();});
 }else allocate();
 function render(layer,now,duration){
  if(disposed||error)throw error||Error('Instrument disposed');if(!ready)return false;
  const frequencies=paletteFrequencies(layer.frequency_hz,palette);
  const beats=paletteBeatEvents(palette,{start:now,duration,origin});
  const shape=recipe?.shape||'pad';
  sources.forEach((source,index)=>{
   const hz=recipe?.fixed_hz||frequencies[index],parameter=recipe?.kind==='noise'?null:source.frequency||source.playbackRate;
   if(parameter){parameter.cancelScheduledValues?.(now);parameter.setValueAtTime(source.frequency?hz:hz/(440*2**(((bank?.metadata(palette.voice.slice(7))?.root_midi??sample?.root_midi??60)-69)/12)),now);}
   const gain=envelopes[index].gain,level=.7/sources.length;
   gain.cancelScheduledValues(now);gain.setValueAtTime(0,now);
   if(palette.rhythm==='sustained'){
    gain.linearRampToValueAtTime(level,now+(shape==='pad'?.3:.008));
    if(shape==='pluck')gain.linearRampToValueAtTime(0,now+.45);
    else{gain.setValueAtTime(level,now+Math.max(.31,duration-.3));gain.linearRampToValueAtTime(0,now+duration);}
   }else for(const beat of beats){
    const end=Math.min(beat.at+Math.min(shape==='pad'?beat.duration:.22,beat.duration),now+duration);
    gain.setValueAtTime(0,beat.at);gain.linearRampToValueAtTime(level*beat.velocity,Math.min(end,beat.at+.008));gain.linearRampToValueAtTime(0,end);
    if(recipe?.id==='kick'&&parameter){parameter.setValueAtTime(hz*3,beat.at);parameter.linearRampToValueAtTime(hz,Math.min(end,beat.at+.1));}
   }
   if(!started)source.start(now);source.stop(now+duration+.02);
  });started=true;return true;
 }
 return {render,dispose,stopAt(time){for(const source of sources)try{source.stop(time);}catch{}},get pending(){return !ready&&!error;},get error(){return error?.message||null;}};
}
