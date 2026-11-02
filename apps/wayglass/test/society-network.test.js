import test from 'node:test';
import assert from 'node:assert/strict';
import {createWayglassSocietyNetwork,sendSocietyMessage,deliverModelConversation,listInbox} from '../src/society-network.js';
test('agent can initiate a conversation to Rowan without requiring a reply',()=>{
 const bus=createWayglassSocietyNetwork();
 const sent=sendSocietyMessage(bus,{from:'geometer',to:'rowan',text:'What does the third point feel like in your notes?'});
 assert.equal(listInbox(sent.bus,'rowan').length,1);
 assert.equal(sent.message.delivery_status,'queued');
});
test('model-to-model message gets attributed reply via configured route',async()=>{
 const bus=createWayglassSocietyNetwork();
 const sent=sendSocietyMessage(bus,{from:'geometer',to:'symbolist',text:'What does the triangle suggest?'});
 const fetchImpl=async()=>({ok:true,json:async()=>({output:'A symbolic relation, not a measured fold.'})});
 const delivered=await deliverModelConversation({bus:sent.bus,messageId:sent.message.id,routeIds:{symbolist:'openai:gpt'},fetchImpl});
 assert.equal(delivered.deliveries[0].status,'responded');
 assert.equal(listInbox(delivered.bus,'geometer').length,1);
 assert.equal(listInbox(delivered.bus,'geometer')[0].from,'symbolist');
});
test('unconfigured model route is not impersonated',async()=>{
 const bus=createWayglassSocietyNetwork();
 const sent=sendSocietyMessage(bus,{from:'chronologist',to:'continuity',text:'Can we compare source IDs?'});
 const delivered=await deliverModelConversation({bus:sent.bus,messageId:sent.message.id,routeIds:{}});
 assert.equal(delivered.deliveries[0].status,'route-not-configured');
 assert.equal(listInbox(delivered.bus,'chronologist').length,0);
});
