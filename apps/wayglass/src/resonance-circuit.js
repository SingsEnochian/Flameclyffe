// Nervous-system event integration across Wayglass's existing projection lanes.
// This is an in-process adapter, not a provider connection or persistent host.
import {createResonanceNervousSystem} from './resonance-nervous-system.js';
import {projectResonance} from './resonance-bridge.js';
export function createResonanceCircuit({emit,feather=()=>false,audioAllowed=()=>false,hapticsAllowed=()=>false}={}){
 if(typeof emit!=='function')throw new TypeError('Projection sink required');
 const system=createResonanceNervousSystem();
 const provenance=new Map();
 let stopped=false;
 function compose(proposal,{verifiedShipRoute=false,source}={}){
  if(stopped||feather())return {status:'feather-stopped'};
  if(!verifiedShipRoute||source?.participant_id!=='wayglass'||source?.route_id!=='wayglass:ship'||
    typeof source?.receipt_id!=='string'||!source.receipt_id.trim())
   throw new Error('Verified Wayglass source and receipt required');
  const value=system.compose(proposal,{verifiedShipRoute});
  provenance.set(value.id,structuredClone(source));
  return project(value);
 }
 function project(value){
  if(stopped||feather())return {status:'feather-stopped',projections:[]};
  const result=projectResonance({resonance:value,revision:system.snapshot().revision,
   source:provenance.get(value.id),audioOptIn:audioAllowed()===true,hapticsOptIn:hapticsAllowed()===true});
  // Projection sinks must independently enforce output permission and durable storage.
  for(const item of result.projections)emit(structuredClone(item));
  return result;
 }
 function release(id,{verifiedShipRoute=false}={}){
  if(stopped||feather())return false;
  const changed=system.release(id,{verifiedShipRoute});
  if(changed)provenance.delete(id);
  return changed;
 }
 function stop(){stopped=true;provenance.clear();return {status:'feather-stopped'};}
 function resume({confirmed=false}={}){if(!confirmed)throw new Error('Explicit Feather release required');stopped=false;}
 return Object.freeze({compose,release,stop,resume,snapshot:()=>system.snapshot()});
}
