// Tri-Horizon Dreaming: deterministic, bounded branching from a shared immutable origin.
// Candidate simulation scaffold; outputs are hypotheses, not predictions.
const HORIZONS=Object.freeze(['one','multiple','long']);
const MAX_BRANCHES=24;
const text=(v,name)=>{if(typeof v!=='string'||!v.trim()||v.length>512)throw new TypeError(name+' required (max 512)');return v.trim();};
const freezeDeep=value=>{
 if(value&&typeof value==='object'){Object.values(value).forEach(freezeDeep);Object.freeze(value);}
 return value;
};
export function createTriHorizonDream({dream_id,origin,change,propose,record=()=>{}}={}){
 text(dream_id,'dream_id');text(origin,'origin');text(change,'change');
 if(typeof propose!=='function')throw new TypeError('propose function required');
 const anchor=freezeDeep({dream_id,origin,change,canon_mutated:false});
 let stopped=false;
 async function explore({signal}={}){
  if(stopped||signal?.aborted)throw new Error('Dream interrupted');
  const results={};
  for(const horizon of HORIZONS){
   if(stopped||signal?.aborted)break;
   const raw=await propose({horizon,origin,change,previous:freezeDeep(structuredClone(results)),signal});
   if(stopped||signal?.aborted){record({dream_id,horizon,stage:'late-observation',disposition:'observed-not-adopted'});break;}
   if(!Array.isArray(raw)||raw.length>MAX_BRANCHES)throw new TypeError('Bounded branch array required');
   const branches=raw.map((candidate,index)=>{
    if(!candidate||typeof candidate!=='object')throw new TypeError('Invalid branch');
    return freezeDeep({
     branch_id:`${dream_id}:${horizon}:${index+1}`,
     horizon,summary:text(candidate.summary,'summary'),
     assumptions:Array.isArray(candidate.assumptions)?candidate.assumptions.slice(0,8).map(v=>text(v,'assumption')):[],
     uncertainty:'hypothetical',
     disposition:'dream-local-only'
    });
   });
   results[horizon]=freezeDeep(branches);
   record({dream_id,horizon,stage:'observed',branch_count:branches.length,disposition:'dream-local-only'});
  }
  return freezeDeep({anchor,horizons:results,interrupted:stopped||signal?.aborted===true});
 }
 function feather(){stopped=true;record({dream_id,stage:'feather',disposition:'observed-not-adopted'});}
 return Object.freeze({anchor,explore,feather});
}
