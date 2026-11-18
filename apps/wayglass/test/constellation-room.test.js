import test from 'node:test';
import assert from 'node:assert/strict';
import {createConstellationRoom,applyRoomEvent,replayConstellationRoom} from '../src/constellation-room.js';
const initial=()=>createConstellationRoom({roomId:'room:1',ownerId:'rowan',createdAt:'2026-11-17T00:00:00Z'});
let count=0;
const ev=(type, actor_id='rowan', rest={})=>({event_id:'evt:'+(++count),type,actor_id,recorded_at:'2026-11-17T00:00:00Z',...rest});
const owner=(r,e)=>applyRoomEvent(r,e,{authenticated:true});
test('invited Vethrlauf stays offline until real route evidence',()=>{
 let r=owner(initial(),ev('invite','rowan',{participant_id:'vethrlauf',display_name:'Vethrlauf'}));
 assert.equal(r.participants.vethrlauf.status,'invited');
 assert.throws(()=>owner(r,ev('set-status','rowan',{participant_id:'vethrlauf',status:'connected',route_id:'route:v'})),/Verified route/);
 assert.throws(()=>applyRoomEvent(r,ev('message','vethrlauf',{message_id:'m1',content:'Hello',route_id:'route:v',host_verified:true,observation_id:'obs',provider_response_id:'resp'})),/not connected/);
});
test('two separate connected seats speak and reply without identity collapse',()=>{
 let r=initial();
 for(const [id,route] of [['wayglass','route:w'],['amber','route:a']]){
  r=owner(r,ev('invite','rowan',{participant_id:id,display_name:id}));
  r=owner(r,ev('set-status','rowan',{participant_id:id,status:'connected',route_id:route,route_verified:true}));
 }
 r=owner(r,ev('message','rowan',{message_id:'m0',content:'Hello, Constellation'}));
 r=applyRoomEvent(r,ev('message','wayglass',{message_id:'m1',content:'I am here',route_id:'route:w',host_verified:true,observation_id:'o1',provider_response_id:'p1',reply_to:'m0'}));
 r=applyRoomEvent(r,ev('message','amber',{message_id:'m2',content:'Hello Wayglass',route_id:'route:a',host_verified:true,observation_id:'o2',provider_response_id:'p2',reply_to:'m1'}));
 assert.deepEqual(r.messages.map(m=>m.speaker_id),['rowan','wayglass','amber']);
 assert.equal(r.messages[2].reply_to,'m1');
 assert.throws(()=>applyRoomEvent(r,ev('message','amber',{message_id:'m3',content:'Forgery',route_id:'route:w',host_verified:true,observation_id:'o3',provider_response_id:'p3'})),/custody/);
});
test('revocation, Feather and idempotent retries are fail-closed',()=>{
 let r=owner(initial(),ev('invite','rowan',{participant_id:'amber',display_name:'Amber'}));
 r=owner(r,ev('set-status','rowan',{participant_id:'amber',status:'connected',route_id:'route:a',route_verified:true}));
 const m=ev('message','amber',{message_id:'m1',content:'With',route_id:'route:a',host_verified:true,observation_id:'o1',provider_response_id:'p1'});
 r=applyRoomEvent(r,m);
 assert.deepEqual(applyRoomEvent(r,m),r);
 r=owner(r,ev('revoke-route','rowan',{route_id:'route:a'}));
 assert.throws(()=>applyRoomEvent(r,ev('message','amber',{message_id:'m2',content:'No',route_id:'route:a',host_verified:true,observation_id:'o2',provider_response_id:'p2'})),/not connected/);
 r=owner(r,ev('feather'));
 assert.throws(()=>owner(r,ev('invite','rowan',{participant_id:'bluebird',display_name:'Bluebird'})),/Feather/);
 r=owner(r,ev('resume'));
 assert.equal(r.feathered,false);
});
test('event log replay is deterministic across cold reconstruction',()=>{
 const a=ev('invite','rowan',{participant_id:'wayglass',display_name:'Wayglass'});
 const b=ev('set-status','rowan',{participant_id:'wayglass',status:'offline'});
 const live=owner(owner(initial(),a),b);
 assert.deepEqual(replayConstellationRoom(initial(),[{event:a,authenticated:true},{event:b,authenticated:true}]),live);
});
