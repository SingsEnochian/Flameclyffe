'use strict';
// Native Wyrdrune is the ONLY owner of living-learning state transitions.
// This adapter supplies typed sensory values and interpretation-free bridges.
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const {compile,execute}=require('./wyrdrune/wyrdrune.cjs');
const SCHEMA='wayglass.wyrdrune-living-learning/v0.1';
const CODE=readFileSync(join(__dirname,'wyrdrune','living-learning.wtl'),'utf8');
const IR=compile(CODE);
const ATLAS_KEYS=['coherence','interference','bloom','granulation','flow'];
const INTERIOR_KEYS=['energy','curiosity','uncertainty','coherence','previous_resonance'];
const K=new Set(['atlas','interior','source','reflection']);
function number(v,name){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)
  throw new TypeError(name+' requires a finite scalar between zero and one.');
  return v;}
function validateInput(input) {
  if(!input||typeof input!=='object'||Array.isArray(input) || Object.keys(input).some(key=>!K.has(key)))
    throw new TypeError('Learning accepts only typed Atlas, interior, source, reflection envelopes.');
  if(!input.atlas||!input.interior||!input.source)throw new TypeError('Learning requires typed Atlas, interior and provenance.');
  if(Object.keys(input.atlas).some(key=>!ATLAS_KEYS.includes(key))
     || Object.keys(input.interior).some(key=>!INTERIOR_KEYS.includes(key)))
    throw new TypeError('Unrecognised cognitive input field.');
  const atlas={},interior={};
  for(const key of ATLAS_KEYS)atlas[key]=number(input.atlas[key],'atlas.'+key);
  for(const key of INTERIOR_KEYS)interior[key]=number(input.interior[key],'interior.'+key);
  if(Math.abs(atlas.coherence+atlas.interference-1)>0.000001)
    throw new TypeError('Coherence and interference cannot be silently collapsed.');
  const source=input.source;
  if(!source || typeof source.event_id!=='string'|| !/^ui-[a-z0-9._:-]{1,90}$/i.test(source.event_id)
    || typeof source.atlas_input_hash!=='string'||!/^[a-f0-9]{64}$/.test(source.atlas_input_hash)
    || typeof source.atlas_program_hash!=='string'||!/^[a-f0-9]{64}$/.test(source.atlas_program_hash))
      throw new TypeError('An attributable Atlas input and programme receipt are required.');
  let reflection=null;
  if(input.reflection!=null){
    const r=input.reflection;
    if(!r || typeof r!=='object' || r.kind!=='offered-model-return'
       || typeof r.route_ref!=='string'||!r.route_ref.trim()||r.route_ref.length>180
       || typeof r.receipt_ref!=='string'||!r.receipt_ref.trim()||r.receipt_ref.length>220
       || typeof r.text!=='string'||!r.text.trim()||r.text.length>2400
       || r.owner_offered!==true)throw new TypeError('Only an owner-offered attributed model return can enter reflection.');
    reflection=Object.freeze({kind:r.kind,route_ref:r.route_ref,
      receipt_ref:r.receipt_ref,text:r.text,owner_offered:true});
  }
  return Object.freeze({atlas:Object.freeze(atlas),interior:Object.freeze(interior),
    source:Object.freeze({event_id:source.event_id,atlas_input_hash:source.atlas_input_hash,
      atlas_program_hash:source.atlas_program_hash}),reflection});
}
function frame(args){
  if(args.length!==6)throw new TypeError('Native Wyrdrune learning frame requires six scalars.');
  const [energy,curiosity,uncertainty,coherence,opening,attention]=args;
  for(const [i,key] of ['energy','curiosity','uncertainty','coherence','opening','attention'].entries())
    number(args[i],'learning.'+key);
  return Object.freeze({energy,curiosity,uncertainty,coherence,opening,attention});
}
async function executeLivingLearning(value,{principal,signal=null}={}){
  if(!principal?.authorized)throw new Error('Living Learning requires authenticated House permission.');
  const input=validateInput(value);
  const reflections=[];
  const bridges={
    atlas:Object.fromEntries(ATLAS_KEYS.map(key=>[key,()=>input.atlas[key]])),
    interior:Object.fromEntries(INTERIOR_KEYS.map(key=>[key,()=>input.interior[key]])),
    learning:{
      validate:({arguments:args})=>{frame(args);return 'validated';},
      frame:({arguments:args})=>frame(args),
    },
    reflection:{
      offered:()=>input.reflection ? 'attributed-return-offered' : 'open-unoffered',
      hold_open:({arguments:args})=>{
        const condition=args[0];
        if(condition!=='attributed-return-offered'&&condition!=='open-unoffered')
          throw new TypeError('A Wyrdrune reflection cannot be given an invented voice.');
        const result=Object.freeze({state:condition,interpretation:'open',consent:'participant-owned'});
        reflections.push(result);
        return result;
      },
    },
    continuity:{
      hold:({arguments:args})=>Object.freeze({state:'uncommitted',pass:args[0]}),
      next:({arguments:args})=>Object.freeze({state:'navigable',phase:args[0]}),
    },
  };
  const executed=await execute(IR,{
    principal:{id:'wayglass:house-native-wyrdrune',authorized:true},
    bridges,signal,maxOperations:500,
  });
  if(executed.status!=='committed'||executed.checkpoints?.length!==2
    ||executed.receipts.length!==16||executed.withness.completedCycles!==2
    ||executed.output.length!==10||executed.output[0]!=='validated'
    ||executed.output[5]!=='validated'||reflections.length!==2)
    throw new Error('Living Learning did not complete both native Wyrdrune circuits.');
  const inputSha=createHash('sha256').update(JSON.stringify({
    atlas:input.atlas,interior:input.interior,source:input.source,
    reflection:input.reflection?{route_ref:input.reflection.route_ref,receipt_ref:input.reflection.receipt_ref}:null,
  })).digest('hex');
  return Object.freeze({
    schema:SCHEMA,status:'wyrdrune-returned',
    first_pass:executed.output[1],returned:executed.output[6],
    open_reflection:executed.output[7],
    // The person's or model's offered words are never copied into telemetry.
    reflection_offer:input.reflection?{
      route_ref:input.reflection.route_ref,receipt_ref:input.reflection.receipt_ref,
      kind:input.reflection.kind,interpretation:'open',
    }:null,
    source:input.source,source_hash:executed.sourceHash,input_hash:inputSha,
    phase_receipts:executed.receipts.map(x=>({phase:x.phase,source_hash:x.sourceHash})),
    withness:executed.withness,
    // What crossed the twist, exactly as Wyrdrune receipted it: the six-part carry,
    // its WCE-1 digest and the chained checkpoints. The Return Engine stores this.
    continuity:Object.freeze({schema:'wayglass.wyrdrune-learning-continuity/v0.1',
      lineage_root:executed.lineage.root,carry:executed.continuity.carry,
      carry_digest:executed.continuity.carry_digest,checkpoints:executed.checkpoints,
      status:executed.status}),
    model_invoked:false,model_weights_updated:false,canon_commit:false,
    identity_commit:false,relationship_commit:false,
  });
}
module.exports={CODE,IR,SCHEMA,executeLivingLearning,validateInput};
