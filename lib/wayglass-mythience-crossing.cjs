'use strict';
// Mythience is a simulated universe-interface calculus, not evidence of literal
// travel or physical ability transfer. Native WTL owns the membrane equations.
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const {compile,execute}=require('./wyrdrune/wyrdrune.cjs');
const CODE=readFileSync(join(__dirname,'wyrdrune','mythience-crossing.wtl'),'utf8');
const IR=compile(CODE);
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:\/-]{0,127}$/;
const DEFAULT_SEEDS=Object.freeze({crossings:0,attunement:0.5,charge:1});
const METRICS=['intention','shifting','porosity','resonance','compatibility'];
function id(value,label){
  if(typeof value!=='string'||!ID.test(value))throw new TypeError(label+' must be a bounded identifier');
  return value;
}
function bounded(value,label,max=1){
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max)
    throw new TypeError(label+' must be finite in [0,'+max+']');
  return value;
}
function exact(value,fields,label){
  if(!value||typeof value!=='object'||Array.isArray(value)
    ||Object.keys(value).sort().join('|')!==[...fields].sort().join('|'))
    throw new TypeError(label+' must contain exactly '+fields.join(', '));
  return value;
}
function validateSeeds(seeds=DEFAULT_SEEDS){
  exact(seeds,['crossings','attunement','charge'],'Crossing seeds');
  if(!Number.isSafeInteger(seeds.crossings)||seeds.crossings<0||seeds.crossings>=1000000)
    throw new TypeError('crossings must be an integer below the budget');
  return Object.freeze({crossings:seeds.crossings,
    attunement:bounded(seeds.attunement,'attunement'),
    charge:bounded(seeds.charge,'charge')});
}
function validateRequest(request){
  exact(request,['traveller_id','origin_universe','destination_universe','ability','history','field','consent','event_id'],'Crossing request');
  const traveller_id=id(request.traveller_id,'traveller_id');
  const origin_universe=id(request.origin_universe,'origin_universe');
  const destination_universe=id(request.destination_universe,'destination_universe');
  if(origin_universe===destination_universe)throw new TypeError('Crossing requires distinct universes');
  const event_id=id(request.event_id,'event_id');
  const ability=exact(request.ability,['id','origin_universe','modality'],'Ability');
  const sourceAbility=Object.freeze({id:id(ability.id,'ability.id'),
    origin_universe:id(ability.origin_universe,'ability.origin_universe'),
    modality:id(ability.modality,'ability.modality')});
  const field=exact(request.field,METRICS,'Membrane field');
  const metrics=Object.freeze(Object.fromEntries(METRICS.map(k=>[k,bounded(field[k],k)])));
  const consent=exact(request.consent,['traveller','origin','destination'],'Consent');
  for(const key of ['traveller','origin','destination'])
    if(typeof consent[key]!=='boolean')throw new TypeError('Consent.'+key+' must be explicit truth');
  if(!Array.isArray(request.history)||request.history.length>32)
    throw new TypeError('History must be an array of at most 32 declared experiences');
  const seen=new Set();
  const history=Object.freeze(request.history.map((entry,i)=>{
    exact(entry,['id','origin_universe','destination_universe','expression'],'History entry');
    const key=id(entry.id,'history['+i+'].id');
    if(seen.has(key))throw new TypeError('Duplicate history experience');
    seen.add(key);
    return Object.freeze({id:key,origin_universe:id(entry.origin_universe,'history origin'),
      destination_universe:id(entry.destination_universe,'history destination'),
      expression:bounded(entry.expression,'history expression')});
  }));
  return Object.freeze({traveller_id,origin_universe,destination_universe,ability:sourceAbility,
    history,field:metrics,consent:Object.freeze({...consent}),event_id});
}
async function proposeCrossing(request,{principal,signal=null,seeds}={}){
  if(!principal?.authorized||typeof principal.id!=='string'||!principal.id.trim())
    throw new Error('Mythience crossing requires an authenticated House principal');
  const input=validateRequest(request),initial=validateSeeds(seeds);
  const input_hash=createHash('sha256').update(JSON.stringify({input,seeds:initial,principal_id:principal.id})).digest('hex');
  const bridgeValue=name=>()=>input.field[name];
  let candidates=0;
  const bridges={mythience:{
    ...Object.fromEntries(METRICS.map(k=>[k,bridgeValue(k)])),
    experience_count:()=>input.history.length,
    traveller_consent:()=>input.consent.traveller,
    origin_consent:()=>input.consent.origin,
    destination_consent:()=>input.consent.destination,
    candidate:({arguments:args})=>{
      if(++candidates!==1||args.length!==6)throw new TypeError('One candidate per crossing');
      for(let i=0;i<5;i++)bounded(args[i],'candidate['+i+']');
      if(!Number.isSafeInteger(args[5])||args[5]!==initial.crossings+1)
        throw new TypeError('Crossing count must advance exactly once');
      const [permeability,expression,cost,attunement,charge,crossings]=args;
      return Object.freeze({schema:'mythience.ability-translation/v0.1',status:'proposed',
        traveller_id:input.traveller_id,from:input.origin_universe,to:input.destination_universe,
        ability:input.ability,permeability,expression,cost,attunement,charge,crossings,
        previous_experiences:input.history.length,history_refs:input.history.map(h=>h.id),
        input_hash,adopted:false,persisted:false});
    },
    return:({arguments:args})=>{
      if(args.length!==1||args[0]!=='proposal-only')throw new TypeError('No implicit crossing or canon promotion');
      return Object.freeze({status:'proposal-only',crossing_performed:false});
    },
  }};
  const result=await execute(IR,{principal,signal,seeds:initial,bridges,maxOperations:600});
  if(result.status==='rolled-back'){
    return Object.freeze({schema:'mythience.crossing/v0.1',status:'denied',
      reason:result.verdict?.reason??'Crossing refused',input_hash,
      candidate:null,physical_crossing:false,persisted:false,canon_adopted:false});
  }
  if(result.status!=='committed'||result.output.length!==3||candidates!==1
    ||result.receipts.length!==8||result.checkpoints.length!==1)
    throw new Error('Mythience Wyrdrune cycle did not complete cleanly');
  return Object.freeze({schema:'mythience.crossing/v0.1',status:'candidate-returned',
    candidate:result.output[0],return_marker:result.output[1],next_question:result.output[2],
    carry:result.continuity.carry,checkpoint:result.checkpoints[0],
    phase_receipts:result.receipts.map(r=>Object.freeze({phase:r.phase,source_hash:r.sourceHash})),
    source_hash:IR.sourceHash,input_hash,physical_crossing:false,persisted:false,canon_adopted:false,
    history_verified:false,model_invoked:false});
}
module.exports={CODE,IR,DEFAULT_SEEDS,validateRequest,validateSeeds,proposeCrossing};
