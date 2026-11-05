import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectWayglassKernel, invokeWayglassRoute } from '../src/route-client.js';

const response=(status,data)=>({ok:status>=200&&status<300,status,
  async json(){return data;}});

test('browser kernel probe inspects real contract and keeps chosen local route',async()=>{
  let captured;
  const result=await inspectWayglassKernel({
    routeId:'local:ollama',worldId:'wayglass:watercolor',
    embodiment:{body_class:'host-os',touch:true,keyboard:false},
    fetchImpl:async (url,options)=>{
      captured={url,options};
      return response(200,{schema:'wayglass.kernel/v0.1',status:'boot-contract',
        cognition:{route_id:'local:ollama'},world:{world_id:'wayglass:watercolor'}});
    },
  });
  assert.equal(result.cognition.route_id,'local:ollama');
  assert.match(captured.url,/^\/api\/v1\/wayglass\/kernel\?/);
  assert.match(captured.url,/route=local%3Aollama/);
  assert.match(captured.url,/touch=1/);
  assert.match(captured.url,/keyboard=0/);
  assert.equal(captured.options.cache,'no-store');
});
test('kernel route mismatch is never treated as working provider',async()=>{
  await assert.rejects(inspectWayglassKernel({
    routeId:'local:ollama',
    fetchImpl:async()=>response(200,{
      schema:'wayglass.kernel/v0.1',status:'boot-contract',
      cognition:{route_id:'openai:gpt'},
    }),
  }),/differs/);
});
test('every routed turn carries kernel context, without silently invoking OpenAI',async()=>{
  let body;
  const result=await invokeWayglassRoute({
    input:'Can the canvas receive this?',
    worldId:'wayglass:watercolor',
    participantId:'wayglass:operator',
    waygateManifest:{schema:'wayglass.waygate/v0.1'},
    fetchImpl:async (url,options)=>{
      assert.equal(url,'/api/v1/wayglass/respond');
      body=JSON.parse(options.body);
      return response(200,{schema:'wayglass.route-turn/v0.1',
        output:'Test model reply',
        kernel_preflight:{schema:'wayglass.kernel-cognition-preflight/v0.1',
          status:'ready-for-route',owner_authenticated:false,world_entry_verified:false}});
    },
  });
  assert.equal(body.route_id,'local:ollama');
  assert.equal(body.world_id,'wayglass:watercolor');
  assert.equal(body.participant_id,'wayglass:operator');
  assert.equal(body.waygate_manifest.schema,'wayglass.waygate/v0.1');
  assert.equal(result.kernel_preflight.world_entry_verified,false);
});

