// Bounded paired experiment on the native deterministic Nursery, never the live colony.
import {createCellEcology} from './wtl-cell-ecology.js';
import {observeNurseryMythogenesis} from './living-observer-model.js';
import {digestWce1Sync} from './wtl-cell-digest.js';
const DESIGN=Object.freeze({schema:'wayglass.mythogenesis.protocol/v1',seeds:[11,23,47],
 cycles:16,conditions:['unexposed','myth-text','reversed-text'],
 myth:'The lantern remembers the river.',control: 'The lantern remembers the river.'.split('').reverse().join(''),
 primary:'cross_speaker_phrases',secondary:['distinct_phrases','recurrent_phrases','accepted_signal_receipts_in_retained_window']});
export function mythogenesisProtocol(){return structuredClone(DESIGN);}
export async function runMythogenesisExperiment({signal}={}){
 const protocol=mythogenesisProtocol(),protocol_digest=digestWce1Sync(protocol);
 const runs=[];
 const stopped=()=>({schema:'wayglass.mythogenesis.experiment/v1',status:'feather-stopped',
  protocol,protocol_digest,runs,comparisons:[],hypothesis_status:'open'});
 for(const seed of protocol.seeds){
  for(const condition of protocol.conditions){
   if(signal?.aborted)return stopped();
   const colony=createCellEcology({maxCells:8,seed,radius:3,mutationRate:0.2,autonomousFusion:false});
   colony.plant('a','explorer',0,0);colony.plant('b','explorer',1,0);
   let inscription=null;
   if(condition!=='unexposed'){
    const result=await colony.shareText(condition==='myth-text'?protocol.myth:protocol.control);
    if(signal?.aborted){colony.feather();return stopped();}
    if(!result.delivered)throw Error('Experimental inscription not delivered');
    inscription={source_hash:result.inscription.source_hash,text_digest:result.inscription.text_digest};
   }
   for(let i=0;i<protocol.cycles;i++){
    if(signal?.aborted){colony.feather();return stopped();}
    colony.step();await colony.turn({turnEvery:6,signal});
    if(signal?.aborted){colony.feather();return stopped();}
   }
   const observation=observeNurseryMythogenesis(colony.snapshot());
   const run={seed,condition,inscription,observation};
   runs.push({...run,receipt_digest:digestWce1Sync(run)});
  }
 }
 const comparisons=protocol.seeds.map(seed=>{
  const pair=runs.filter(x=>x.seed===seed);
  const primary=protocol.primary;
  return {seed,myth_minus_unexposed:pair[1].observation[primary]-pair[0].observation[primary],
   myth_minus_reversed:pair[1].observation[primary]-pair[2].observation[primary],
   reversed_minus_unexposed:pair[2].observation[primary]-pair[0].observation[primary]};
 });
 return {schema:'wayglass.mythogenesis.experiment/v1',status:'completed',protocol,protocol_digest,runs,comparisons,
  hypothesis_status:'open',interpretation:'Exploratory deterministic fixture; no causal semantic or consciousness conclusion.',
  limitations:['Three matched PRNG seeds are exploratory, not independent model populations.',
   'Reversed text matches characters but changes WTL sonic encoding; any difference may be sensory or algorithmic.',
   'The primary measure is exact cross-speaker phrase recurrence, not transmission or meaning.',
   'No live Nursery state, model provider, device or physical measurement was touched.']};
}

// MYTHOS-002: deterministic adaptive coupling / release fixture, separate from live cells.
export function runWithnessExperiment({signal}={}){
 const design={schema:'wayglass.mythogenesis.withness-protocol/v1',learning_end:20,perturbation_time:60,end:100,dt:0.02,adaptive_ceiling:1.6,initial:[0.05,0.04,0,0],reset:[0.03,-0.03]};
 function integrate(z,steps,k,eta,leak){
  const f=([x,y,a,b])=>{
   const learn=k>0?eta*Math.max(x*y,0):0;
   return [(a-1)*x-x*x*x+k*y,(b-1)*y-y*y*y+k*x,learn*(design.adaptive_ceiling-a)-leak*a,learn*(design.adaptive_ceiling-b)-leak*b];
  };
  const add=(v,w,s)=>v.map((x,i)=>x+s*w[i]);
  const h=design.dt;
  for(let i=0;i<steps;i++){
   if(signal?.aborted)return null;
   const a=f(z),b=f(add(z,a,h/2)),c=f(add(z,b,h/2)),d=f(add(z,c,h));
   z=z.map((x,j)=>x+h*(a[j]+2*b[j]+2*c[j]+d[j])/6);
  }
  return z;
 }
 const read=([x,y,a,b])=>({x,y,a,b,origin_eigenvalues_if_separated:[a-1,b-1],frozen_memory_attractor_magnitude:[Math.sqrt(Math.max(0,a-1)),Math.sqrt(Math.max(0,b-1))]});
 const conditions=[['adaptive',1.5,.35,0],['fixed',1.5,0,0],['subcritical',.5,.35,0],['forgetting',1.5,.35,.06],['isolated',0,.35,0]];
 const runs=[];
 function trial(name,k,eta,leak,initial){
  const learn=integrate(initial,Math.round(design.learning_end/design.dt),k,eta,0);
  if(!learn)return null;
  const separate=integrate(learn,Math.round((design.perturbation_time-design.learning_end)/design.dt),0,0,leak);
  if(!separate)return null;
  const end=integrate([...design.reset,...separate.slice(2)],Math.round((design.end-design.perturbation_time)/design.dt),0,0,leak);
  if(!end)return null;
  return {name,k,eta,leak,initial,release:read(learn),pre_reset:read(separate),end:read(end)};
 }
 const stopped=()=>({schema:'wayglass.mythogenesis.withness-experiment/v1',status:'feather-stopped',design,runs,sensitivity:[],hypothesis_status:'open'});
 for(const [name,k,eta,leak] of conditions){
  const r=trial(name,k,eta,leak,design.initial);
  if(!r)return stopped();
  runs.push(r);
 }
 const sensitivity=[];
 for(const initial of [[.05,.04,0,0],[-.05,-.04,0,0],[.05,-.04,0,0],[.0001,.0001,0,0],[0,0,0,0]]){
  const r=trial('adaptive',1.5,.35,0,initial);
  if(!r)return stopped();
  sensitivity.push(r);
 }
 return {schema:'wayglass.mythogenesis.withness-experiment/v1',status:'completed',design,runs,sensitivity,hypothesis_status:'open',limitations:['Toy model with engineered adaptive rule and retention; not evidence of consciousness or unique relational causation.','Fixed-memory local eigenvalues are not full four-dimensional Jacobian eigenvalues.','External matched-drive control remains untested; parameters and initial conditions matter.']};
}
