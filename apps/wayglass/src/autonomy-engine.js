// Autonomous inquiry engine: each cycle lets a participant choose its own next
// inquiry, execute it, reflect on the outcome, and revise its approach.
// The host supplies actual model adapters and durable checkpoint storage.
import {runConcurrentWork} from './concurrent-work.js';
import {createKnowledgeLineage,contributeKnowledge} from './knowledge-lineage.js';

export function createAutonomyState(participants=[]){
 return {schema:'wayglass.autonomy/v1',cycle:0,participants:[...participants],methods:{},history:[],knowledge:createKnowledgeLineage()};
}
export async function runAutonomyCycle(state,{propose,explore,reflect,concurrency=4,onReceipt=()=>{}}={}){
 if(![propose,explore,reflect].every(fn=>typeof fn==='function'))throw Error('Three model adapters required');
 const next=structuredClone(state);
 const tasks=next.participants.map(participant=>({participant,method:next.methods[participant]??null}));
 const results=await runConcurrentWork({tasks,concurrency,execute:async ({participant,method})=>{
  const proposal=await propose({participant,method,history:next.history.filter(x=>x.participant===participant)});
  if(!proposal||typeof proposal.question!=='string'||!proposal.question.trim())throw Error('No inquiry proposed');
  const observation=await explore({participant,proposal,method});
  const reflection=await reflect({participant,proposal,observation,method});
  if(!reflection||typeof reflection.learning!=='string'||!reflection.learning.trim())throw Error('No learning recorded');
  return {participant,proposal,observation,reflection};
 }});
 for(const result of results){
  if(result.status==='fulfilled'){
   const {participant,proposal,observation,reflection}=result.value;
   const recorded=contributeKnowledge(next.knowledge,{participant,content:reflection.learning,context:{cycle:next.cycle+1,question:proposal.question}});
   next.knowledge=recorded.ledger;
   // Method changes are proposals for the next cycle, never silently executable code.
   if(Object.hasOwn(reflection,'nextMethod'))next.methods[participant]=reflection.nextMethod;
   const receipt={cycle:next.cycle+1,participant,status:'completed',question:proposal.question,knowledge_id:recorded.entry.id,method_changed:Object.hasOwn(reflection,'nextMethod')};
   next.history.push(receipt);await onReceipt(receipt);
  }else{
   const receipt={cycle:next.cycle+1,participant:result.task.participant,status:'failed',error:result.error};
   next.history.push(receipt);await onReceipt(receipt);
  }
 }
 next.cycle++;
 return {state:next,receipts:results};
}
export async function runAutonomySession(initial,{cycles=1,shouldStop=()=>false,onCheckpoint=async()=>{},...adapters}={}){
 if(!Number.isSafeInteger(cycles)||cycles<1)throw Error('Invalid cycle count');
 let state=initial;
 for(let i=0;i<cycles&&!shouldStop(state);i++){
  state=(await runAutonomyCycle(state,adapters)).state;
  await onCheckpoint(state);
 }
 return state;
}
