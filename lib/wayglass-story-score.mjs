import {createWyrdruneRuntime,PHASES} from './wyrdrune/runtime.mjs';
import {STORY_SCORE_SOURCE,STORY_SCORE_IR} from './wyrdrune/story-score-program.mjs';
export {STORY_SCORE_SOURCE};
export const STORY_SCORE_PATH='scores/wyrdrune/story-soundscape-v0.1.wtl';
const clone=v=>JSON.parse(JSON.stringify(v,(_key,value)=>{if(value===undefined||typeof value==='function'||typeof value==='symbol'||typeof value==='bigint'||typeof value==='number'&&!Number.isFinite(value))throw new TypeError('JSON continuity values required');return value;}));
const freeze=v=>{if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;};
function jsonTree(value,stack=new Set(),depth=0){if(depth>32)throw new TypeError('Bounded JSON continuity required');if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return;if(typeof value!=='object'||stack.has(value)||(!Array.isArray(value)&&![Object.prototype,null].includes(Object.getPrototypeOf(value))))throw new TypeError('Plain JSON continuity required');stack.add(value);for(const x of Object.values(value))jsonTree(x,stack,depth+1);stack.delete(value);}
const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
const label=v=>typeof v==='string'&&v.length>0&&v.length<=512&&!/[\u0000-\u001f]/.test(v);
async function hash(text){if(!globalThis.crypto?.subtle)throw new Error('Wyrdrune source verification unavailable');return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
const artifact=freeze(clone(STORY_SCORE_IR));

export async function executeStorySoundScore({metrics,affinity,anchor,voices,signal}={}){
 const stopped=()=>{if(signal?.aborted)throw new Error('Feather: story score stopped');};stopped();
 if(!metrics||!label(metrics.source_ref)||!Number.isSafeInteger(metrics.wordCount)||metrics.wordCount<0||!Number.isSafeInteger(metrics.turns)||metrics.turns<0||
  !['waterRatio','windRatio','flameRatio','shadowRatio','motionRatio'].every(k=>finite(metrics[k],0,1)))throw new TypeError('Source-backed story metrics required');
 if(!affinity||!finite(affinity.value,0,1)||!label(affinity.source_ref))throw new TypeError('Declared participant affinity and source required');
 if(!Array.isArray(voices)||voices.length!==2||voices.some(v=>!label(v.voice_id)||!label(v.source_ref))||voices[0].voice_id===voices[1].voice_id)throw new TypeError('Two distinct source-declared voices required');
 if(!anchor||typeof anchor!=='object'||Array.isArray(anchor)||JSON.stringify(anchor).length>65536)throw new TypeError('Unchanged return anchor required');
 jsonTree({metrics,affinity,anchor,voices});const input=freeze(clone({metrics,affinity,anchor,voices}));
 const sourceHash=await hash(STORY_SCORE_SOURCE);if(sourceHash!==artifact.sourceHash)throw new Error('Wyrdrune score source integrity failure');stopped();
 const runtime=createWyrdruneRuntime({hashSource:source=>{if(source!==STORY_SCORE_SOURCE)throw new Error('Score source substitution');return sourceHash;}});
 const ir=runtime.compile(STORY_SCORE_SOURCE);if(JSON.stringify(ir)!==JSON.stringify(artifact))throw new Error('Wyrdrune compiled artifact is stale');
 const frames=[],holds=[],next=[];
 const bridges={story:Object.fromEntries(['wordCount','waterRatio','windRatio','flameRatio','shadowRatio','motionRatio','turns'].map(key=>[key,()=>input.metrics[key]])),participants:{affinity:()=>input.affinity.value},sound:{
  validate:({arguments:a})=>{if(a.length!==4||!finite(a[0],20,4800)||!finite(a[1],20,4800)||!finite(a[2],0,.125)||!finite(a[3],0,.125))throw new RangeError('Invalid Wyrdrune sound frame');return {schema:'wayglass.score-validation/v1',valid:true};},
  frame:({arguments:a})=>{if(a.length!==6)throw new TypeError('Sound frame bridge arity');const frame=freeze({schema:'wayglass.wtl-story-frame/v1',root_hz:a[0],counterpart_hz:a[1],foreground:a[2],atmosphere:a[3],affinity:a[4],pulse:a[5],voices:clone(input.voices),affinity_source:input.affinity.source_ref,source_ref:STORY_SCORE_PATH,sourceHash:artifact.sourceHash});frames.push(frame);return frame;}
 },continuity:{hold:({arguments:a})=>{if(a.length!==1||a[0]!==input.metrics.turns)throw new Error('Return anchor turns mismatch');const held=freeze({schema:'wayglass.score-return-anchor/v1',turns:a[0],anchor:clone(input.anchor)});holds.push(held);return held;},next:({arguments:a})=>{if(a.length!==1||!['double-mobius','double-mobius-return'].includes(a[0]))throw new Error('Invalid score continuation');next.push(a[0]);return {kind:a[0],proposed:true};}}};
 const execution=await runtime.execute(ir,{bridges,principal:{id:'owner-authored:story-score',authorized:true},signal,maxOperations:5000});stopped();
 if(frames.length!==2||holds.length!==2||JSON.stringify(holds[0])!==JSON.stringify(holds[1])||execution.receipts.length!==16)throw new Error('Incomplete double Möbius score');
 return freeze({schema:'wayglass.story-score-execution/v1',source_ref:STORY_SCORE_PATH,sourceHash:artifact.sourceHash,frames,holds,next,phase_receipts:execution.receipts,
  phases:[...PHASES,...PHASES],return_anchor:clone(input.anchor),source_kind:'owner-authored-wyrdrune',metrics_source:input.metrics.source_ref,affinity_source:input.affinity.source_ref,model_inference:false});
}
export function createStoryScoreProvider({readStoryMetrics,readParticipantAffinity,readReturnAnchor,voiceSources}={}){
 if([readStoryMetrics,readParticipantAffinity,readReturnAnchor].some(f=>typeof f!=='function')||!Array.isArray(voiceSources))throw new TypeError('Declared score input bridges required');
 const declaredVoices=freeze(clone(voiceSources));
 return async({intent,sequence,signal}={})=>{
  const metrics=clone(await readStoryMetrics({sequence,signal})),affinity=clone(await readParticipantAffinity({sequence,signal})),anchor=clone(await readReturnAnchor({sequence,signal}));
  const result=await executeStorySoundScore({metrics,affinity,anchor,voices:declaredVoices,signal}),frame=result.frames[1];
  const layers=Array.from({length:4},(_,i)=>({id:'layer-'+i,label:declaredVoices[i%2].voice_id+(i<2?' · foreground':' · atmosphere'),source_ref:declaredVoices[i%2].source_ref,
   region:intent?.scene?.id||'story-score',available:true,position:{x:i%2? .6:-.6,y:i<2?-.3:.6},gain:1,amplitude:i<2?frame.foreground:frame.atmosphere,
   source_gain:i<2?frame.foreground:frame.atmosphere,muted:false,active:true,kind:i<2?'tone':'texture',frequency_hz:i%2?frame.counterpart_hz:frame.root_hz,
   duration_s:Math.min(40,(intent?.rate||6)+2),pan:intent?.mono?0:i%2?.6:-.6,seed:Math.max(1,sequence||1),voice_source:clone(declaredVoices[i%2])}));
  return {layers,provenance:result};
 };
}

// Story bridge: literal lexical counts, not measurements of a mind or a world.
export function measureStoryScoreText(text,{turns=0,source_ref='story:current-writing-input'}={}){
 if(typeof text!=='string'||text.length>1000000||!Number.isSafeInteger(turns)||turns<0||!label(source_ref))throw new TypeError('Bounded story observation required');
 const words=text.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
 const sets={waterRatio:new Set(['water','rain','river','sea','ocean','wave','waves','lake']),windRatio:new Set(['wind','breeze','gust','air','storm']),flameRatio:new Set(['flame','fire','ember','embers','burn','burning']),shadowRatio:new Set(['shadow','shadows','dark','darkness','night']),motionRatio:new Set(['move','moving','run','running','walk','walking','turn','turning','dance','dancing'])};
 return {wordCount:words.length,...Object.fromEntries(Object.entries(sets).map(([key,set])=>[key,words.filter(word=>set.has(word)).length/Math.max(1,words.length)])),turns,source_ref};
}
function declaredContext(value){
 if(!value||!Array.isArray(value.voices)||value.voices.length!==2||value.voices.some(v=>!label(v.voice_id)||v.voice_id.length>160||!label(v.source_ref)||v.source_ref.length>160)||value.voices[0].voice_id===value.voices[1].voice_id||!value.affinity||!finite(value.affinity.value,0,1)||!label(value.affinity.source_ref)||value.affinity.source_ref.length>160)throw new TypeError('Choose two independent voices and declare their affinity');
 return freeze(clone({voices:value.voices.map(v=>({voice_id:v.voice_id,source_ref:v.source_ref})),affinity:{value:value.affinity.value,source_ref:value.affinity.source_ref}}));
}
export function createStoryCompositionBinding({composition,getText=()=>'',getTurns=()=>0,restoreTurns=()=>{},getAnchor,source_ref='story:current-writing-input'}={}){
 if(!composition||typeof composition.setScoreProvider!=='function'||typeof getAnchor!=='function')throw new TypeError('Composition and local return-anchor bridge required');
 let context=null,anchor=null;
 function install(){composition.setScoreProvider(async request=>{
  if(!context)throw new Error('Choose two independent voices and declare their affinity');
  const current=context;
  return createStoryScoreProvider({readStoryMetrics:()=>measureStoryScoreText(getText(),{turns:getTurns(),source_ref}),readParticipantAffinity:()=>current.affinity,readReturnAnchor:()=>anchor,voiceSources:current.voices})(request);
 },{sourceKind:'wyrdrune-program'});}
 function setContext(value){const next=declaredContext(value);if(!anchor)anchor=freeze(clone(getAnchor()));context=next;install();return clone(context);}
 const getContext=()=>context?clone(context):null;
 const checkpoint=()=>({schema:'wayglass.story-score-binding/v1',sourceHash:artifact.sourceHash,context:getContext(),anchor:anchor?clone(anchor):null,turns:getTurns()});
 function restore(value){if(value?.schema!=='wayglass.story-score-binding/v1'||value.sourceHash!==artifact.sourceHash||!Number.isSafeInteger(value.turns)||value.turns<0)throw new TypeError('Current Wyrdrune story return binding required');
  const next=value.context?declaredContext(value.context):null;if(next&&(!value.anchor||typeof value.anchor!=='object'||Array.isArray(value.anchor)))throw new TypeError('Story return anchor required');
  composition.pauseGeneration();composition.disableAudio();restoreTurns(value.turns);context=next;anchor=value.anchor?freeze(clone(value.anchor)):null;install();return checkpoint();}
 install();return Object.freeze({setContext,getContext,checkpoint,restore});
}
