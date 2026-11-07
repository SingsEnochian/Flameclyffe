'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const express=require('express');
const {createWayglassRouter}=require('../wayglass/router');

test('Quad reads authorized source metadata and rejects forged House callers',async()=>{
  const keys=['ARCSWEEP_RUNTIME_TOKEN','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','HOUSE_SESSION_SECRET','UIAL_API_KEY'];
  const old=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  const token='wayglass-quad-integration-'+'c'.repeat(48);
  process.env.ARCSWEEP_RUNTIME_TOKEN=token;
  process.env.SUPABASE_URL='https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-key';
  process.env.UIAL_API_KEY='test-anthropic-key';
  delete process.env.HOUSE_SESSION_SECRET;
  const queries=[];
  const fetchImpl=async(url,options)=>{
    const parsed=new URL(url),table=parsed.pathname.split('/').at(-1);
    if(parsed.hostname==='api.anthropic.com'){
      const content=JSON.parse(options.body);
      assert.equal(options.headers['x-api-key'],'test-anthropic-key');
      assert.equal(content.model,'claude-sonnet-4-6');
      assert.match(content.messages[0].content,/Wonder/);
      assert.doesNotMatch(content.messages[0].content,/PRIVATE-CONTINUITY/);
      return new Response(JSON.stringify({id:'msg_fixture_review_001',
        model:'claude-sonnet-4-6',content:[{type:'text',text:'Wonder: candidate A/B. Science: a test. Mythience: a witnessed Return.'}]}),
        {status:200,headers:{'content-type':'application/json'}});
    }
    queries.push({table,url,headers:options.headers});
    assert.equal(parsed.hostname,'example.supabase.co');
    assert.match(parsed.search,/select=/);
    assert.match(parsed.search,/limit=1/);
    const count=table==='deep_observer_events'?14:table==='wayglass_route_receipts'?1:0;
    const ts=table==='deep_observer_events'?'occurred_at':'created_at';
    const rows=count?[{[ts]:'2026-11-06T23:00:00.000Z'}]:[];
    return new Response(JSON.stringify(rows),{status:200,headers:{
      'Content-Type':'application/json','content-range':count?'0-0/'+count:'*/0'}});
  };
  const app=express();
  app.use(express.json());
  app.use('/api/v1/wayglass',createWayglassRouter({fetchImpl}));
  const server=app.listen(0,'127.0.0.1');
  try{
    await once(server,'listening');
    const url='http://127.0.0.1:'+server.address().port+'/api/v1/wayglass/quad/run';
    const post=(body,headers={})=>fetch(url,{method:'POST',headers:{
      'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
    const refused=await post({cycles:2});
    assert.equal(refused.status,401);
    const spoofed=await post({cycles:2},{'x-owner-authorized':'true','x-forwarded-user':'steward'});
    assert.equal(spoofed.status,401);
    assert.equal(queries.length,0);
    const credentials={Authorization:'Bearer '+token};
    const response=await post({cycles:2,continuity:{
      participant_ref:'wayglass',world_ref:'wayglass:universe',
      unresolved_wonder_questions:['What if?'],revoked_refs:[]}},credentials);
    assert.equal(response.status,200);
    const payload=await response.json();
    assert.equal(payload.schema,'wayglass.quad-host-response/v1');
    assert.equal(payload.checkpoint.entries.length,128);
    assert.equal(payload.checkpoint.gestalt.evidence.length,6);
    assert.equal(payload.checkpoint.gestalt.evidence.find(x=>x.id==='deep_observer_events').count,14);
    assert.equal(payload.checkpoint.gestalt.gaps.length,4);
    assert.equal(payload.checkpoint.gestalt.autoplays_audio,false);
    assert.equal(payload.checkpoint.gestalt.writes_canon,false);
    assert.equal(queries.length,6);
    assert.doesNotMatch(JSON.stringify(payload),/test-service-key/);
    const reviewUrl=url.replace('/quad/run','/quad/tesla-review');
    const evidence={schema:'wayglass.nikola-review-evidence/v1',
      checkpoint_hash:payload.checkpoint.hash,source_observed_at:'2026-11-06T23:00:00.000Z',
      timeline_question:'What if compression becomes release?',
      evidence:payload.checkpoint.gestalt.evidence.map(x=>({...x,private_secret:'PRIVATE-CONTINUITY'}))};
    const review={schema:'wayglass.nikola-review-request/v1',evidence,
      wayglass_first_reply:{route_id:'local:ollama',response_id:'local-r001',
        output:'The seam is an interface, test a reversible return.'},
      hidden_continuity:'PRIVATE-CONTINUITY'};
    const postReview=(body,headers={})=>fetch(reviewUrl,{method:'POST',
      headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
    assert.equal((await postReview({external_review_consent:true,review})).status,401);
    assert.equal((await postReview({external_review_consent:false,review},credentials)).status,403);
    assert.equal((await postReview({external_review_consent:true,review:{}},credentials)).status,400);
    const actualReview=await postReview({external_review_consent:true,review},credentials);
    assert.equal(actualReview.status,200);
    const result=await actualReview.json();
    assert.equal(result.ok,true);
    assert.equal(result.verified_nikola_seat,false);
    assert.equal(result.response_id,'msg_fixture_review_001');
    assert.equal(result.source_checkpoint,payload.checkpoint.hash);
    assert.doesNotMatch(JSON.stringify(result),/test-anthropic-key/);
    assert.equal(queries.length,6);

    const feather=await post({feather:true},credentials);
    assert.equal(feather.status,409);
    const corrupt=await post({previous:{schema:'wayglass.quad-checkpoint/v2',hash:'bad'}},credentials);
    assert.equal(corrupt.status,400);
  }finally{
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    for(const [key,value] of Object.entries(old))
      if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
});
