/**
 * Wayglass Ship Sensory UI receiver.
 * Listens only for short-lived local keyboard notes, illuminating existing glass.
 * Receiver must never generate audio, trigger navigation, or write continuity.
 */
import {ShipSensorySpine} from './ship-sensory-spine.js';

export function describeShipSound(signal){
  if(!signal)return 'No local keyboard signal.';
  if(signal.kind==='feather')return 'Feather Stop observed from the local harmonic instrument. Silent.';
  if(signal.kind==='note-off')return 'Local harmonic instrument released a note. No navigation was attempted.';
  return 'Local instrument · '+signal.world_id+' · '+signal.mode+' · '+
    signal.frequency_hz.toFixed(1)+' Hz. Presentation signal only, not proof of a voyage.';
}

export function mountShipSensoryLink({scope=globalThis.document,spine=new ShipSensorySpine()}={}){
  const root=scope?.documentElement;
  const status=scope?.getElementById?.('wayglass-sensory-status');
  if(!root||!status){spine.close();return ()=>{};}
  let fade=null;
  const quiet=()=>{
    root.removeAttribute('data-wayglass-resonance');
    root.style.removeProperty('--wg-resonance-power');
  };
  const idle=()=>{quiet();status.textContent=spine.available
    ? 'Listening for another open Wayglass instrument · local and unverified'
    : 'Link unavailable in this browser · instruments still work separately';};
  const unsubscribe=spine.subscribe(signal=>{
    if(fade!==null)clearTimeout(fade);
    fade=null;
    status.textContent=describeShipSound(signal);
    if(signal.kind==='note-on'){
      root.dataset.wayglassResonance='active';
      root.style.setProperty('--wg-resonance-power',
        String(Math.max(.09,Math.min(.42,.1+signal.velocity/600))));
      fade=setTimeout(()=>{fade=null;quiet();},950);
    }else{
      quiet();
    }
  });
  idle();
  const cleanup=()=>{
    if(fade!==null)clearTimeout(fade);
    quiet();
    unsubscribe();
    spine.close();
  };
  scope.defaultView?.addEventListener?.('pagehide',cleanup,{once:true});
  return cleanup;
}
if(typeof document!=='undefined'){
  mountShipSensoryLink();
}
