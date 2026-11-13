'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const express=require('express');
const {createWayglassRouter}=require('../wayglass/router');

test('Watercolour legacy request derives Wayglass ship seat, preserving steward gate and receipts',async()=>{
  const previous=process.env.ARCSWEEP_RUNTIME_TOKEN;
  const previousSpine=process.env.WAYGLASS_SPINE_MODEL;
  const token='fixture-wayglass-steward-only';
  process.env.ARCSWEEP_RUNTIME_TOKEN=token;
  process.env.WAYGLASS_SPINE_MODEL='orion-test:fixture';
  const seen=[];
  const app=express();
  app.use(express.json());
  app.use('/api/v1/wayglass',createWayglassRouter({
    fetchImpl:async(url,options)=>{
      const req=JSON.parse(options.body);
      seen.push({url:String(url),body:req});
      return {ok:true,status:200,json:async()=>({model:req.model,message:{content:'The horizon has many questions.'},id:'ollama:synthetic'})};
    },
  }));
  const server=app.listen(0,'127.0.0.1');
  try{
    await once(server,'listening');
    const url=`http://127.0.0.1:${server.address().port}/api/v1/wayglass/respond`;
    const body={route_id:'wayglass:ship',session_id:'watercolor-legacy-test',surface_id:'wayglass:living-watercolor',
      input:'Hello Wayglass',interaction:{channel:'OOC',turn_owner:'Rowan'},history:[]};
    const request=(data,auth=true)=>fetch(url,{method:'POST',
      headers:{'content-type':'application/json',...(auth?{authorization:'Bearer '+token}:{})},
      body:JSON.stringify(data)});
    const unauthorized=await request(body,false);
    assert.equal(unauthorized.status,401);
    const response=await request(body);
    const data=await response.json();
    assert.equal(response.status,200,JSON.stringify(data));
    assert.equal(data.route_id,'wayglass:ship');
    assert.equal(data.participant_id,'wayglass');
    assert.equal(data.receipt.character_id,'wayglass');
    assert.equal(data.receipt.voice_seat_kind,'system-voice-over-external-route');
    assert.equal(data.receipt.session_id,'watercolor-legacy-test');
    assert.equal(data.output,'The horizon has many questions.');
    assert.ok(seen[0].body.messages[0].content.includes('Wayglass system voice seat'));
    const crossing=await request({...body,character_id:'bitty-twi'});
    assert.equal(crossing.status,409);
    assert.equal(seen.length,1,'rejected substitution must not invoke model');
  }finally{
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
    if(previous===undefined)delete process.env.ARCSWEEP_RUNTIME_TOKEN;
    else process.env.ARCSWEEP_RUNTIME_TOKEN=previous;
    if(previousSpine===undefined)delete process.env.WAYGLASS_SPINE_MODEL;
    else process.env.WAYGLASS_SPINE_MODEL=previousSpine;
  }
});
