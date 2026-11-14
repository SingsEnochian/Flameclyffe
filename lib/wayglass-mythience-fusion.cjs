'use strict';
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const {compile,execute}=require('./wyrdrune/wyrdrune.cjs');
const {DEFAULT_SEEDS,validateSeeds}=require('./wayglass-mythience-crossing.cjs');
const CODE=readFileSync(join(__dirname,'wyrdrune','mythience-hybrid.wtl'),'utf8');
const IR=compile(CODE);
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}$/;
const id=(value,label)=>{
  if(typeof value!=='string'||!ID.test(value))throw new TypeError(label+' must be a bounded identifier');
  return value;
};
const unit=(value,label)=>{
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1)
    throw new TypeError(label+' must be in [0,1]');
  return value;
};
function validateFusion(request){
  if(!request||typeof request!=='object'||Array.isArray(request))throw new TypeError('Hybrid request required');
  if(Object.keys(request).sort().join('|')!==['traveller_id','destination_universe','first','second','field','consent','event_id'].sort().join('|'))
    throw new TypeError('Hybrid request has unsupported fields');
  const ability=(v,label)=>{
    if(!v||typeof v!=='object'||Array.isArray(v)||
      Object.keys(v).sort().join('|')!==['id','origin_universe','modality','expression'].sort().join('|'))
      throw new TypeError(label+' requires id, origin, modality, expression');
    return Object.freeze({id:id(v.id,label+'.id'),origin_universe:id(v.origin_universe,label+'.origin_universe'),
      modality:id(v.modality,label+'.modality'),expression:unit(v.expression,label+'.expression')});
  };
  const first=ability(request.first,'first'),second=ability(request.second,'second');
  if(first.id===second.id&&first.origin_universe===second.origin_universe)
    throw new TypeError('Hybrid requires distinct parent abilities');
  const keys=['intention','shifting','resonance','compatibility'];
  if(!request.field||Object.keys(request.field).sort().join('|')!==keys.sort().join('|'))
    throw new TypeError('Hybrid field mismatch');
  const field=Object.freeze(Object.fromEntries(keys.map(k=>[k,unit(request.field[k],k)])));
  const permissions=['traveller','first','second','destination'];
  if(!request.consent||Object.keys(request.consent).sort().join('|')!==permissions.sort().join('|')||
    permissions.some(k=>typeof request.consent[k]!=='boolean'))
    throw new TypeError('Four explicit hybrid consents required');
  return Object.freeze({traveller_id:id(request.traveller_id,'traveller_id'),
    destination_universe:id(request.destination_universe,'destination_universe'),
    first,second,field,consent:Object.freeze({...request.consent}),event_id:id(request.event_id,'event_id')});
}
async function proposeHybrid(request,{principal,signal=null,seeds=DEFAULT_SEEDS}={}){
  if(!principal?.authorized||typeof principal.id!=='string'||!principal.id.trim())
    throw new Error('Authenticated House principal required');
  const input=validateFusion(request),initial=validateSeeds(seeds);
  const input_hash=createHash('sha256').update(JSON.stringify({input,seeds:initial,principal_id:principal.id})).digest('hex');
  let candidates=0;
  const bridge={first_expression:()=>input.first.expression,second_expression:()=>input.second.expression,
    ...Object.fromEntries(Object.keys(input.field).map(k=>[k,()=>input.field[k]])),
    ...Object.fromEntries(['traveller','first','second','destination'].map(k=>[k+'_consent',()=>input.consent[k]])),
    hybrid:({arguments:args})=>{
      if(++candidates!==1||args.length!==5)throw new TypeError('Exactly one hybrid candidate required');
      args.forEach((n,i)=>unit(n,'hybrid['+i+']'));
      return Object.freeze({schema:'mythience.hybrid-translation/v0.1',
        id:'hybrid:'+input.event_id,traveller_id:input.traveller_id,
        destination_universe:input.destination_universe,
        parents:[input.first,input.second],expression:args[0],synergy:args[1],
        cost:args[2],attunement:args[3],charge:args[4],input_hash,
        adopted:false,persisted:false,canon_commit:false});
    },
  };
  const result=await execute(IR,{principal,signal,seeds:initial,bridges:{mythience:bridge},maxOperations:600});
  if(result.status==='rolled-back')return Object.freeze({schema:'mythience.hybrid/v0.1',
    status:'denied',reason:result.verdict?.reason||'Hybrid declined',candidate:null,
    input_hash,canon_adopted:false,persisted:false});
  if(result.status!=='committed'||result.output.length!==3||result.receipts.length!==8||candidates!==1)
    throw new Error('Hybrid Wyrdrune cycle did not return a complete receipt');
  return Object.freeze({schema:'mythience.hybrid/v0.1',status:'candidate-returned',
    candidate:result.output[0],return_marker:result.output[1],next_question:result.output[2],
    carry:result.continuity.carry,source_hash:IR.sourceHash,input_hash,
    phase_receipts:result.receipts.map(r=>({phase:r.phase,source_hash:r.sourceHash})),
    physical_crossing:false,canon_adopted:false,persisted:false,model_invoked:false});
}
module.exports={CODE,IR,validateFusion,proposeHybrid};
