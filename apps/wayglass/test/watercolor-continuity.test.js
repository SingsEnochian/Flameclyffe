import test from 'node:test';
import assert from 'node:assert/strict';
import {createWatercolorContinuity,WATERCOLOR_LOCAL_KEY,MAX_TRANSCRIPT_BYTES,MAX_TRANSCRIPT_TURNS} from '../src/watercolor-continuity.js';

// Acceptance: explicit browser save survives a new controller; exact request,
// returned text/route/model/receipt survive; browser custody never becomes a
// host checkpoint. Host fixtures model the actual departure wire contract.
// Failed saves/recoveries preserve newer work and never retry network effects.
const store=()=>{const items=new Map();return {getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value)};};
const fixtureTurn=(i=1)=>({request:{mode:'dream',authorText:'Rowan contribution '+i+' 💎',routeId:'local:ollama',sessionId:'wc-fixture'},response:{schema:'wayglass.watercolor-model-turn/v1',mode:'dream',text:'Attributed answer '+i+'\nI choose to defer.',route_id:'local:ollama',provider:'ollama',model:'ornith-fixture',receipt:{observation_id:'observation:'+i,response_id:'response:'+i,returned_model:'reported-fixture-model',wayglass_persisted:false},state:'returned-not-committed',epistemic_register:'model-generated-collaboration'}});
const scope={worldId:'wayglass:home',participantId:'rowan',storageId:'a'.repeat(64)};
const explicit={worldId:scope.worldId,participantId:scope.participantId,identityDeclarations:[{entity_id:'rowan',declaration:'Fixture caller declaration'}],stopPoint:'Continue the open question',nextOwner:'rowan',provenanceRefs:['fixture:conversation']};
function departure(payload,{durable=true}={}){
 const packet={schema:'wayglass.continuation-packet/v0.1',world_id:payload.worldId,participant_id:payload.participantId,active_work:structuredClone(payload.activeWork)};
 const stopped={schema:'wayglass.stop-receipt/v0.1',receipt_id:'stop:fixture',world_id:payload.worldId,participant_id:payload.participantId};
 return {schema:'wayglass.departure/v0.1',world_id:payload.worldId,participant_id:payload.participantId,stop_receipt:stopped,continuation_packet:packet,...(durable?{storage_receipt:{schema:'wayglass.storage-receipt/v0.1',storage_id:scope.storageId,departure_receipt_id:stopped.receipt_id,persisted:true,durability:'local-file-fsync'}}:{})};
}
test('explicit browser save and cold return preserve exact attributed conversation',()=>{
 const storage=store(),a=createWatercolorContinuity({sessionId:'wc-fixture',storage});
 const input=fixtureTurn();a.append(input);
 assert.equal(storage.getItem(WATERCOLOR_LOCAL_KEY),null);
 const saved=a.saveLocal();assert.equal(saved.scope,'local-browser');assert.equal(saved.persisted,true);
 const b=createWatercolorContinuity({sessionId:'new-session',storage});
 const restored=b.recoverLocal();
 assert.equal(restored.session_id,'wc-fixture');assert.deepEqual(restored.turns,[input]);
 assert.equal(restored.scope,'local-browser');assert.equal(restored.checkpoint,null);assert.equal(restored.dirty,false);
 assert.deepEqual(b.history(),[{role:'user',content:input.request.authorText},{role:'assistant',content:input.response.text}]);
 assert.equal(restored.turns[0].response.receipt.wayglass_persisted,false);
});
test('history gives the bounded host window while full preserved transcript retains all turns',()=>{
 const a=createWatercolorContinuity({sessionId:'wc-fixture',storage:store()});
 for(let i=1;i<=12;i++)a.append(fixtureTurn(i));
 assert.equal(a.snapshot().turns.length,12);assert.equal(a.history().length,16);
 assert.equal(a.history()[0].content,fixtureTurn(5).request.authorText);
 assert.equal(a.snapshot().turns[0].response.text,fixtureTurn(1).response.text);
});
test('append and snapshot own independent records without silently changing source metadata',()=>{
 const a=createWatercolorContinuity({sessionId:'wc-fixture',storage:store()}),value=fixtureTurn();
 a.append(value);value.response.receipt.returned_model='mutated';
 assert.equal(a.snapshot().turns[0].response.receipt.returned_model,'reported-fixture-model');
 assert.ok(Object.isFrozen(a.snapshot().turns[0].response.receipt));
 a.saveLocal();assert.equal(a.snapshot().dirty,false);a.append(fixtureTurn(2));assert.equal(a.snapshot().dirty,true);
});
test('incomplete or non-JSON outcomes reject without claiming a model answer',()=>{
 const a=createWatercolorContinuity({sessionId:'wc-fixture',storage:store()});
 for(const mutate of [
  t=>t.response.text='',t=>t.response.receipt=null,t=>t.response.provider='',t=>t.response.model='',
  t=>t.response.schema='unverified',t=>t.response.receipt.usage=NaN,
  t=>t.request.sessionId='another-session',t=>t.request.mode='invent',
  t=>t.response.receipt.fn=()=>{},
 ]){const t=fixtureTurn();mutate(t);assert.throws(()=>a.append(t));}
 assert.equal(a.snapshot().turns.length,0);
});
test('storage errors and damaged recovery preserve current session',()=>{
 const storage=store(),a=createWatercolorContinuity({sessionId:'wc-fixture',storage});a.append(fixtureTurn());
 storage.setItem(WATERCOLOR_LOCAL_KEY,'{broken');assert.throws(()=>a.recoverLocal());
 assert.equal(a.snapshot().turns.length,1);
 const limited=createWatercolorContinuity({sessionId:'wc-fixture',storage:{getItem:()=>null,setItem(){throw new Error('quota');}}});limited.append(fixtureTurn());
 assert.throws(()=>limited.saveLocal(),/quota/);assert.equal(limited.snapshot().scope,'session');
 assert.equal(limited.snapshot().turns.length,1);
 storage.setItem(WATERCOLOR_LOCAL_KEY,' '.repeat(MAX_TRANSCRIPT_BYTES+1));assert.throws(()=>a.recoverLocal(),/byte limit/);
 assert.equal(a.snapshot().turns.length,1);
});
test('capacity limits reject further data instead of truncating existing conversation',()=>{
 const a=createWatercolorContinuity({sessionId:'wc-fixture',storage:store()});
 for(let i=1;i<=MAX_TRANSCRIPT_TURNS;i++)a.append(fixtureTurn(i));
 assert.throws(()=>a.append(fixtureTurn(65)),/turn limit/);
 assert.equal(a.snapshot().turns.length,MAX_TRANSCRIPT_TURNS);
 const b=createWatercolorContinuity({sessionId:'wc-fixture',storage:store()}),large=fixtureTurn();
 large.response.receipt.long_text='x'.repeat(MAX_TRANSCRIPT_BYTES);
 assert.throws(()=>b.append(large),/byte limit/);assert.equal(b.snapshot().turns.length,0);
});
test('explicit host save sends real declarations and exact turn evidence through existing active_work',async()=>{
 let captured,calls=0;
 const a=createWatercolorContinuity({sessionId:'wc-fixture',storage:store(),leave:async options=>{calls++;captured=options;return departure(options);}});
 a.append(fixtureTurn());assert.equal(calls,0);
 const saved=await a.saveHost(explicit);
 assert.equal(calls,1);assert.deepEqual(captured.identityDeclarations,explicit.identityDeclarations);
 assert.equal(captured.activeWork[0].kind,'wayglass-watercolor-conversation');
 assert.deepEqual(captured.activeWork[0].conversation.turns,[fixtureTurn()]);
 assert.equal(saved.scope,'host-fsync');assert.equal(saved.storage_receipt.durability,'local-file-fsync');
 assert.deepEqual(a.snapshot().checkpoint,scope);assert.equal(a.snapshot().dirty,false);
});
test('host save requires explicit identity and durable receipt; no retries or fabricated custody',async()=>{
 let calls=0;const a=createWatercolorContinuity({sessionId:'wc-fixture',leave:async payload=>{calls++;return departure(payload,{durable:false});}});a.append(fixtureTurn());
 await assert.rejects(a.saveHost({...explicit,identityDeclarations:[]}),/identity declarations/);assert.equal(calls,0);
 await assert.rejects(a.saveHost(explicit),/durable storage receipt/);assert.equal(calls,1);
 assert.equal(a.snapshot().checkpoint,null);assert.equal(a.snapshot().scope,'session');
 const b=createWatercolorContinuity({sessionId:'wc-fixture',leave:async()=>{throw new Error('timeout; result uncertain');}});b.append(fixtureTurn());
 await assert.rejects(b.saveHost(explicit),/uncertain/);assert.equal(b.snapshot().turns.length,1);
});
test('host recovery verifies scope and preserves original route outcome',async()=>{
 let saved;
 const a=createWatercolorContinuity({sessionId:'wc-fixture',leave:async p=>{saved=departure(p);return saved;}});a.append(fixtureTurn());await a.saveHost(explicit);
 const b=createWatercolorContinuity({sessionId:'cold',recover:async request=>{assert.deepEqual(request,scope);return {...saved,recovered_storage_id:request.storageId};}});
 const result=await b.recoverHost(scope);
 assert.equal(result.scope,'host-fsync');assert.deepEqual(result.turns,[fixtureTurn()]);assert.deepEqual(result.checkpoint,scope);
 const wrong=createWatercolorContinuity({sessionId:'cold',recover:async()=>({...saved,recovered_storage_id:scope.storageId,participant_id:'someone-else'})});
 await assert.rejects(wrong.recoverHost(scope),/binding mismatch/);assert.equal(wrong.snapshot().turns.length,0);
});
test('an in-flight save keeps newer turns and marks its earlier checkpoint dirty',async()=>{
 let resolve,payload;
 const a=createWatercolorContinuity({sessionId:'wc-fixture',leave:p=>{payload=p;return new Promise(r=>{resolve=r;});}});a.append(fixtureTurn());
 const pending=a.saveHost(explicit);a.append(fixtureTurn(2));resolve(departure(payload));await pending;
 assert.equal(a.snapshot().turns.length,2);assert.equal(a.snapshot().dirty,true);assert.deepEqual(a.snapshot().checkpoint,scope);
});
test('in-flight host recovery never overwrites a newly appended turn',async()=>{
 let resolve,preserved;
 const a=createWatercolorContinuity({sessionId:'wc-fixture',leave:async p=>{preserved=departure(p);return preserved;}});a.append(fixtureTurn());await a.saveHost(explicit);
 const b=createWatercolorContinuity({sessionId:'wc-fixture',recover:()=>new Promise(r=>{resolve=r;})});
 const pending=b.recoverHost(scope);b.append(fixtureTurn(2));resolve({...preserved,recovered_storage_id:scope.storageId});
 await assert.rejects(pending,/changed while recovery/);assert.deepEqual(b.snapshot().turns,[fixtureTurn(2)]);
});
test('browser recovery does not inherit a host checkpoint or change model-declared persistence',async()=>{
 const storage=store(),a=createWatercolorContinuity({sessionId:'wc-fixture',storage,leave:async p=>departure(p)});a.append(fixtureTurn());await a.saveHost(explicit);a.saveLocal();
 const b=createWatercolorContinuity({sessionId:'cold',storage});const result=b.recoverLocal();
 assert.equal(result.scope,'local-browser');assert.equal(result.checkpoint,null);
 assert.equal(result.turns[0].response.receipt.wayglass_persisted,false);
});
test('late host save cannot replace a same-session browser recovery custody binding',async()=>{
 let resolve,payload;const storage=store();
 const a=createWatercolorContinuity({sessionId:'wc-fixture',storage,leave:p=>{payload=p;return new Promise(r=>{resolve=r;});}});
 a.append(fixtureTurn());a.saveLocal();const pending=a.saveHost(explicit);
 const b=createWatercolorContinuity({sessionId:'wc-fixture',storage});b.append(fixtureTurn(2));b.saveLocal();
 a.recoverLocal();resolve(departure(payload));await pending;
 assert.equal(a.snapshot().scope,'local-browser');assert.equal(a.snapshot().checkpoint,null);
 assert.deepEqual(a.snapshot().turns,[fixtureTurn(2)]);assert.equal(a.snapshot().dirty,false);
});
