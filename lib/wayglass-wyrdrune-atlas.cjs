'use strict';
// Typed numeric bridge for Wyrdrune's multiscale Resonance Atlas.
// No frequency, harmonic or spectral composition occurs in this adapter.
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const {compile,execute}=require('./wyrdrune/wyrdrune.cjs');
const SCHEMA='wayglass.resonance-atlas/v0.1';
const CODE=readFileSync(join(__dirname,'wyrdrune','resonance-atlas.wtl'),'utf8');
const IR=compile(CODE);
const INPUT_KEYS=new Set(['instant','room','world','universe','affinity','phase','counts']);
const COUNT_KEYS=['instant','room','world','universe'];
function bounded(value,name,min=0,max=1){
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)
    throw new TypeError(name+' must be a bounded finite number.');
  return value;
}
function normaliseAtlasInput(value){
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw new TypeError('Resonance Atlas requires a numeric input object.');
  if(Object.keys(value).some(key=>!INPUT_KEYS.has(key)))
    throw new TypeError('Resonance Atlas rejects unrecognised fields or raw text.');
  const counts=value.counts;
  if(!counts||typeof counts!=='object'||Array.isArray(counts)
    ||Object.keys(counts).some(key=>!COUNT_KEYS.includes(key)))
    throw new TypeError('Atlas requires known-scope observation counts.');
  const confirmed={};
  for(const key of COUNT_KEYS){
    const n=counts[key];
    if(!Number.isInteger(n)||n<1||n>256)throw new TypeError('Invalid '+key+' observation count.');
    confirmed[key]=n;
  }
  return Object.freeze({
    instant:bounded(value.instant,'instant'),
    room:bounded(value.room,'room'),
    world:bounded(value.world,'world'),
    universe:bounded(value.universe,'universe'),
    affinity:bounded(value.affinity,'affinity'),
    phase:bounded(value.phase,'phase'),
    counts:Object.freeze(confirmed),
  });
}
function formatAtlasFrame(args){
  if(args.length!==9)throw new TypeError('Nine Wyrdrune atlas scalars are required.');
  const [belowHz,voiceHz,partnerHz,aboveHz,coherence,interference,bloom,grain,flow]=args;
  bounded(belowHz,'virtual infrasonic Hz',.01,19.99);
  bounded(voiceHz,'audible root Hz',90,900);
  bounded(partnerHz,'audible counterpart Hz',90,1100);
  bounded(aboveHz,'virtual ultrasonic Hz',20001,50000);
  bounded(coherence,'coherence');
  bounded(interference,'interference');
  bounded(bloom,'bloom');
  bounded(grain,'granulation');
  bounded(flow,'flow');
  return Object.freeze({
    below:Object.freeze({hz:belowHz,kind:'virtual-infrasonic',physical_playback:false}),
    within:Object.freeze({root_hz:voiceHz,counterpart_hz:partnerHz,kind:'audible-representation',autoplay:false}),
    above:Object.freeze({hz:aboveHz,kind:'virtual-ultrasonic',physical_playback:false}),
    structure:Object.freeze({coherence,interference,bloom,granulation:grain,flow}),
  });
}
async function scoreResonanceAtlas(value,{principal}={}){
  if(!principal?.authorized)throw new Error('Authenticated House authority is required.');
  const input=normaliseAtlasInput(value);
  const bridges={
    atlas:{
      instant:()=>input.instant,room:()=>input.room,world:()=>input.world,
      universe:()=>input.universe,affinity:()=>input.affinity,phase:()=>input.phase,
      validate:({arguments:args})=>{
        formatAtlasFrame(args);
        return 'validated';
      },
      frame:({arguments:args})=>formatAtlasFrame(args),
    },
    continuity:{
      hold:({arguments:args})=>Object.freeze({state:'local-uncommitted',pass:args[0]}),
      next:({arguments:args})=>Object.freeze({state:'next-face',phase:args[0]}),
    },
  };
  const result=await execute(IR,{
    principal:{id:'wayglass:house-steward-atlas',authorized:true},
    bridges,maxOperations:550,
  });
  if(result.output.length!==8||result.receipts.length!==16||result.withness.completedCycles!==2
    ||result.output[0]!=='validated'||result.output[4]!=='validated')
      throw new Error('Atlas did not complete the two Eightfold traversals.');
  const inputSha=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return Object.freeze({
    schema:SCHEMA,status:'composed-in-wyrdrune',
    first_pass:result.output[1],returned:result.output[5],
    counts:input.counts,
    phase_receipts:Object.freeze(result.receipts.map(x=>Object.freeze({phase:x.phase,source_hash:x.sourceHash}))),
    source_sha256:result.sourceHash,input_sha256:inputSha,
    withness:result.withness,
    scope_refs:'held-client-side-only',
    physical_inaudible_output:false,model_invoked:false,
    persisted:false,canon_commit:false,identity_commit:false,
  });
}
module.exports={SCHEMA,CODE,IR,normaliseAtlasInput,scoreResonanceAtlas};
