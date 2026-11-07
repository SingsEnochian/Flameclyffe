import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runWayglassNikolaReview,prepareReviewEnvelope} from '../src/wayglass-nikola-workflow.js';
const clock=()=> '2026-11-06T23:48:00.000Z';
function source(){
 return {schema:'wayglass.quad-ship-observation/v1',
  checkpoint_hash:'wce1:'+'d'.repeat(64),observed_at:clock(),
  evidence:[
   {id:'deep_observer_events',status:'observed',count:14,freshness:'fresh'},
   {id:'observer_measurements',status:'empty',count:0,freshness:'empty'},
   {id:'wayglass_route_receipts',status:'observed',count:1,freshness:'aging'},
   {id:'house_runtime_events',status:'empty',count:0,freshness:'empty'},
   {id:'math_spine_packets',status:'empty',count:0,freshness:'empty'},
   {id:'source_library_query_receipts',status:'empty',count:0,freshness:'empty'},
  ],engines:['observation','provenance','geometry','cosmology','resonance','numerology','wonder','continuity'],
  phase_records_per_cycle:64};
}
const wayReply=phase=>({schema:'wayglass.route-turn/v0.1',
  output:phase==='first-contact'?'Study one reversible visual hinge':'Revise and test, keep Wonder open',
  route_id:'local:ollama',model:'local-model',provider:'ollama',
  receipt:{response_id:phase+'-r1',observation_id:phase+'-ob1'}});
const tesla={ok:true,reply:'Wonder: 2 competing mechanisms; Science: holdout; Mythience: Return Marker',
  provider:'anthropic'};
test('workflow requires approval before calling external model',async()=>{
 let called=0;
 await assert.rejects(()=>runWayglassNikolaReview({reading:source(),
  askWayglass:async()=>{called++;return wayReply('first-contact');},
  askTesla:async()=>{called++;return tesla}}),/Explicit approval/);
 assert.equal(called,0);
});
test('attributed first contact, three-lens review and Wayglass return, in order',async()=>{
 const visited=[];
 const result=await runWayglassNikolaReview({
  reading:source(),externalShareApproved:true,clock,
  askWayglass:async({phase,input})=>{
   visited.push('wayglass:'+phase);
   assert.match(input,/wce1:/);
   if(phase==='return')assert.match(input,/verified_nikola_seat/);
   return wayReply(phase);
  },
  askTesla:async({payload})=>{
   visited.push('tesla');
   assert.deepEqual(payload.evidence.lenses.map(x=>x.lens),
     ['wonder','science','mythience']);
   assert.equal(payload.evidence.evidence.length,6);
   assert.equal(payload.evidence.private_continuity_excluded,true);
   assert.match(payload.wayglass_first_reply.output,/reversible/);
   return tesla;
  }});
 assert.deepEqual(visited,['wayglass:first-contact','tesla','wayglass:return']);
 assert.equal(result.stages.length,4);
 assert.equal(result.replies.tesla_observatory.verified_nikola_seat,false);
 assert.equal(result.training_candidate.model_weight_updates,0);
 assert.equal(result.canon_commit,false);
 assert.equal(result.checkpoint_hash,source().checkpoint_hash);
 assert.equal(result.replies.wayglass_return.response_id,'return-r1');
});
test('failed and empty routes cannot be promoted into a fictitious exchange',async()=>{
 let returned=false;
 await assert.rejects(()=>runWayglassNikolaReview({
  reading:source(),externalShareApproved:true,
  askWayglass:async ({phase})=>{
   if(phase==='return')returned=true;
   return wayReply(phase);},
  askTesla:async()=>({ok:true,provider:'anthropic',reply:''})
 }),/did not return/);
 assert.equal(returned,false);
 await assert.rejects(()=>runWayglassNikolaReview({
  reading:source(),externalShareApproved:true,
  askWayglass:async()=>({schema:'wayglass.route-turn/v0.1',output:'?',route_id:'local:ollama',provider:'ollama'}),
  askTesla:async()=>tesla
 }),/no attributable model-route response/);
});
test('Feather/abort cuts off later crossings',async()=>{
 const controller=new AbortController();
 let calls=0;
 await assert.rejects(()=>runWayglassNikolaReview({
  reading:source(),externalShareApproved:true,signal:controller.signal,
  askWayglass:async()=>{calls++;controller.abort();return wayReply('first-contact');},
  askTesla:async()=>{calls++;return tesla}
 }),/cancelled/);
 assert.equal(calls,1);
});
test('transfer packet contains no private continuity or raw events',()=>{
 const reading={...source(),private_secret:'NOPE',
   continuity:{private_secret:'NOPE'},evidence:source().evidence.map(x=>({...x,
     hidden_payload:'NOPE',raw_qa:'NOPE'}))};
 const e=prepareReviewEnvelope(reading);
 assert.equal(JSON.stringify(e).includes('NOPE'),false);
 assert.equal(e.private_continuity_excluded,true);
 assert.equal(e.design.no_autoplay,true);
 assert.equal(e.lenses.length,3);
});
