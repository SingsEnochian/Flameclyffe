// Wyrdrune Axiom of Almost and Resonance · v0.1
// Native, bounded, deterministic pure values. No physical, model, or device effects.
// A possibility can remain open without being treated as an error or adopted state.
export const ALMOST_SCHEMA='wyrdrune.almost/v0.1';
export const RESONANCE_SCHEMA='wyrdrune.resonance/v0.1';
export const METAGENESIS_FUNCTIONS=Object.freeze([
 'almost','relateAlmost','holdAlmost','proposeAlmost','shadowAlmost',
 'resonanceNode','resonanceField','singResonance'
]);
const names=new Set(METAGENESIS_FUNCTIONS);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const text=(v,label)=>{if(typeof v!=='string'||!v.trim()||v.length>100)throw new TypeError(label+' must be bounded text');return v;};
const bounded=(v,lo,hi,label)=>{if(!finite(v)||v<lo||v>hi)throw new RangeError(label+' outside allowed bounds');return v;};
const round=v=>Math.round(v*1e9)/1e9;
const copy=record=>JSON.parse(JSON.stringify(record));
const validAlmost=v=>v?.schema===ALMOST_SCHEMA&&Array.isArray(v?.possibilities)&&Array.isArray(v?.relations)&&Array.isArray(v?.shadows)&&typeof v.id==='string';
const checkAlmost=v=>{if(!validAlmost(v))throw new TypeError('Expected native Wyrdrune Almost register');return v;};
const has=(v,id)=>v.possibilities.some(p=>p.id===id);
const distinct=v=>new Set(v).size===v.length;
function almost(id,ids){
 text(id,'Almost identity');
 if(!Array.isArray(ids)||ids.length<2||ids.length>16)throw new RangeError('Almost requires 2–16 possibilities');
 ids=ids.map(x=>text(x,'Possibility identity'));
 if(!distinct(ids))throw new TypeError('Possibilities must remain distinct');
 return {schema:ALMOST_SCHEMA,id,possibilities:ids.map(pid=>({id:pid,status:'open'})),
  relations:[],shadows:[],adopted:null,authority:'proposal-only',register:'possibility—not observed reality'};
}
function relateAlmost(v,a,b,relation){
 v=checkAlmost(v);text(a,'First possibility');text(b,'Second possibility');
 if(!has(v,a)||!has(v,b)||a===b)throw new TypeError('Relation requires two distinct registered possibilities');
 relation=text(relation,'Relation label');if(v.relations.length>=64)throw new RangeError('Almost relation budget exceeded');
 const r=copy(v);r.relations.push({from:a,to:b,relation});return r;
}
function holdAlmost(v,id){v=checkAlmost(v);text(id,'Held possibility');if(!has(v,id))throw new TypeError('Unknown possibility');const r=copy(v);r.possibilities.find(p=>p.id===id).status='held-open';return r;}
function proposeAlmost(v,id){
 v=checkAlmost(v);text(id,'Proposed possibility');if(!has(v,id))throw new TypeError('Unknown possibility');
 const r=copy(v);r.possibilities.find(p=>p.id===id).status='proposed-not-adopted';
 return r; // Crucial: no state promotion, host bridge, consent inference or execution.
}
function shadowAlmost(v,id){
 v=checkAlmost(v);text(id,'Shadow possibility');if(!has(v,id))throw new TypeError('Unknown possibility');
 const r=copy(v);if(!r.shadows.includes(id)){if(r.shadows.length>=16)throw new RangeError('Almost shadow budget');r.shadows.push(id);}
 return r; // A shadow is preserved history, not evidence the candidate happened.
}
function resonanceNode(id,hz,phase){
 return {schema:'wyrdrune.resonance-node/v0.1',id:text(id,'Resonance node identity'),
  naturalHz:bounded(hz,0.05,5,'Frequency'),phase:bounded(phase,-2*Math.PI,2*Math.PI,'Phase')};
}
function resonanceField(nodes,coupling,steps){
 if(!Array.isArray(nodes)||nodes.length<2||nodes.length>24)throw new RangeError('2–24 resonance nodes required');
 coupling=bounded(coupling,0,1,'Coupling');
 if(!Number.isSafeInteger(steps)||steps<0||steps>200)throw new RangeError('Resonance step budget exceeded');
 const checked=nodes.map(n=>{
  if(n?.schema!=='wyrdrune.resonance-node/v0.1')throw new TypeError('Expected native resonance node');
  return resonanceNode(n.id,n.naturalHz,n.phase);
 });
 if(!distinct(checked.map(n=>n.id)))throw new TypeError('Resonance identities must remain distinct');
 let phases=checked.map(x=>x.phase);
 const dt=0.04;
 for(let t=0;t<steps;t++){
  const previous=phases;
  phases=checked.map((n,i)=>{
   let sum=0;
   for(let j=0;j<previous.length;j++)if(i!==j)sum+=Math.sin(previous[j]-previous[i]);
   const velocity=2*Math.PI*n.naturalHz+coupling*sum/(previous.length-1);
   const x=previous[i]+dt*velocity;
   return Math.atan2(Math.sin(x),Math.cos(x));
  });
 }
 const re=phases.reduce((s,x)=>s+Math.cos(x),0)/phases.length;
 const im=phases.reduce((s,x)=>s+Math.sin(x),0)/phases.length;
 return {schema:RESONANCE_SCHEMA,kind:'pure-numerical-simulation',members:checked.map((n,i)=>({
  id:n.id,naturalHz:n.naturalHz,phase:round(phases[i])
 })),coupling,steps,coherence:round(Math.hypot(re,im)),
  authority:'no-audio-no-device-output',interpretation:'numerical phase relationships only'};
}
function singResonance(field){
 if(field?.schema!==RESONANCE_SCHEMA)throw new TypeError('Expected native resonance field');
 return {kind:'wyrdrune.resonance-score/v0.1',voices:field.members.map(n=>({
  id:n.id,hz:n.naturalHz,phase:n.phase
 })),coherence:field.coherence,
  audible:false,autoplay:false,authority:'score-only-explicit-renderer-required'};
}
export function evaluateMetagenesis(name,args){
 if(!names.has(name))return {handled:false};
 const methods={almost,relateAlmost,holdAlmost,proposeAlmost,shadowAlmost,resonanceNode,resonanceField,singResonance};
 const arity={almost:2,relateAlmost:4,holdAlmost:2,proposeAlmost:2,shadowAlmost:2,resonanceNode:3,resonanceField:3,singResonance:1};
 if(args.length!==arity[name])throw new TypeError(name+' expects '+arity[name]+' arguments');
 return {handled:true,value:methods[name](...args)};
}
