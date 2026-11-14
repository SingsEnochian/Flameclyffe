// The Triptych Lift is a real ship surface, not an invented model route.
// Native Wyrdrune owns topology and acoustic values. Browser code only renders,
// checks destinations and plays explicitly requested, conservative previews.
import triptychSource from '../../../lib/wyrdrune/triptych-mobius-lift.wtl?raw';
import {createWyrdruneRuntime} from '../../../lib/wyrdrune/runtime.mjs';
import {mountTriptychJourney} from './triptych-lift-journey.js';

export const TRIPTYCH_ALLOWED_ROOMS=Object.freeze([
  'wayglass:living-watercolor',
  'wayglass:journey-before-destination',
  'wayglass:living-observer',
]);
export async function compileTriptychLift({source=triptychSource,cryptoProvider=globalThis.crypto}={}){
  if(!cryptoProvider?.subtle)throw new Error('Secure browser hashing is required for source attribution.');
  const bytes=new TextEncoder().encode(source);
  const digest=Array.from(new Uint8Array(await cryptoProvider.subtle.digest('SHA-256',bytes)),
    byte=>byte.toString(16).padStart(2,'0')).join('');
  const runtime=createWyrdruneRuntime({hashSource:()=>digest});
  const result=await runtime.execute(runtime.compile(source));
  const plan=result.output.find(value=>value?.schema==='wayglass.triptych-lift/v0.1');
  if(!plan||plan.autoplay!==false||plan.reversible!==true||
     !Array.isArray(plan.panels)||plan.panels.length!==3||
     plan.panels.some((panel,index)=>panel.destination!==TRIPTYCH_ALLOWED_ROOMS[index]||
       !Number.isFinite(panel.root_hz)||panel.root_hz<50||panel.root_hz>1000||
       !Number.isFinite(panel.upper_hz)||panel.upper_hz<20||panel.upper_hz>1000||
       !Number.isFinite(panel.gain)||panel.gain<=0||panel.gain>0.12))
    throw new TypeError('Wyrdrune triptych emitted an unsafe or unknown route/score.');
  if(result.withness.completedCycles!==2||result.receipts.length!==16)
    throw new TypeError('Both Eightfold Möbius cycles must complete.');
  return Object.freeze({source_sha256:digest,plan,receipts:result.receipts,origin:'native Wyrdrune'});
}

export function mountWayglassTriptychLift(root,{navigate,scope=globalThis,compile=compileTriptychLift}={}){
  return mountTriptychJourney(root,{navigate,scope,compile});
}
