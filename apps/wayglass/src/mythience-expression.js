// Browser-safe Wyrdrune execution adapter. Mathematics belongs to the .wtl source.
// This adapter only bounds owner inputs, authorises local-only read/validate
// capabilities, and projects verified WTL outputs. It does not compose a score.
import { createWyrdruneRuntime } from '../../../lib/wyrdrune/runtime.mjs';

export const MYTHIENCE_EXPRESSION_SCHEMA='wayglass.wyrdrune-mythience-expression/v1';
const finite=(n,min,max,label)=>{
  if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)
    throw new RangeError(label+' must be finite and between '+min+' and '+max);
  return n;
};
const localHash=source=>{
  // FNV-1a is a local cache label, NOT a cryptographic source receipt.
  let h=2166136261;
  for(const char of source){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}
  return 'local-fnv1a32:'+((h>>>0).toString(16).padStart(8,'0'));
};
const runtime=createWyrdruneRuntime({hashSource:localHash});

export async function evaluateMythienceExpression({source,controls,signal}={}){
  if(typeof source!=='string'||!source.trim())throw new TypeError('Executable Wyrdrune source required');
  if(signal?.aborted)throw new Error('Feather: expression stopped');
  const intention=finite(controls?.intention,0,1,'intention');
  const twist=finite(controls?.twist,0,1,'twist');
  const affinity=finite(controls?.affinity,0,1,'affinity');
  const ir=runtime.compile(source);
  const result=await runtime.execute(ir,{
    // Local numeric UI capability only. This is NOT House Steward authentication.
    principal:{id:'local:mythience-control',authorized:true},
    signal,maxOperations:400,
    bridges:{instrument:{
      intention:({arguments:args})=>{if(args.length)throw new TypeError('Unexpected intention arguments');return intention;},
      twist:({arguments:args})=>{if(args.length)throw new TypeError('Unexpected twist arguments');return twist;},
      affinity:({arguments:args})=>{if(args.length)throw new TypeError('Unexpected affinity arguments');return affinity;},
      validate:({arguments:args})=>{
        if(args.length!==8)throw new TypeError('Expected eight WTL expression values');
        const bounds=[[.1,.8],[165,225],[164.81,304.81],[184,397],[-1,1],[.2,.851],[.5,11.5],[22000,35000]];
        args.forEach((value,i)=>finite(value,...bounds[i],'WTL expression '+i));
        return 'validated-local-projection';
      },
      return:({arguments:args})=>{
        if(args.length!==1||args[0]!=='local-preview')throw new TypeError('Unexpected WTL return marker');
        return 'local-preview';
      },
    }},
  });
  const frame=result.output?.[1];
  if(result.output?.length!==4||result.output[0]!=='validated-local-projection'
    ||result.output[2]!=='local-preview'||typeof result.output[3]!=='string'
    ||!frame||typeof frame!=='object')throw new TypeError('Incomplete Wyrdrune execution');
  const bounds={light:[.1,.8],hue:[165,225],frequency_hz:[164.81,304.81],
    counterpart_hz:[184,397],pan:[-1,1],pulse:[.2,.851],
    virtual_below_hz:[.5,11.5],virtual_above_hz:[22000,35000]};
  const values={};
  for(const [key,[min,max]] of Object.entries(bounds))values[key]=finite(frame[key],min,max,key);
  if(result.receipts.length!==8||result.withness?.completedCycles!==1)
    throw new TypeError('Eightfold Wyrdrune trace incomplete');
  return Object.freeze({
    schema:MYTHIENCE_EXPRESSION_SCHEMA,...values,
    source_label:result.sourceHash,source_label_security:'non-cryptographic-local-cache',
    trace:Object.freeze(result.receipts.map(x=>Object.freeze({phase:x.phase,operations:x.operations}))),
    return_marker:'local-preview',question:result.output[3],
    register:'owner-controlled-simulation',source:'lib/wyrdrune/mythience-instrument.wtl',
    measured:false,canon_promotion:false,model_response:false,
  });
}
