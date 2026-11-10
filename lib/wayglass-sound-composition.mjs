import {validSoundPalette} from './wayglass-sound-palette.mjs';
// Seeded scene scores shared across Wayglass regions. No AudioContext is created
// here: existing host sound organs own output and user-gesture permission.
export const SOUND_COMPOSITION_SCHEMA='wayglass.sound-composition/v1';
export const SOUND_PROPOSAL_SCHEMA='wayglass.sound-composition-proposal/v1';
const SOURCES=new Set(['wayglass-watercolor','wayglass-acoustic','wayglass-arcsweep']);
const finite=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const label=value=>typeof value==='string'&&value.length>0&&value.length<=160&&!/[\u0000-\u001f]/.test(value);
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
const copy=value=>JSON.parse(JSON.stringify(value));
function sceneValid(scene){return exact(scene,['id','root_hz','source_ref'])&&label(scene.id)&&finite(scene.root_hz,40,1200)&&label(scene.source_ref);}
function layerValid(layer){return (exact(layer,['id','position','gain','muted'])||(exact(layer,['id','position','gain','muted','palette'])&&validSoundPalette(layer.palette)))&&/^layer-[0-7]$/.test(layer.id)&&exact(layer.position,['x','y'])&&finite(layer.position.x,-1,1)&&finite(layer.position.y,-1,1)&&finite(layer.gain,0,1)&&typeof layer.muted==='boolean';}
function intentValid(intent){return exact(intent,['scene','seed','density','rate','mono','layers'])&&sceneValid(intent.scene)&&Number.isSafeInteger(intent.seed)&&intent.seed>=1&&intent.seed<=0xffffffff&&finite(intent.density,0,1)&&finite(intent.rate,1,30)&&typeof intent.mono==='boolean'&&Array.isArray(intent.layers)&&intent.layers.length<=8&&intent.layers.every(layerValid)&&new Set(intent.layers.map(l=>l.id)).size===intent.layers.length;}
export function isSoundCompositionProposal(value){return Boolean(exact(value,['schema','source','session','sequence','intent'])&&value.schema===SOUND_PROPOSAL_SCHEMA&&SOURCES.has(value.source)&&typeof value.session==='string'&&/^[a-f0-9-]{16,64}$/i.test(value.session)&&Number.isSafeInteger(value.sequence)&&value.sequence>=1&&intentValid(value.intent));}
function randomFor(seed,step,index){let x=(seed^Math.imul(step+1,0x9e3779b9)^Math.imul(index+1,0x85ebca6b))>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;}
export function scoreForComposition({seed,sequence,scene,density,rate,mono,layers=[]}){
 if(!intentValid({seed,scene,density,rate,mono,layers})||!Number.isSafeInteger(sequence)||sequence<0)throw new TypeError('Valid bounded composition intent required');
 const count=Math.floor(density*8),ratios=[.5,1,1.25,1.5,2,2.5,3,4];
 return Array.from({length:8},(_,index)=>{
  const id='layer-'+index,override=layers.find(l=>l.id===id),r=randomFor(seed,sequence,index),x=Math.sin(sequence*.17+index*2.399963229728653)*.85;
  const position=override?.position||{x,y:Math.cos(sequence*.11+index)*.8};
  return {id,label:scene.id+' · '+(index+1),region:scene.id,source_ref:scene.source_ref,available:true,position:copy(position),
   ...(override?.palette?{palette:copy(override.palette)}:{}),gain:override?.gain??(.35+r*.35),muted:override?.muted??false,active:index<count,
   kind:index%3===1?'texture':'tone',frequency_hz:Math.min(4800,scene.root_hz*ratios[index]*(1+(r-.5)*.03)),
   duration_s:Math.min(40,rate+2),pan:mono?0:position.x,seed:(seed^sequence^index)>>>0};
 });
}
export function createSoundComposition({region='wayglass-watercolor',source_ref='apps/wayglass/src/somatic-sound.js',seed=369,
 scene={id:'living-watercolor',root_hz:220,source_ref},timers=globalThis,eventScope=globalThis,onScore=()=>false,enableAudio=async()=>false,stopAudio=()=>{}}={}){
 if(!SOURCES.has(region)||!label(source_ref)||!sceneValid(scene)||!Number.isSafeInteger(seed)||seed<1||seed>0xffffffff)throw new TypeError('Source-addressed composition required');
 let state={schema:SOUND_COMPOSITION_SCHEMA,math_spine:'hearthgate.math-spine/v1.8',source_ref,source_kind:'procedural-composition',region,seed,scene:copy(scene),sequence:0,generating:false,audio_enabled:false,feather_stopped:false,mono:false,density:.5,rate:6,last_error:null,bridge:{status:'local-only'}};
 let overrides=[],timer=null,epoch=0,disposed=false,proposalSequence=0;
 let scoreProvider=null,scoreEpoch=0,scoreAbort=null,pendingScore=null,programLayers=null,programProvenance=null,requiresProgram=false,programKind='source-program';const listeners=new Set(),seen=new Map();
 function validateProgramScore(value){
  if(!value||typeof value!=='object'||!Array.isArray(value.layers)||value.layers.length<1||value.layers.length>8||!value.provenance||typeof value.provenance!=='object'||BufferLength(JSON.stringify(value))>131072)throw new TypeError('Bounded source program score and provenance required');
  const ids=new Set();for(const layer of value.layers){if(!layer||!/^layer-[0-7]$/.test(layer.id)||ids.has(layer.id)||!['tone','texture'].includes(layer.kind)||!finite(layer.frequency_hz,20,4800)||!finite(layer.gain,0,1)||!finite(layer.amplitude??layer.gain,0,1)||!finite(layer.duration_s,1,40)||!exact(layer.position,['x','y'])||!finite(layer.position.x,-1,1)||!finite(layer.position.y,-1,1)||!label(layer.source_ref)||(layer.palette!==undefined&&!validSoundPalette(layer.palette)))throw new TypeError('Invalid source program sound object');ids.add(layer.id);}return copy(value);
 }
 const BufferLength=value=>new TextEncoder().encode(value).length;
 function currentLayers(){
  if(!requiresProgram)return scoreForComposition({...state,layers:overrides});
  return (programLayers||[]).map(layer=>{const override=overrides.find(l=>l.id===layer.id),position=override?.position||layer.position,mix=override?.gain??1;
   return {...copy(layer),...(override?.palette?{palette:copy(override.palette)}:{}),label:layer.label||layer.id,region,available:true,source_gain:layer.source_gain??layer.gain,gain:mix,amplitude:(layer.amplitude??layer.gain)*mix*state.density,position:copy(position),pan:state.mono?0:position.x,duration_s:Math.min(40,Math.max(layer.duration_s,state.rate+2)),muted:override?.muted??false,active:layer.active!==false};});
 }
 function snapshot(){return copy({...state,layers:currentLayers(),program_provenance:programProvenance,disposed,playback_status:state.audio_enabled?'playing':'off',generation_status:state.generating?'generating':'paused'});}
 function notify(){const value=snapshot();for(const fn of listeners){try{fn(value);}catch{}}return value;}
 function clear(){if(timer!==null)timers.clearTimeout(timer);timer=null;}
 function silence(){state.audio_enabled=false;try{stopAudio();}catch(error){state.last_error=String(error?.message||error);}}
 function cancelScore(){++scoreEpoch;scoreAbort?.abort();scoreAbort=null;pendingScore=null;}
 function advance(){
  if(disposed||!state.generating||state.feather_stopped)return snapshot();if(pendingScore)return pendingScore;state.sequence++;
  if(!requiresProgram){reproject();return notify();}
  if(!scoreProvider){state.score_status='provider-required';state.last_error='Source program provider required';silence();return notify();}
  const token=scoreEpoch,controller=new AbortController();scoreAbort=controller;state.score_status='pending';notify();
  const request={intent:intent(),sequence:state.sequence,signal:controller.signal};
  const activeProvider=scoreProvider;
  const pending=Promise.resolve().then(()=>{if(controller.signal.aborted)throw new Error('Score generation cancelled');return activeProvider(request);}).then(value=>{
   if(disposed||token!==scoreEpoch||controller.signal.aborted)return snapshot();
   const score=validateProgramScore(value);programLayers=score.layers;programProvenance=score.provenance;state.score_status='source-score-ready';state.last_error=null;reproject();return notify();
  }).catch(error=>{if(!disposed&&token===scoreEpoch&&!controller.signal.aborted){state.score_status='source-score-unavailable';state.last_error=String(error?.message||error);programLayers=null;programProvenance=null;silence();notify();}return snapshot();}).finally(()=>{if(pendingScore===pending)pendingScore=null;if(scoreAbort===controller)scoreAbort=null;});
  pendingScore=pending;return pending;
 }
 function schedule(){clear();if(state.generating&&!state.feather_stopped&&!disposed)timer=timers.setTimeout(()=>{timer=null;const next=advance();if(next&&typeof next.then==='function')void next.then(schedule,schedule);else schedule();},state.rate*1000);}
 function setScoreProvider(provider,{sourceKind='source-program'}={}){
  if(typeof provider!=='function'||!label(sourceKind))throw new TypeError('Source program provider required');cancelScore();silence();if(!requiresProgram)state.density=1;
  requiresProgram=true;programKind=sourceKind;scoreProvider=provider;programLayers=null;programProvenance=null;state.source_kind=sourceKind;state.score_status='pending';
  if(state.generating)void advance();return notify();
 }
 function startGeneration({confirmed=false}={}){if(disposed||state.feather_stopped||confirmed!==true)throw new Error('Explicit composition start required after Feather release');state.generating=true;advance();schedule();return snapshot();}
 function pauseGeneration(){cancelScore();clear();state.generating=false;return notify();}
 async function allowAudio({confirmed=false}={}){if(disposed||state.feather_stopped||confirmed!==true)throw new Error('Explicit playback gesture required');const token=++epoch;if(requiresProgram&&state.score_status!=='source-score-ready')throw new Error('Source program evaluation required before playback');state.last_error=null;
  try{const accepted=await enableAudio();if(token!==epoch||state.feather_stopped||disposed)return snapshot();state.audio_enabled=accepted===true;if(!state.audio_enabled)state.last_error='Audio output unavailable';
   if(state.audio_enabled&&onScore(snapshot())!==true){silence();state.last_error='Audio projection unavailable';}}
  catch(error){if(token===epoch){silence();state.last_error=String(error?.message||error);}}return notify();}
 function disableAudio(){++epoch;silence();return notify();}
 function reproject(){if(state.audio_enabled){try{if(onScore(snapshot())!==true){silence();state.last_error='Audio projection unavailable';}}catch(error){silence();state.last_error=String(error?.message||error);}}}
 function setMix(patch={}){if(disposed)return snapshot();if(Object.keys(patch).some(k=>!['density','rate','mono'].includes(k)))throw new TypeError('Unknown mix control');
  if('density'in patch&&!finite(patch.density,0,1)||'rate'in patch&&!finite(patch.rate,1,30)||'mono'in patch&&typeof patch.mono!=='boolean')throw new TypeError('Bounded mix controls required');
  Object.assign(state,patch);if(state.generating)schedule();reproject();return notify();}
 function setLayer(id,patch={}){if(!/^layer-[0-7]$/.test(id)||Object.keys(patch).some(k=>!['position','gain','muted','palette'].includes(k)))throw new TypeError('Known sound object control required');
  const current=currentLayers().find(l=>l.id===id);if(!current)throw new TypeError('Source sound object unavailable');const value={id,position:copy(current.position),gain:current.gain,muted:current.muted,...(current.palette?{palette:copy(current.palette)}:{}),...copy(patch)};
  if(!layerValid(value))throw new TypeError('Bounded spatial layer required');overrides=overrides.filter(l=>l.id!==id).concat(value);reproject();return notify();}
 function setScene(value){if(!sceneValid(value))throw new TypeError('Source-addressed scene required');state.scene=copy(value);reproject();return notify();}
 function feather(){++epoch;cancelScore();clear();state.generating=false;state.feather_stopped=true;silence();return notify();}
 function releaseFeather({confirmed=false}={}){if(confirmed!==true)throw new Error('Explicit Feather release required');++epoch;cancelScore();clear();silence();state.generating=false;state.feather_stopped=false;return notify();}
 function intent(){return copy({scene:state.scene,seed:state.seed,density:state.density,rate:state.rate,mono:state.mono,layers:overrides});}
 function checkpoint(){const value={schema:SOUND_COMPOSITION_SCHEMA,intent:intent(),sequence:state.sequence,feather_stopped:state.feather_stopped,resume:'explicit-gesture-required'};if(requiresProgram)value.program={source_kind:programKind,score:programLayers?{layers:copy(programLayers),provenance:copy(programProvenance)}:null};return value;}
 function restore(value){if(!(exact(value,['schema','intent','sequence','feather_stopped','resume'])||exact(value,['schema','intent','sequence','feather_stopped','resume','program']))||value.schema!==SOUND_COMPOSITION_SCHEMA||!intentValid(value.intent)||!Number.isSafeInteger(value.sequence)||value.sequence<0||typeof value.feather_stopped!=='boolean'||value.resume!=='explicit-gesture-required')throw new TypeError('Valid composition return receipt required');
  if(value.program){if(!exact(value.program,['source_kind','score'])||!label(value.program.source_kind))throw new TypeError('Source program return provenance required');if(value.program.score)validateProgramScore(value.program.score);}
  ++epoch;cancelScore();clear();silence();if(value.program){requiresProgram=true;programKind=value.program.source_kind;programLayers=value.program.score?copy(value.program.score.layers):null;programProvenance=value.program.score?copy(value.program.score.provenance):null;state.source_kind=programKind;}if(requiresProgram)state.score_status='return-held';Object.assign(state,copy(value.intent),{sequence:value.sequence,generating:false,feather_stopped:state.feather_stopped||value.feather_stopped});overrides=copy(value.intent.layers);delete state.layers;return notify();}
 function createProposal({session}={}){const proposal={schema:SOUND_PROPOSAL_SCHEMA,source:region,session,sequence:++proposalSequence,intent:intent()};if(!isSoundCompositionProposal(proposal))throw new TypeError('Current deck session required');return proposal;}
 function applyProposal(value,{session,expectedSource}={}){if(!isSoundCompositionProposal(value)||value.session!==session||value.source!==expectedSource||value.source===region)throw new Error('Sound proposal source/session mismatch');const key=value.source+':'+session;
  if(value.sequence<=(seen.get(key)||0))throw new Error('Replayed sound proposal');seen.set(key,value.sequence);if(seen.size>8)seen.delete(seen.keys().next().value);
  // Proposals may change score intent but never start generation or playback.
  Object.assign(state,copy(value.intent));overrides=copy(value.intent.layers);delete state.layers;state.bridge={status:'proposal-received',source:value.source,sequence:value.sequence};reproject();return notify();}
 function proposeBridge(){const Custom=eventScope.CustomEvent||globalThis.CustomEvent;if(typeof eventScope.dispatchEvent!=='function'||typeof Custom!=='function')return false;const event=new Custom('wayglass:sound-composition-proposal',{cancelable:true,detail:{composition:api}});return eventScope.dispatchEvent(event)===false;}
 function subscribe(fn){if(typeof fn!=='function')throw new TypeError('Listener required');listeners.add(fn);return()=>listeners.delete(fn);}
 function dispose(){if(disposed)return;feather();disposed=true;listeners.clear();}
 const api=Object.freeze({snapshot,subscribe,startGeneration,pauseGeneration,enableAudio:allowAudio,disableAudio,setMix,setLayer,setScene,feather,releaseFeather,checkpoint,restore,createProposal,applyProposal,proposeBridge,setScoreProvider,waitForScore:()=>pendingScore||Promise.resolve(snapshot()),advance,dispose});return api;
}
