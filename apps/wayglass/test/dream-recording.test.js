import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDreamRecording} from '../src/dream-recording.js';
test('recording requires explicit consent and durable adapters',()=>{
 assert.throws(()=>createDreamRecording({dream_id:'d',universe_id:'u',permission:false,write(){},read(){}}),/permission/);
});
test('records content-addressed asset without storing raw private content; replay survives new instance',async()=>{
 const store=new Map();
 const write=async(id,events)=>store.set(id,structuredClone(events));
 const read=async(id)=>structuredClone(store.get(id)||[]);
 const args={dream_id:'dream-001',universe_id:'wayglass',permission:true,write,read};
 const first=createDreamRecording(args);
 const event={event_id:'frame-001',stage:'captured',prompt:'DO NOT RECORD',secret:'DO NOT RECORD',asset:{asset_id:'scene-1',kind:'spatial',sha256:'a'.repeat(64),bytes:4096}};
 await first.append(event);
 const second=createDreamRecording(args);
 const result=await second.manifest();
 assert.equal(result.asset_count,1);
 assert.equal(result.events[0].asset.asset_id,'scene-1');
 assert.equal(JSON.stringify(result).includes('DO NOT RECORD'),false);
 await second.append(event);
 assert.equal((await second.manifest()).events.length,1);
 await assert.rejects(second.append({...event,stage:'modified'}),/Conflicting/);
 second.feather();
 await assert.rejects(second.append({...event,event_id:'frame-002'}),/closed/);
});
