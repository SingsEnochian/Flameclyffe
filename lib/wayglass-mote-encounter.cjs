'use strict';
// Two sovereign motes encounter one another. Both must opt in, and both read
// the other's *previous* state, so neither receives a privileged first move.
// The host supplies bounded relational observations; native WTL owns changes.
const {createHash}=require('node:crypto');
const {playObservation}=require('./wayglass-mote-play.cjs');
const {advanceMote,DEFAULT_SEEDS,validateSeeds}=require('./wayglass-wyrdrune-motes.cjs');
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function validateParticipant(value,index){
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw new TypeError('Encounter participant '+index+' must be a record');
  if(value.consent!==true)
    throw new Error('Encounter requires explicit consent from each participant');
  const {mote_id,identity_spin,kind,intensity=0.7}=value;
  const observation=playObservation({kind,intensity,turn:1,mote_id,identity_spin});
  // advanceMote is the authority for state bounds and source validation.
  const seeds=validateSeeds(value.seeds===undefined?DEFAULT_SEEDS:value.seeds);
  return {mote_id,identity_spin,kind,intensity,observation,seeds};
}
async function encounterTurn({participants,turn=1,principal,signal}={}){
  if(!Array.isArray(participants)||participants.length!==2)
    throw new TypeError('Encounter requires exactly two participants');
  if(!Number.isSafeInteger(turn)||turn<1||turn>1000000)
    throw new TypeError('Encounter turn must be a positive bounded integer');
  if(!principal?.authorized||typeof principal.id!=='string'||!principal.id.trim())
    throw new Error('Encounter requires an authenticated House principal');
  if(signal?.aborted)throw new Error('Feather: encounter stopped before observation');
  const pair=participants.map(validateParticipant);
  if(pair[0].mote_id===pair[1].mote_id)
    throw new Error('Encounter requires two distinct mote identities');
  // Only previous carried states are read: deterministic, symmetric encounter.
  const encounter_id='encounter:'+turn+':'+sha(pair.map(p=>({
    mote_id:p.mote_id,identity_spin:p.identity_spin,kind:p.kind,
    intensity:p.intensity,seeds:p.seeds
  }))).slice(0,24);
  const observations=pair.map((self,i)=>{
    const other=pair[1-i];
    const signals=Object.freeze({
      ...self.observation.signals,
      neighbour_resonance:(other.seeds.harmony+other.seeds.magic)/2,
    });
    return Object.freeze({
      mote_id:self.mote_id,identity_spin:self.identity_spin,signals,
      source:Object.freeze({
        event_id:encounter_id+':'+i,
        source_hash:sha({encounter_id,self:self.mote_id,other:other.mote_id,
          signals,prior_self:self.seeds,prior_other:other.seeds}),
      }),
    });
  });
  // Do not write either candidate. A host must separately authorise adoption.
  const results=await Promise.all(observations.map((observation,i)=>
    advanceMote(observation,{principal,signal,seeds:pair[i].seeds})));
  const changes=results.map((result,i)=>Object.freeze({
    mote_id:pair[i].mote_id,identity_spin:pair[i].identity_spin,
    kind:pair[i].kind,previous:pair[i].seeds,proposed:result.carry,
    proposal:result.candidate,return_marker:result.return_marker,
    evidence:Object.freeze({source_hash:result.source_hash,
      input_hash:result.input_hash,phase_receipts:result.phase_receipts.length,
      checkpoints:result.checkpoints.length}),
  }));
  const projection=Object.freeze({
    // Read-only visual/audio hints, not a shared participant identity or state.
    hue_shift:(changes[0].proposed.magic+changes[1].proposed.magic)/2,
    pulse:(changes[0].proposed.velocity+changes[1].proposed.velocity)/2,
    contrast:Math.abs(changes[0].proposed.chaos-changes[1].proposed.chaos),
  });
  return Object.freeze({
    schema:'wayglass.mote-encounter/v0.1',encounter_id,turn,
    consent:'both-explicit',simultaneous:true,changes:Object.freeze(changes),
    projection,source_hash:sha(observations),persisted:false,
    canon_adopted:false,model_invoked:false,
    next_question:'What changed for each mote when they met?',
  });
}
module.exports={encounterTurn};
