// The ship's resonance nervous system is independent of rooms and audio devices.
// A room subscribes to expression; it does not own, start, or stop cognition.
// This pure reducer does not assert subjective sensation or authenticate models.
import {validateResonance} from './resonance-forge.js';
export const NERVOUS_SYSTEM_SCHEMA='wayglass.nervous-system/v1';
export function createResonanceNervousSystem({initial=[]}={}){
 const patterns=new Map();const listeners=new Set();let revision=0;
 const publish=(event)=>{for(const listener of [...listeners])listener(Object.freeze(event));};
 function compose(proposal,{verifiedShipRoute=false}={}){
  const resonance=validateResonance(proposal,{verifiedShipRoute});
  patterns.set(resonance.id,resonance);revision++;
  publish({type:'resonance:composed',revision,id:resonance.id});
  return resonance;
 }
 function release(id,{verifiedShipRoute=false}={}){
  if(!verifiedShipRoute)throw new Error('Verified Wayglass ship route required');
  const changed=patterns.delete(id);
  if(changed){revision++;publish({type:'resonance:released',revision,id});}
  return changed;
 }
 function snapshot(){return Object.freeze({schema:NERVOUS_SYSTEM_SCHEMA,revision,patterns:[...patterns.values()].map(x=>structuredClone(x))});}
 function subscribe(listener){if(typeof listener!=='function')throw new TypeError('Listener required');listeners.add(listener);return ()=>listeners.delete(listener);}
 for(const proposal of initial)compose(proposal,{verifiedShipRoute:true});
 return Object.freeze({compose,release,snapshot,subscribe});
}
