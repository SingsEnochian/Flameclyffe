import {invokeWayglassRoute} from './route-client.js';
import {createConversationBus,registerParticipant,initiateConversation,markDelivered,listInbox} from './conversation-bus.js';
const SEATS=['chronologist','continuity','geometer','symbolist','skeptic'];
export function createWayglassSocietyNetwork(){
 let bus=createConversationBus();
 bus=registerParticipant(bus,{id:'rowan',kind:'human',label:'Rowan',allowIncoming:true});
 for(const id of SEATS)bus=registerParticipant(bus,{id,kind:'agent',label:id,allowIncoming:true});
 return bus;
}
export function sendSocietyMessage(bus,{from,to,text,threadId=null,sourceIds=[]}){
 return initiateConversation(bus,{from,to:Array.isArray(to)?to:[to],text,threadId,sourceIds});
}
export async function deliverModelConversation({bus,messageId,routeIds={},fetchImpl=fetch}={}){
 const message=bus.messages.find(m=>m.id===messageId);
 if(!message)throw Error('Unknown message');
 let next=bus;const deliveries=[];
 for(const recipient of message.to){
  const participant=next.participants[recipient];
  if(participant.kind==='human'){deliveries.push({recipient,status:'inbox-queued'});continue;}
  const routeId=routeIds[recipient];
  if(!routeId){deliveries.push({recipient,status:'route-not-configured'});continue;}
  try{
   const response=await invokeWayglassRoute({routeId,fetchImpl,
     surfaceId:'dream-voyage:walter-third-point',
     input:'Conversation from '+message.from+' to '+recipient+'. Reply as '+recipient+
       '. This is an attributed conversation, not permission for external actions.\nMessage:\n'+message.text,
     maxOutputTokens:700});
   const raw=typeof response.output==='string'?response.output:typeof response.response==='string'?response.response:
     typeof response.text==='string'?response.text:JSON.stringify(response);
   const sent=initiateConversation(next,{from:recipient,to:[message.from],text:raw.slice(0,4000),
     threadId:message.thread_id,sourceIds:message.source_ids});
   next=markDelivered(sent.bus,messageId,recipient);
   deliveries.push({recipient,status:'responded',reply_id:sent.message.id});
  }catch(error){deliveries.push({recipient,status:'error',error:String(error.message||error)});}
 }
 return {bus:next,deliveries};
}
export {listInbox};
