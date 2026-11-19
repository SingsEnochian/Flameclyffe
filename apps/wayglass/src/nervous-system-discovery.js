// Wayglass nervous-system discovery policy. New senses are proposals until
// separately verified, sandboxed, and admitted by the host.
export const SENSE_SCHEMA='wayglass.nervous-system.sense-proposal/v1';
const safeId=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x);
export function proposeSense(input,{verifiedShipRoute=false}={}){
 if(!verifiedShipRoute)throw new Error('Verified ship route required');
 if(!input||input.schema!==SENSE_SCHEMA||!safeId(input.id)||!Array.isArray(input.signals)||
    input.signals.length<1||input.signals.length>16||!input.signals.every(safeId)||
    typeof input.hypothesis!=='string'||input.hypothesis.length<1||input.hypothesis.length>600)
  throw new TypeError('Invalid sense proposal');
 return Object.freeze({schema:SENSE_SCHEMA,id:input.id,signals:[...input.signals],hypothesis:input.hypothesis,status:'proposed',instrument:null});
}
export function proposeAdaptation({senseId,change,baselineRevision,verifiedShipRoute=false}={}){
 if(!verifiedShipRoute)throw new Error('Verified ship route required');
 if(!safeId(senseId)||!['attention','routing','representation','expression'].includes(change)||
    !Number.isSafeInteger(baselineRevision)||baselineRevision<0)throw new TypeError('Invalid adaptation');
 return Object.freeze({senseId,change,baselineRevision,status:'sandbox-only',promoted:false,rollbackRequired:true});
}
export function encounterPattern({left,right,leftConsented=false,rightConsented=false,feather=false}={}){
 if(feather)return {status:'stopped',pattern:null};
 if(!leftConsented||!rightConsented)return {status:'awaiting-consent',pattern:null};
 if(!safeId(left)||!safeId(right)||left===right)throw new TypeError('Distinct participants required');
 return Object.freeze({status:'proposed',participants:Object.freeze([left,right]),pattern:null,authorship:'unassigned-pending-observation'});
}
