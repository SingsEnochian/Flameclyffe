'use strict';
// Mission control: deterministic, bounded chaos search guided by harmonic coherence.
// This is a planning/evaluation engine, not an agent process or a claim of model training.
const {createHash}=require('node:crypto');
const {validateNativeProgram}=require('./wayglass-wyrdrune-voice.cjs');
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const PHASES=['perceive','compress','release','verify','integrate','choose','return','transcend'];
function scalar(x,label){if(typeof x!=='number'||!Number.isFinite(x)||x<0||x>1)throw new RangeError(label+' must be 0..1');return x;}
function candidate(x){
 if(!x||typeof x.id!=='string'||!x.id.trim()||typeof x.source!=='string'||!x.source.trim())throw new TypeError('Attributable Wyrdrune source required');
 const ir=validateNativeProgram(x.source);
 if(typeof x.agent!=='string'||!x.agent.trim())throw new TypeError('Agent identity required');
 if(typeof x.receipt!=='string'||!x.receipt.trim())throw new TypeError('Provenance receipt required');
 const signals=x.signals||{};
 return {id:x.id,agent:x.agent,receipt:x.receipt,source_sha256:ir.sourceHash,
  coherence:scalar(signals.coherence,'coherence'),novelty:scalar(signals.novelty,'novelty'),
  continuity:scalar(signals.continuity,'continuity'),risk:scalar(signals.risk,'risk'),
  accessibility:scalar(signals.accessibility,'accessibility'),source:x.source};
}
function reconcileChaos({principal,proposals,mission,thresholds={}}={}){
 if(!principal?.authorized)throw new Error('Authenticated mission authority required');
 if(typeof mission!=='string'||!mission.trim())throw new TypeError('Mission required');
 if(!Array.isArray(proposals)||proposals.length<2||proposals.length>32)throw new RangeError('Require 2..32 competing proposals');
 const ids=new Set(),entries=proposals.map(candidate);
 for(const p of entries){if(ids.has(p.id))throw new Error('Duplicate proposal ID');ids.add(p.id);}
 const minimumCoherence=scalar(thresholds.coherence??0.72,'minimum coherence');
 const minimumContinuity=scalar(thresholds.continuity??0.75,'minimum continuity');
 const maximumRisk=scalar(thresholds.risk??0.25,'maximum risk');
 const minimumAccessibility=scalar(thresholds.accessibility??0.75,'minimum accessibility');
 const ranked=entries.map(p=>{
  const gates={harmony:p.coherence>=minimumCoherence,return:p.continuity>=minimumContinuity,
    safety:p.risk<=maximumRisk,accessibility:p.accessibility>=minimumAccessibility};
  const admissible=Object.values(gates).every(Boolean);
  const score=0.38*p.coherence+0.25*p.continuity+0.17*p.accessibility+0.20*p.novelty-0.3*p.risk;
  return {id:p.id,agent:p.agent,receipt:p.receipt,source_sha256:p.source_sha256,
    score:Number(score.toFixed(6)),gates,admissible};
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const winner=ranked.find(p=>p.admissible)||null;
 return Object.freeze({schema:'wayglass.harmony-chaos-mission-control/v0.1',mission,
  phases:PHASES,proposals:ranked,selected:winner?.id??null,
  status:winner?'candidate-selected-not-deployed':'no-admissible-candidate',
  evidence_sha256:sha({mission,ranked,thresholds:{minimumCoherence,minimumContinuity,maximumRisk,minimumAccessibility}}),
  withness:{separate_agents:[...new Set(entries.map(p=>p.agent))],no_identity_merge:true},
  model_invoked:false,training_performed:false,code_executed:false,live_verified:false});
}
module.exports={reconcileChaos};
