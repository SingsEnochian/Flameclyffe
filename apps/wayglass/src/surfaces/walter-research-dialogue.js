// Owner-participant conversation protocol. Queues questions; does not send messages outside Wayglass.
const TYPES=new Set(['question','discussion','invitation']);
const STATES=new Set(['pending','answered','declined','deferred']);
const MAX_TEXT=2000;
export function createResearchDialogue(){
 return {schema:'wayglass.research-dialogue/v0.1',messages:[],next_id:1};
}
export function askRowan(dialogue,{agentId,type='question',text,sourceIds=['walter:1933','walter:1950'],cycle=0}){
 if(!TYPES.has(type)||typeof agentId!=='string'||!agentId.trim()||typeof text!=='string'||!text.trim()||text.length>MAX_TEXT)throw Error('Invalid research invitation');
 if(!Array.isArray(sourceIds)||sourceIds.some(x=>typeof x!=='string'))throw Error('Invalid sources');
 const next=structuredClone(dialogue);
 const id='dialogue:'+next.next_id++;
 next.messages.push({id,agent_id:agentId,type,text,source_ids:sourceIds,cycle,
   status:'pending',reply:null,authority:'none',consent_required:true});
 return next;
}
export function respondToAgent(dialogue,id,{action,text=''}){
 if(!['answer','decline','defer'].includes(action))throw Error('Invalid response');
 if(typeof text!=='string'||text.length>MAX_TEXT)throw Error('Invalid reply');
 const next=structuredClone(dialogue),message=next.messages.find(x=>x.id===id);
 if(!message||message.status!=='pending')throw Error('Question not pending');
 message.status=action==='answer'?'answered':action==='decline'?'declined':'deferred';
 message.reply=action==='answer'?text:null;
 message.owner_action=action;
 return next;
}
export function deriveResearchQuestions(dossier){
 const found=new Set();
 return (dossier?.entries||[]).filter(e=>e.status==='candidate'&&e.result?.open_question)
   .filter(e=>{const k=e.seat_id+':'+e.result.open_question;if(found.has(k))return false;found.add(k);return true;})
   .map(e=>({agentId:e.seat_id,type:'question',text:e.result.open_question,
     sourceIds:e.source_ids,cycle:0}));
}
