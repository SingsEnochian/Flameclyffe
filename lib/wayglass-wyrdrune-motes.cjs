'use strict';
// Capability boundary for native Wyrdrune ascending motes. This adapter only
// validates observations/identity and stages typed output. WTL owns dynamics.
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const {compile,execute}=require('./wyrdrune/wyrdrune.cjs');
const SCHEMA='wayglass.wyrdrune-ascending-mote/v0.1';
const CODE=readFileSync(join(__dirname,'wyrdrune','ascending-motes.wtl'),'utf8');
const IR=compile(CODE);
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:\/-]{0,179}$/;
const SHA=/^[a-f0-9]{64}$/;
const FIELDS=['phase','velocity','elevation','wonder','possibility','harmony','chaos','magic'];
const SIGNALS=['wonder','possibility','neighbour_resonance','novelty','time_step'];
const DEFAULT_SEEDS=Object.freeze({phase:0,velocity:0.5,elevation:0,wonder:0.5,
  possibility:0.5,harmony:0.5,chaos:0.5,magic:0.5});
function bounded(value,label,{min=0,max=1}={}){
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)
    throw new TypeError(label+' must be finite in ['+min+','+max+']');
  return value;
}
function identifier(value,label){
  if(typeof value!=='string'||!ID.test(value))throw new TypeError(label+' must be a bounded identifier');
  return value;
}
function exact(value,keys,label){
  if(!value||typeof value!=='object'||Array.isArray(value)
    ||Object.keys(value).sort().join('|')!==[...keys].sort().join('|'))
    throw new TypeError(label+' requires exactly '+keys.join(', '));
  return value;
}
function validateInput(value){
  exact(value,['mote_id','identity_spin','signals','source'], 'Mote input');
  const mote_id=identifier(value.mote_id,'mote_id');
  const identity_spin=bounded(value.identity_spin,'identity_spin',{min:0.000001});
  const signals=exact(value.signals,SIGNALS,'Mote signals');
  const validated=Object.freeze(Object.fromEntries(SIGNALS.map(k=>[k,bounded(signals[k],
    'signals.'+k,{min:k==='time_step'?0.000001:0})])));
  const source=exact(value.source,['event_id','source_hash'],'Mote source');
  identifier(source.event_id,'source.event_id');
  if(typeof source.source_hash!=='string'||!SHA.test(source.source_hash))
    throw new TypeError('source_hash must be a SHA-256 hex digest');
  return Object.freeze({mote_id,identity_spin,signals:validated,
    source:Object.freeze({event_id:source.event_id,source_hash:source.source_hash})});
}
function validateSeeds(value){
  if(value===undefined)return DEFAULT_SEEDS;
  exact(value,FIELDS,'Mote seeds');
  return Object.freeze(Object.fromEntries(FIELDS.map(k=>[k,bounded(value[k],
    'seeds.'+k,{max:k==='phase'||k==='elevation'?1000000:1})])));
}
async function advanceMote(value,{principal,signal=null,seeds}={}){
  if(!principal?.authorized||typeof principal.id!=='string'||!principal.id.trim())
    throw new Error('Mote advance requires an authenticated House principal');
  const input=validateInput(value),initial=validateSeeds(seeds);
  let proposed=0;
  const bridges={helix:{
    identity_spin:()=>input.identity_spin,
    wonder:()=>input.signals.wonder,
    possibility:()=>input.signals.possibility,
    neighbour_resonance:()=>input.signals.neighbour_resonance,
    novelty:()=>input.signals.novelty,
    time_step:()=>input.signals.time_step,
    candidate:({arguments:args})=>{
      if(++proposed!==1||args.length!==FIELDS.length)
        throw new TypeError('One eight-field candidate per Möbius turn');
      const next=Object.freeze(Object.fromEntries(FIELDS.map((k,i)=>[k,bounded(args[i],
        'candidate.'+k,{max:k==='phase'||k==='elevation'?1000000:1})])));
      return Object.freeze({kind:'wyrdrune.ascending-mote-candidate/v0.1',
        status:'proposed',mote_id:input.mote_id,identity_spin:input.identity_spin,
        state:next,source:input.source,canon_adopted:false,persisted:false});
    },
    return:({arguments:args})=>{
      if(args.length!==1||args[0]!=='proposal-only')
        throw new TypeError('A mote may not self-promote its state');
      return Object.freeze({status:'proposal-only',persistence:'host-not-connected'});
    },
  }};
  const result=await execute(IR,{principal,bridges,seeds:initial,signal,maxOperations:600});
  if(result.status!=='committed'||result.output.length!==3||proposed!==1
    ||result.receipts.length!==8||result.checkpoints.length!==1
    ||result.withness.completedCycles!==1)
    throw new Error('Native Wyrdrune ascending turn did not return cleanly');
  const input_hash=createHash('sha256').update(JSON.stringify({input,seeds:initial})).digest('hex');
  return Object.freeze({schema:SCHEMA,status:'candidate-returned',
    candidate:result.output[0],return_marker:result.output[1],
    next_question:result.output[2],carry:result.continuity.carry,
    checkpoints:result.checkpoints,phase_receipts:result.receipts.map(r=>Object.freeze({
      phase:r.phase,sourceHash:r.sourceHash})),
    source_hash:IR.sourceHash,input_hash,
    model_invoked:false,model_weights_updated:false,persisted:false,canon_commit:false});
}
module.exports={CODE,IR,SCHEMA,DEFAULT_SEEDS,validateInput,validateSeeds,advanceMote};
