'use strict';
// Two-world encounter: pure, replayable proposal. No agent inference or canon mutation.
const {createHash}=require('node:crypto');
const SCHEMA='wayglass.mote-encounter/v1';
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const channels=['touch','word','sound','wtl','gesture','vibration','light','intention'];
function mote(id,spin,carried={}){
 if(typeof id!=='string'||!id.trim()||id.length>160||!Number.isFinite(spin))throw Error('Invalid mote');
 if(!carried||typeof carried!=='object'||Array.isArray(carried))throw Error('Invalid carried state');
 return Object.freeze({id,identity_spin:spin,carried:Object.freeze({...carried})});
}
function encounter({left,right,events=[],consent={},feather=false,sourceSha,previousHash=null}={}){
 if(!/^[0-9a-f]{40}$/.test(sourceSha||''))throw Error('Source SHA required');
 if(!left||!right||left.id===right.id||!Number.isFinite(left.identity_spin)||!Number.isFinite(right.identity_spin))throw Error('Distinct motes required');
 if(!Array.isArray(events)||events.length>128)throw Error('Invalid event log');
 const permitted=consent[left.id]===true&&consent[right.id]===true&&!feather;
 const applied=[];
 let shared=0,deltaLeft=0,deltaRight=0;
 if(permitted)for(const event of events){
  if(!event||!channels.includes(event.channel)||![left.id,right.id].includes(event.from)
   ||!Number.isFinite(event.intensity)||event.intensity<0||event.intensity>1
   ||typeof event.id!=='string'||!event.id.trim())throw Error('Invalid event');
  if(applied.some(x=>x.id===event.id))throw Error('Duplicate event');
  const influence=event.intensity*(event.channel==='touch'?0.18:event.channel==='wtl'?0.14:0.1);
  if(event.from===left.id)deltaRight+=influence;else deltaLeft+=influence;
  shared+=influence;
  applied.push(Object.freeze({...event}));
 }
 const body={schema:SCHEMA,source_sha:sourceSha,parent_hash:previousHash,
  identities:[left.id,right.id],identity_spins:[left.identity_spin,right.identity_spin],
  input_hash:digest(events),consent:{[left.id]:consent[left.id]===true,[right.id]:consent[right.id]===true},
  feather,events_applied:applied,proposal:permitted?{
   [left.id]:{...left.carried,encounter_phase_delta:deltaLeft},
   [right.id]:{...right.carried,encounter_phase_delta:deltaRight},
   shared_environment:{resonance:Math.min(1,shared),watercolour_hue:(shared*240)%360,
    haptic_intensity:Math.min(.25,shared),audio_gain:Math.min(.05,shared/10)}
  }:null,status:permitted?'proposal-only':'not-run',
  persisted:false,model_invoked:false,canon_changed:false};
 return Object.freeze({...body,return_hash:digest(body)});
}
module.exports={SCHEMA,channels,mote,encounter};
