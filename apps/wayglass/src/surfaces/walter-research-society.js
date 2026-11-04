import { deliberateThirdLight } from './walter-agent-deliberation.js';

const MODELS=['linear','branch','fold','projection','third'];
const MAX_CYCLES=5;
const MAX_HISTORY=50;
const REQUIRED=['finding','constraint','open_question','discriminating_observation','epistemic_label','source_ids'];
const sourceIds=['walter:1933','walter:1950'];
const clone=value=>JSON.parse(JSON.stringify(value));
export function createResearchSocietyState({missionId='third-light-001'}={}) {
  return {schema:'wayglass.research-society/v0.1',mission_id:missionId,cycle:0,
    agenda:MODELS.map((model,i)=>({id:'agenda:'+model,model,priority:MODELS.length-i,status:'open'})),
    ledger:[],methods:[{id:'baseline-v1',version:1,status:'active',description:'Independent proposal, cross-seat critique, revision'}],
    evaluations:[],unresolved:['What observation could distinguish the two Walter histories?'],
    next_owner:'research-society',stop_point:'ready',revoked_source_ids:[],canon_promoted:false};
}
export function validateSocietyState(state){
  if(state?.schema!=='wayglass.research-society/v0.1'||!Array.isArray(state.ledger)||!Array.isArray(state.agenda)||!Array.isArray(state.methods))throw Error('Invalid society state');
  if(!Number.isInteger(state.cycle)||state.cycle<0||state.cycle>MAX_HISTORY)throw Error('Invalid cycle');
  if(state.ledger.length>MAX_HISTORY)throw Error('Ledger exceeds bound');
  if(state.canon_promoted!==false)throw Error('Unauthorized authority promotion');
  return true;
}
function scoreDossier(dossier){
  const entries=dossier.entries||[];
  const valid=entries.filter(e=>e.status==='candidate'&&e.result&&REQUIRED.every(k=>Object.hasOwn(e.result,k))&&
    sourceIds.every(id=>e.result.source_ids.includes(id)));
  const stages=new Set(valid.map(e=>e.stage));
  const seats=new Set(valid.map(e=>e.seat_id));
  const diversity=stages.size/3;
  const coverage=seats.size/5;
  const completion=valid.length/15;
  return {score:Math.round(100*(0.5*completion+0.25*diversity+0.25*coverage)),
    structurally_valid:valid.length,distinct_stages:stages.size,distinct_seats:seats.size,
    evidence_verified:0,metric:'structure-only-not-research-quality'};
}
export function proposeMethodImprovement(state,latest){
  validateSocietyState(state);
  const previous=state.evaluations.at(-2);
  const candidate={id:'method-candidate:'+state.cycle,version:state.cycle+1,status:'proposed',
    description:latest.score<90?'Add source-grounded observation checks and request JSON repair on invalid outputs':'Add independent evidence retrieval and contradiction cross-checks',
    rationale:'Improve the weakest observable evaluation dimension without changing permissions',
    requires_evaluation:true,requires_owner_approval_for_runtime_change:true};
  // Never automatically promote based on self-scoring or a single unverified run.
  return {...candidate,baseline_score:previous?.score??null,observed_score:latest.score,
    eligible_for_promotion:false};
}
export function exportResearchSocietyCheckpoint(state){
  validateSocietyState(state);
  return clone({...state,stop_point:'checkpoint',next_owner:'research-society'});
}
export async function runResearchSociety({state=createResearchSocietyState(),routeId='openai:gpt',fetchImpl=fetch,
  maxCycles=1,onProgress=()=>{},signal}={}){
  validateSocietyState(state);
  if(!Number.isInteger(maxCycles)||maxCycles<1||maxCycles>MAX_CYCLES)throw Error('maxCycles must be 1..5');
  const next=clone(state);
  if(next.revoked_source_ids.some(id=>sourceIds.includes(id)))throw Error('Required source revoked; research stopped');
  for(let n=0;n<maxCycles;n++){
    if(signal?.aborted){next.stop_point='owner-stop';break;}
    const job=next.agenda.filter(x=>x.status==='open').sort((a,b)=>b.priority-a.priority)[0];
    if(!job){next.stop_point='agenda-complete';break;}
    next.stop_point='running:'+job.id;
    const dossier=await deliberateThirdLight({model:job.model,routeId,fetchImpl,signal,
      onProgress:item=>onProgress({type:'agent-receipt',cycle:next.cycle+1,agenda_id:job.id,entry:item})});
    const evaluation=scoreDossier(dossier);
    next.cycle++;
    const record={cycle:next.cycle,agenda_id:job.id,model:job.model,
      source_ids:[...sourceIds],dossier,evaluation,
      authority:'none',canon_promoted:false,review_status:'pending-owner-evidence-review'};
    next.ledger.push(record);
    next.evaluations.push({cycle:next.cycle,...evaluation});
    const proposal=proposeMethodImprovement(next,evaluation);
    next.methods.push(proposal);
    job.status='researched-awaiting-review';
    const questions=dossier.entries.filter(e=>e.status==='candidate').map(e=>e.result.open_question);
    next.unresolved=[...new Set([...next.unresolved,...questions])].slice(-40);
    next.stop_point='after:'+job.id;
    onProgress({type:'cycle-complete',cycle:next.cycle,agenda_id:job.id,evaluation,method_proposal:proposal});
    if(next.ledger.length>=MAX_HISTORY){next.stop_point='ledger-limit';break;}
  }
  next.next_owner='research-society';
  validateSocietyState(next);
  return next;
}
