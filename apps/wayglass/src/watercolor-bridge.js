import {
  PREMAQC_TERM, PREMAQC_DYNAMIC_AXES, PREMAQC_CONTEXT_ONLY_AXES,
} from '../../starwell/src/premaqc-contract.js';

export const WATERCOLOR_ACTIVITY_SCHEMA='wayglass.watercolor-activity/v1';
export const WATERCOLOR_PROPOSAL_SCHEMA='wayglass.watercolor-touch-proposal/v1';
export const WATERCOLOR_PROGRAM_SCHEMA='wayglass.watercolor-program/v1';

const DEFAULT_COLORS=Object.freeze({
  'agent:active':'#61c7a7',
  'route:pending':'#9c96ce',
  'route:responded':'#e3af73',
  'route:failed':'#b46675',
  'waygate:return':'#8daac6',
  'learning:verified':'#ceb17a',
  'touch:suggestion':'#7bbebd',
  'journey:chamber':'#78b3c3',
  'fold:compass':'#ddb982',
  'fold:witness':'#81c3bd',
  'fold:hearth':'#bf9a88',
  'form:morph':'#b9b0dd',
  'mythience:crossing':'#79d8c8',
});
const KINDS=new Set(Object.keys(DEFAULT_COLORS));
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const validColor=c=>typeof c==='string'&&/^#[\da-f]{6}$/i.test(c);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const deepFreeze=value=>{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.values(value).forEach(deepFreeze);Object.freeze(value);
  }
  return value;
};
const freezeCopy=value=>deepFreeze(structuredClone(value));
let seq=0;
let program=Object.freeze({
  schema:WATERCOLOR_PROGRAM_SCHEMA,
  colors:DEFAULT_COLORS,
  flow:0.6,
  granulation:0.6,
  bloom:0.5,
  author:'wayglass:default-score',
  authority:'local-visualization-only',
});
const recent=[],proposals=[],listeners=new Set();
export function projectPremaqcTexture(packet) {
  if(packet == null)return Object.freeze({
    vocabulary:PREMAQC_TERM,
    data_state:'unavailable',wetness:0.5,rhythm:0.4,cohesion:0.5,granulation:0.4,
    qualia_evolved:false,qualia_inferred:false,
  });
  if(typeof packet!=='object')throw new TypeError('PREMAQC observation must be an object');
  const state=packet.state;
  if(!state || typeof state!=='object')throw new TypeError('PREMAQC state required');
  const values={};
  for(const axis of PREMAQC_DYNAMIC_AXES){
    const observed=state[axis]?.value;
    if(!finite(observed)||observed<0||observed>1)
      throw new TypeError('Valid PREMAQC axis measurement required: '+axis);
    values[axis]=observed;
  }
  // Q is intentionally not used in pigment mathematics.
  if(PREMAQC_CONTEXT_ONLY_AXES.join(',')!=='Q')throw new Error('Qualia contract changed');
  return Object.freeze({
    vocabulary:PREMAQC_TERM,data_state:'supplied-observation',
    wetness:clamp(0.15+values.P*0.55+values.E*0.2),
    rhythm:clamp(0.14+values.R*0.55+values.A*0.25),
    cohesion:clamp(values.C),
    granulation:clamp(0.22+(1-values.C)*0.43+values.M*0.33),
    qualia_evolved:false,qualia_inferred:false,
    provenance_refs:Object.freeze(Array.isArray(packet.provenance_refs)?packet.provenance_refs.filter(ref=>typeof ref==='string').slice(0,16).map(ref=>ref.slice(0,180)):[]),
  });
}
function normalizeReceipt(receipt){
  if(!receipt || typeof receipt!=='object')return null;
  const ref=receipt.observation_id||receipt.receipt_id||receipt.packet_id||receipt.response_id;
  if(typeof ref!=='string'||!ref.trim())return null;
  return Object.freeze({
    schema:String(receipt.schema||'unknown').slice(0,100),
    receipt_ref:ref.slice(0,180),
  });
}
export function publishWatercolorActivity({
  kind,actor='wayglass:runtime',receipt=null,premaqc=null,intensity=0.65,
  observedAt=new Date().toISOString(),
}={}){
  if(!KINDS.has(kind))throw new TypeError('Unsupported watercolor activity kind');
  if(!finite(intensity))throw new TypeError('Finite activity intensity required');
  const texture=projectPremaqcTexture(premaqc);
  const evidence=normalizeReceipt(receipt);
  if(kind==='learning:verified'&&!evidence)throw new TypeError('Learning activity requires a receipt reference');
  const event=Object.freeze({
    schema:WATERCOLOR_ACTIVITY_SCHEMA,
    sequence:++seq,kind,
    actor:String(actor).slice(0,100),
    observed_at:String(observedAt).slice(0,48),
    pigment:program.colors[kind],
    intensity:clamp(intensity),
    flow:program.flow,
    granulation:program.granulation,
    texture,
    evidence,
    evidence_state:evidence?'referenced-not-independently-verified':'no-receipt',
    learning_verification:kind==='learning:verified'?'receipt-label-not-independent-verification':'not-applicable',
    epistemic_register:'visual-expression-of-operational-events',
    experience_claimed:false,
    qualia_inferred:false,
    authority:'render-only',
  });
  recent.push(event);if(recent.length>64)recent.shift();
  for(const listener of [...listeners]) {
    try { listener(event); } catch { /* a rendering subscriber must not block a route */ }
  }
  return event;
}
export function subscribeWatercolorActivity(listener){
  if(typeof listener!=='function')throw new TypeError('Listener required');
  listeners.add(listener);
  return ()=>listeners.delete(listener);
}
export function proposeWatercolorTouch({
  x,y,color='#7bbebd',pressure=0.5,note='',mode='add-pigment',
}={}){
  if(!finite(x)||!finite(y)||!finite(pressure)||!validColor(color))
    throw new TypeError('Finite normalized touch and hex pigment required');
  if(!['add-pigment','suggest-direction','pause'].includes(mode))
    throw new TypeError('Unknown touch suggestion');
  const proposal=Object.freeze({
    schema:WATERCOLOR_PROPOSAL_SCHEMA,
    id:'local-touch-'+(++seq),x:clamp(x),y:clamp(y),
    color,pressure:clamp(pressure),
    mode,note:String(note).slice(0,300),
    state:'local-proposal-unsubmitted',
    canon_commit:false,identity_commit:false,program_commit:false,
  });
  proposals.push(proposal);if(proposals.length>32)proposals.shift();
  if(mode!=='pause')publishWatercolorActivity({
    kind:'touch:suggestion',actor:'owner:local-gesture',intensity:proposal.pressure,
  });
  return proposal;
}
export function configureWatercolorProgram(candidate,{author='owner:local-preview'}={}){
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))throw new TypeError('Declarative watercolor program required');
  if(Object.keys(candidate).some(key=>!['colors','flow','granulation','bloom'].includes(key)))throw new TypeError('Unsupported declarative watercolor rule');
  if(candidate.colors!=null&&(typeof candidate.colors!=='object'||Array.isArray(candidate.colors)))throw new TypeError('Pigment rules must be an object');
  const colors={...program.colors};
  for(const [kind,color] of Object.entries(candidate.colors||{})){
    if(!KINDS.has(kind)||!validColor(color))throw new TypeError('Unknown or invalid pigment rule');
    colors[kind]=color;
  }
  const flow=candidate.flow??program.flow,granulation=candidate.granulation??program.granulation,
    bloom=candidate.bloom??program.bloom;
  if(![flow,granulation,bloom].every(finite)||[flow,granulation,bloom].some(v=>v<0||v>1))
    throw new RangeError('Declarative fluid parameters must be between zero and one');
  // This only changes local visualization state; model-suggested programs must
  // be reviewed and intentionally applied through this same constrained API.
  program=Object.freeze({
    schema:WATERCOLOR_PROGRAM_SCHEMA,
    colors:Object.freeze(colors),flow,granulation,bloom,
    author:String(author).slice(0,120),authority:'local-visualization-only',
  });
  return program;
}
export function watercolorSnapshot(){
  return freezeCopy({
    program,events:recent,proposals,
    suggestion_persistence:'session-only',
    event_persistence:'session-only',
    model_route_bound:false,
    firsthand_experience_claimed:false,
  });
}
export function watercolorProgram(){return program;}

