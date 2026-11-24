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
