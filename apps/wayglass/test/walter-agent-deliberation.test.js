import test from 'node:test';
import assert from 'node:assert/strict';
import { deliberateThirdLight } from '../src/surfaces/walter-agent-deliberation.js';

const valid={finding:'A relationship remains a hypothesis',constraint:'The source records are distinct',open_question:'What is the third point?',discriminating_observation:'Inspect original Walter note wording',epistemic_label:'narrative-hypothesis',source_ids:['walter:1933','walter:1950']};
test('three-stage five-seat deliberation preserves attribution and authority',async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;return {ok:true,json:async()=>({output:JSON.stringify(valid)})};};
 const result=await deliberateThirdLight({fetchImpl});
 assert.equal(calls,15);
 assert.equal(result.entries.length,15);
 assert.equal(result.validated_shape,15);
 assert.equal(result.evidence_verified,0);
 assert.equal(result.canon_promoted,false);
 assert.deepEqual(new Set(result.entries.map(x=>x.stage)),new Set(['proposal','challenge','revision']));
 assert(result.entries.every(x=>x.authority==='none'));
});
test('malformed source IDs are rejected without promotion',async()=>{
 const fetchImpl=async()=>({ok:true,json:async()=>({output:JSON.stringify({...valid,source_ids:['walter:1933']})})});
 const result=await deliberateThirdLight({fetchImpl});
 assert.equal(result.validated_shape,0);
 assert.equal(result.canon_promoted,false);
 assert(result.entries.every(x=>x.status==='rejected-or-route-error'));
});
