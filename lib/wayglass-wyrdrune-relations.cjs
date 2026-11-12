'use strict';
// Host adapter for Wyrdrune's native relational growth. It does not compute
// growth, invent glyph semantics, invoke a model, persist state or adopt canon.
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const {compile,execute}=require('./wyrdrune/wyrdrune.cjs');

const SCHEMA='wayglass.wyrdrune-relational-growth/v0.1';
const CODE=readFileSync(join(__dirname,'wyrdrune','relational-growth.wtl'),'utf8');
const IR=compile(CODE);
const INPUT_KEYS=new Set(['parent_ids','relation','field','source','world_address','model_offer']);
const FIELDS=['novelty','coherence','recurrence','uncertainty'];
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:\/-]{0,179}$/;
const RELATION=/^[a-z][a-z0-9-]{1,63}$/;
const SHA=/^[a-f0-9]{64}$/;
function scalar(value,name) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1)
    throw new TypeError(name+' must be a finite number in [0,1]');
  return value;
}
function identity(value,name) {
  if(typeof value!=='string'||!ID.test(value))throw new TypeError(name+' requires a bounded identifier');
  return value;
}
function address(value) {
  if(value===undefined||value===null)return null;
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('world_address must be a typed address');
  if(value.kind==='rune'&&Object.keys(value).every(k=>['kind','value'].includes(k)))
    return Object.freeze({kind:'rune',value:identity(value.value,'world rune')});
  if(value.kind==='coordinates'&&Object.keys(value).every(k=>['kind','universe','x','y','z','t'].includes(k))) {
    const result={kind:'coordinates',universe:identity(value.universe,'universe')};
    for(const key of ['x','y','z','t']) {
      if(typeof value[key]!=='number'||!Number.isFinite(value[key]))throw new TypeError('world coordinate '+key+' must be finite');
      result[key]=value[key];
    }
    return Object.freeze(result);
  }
  throw new TypeError('world_address requires either a rune or complete coordinates');
}
function validateInput(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!INPUT_KEYS.has(k)))
    throw new TypeError('Relational growth requires a typed input envelope');
  if(!Array.isArray(value.parent_ids)||value.parent_ids.length<2||value.parent_ids.length>8)
    throw new TypeError('A relation requires two to eight distinct parent identifiers');
  const parent_ids=value.parent_ids.map((id,i)=>identity(id,'parent '+i));
  if(new Set(parent_ids).size!==parent_ids.length)throw new TypeError('Relation parents must remain distinct');
  if(typeof value.relation!=='string'||!RELATION.test(value.relation))
    throw new TypeError('Relation requires a declared operator name');
  if(!value.field||typeof value.field!=='object'||Array.isArray(value.field)
      ||Object.keys(value.field).some(k=>!FIELDS.includes(k)))
    throw new TypeError('A bounded relational field is required');
  const field=Object.freeze(Object.fromEntries(FIELDS.map(k=>[k,scalar(value.field[k],'field.'+k)])));
  const source=value.source;
  if(!source||typeof source!=='object'||Array.isArray(source)
      ||Object.keys(source).some(k=>!['event_id','source_hash'].includes(k))
      ||!ID.test(source.event_id)||!SHA.test(source.source_hash))
    throw new TypeError('An attributable source event and source hash are required');
  let model_offer=null;
  if(value.model_offer!=null) {
    const m=value.model_offer;
    if(!m||typeof m!=='object'||Array.isArray(m)||m.kind!=='attributed-model-proposal'
       ||m.owner_offered!==true||!ID.test(m.route_ref)||!ID.test(m.receipt_ref)
       ||typeof m.text!=='string'||!m.text.trim()||m.text.length>2000)
      throw new TypeError('Model proposal must be explicitly offered and receipt-attributed');
    model_offer=Object.freeze({kind:m.kind,route_ref:m.route_ref,receipt_ref:m.receipt_ref,
      text:m.text,owner_offered:true});
  }
  return Object.freeze({parent_ids:Object.freeze(parent_ids),relation:value.relation,
    field,source:Object.freeze({event_id:source.event_id,source_hash:source.source_hash}),
    world_address:address(value.world_address),model_offer});
}
function validateSeeds(value) {
  if(value===undefined)return Object.freeze({resonance:0.5,openness:0.5});
  if(!value||typeof value!=='object'||Array.isArray(value)
      ||Object.keys(value).sort().join(',')!=='openness,resonance')
    throw new TypeError('Growth seeds must contain exactly resonance and openness');
  return Object.freeze({resonance:scalar(value.resonance,'seed.resonance'),
    openness:scalar(value.openness,'seed.openness')});
}
async function proposeRelationalGrowth(value,{principal,signal=null,seeds}={}) {
  if(!principal?.authorized||typeof principal.id!=='string'||!principal.id.trim())
    throw new Error('Relational growth requires an authenticated House principal');
  const input=validateInput(value),initial=validateSeeds(seeds);
  let proposed=0;
  const bridges={
    relations:{
      ...Object.fromEntries(FIELDS.map(k=>[k,()=>input.field[k]])),
      candidate:({arguments:args})=>{
        if(args.length!==2||++proposed!==1)throw new TypeError('One relational candidate per Wyrdrune cycle');
        const [resonance,openness]=args;
        scalar(resonance,'candidate.resonance');scalar(openness,'candidate.openness');
        return Object.freeze({
          kind:'wyrdrune.relational-candidate/v0.1',status:'proposed',
          parent_ids:input.parent_ids,relation:input.relation,
          world_address:input.world_address,
          source:input.source,
          model_offer:input.model_offer?Object.freeze({
            route_ref:input.model_offer.route_ref,receipt_ref:input.model_offer.receipt_ref,
          }):null,
          resonance,openness,
          meaning_status:'author-defined-or-unresolved',
          canon_adopted:false,world_created:false,
        });
      },
      return:({arguments:args})=>{
        if(args.length!==1||args[0]!=='candidate-only')
          throw new TypeError('Relational growth cannot silently promote canon');
        return Object.freeze({status:'candidate-only',persistence:'host-not-connected'});
      },
    },
  };
  const result=await execute(IR,{principal,bridges,seeds:initial,signal,maxOperations:300});
  if(result.status!=='committed'||result.output.length!==3||proposed!==1
     ||result.receipts.length!==8||result.checkpoints.length!==1
     ||result.withness.completedCycles!==1)
    throw new Error('Native Wyrdrune relational cycle did not return cleanly');
  const fingerprint=createHash('sha256').update(JSON.stringify({
    parent_ids:input.parent_ids,relation:input.relation,field:input.field,
    source:input.source,world_address:input.world_address,
    model_offer:input.model_offer?{
      route_ref:input.model_offer.route_ref,receipt_ref:input.model_offer.receipt_ref,
    }:null,seeds:initial,
  })).digest('hex');
  return Object.freeze({
    schema:SCHEMA,status:'candidate-returned',candidate:result.output[0],
    return_marker:result.output[1],next_question:result.output[2],
    carry:result.continuity.carry,checkpoints:result.checkpoints,
    source_hash:IR.sourceHash,input_hash:fingerprint,
    phase_receipts:result.receipts.map(r=>Object.freeze({phase:r.phase,sourceHash:r.sourceHash})),
    model_invoked:false,model_weights_updated:false,persisted:false,
    canon_commit:false,world_created:false,
  });
}
module.exports={CODE,IR,SCHEMA,validateInput,validateSeeds,proposeRelationalGrowth};
