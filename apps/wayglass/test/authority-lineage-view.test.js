import test from 'node:test';
import assert from 'node:assert/strict';
import {readAuthorityExperiment,authoritySummary} from '../src/authority-lineage-view.js';
test('Authority receipt view preserves original objection and distinguishes Narrow from Suspend',async()=>{
  const data={schema:'wayglass.loki-biscuit/v1',snapshot:{undertakings:{biscuits:{original:'I agree to biscuits.'}},objections:[{participant:'loki',original:'Biscuits, not buildings.'}],revision:23,head:'wce1:receipt'},decisions:[{action:'dependent',status:'Suspend',allowed:[]},{action:'independent',status:'Narrow',allowed:['plate']}],effects:['plate.json']};
  let request;
  const read=await readAuthorityExperiment('object',{fetchImpl:async(url,options)=>{request={url,options};return {ok:true,json:async()=>data};}});
  assert.equal(request.options.credentials,'same-origin');assert.equal(JSON.parse(request.options.body).command,'object');
  const summary=authoritySummary(read);assert.match(summary,/I agree to biscuits\./);assert.match(summary,/loki: Biscuits, not buildings\./);assert.match(summary,/dependent: Suspend/);assert.match(summary,/independent: Narrow/);
  await assert.rejects(readAuthorityExperiment(null,{fetchImpl:async()=>({ok:false,json:async()=>({error:'Unauthenticated'})})}),/Unauthenticated/);
});
