import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutonomyState} from '../src/autonomy-engine.js';
import {runSharedAutonomyCycle} from '../src/autonomy-shared.js';
test('lease commits a completed model cycle',async()=>{
 const calls=[],client={rpc:async(name,args)=>{calls.push({name,args});return name==='wayglass_claim_run'?{data:[{state:createAutonomyState(['one']),version:0}]}:{data:true};}};
 const result=await runSharedAutonomyCycle({client,runId:'lab',workerId:'windows',nextDueAt:'2026-11-03T00:00:00Z',adapters:{propose:async()=>({question:'Next?'}),explore:async()=>('observed'),reflect:async()=>({learning:'learned'})}});
 assert.equal(result.status,'committed');assert.equal(calls.length,2);assert.equal(calls[1].args.p_state.cycle,1);
});
test('busy lease never invokes model',async()=>{
 let called=false;
 const result=await runSharedAutonomyCycle({client:{rpc:async()=>({data:[]})},runId:'lab',workerId:'cloud',nextDueAt:'2026-11-03T00:00:00Z',adapters:{propose:async()=>{called=true;}}});
 assert.equal(result.status,'not_due_or_leased');assert.equal(called,false);
});
