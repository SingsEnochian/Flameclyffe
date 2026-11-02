// Wayglass conversation bus v0.1: deterministic, in-process transport and mailbox.
// Network adapters and persistent storage are separate integration steps.
const MAX_MESSAGES=500, MAX_TEXT=4000, MAX_PARTICIPANTS=100;
const clone=x=>JSON.parse(JSON.stringify(x));
export function createConversationBus(){
 return {schema:'wayglass.conversation-bus/v0.1',next_id:1,participants:{},messages:[],threads:{}};
}
export function registerParticipant(bus,{id,kind='agent',label=id,allowIncoming=true}){
 if(!id||typeof id!=='string'||!['agent','model','human'].includes(kind))throw Error('Invalid participant');
 const next=clone(bus);
 if(!next.participants[id]&&Object.keys(next.participants).length>=MAX_PARTICIPANTS)throw Error('Participant limit');
 next.participants[id]={id,kind,label:String(label).slice(0,120),allow_incoming:!!allowIncoming};
 return next;
}
export function initiateConversation(bus,{from,to,text,threadId=null,sourceIds=[]}){
 if(typeof text!=='string'||!text.trim()||text.length>MAX_TEXT)throw Error('Invalid message');
 if(!Array.isArray(to)||!to.length||to.length>20||new Set(to).size!==to.length)throw Error('Invalid recipients');
 if(!bus.participants[from])throw Error('Unknown sender');
 for(const recipient of to){
  if(!bus.participants[recipient]||!bus.participants[recipient].allow_incoming)throw Error('Recipient unavailable: '+recipient);
 }
 if(!Array.isArray(sourceIds)||sourceIds.some(id=>typeof id!=='string'))throw Error('Invalid provenance');
 const next=clone(bus),id='message:'+next.next_id++,tid=threadId||'thread:'+id;
 if(threadId&&!next.threads[threadId])throw Error('Unknown thread');
 if(next.messages.length>=MAX_MESSAGES)throw Error('Message limit: checkpoint and rotate');
 const message={id,thread_id:tid,from,to:[...to],text,source_ids:[...sourceIds],
   delivery_status:'queued',authority:'conversation-only',external_actions:[]};
 next.messages.push(message);
 if(!next.threads[tid])next.threads[tid]={id:tid,participants:[from,...to],message_ids:[]};
 next.threads[tid].participants=[...new Set([...next.threads[tid].participants,from,...to])];
 next.threads[tid].message_ids.push(id);
 return {bus:next,message};
}
export function listInbox(bus,participantId){
 if(!bus.participants[participantId])throw Error('Unknown participant');
 return bus.messages.filter(message=>message.to.includes(participantId)).map(clone);
}
export function markDelivered(bus,messageId,recipientId){
 const next=clone(bus),message=next.messages.find(m=>m.id===messageId);
 if(!message||!message.to.includes(recipientId))throw Error('Invalid delivery');
 message.delivered_to=[...new Set([...(message.delivered_to||[]),recipientId])];
 message.delivery_status=message.delivered_to.length===message.to.length?'delivered':'partially-delivered';
 return next;
}
export function checkpointConversationBus(bus){return clone(bus);}
