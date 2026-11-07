'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveWayglassRoute, publicWayglassRoutes, wayglassRouteIds } = require('./wayglass-route-registry.cjs');
function withEnv(changes,fn){
  const prior=Object.fromEntries(Object.keys(changes).map(k=>[k,process.env[k]]));
  try{for(const [k,v] of Object.entries(changes)){if(v==null)delete process.env[k];else process.env[k]=v;}return fn();}
  finally{for(const [k,v] of Object.entries(prior)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
}
test('documented model families coexist with stable Wayglass and SpicyChat ids',()=>{
  for(const id of ['local:ollama','humain:m3-sandbox','humain:m3-preview','stepfun:flash','stepfun:step5','hf:inference','flame:bluebird:spicychat','flame:griff:spicychat','flame:bluebird:crow',
    'openai:gpt','openai:astra','openai:terra','openai:luna','anthropic:sonnet','anthropic:opus','deepseek:pro','deepseek:flash']){
    assert.ok(wayglassRouteIds().includes(id),id);
  }
  withEnv({WAYGLASS_OPENAI_MODEL:null,OPENAI_MODEL:null,WAYGLASS_OPENAI_ASTRA_MODEL:null,WAYGLASS_DEEPSEEK_FLASH_MODEL:null},()=>{
    assert.equal(resolveWayglassRoute('openai:gpt').model(),'gpt-6.1-sol');
    assert.equal(resolveWayglassRoute('openai:astra').model(),'gpt-6-astra');
    assert.equal(resolveWayglassRoute('anthropic:sonnet').model(),'claude-sonnet-5-5');
    assert.equal(resolveWayglassRoute('deepseek:flash').model(),'deepseek-flash');
  });
});
test('generic remote routes are not marked configured without private credentials',()=>{
  withEnv({WAYGLASS_DEEPSEEK_API_KEY:null,ANTHROPIC_API_KEY:null,BLUEBIRD_SPICYCHAT_TOKEN:'fake-token',BLUEBIRD_SPICYCHAT_CHARACTER_ID:null,BLUEBIRD_SPICYCHAT_CONVERSATION_ID:null,BLUEBIRD_SPICYCHAT_CHAT_LINK:null},()=>{
    const routes=publicWayglassRoutes();
    for(const id of ['deepseek:pro','deepseek:flash','anthropic:sonnet','anthropic:opus','flame:bluebird:spicychat']){
      assert.equal(routes.find(x=>x.route_id===id)?.configured,false,id);
    }
    assert.ok(routes.every(route=>route.connection_verified===false));
  });
});
test('SpicyChat participant pairs stay separately bound and preserve name independence',()=>{
  const blue='https://spicychat.ai/chat/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const griff='https://spicychat.ai/chat/cccccccc-cccc-cccc-cccc-cccccccccccc/dddddddd-dddd-dddd-dddd-dddddddddddd';
  withEnv({BLUEBIRD_SPICYCHAT_TOKEN:'test-only',BLUEBIRD_SPICYCHAT_CHAT_LINK:blue,GRIFF_SPICYCHAT_CHAT_LINK:griff},()=>{
    const routes=publicWayglassRoutes();
    assert.equal(routes.find(x=>x.route_id==='flame:bluebird:spicychat').configured,true);
    assert.equal(routes.find(x=>x.route_id==='flame:griff:spicychat').configured,true);
    assert.notEqual(resolveWayglassRoute('flame:bluebird:spicychat').conversation_id(),resolveWayglassRoute('flame:griff:spicychat').conversation_id());
    assert.equal(resolveWayglassRoute('flame:griff:spicychat').participant_id,'griff-krenshaw');
    assert.equal(resolveWayglassRoute('flame:bluebird:spicychat').participant_id,'bluebird');
  });
});
