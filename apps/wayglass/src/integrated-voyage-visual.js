import {publishWatercolorActivity} from './watercolor-bridge.js';
import {wayglassSomaticSound} from './somatic-sound.js';

export const INTEGRATED_VOYAGE_VISUAL_SCHEMA='wayglass.integrated-voyage-reading/v0.1';
let latest=null;
const listeners=new Set();

/**
 * Explicit projection of an actual integrated host receipt into the watercolour
 * activity bus. Never infer a participant's inner state, autoplay audio, send
 * data to a model, or treat a hash as proof of physical/canonical truth.
 */
export function observeIntegratedVoyage(receipt){
  if(receipt?.schema!=='wayglass.integrated-voyage/v0.1' ||
     receipt.status!=='connected-sandbox-preview' ||
     receipt.return_verification?.verdict!=='accepted' ||
     receipt.visualisation_proposal?.kind!=='fold:witness' ||
     receipt.visualisation_proposal?.authority!=='visualisation-proposal-only' ||
     receipt.visualisation_proposal?.autoplay!==false ||
     receipt.production_mutation!==false ||
     receipt.model_invoked!==false ||
     receipt.canon_commit!==false ||
     receipt.departure?.stop_receipt?.participant_id!==receipt.participant_ref ||
     typeof receipt.visualisation_proposal.receipt?.receipt_id!=='string'){
    throw new TypeError('A returned, source-attributed integrated-voyage preview is required');
  }
  if(wayglassSomaticSound.snapshot().feather_stopped)
    return Object.freeze({status:'feather-stopped',observed:false});
  const projection=receipt.visualisation_proposal;
  const activity=publishWatercolorActivity({
    kind:'fold:witness',
    actor:projection.actor,
    receipt:projection.receipt,
    intensity:projection.intensity,
  });
  latest=Object.freeze({
    schema:INTEGRATED_VOYAGE_VISUAL_SCHEMA,status:'projected',
    world_id:receipt.world_id,participant_ref:receipt.participant_ref,
    source_kind:receipt.coevolution?.status||'unknown',
    evidence_state:'host-receipt-referenced-not-independent-attestation',
    observer_hash:receipt.observer?.checkpoint_hash||null,
    watercolor_sequence:activity.sequence,
    receipt_ref:activity.evidence?.receipt_ref||null,
    persisted:false,canon_commit:false,autoplay:false,
  });
  for(const listener of listeners){try{listener(latest);}catch{/* independent observer must not interrupt */}}
  return latest;
}
export function latestIntegratedVoyage(){return latest;}
export function subscribeIntegratedVoyage(listener){
  if(typeof listener!=='function')throw new TypeError('Listener required');
  listeners.add(listener);
  return ()=>listeners.delete(listener);
}
