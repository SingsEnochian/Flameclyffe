'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const express=require('express');
const {compile,execute}=require('../../../lib/wyrdrune/wyrdrune.cjs');
const {createWayglassRouter}=require('../wayglass/router');

test('Watercolour legacy request derives Wayglass ship seat, preserving steward gate and receipts',async()=>{
  const previous=process.env.ARCSWEEP_RUNTIME_TOKEN;
  const token='fixture-wayglass-steward-only';
  process.env.ARCSWEEP_RUNTIME_TOKEN=token;
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
    const words='  May I paint e\u0301 and 💎?\n{ "blue" }\n';
    const previousWords='  Keep the garden.\n';
    const assistantWords='I will.';
    const body={route_id:'wayglass:ship',session_id:'watercolor-legacy-test',surface_id:'wayglass:living-watercolor',
      input:words,surface_context:'Dream mode. Read the canvas.',interaction:{channel:'OOC',turn_owner:'Rowan'},
      history:[{role:'user',content:previousWords},{role:'assistant',content:assistantWords}]};
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
    assert.equal(data.receipt.returned_model,seen[0].body.model);
    assert.equal(data.output,'The horizon has many questions.');
    assert.ok(seen[0].body.messages[0].content.includes('Wayglass system voice seat'));
    const wire=seen[0].body.messages;
    assert.deepEqual(wire[2],{role:'assistant',content:assistantWords});
    assert.match(wire[3].content,/Dream mode/);
    for (const [message,original] of [[wire[1],previousWords],[wire.at(-1),words]]) {
      assert.equal(message.role,'user');
      const program=compile(message.content);
      const result=await execute(program);
      assert.equal(result.output.length,1);
      assert.equal(result.output[0].kind,'utterance');
      assert.equal(result.output[0].words,original);
    }
    assert.deepEqual(data.receipt.input_wyrdrune,{
      format:'wyrdrune-utterance/v0.1',source_hash:compile(wire.at(-1).content).sourceHash
    });
    const crossing=await request({...body,character_id:'bitty-twi'});
    assert.equal(crossing.status,409);
    assert.equal(seen.length,1,'rejected substitution must not invoke model');
    const blank=await request({...body,input:'',history:[]});
    assert.equal(blank.status,200);
    assert.equal((await blank.json()).receipt.input_wyrdrune,undefined);
    assert.match(seen[1].body.messages.at(-1).content,/Dream mode/);

    const gardenInvite={
      route_id:'wayglass:ship',surface_id:'wayglass:cell-garden',input:'How would you like to appear?',
    };
    assert.equal((await request(gardenInvite,false)).status,401);
    const direct=await request(gardenInvite);
    assert.equal(direct.status,200);
    assert.equal((await direct.json()).receipt.channel,'OOC');
    assert.match(seen[2].body.messages[0].content,/Dialogue context: direct/);
    const inWorld=await request({...gardenInvite,interaction:{channel:'IC'}});
    assert.equal(inWorld.status,200);
    assert.equal((await inWorld.json()).receipt.channel,'IC');
    assert.match(seen[3].body.messages[0].content,/Dialogue context: in-world/);
    assert.match(seen[3].body.messages[0].content,/Answer in your own voice/);
    assert.doesNotMatch(seen[3].body.messages[0].content,/\bfiction(?:al)?\b|roleplay/i);
    const malformed=await request({...gardenInvite,interaction:{channel:'bad-channel'}});
    assert.equal(malformed.status,422);
    assert.match((await malformed.json()).error,/unknown dialogue context/);
    assert.equal(seen.length,4);
  }finally{
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
    if(previous===undefined)delete process.env.ARCSWEEP_RUNTIME_TOKEN;
    else process.env.ARCSWEEP_RUNTIME_TOKEN=previous;
  }
});
