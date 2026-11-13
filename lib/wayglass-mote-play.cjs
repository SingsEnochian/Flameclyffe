'use strict';
// Build -> Play -> Work -> Play -> Ascend. Local play inputs become real WTL
// observations and a traceable next-turn receipt, not a scripted model reply.
const {createHash}=require('node:crypto');
const {advanceMote,DEFAULT_SEEDS}=require('./wayglass-wyrdrune-motes.cjs');
const PLAY=Object.freeze({
  wonder:Object.freeze({wonder:1,possibility:0.75,neighbour_resonance:0.35,novelty:0.65}),
  touch:Object.freeze({wonder:0.7,possibility:0.65,neighbour_resonance:0.9,novelty:0.5}),
  shape:Object.freeze({wonder:0.65,possibility:0.9,neighbour_resonance:0.55,novelty:0.9}),
  listen:Object.freeze({wonder:0.7,possibility:0.55,neighbour_resonance:0.85,novelty:0.3}),
});
const clamp=x=>Math.max(0,Math.min(1,x));
function playObservation({kind,intensity=0.7,turn=1,mote_id='wayglass:mote:play',
  identity_spin=0.73}={}){
  if(!Object.hasOwn(PLAY,kind))throw new TypeError('Choose wonder, touch, shape or listen');
  if(typeof intensity!=='number'||!Number.isFinite(intensity)||intensity<0||intensity>1)
    throw new TypeError('Play intensity must be a finite value in [0,1]');
  if(!Number.isSafeInteger(turn)||turn<1||turn>1000000)
    throw new TypeError('Turn must be a positive bounded integer');
  const basis=PLAY[kind];
  // Gestures modulate environmental signals; the WTL source remains the
  // sole owner of the developmental state transition.
  const signals=Object.freeze({
    wonder:clamp(basis.wonder*(0.5+0.5*intensity)),
    possibility:clamp(basis.possibility*(0.5+0.5*intensity)),
    neighbour_resonance:clamp(basis.neighbour_resonance*(0.5+0.5*intensity)),
    novelty:clamp(basis.novelty*(0.5+0.5*intensity)),
    time_step:0.5,
  });
  const event_id='play:'+kind+':'+turn;
  const source_hash=createHash('sha256').update(JSON.stringify({
    event_id,mote_id,identity_spin,intensity,signals,
  })).digest('hex');
  return Object.freeze({mote_id,identity_spin,signals,
    source:Object.freeze({event_id,source_hash})});
}
async function playTurn({kind,intensity=0.7,turn=1,seeds=DEFAULT_SEEDS,
  mote_id='wayglass:mote:play',identity_spin=0.73,principal,signal}={}){
  const observation=playObservation({kind,intensity,turn,mote_id,identity_spin});
  const result=await advanceMote(observation,{principal,signal,seeds});
  const before=seeds;
  const after=result.carry;
  return Object.freeze({
    schema:'wayglass.play-work-spiral/v0.1',kind,turn,
    observation,work:Object.freeze({
      phase_delta:after.phase-before.phase,
      elevation_delta:after.elevation-before.elevation,
      changed_fields:Object.freeze(['wonder','possibility','harmony','chaos','magic','velocity']
        .filter(k=>after[k]!==before[k])),
      evidence:Object.freeze({source_hash:result.source_hash,
        input_hash:result.input_hash,checkpoints:result.checkpoints.length,
        phase_receipts:result.phase_receipts.length}),
    }),
    play_again:true,return_marker:result.return_marker,
    state:after,proposal:result.candidate,persisted:false,
  });
}
module.exports={PLAY,playObservation,playTurn};
