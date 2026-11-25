// Learning receipts for Wayglass's resonance nervous system.
// A proposed pattern is not evidence of learning. Only independently observed
// comparison outcomes can be retained as provisional findings.
export const LEARNING_SCHEMA='wayglass.resonance-learning/v1';
const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x);
const receipt=x=>typeof x==='string'&&x.length>0&&x.length<=160&&!/[<>\x00-\x1f]/.test(x);
export function createResonanceLearningLedger(){
 const trials=new Map();let revision=0;
 function begin({trialId,resonanceId,sourceReceipt,baseline,feather=false}={}){
  if(feather)return {status:'feather-stopped'};
  if(!id(trialId)||!id(resonanceId)||!receipt(sourceReceipt)||!Number.isFinite(baseline)||
    trials.has(trialId))throw new TypeError('Invalid or duplicate learning trial');
  const trial={schema:LEARNING_SCHEMA,trialId,resonanceId,sourceReceipt,baseline,
    status:'awaiting-observation',observations:[],revision:++revision};
  trials.set(trialId,trial);return structuredClone(trial);
 }
 function observe({trialId,observationReceipt,measurement,sourceKind,feather=false}={}){
  if(feather)return {status:'feather-stopped'};
  const trial=trials.get(trialId);
  if(!trial||trial.status!=='awaiting-observation'||!receipt(observationReceipt)||
    !Number.isFinite(measurement)||!['test','instrument','owner-review'].includes(sourceKind))
    throw new TypeError('Independent observation required');
  if(observationReceipt===trial.sourceReceipt||trial.observations.some(x=>x.receipt===observationReceipt))
    throw new TypeError('Observation receipt must be distinct');
  trial.observations.push({receipt:observationReceipt,measurement,sourceKind});
  trial.revision=++revision;return structuredClone(trial);
 }
 function assess(trialId,{feather=false}={}){
  if(feather)return {status:'feather-stopped'};
  const trial=trials.get(trialId);
  if(!trial||trial.status!=='awaiting-observation'||trial.observations.length<2)
    throw new TypeError('Two independent observations required');
  const values=trial.observations.map(x=>x.measurement);
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  trial.status='provisional';trial.delta=mean-trial.baseline;trial.revision=++revision;
  return structuredClone(trial);
 }
 function snapshot(){return {schema:LEARNING_SCHEMA,revision,trials:[...trials.values()].map(x=>structuredClone(x))};}
 return Object.freeze({begin,observe,assess,snapshot});
}
