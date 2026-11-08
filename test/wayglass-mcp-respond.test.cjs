'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { handleMcpMessage } = require('../lib/wayglass-mcp-core.cjs');
const { createWayglassMcpServer } = require('../lib/wayglass-mcp-server.cjs');
const call = args => ({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'wayglass_respond',arguments:args}});
test('native invocation advertised only while bound; caller cannot set authority',async()=>{
 const list={jsonrpc:'2.0',id:1,method:'tools/list'};
 assert.equal(handleMcpMessage(list,{authenticated:true}).result.tools.some(t=>t.name==='wayglass_respond'),false);
 assert.equal(handleMcpMessage(list,{authenticated:true,respond:()=>{}}).result.tools.some(t=>t.name==='wayglass_respond'),true);
 let calls=0;
 for(const extra of [{principal_id:'other'},{participant_id:'bluebird'},{world_id:'other'},{max_output_tokens:Infinity},{history:{}},{think:'yes'}]){
  const r=await handleMcpMessage(call({route_id:'local:ollama',input:'hello',...extra}),{authenticated:true,respond:()=>calls++});
  assert.equal(r.error.code,-32602);
 }
 assert.equal(calls,0);
 const denied=await handleMcpMessage(call({route_id:'local:ollama',input:'hello'}),{authenticated:true,respond:()=>{throw Error('secret');}});
 assert.equal(denied.error.message,'Native turn denied or unavailable');
});
test('real HTTP invocation forwards only verified principal context and denies revoked bearer',async t=>{
 let revoked=false;const calls=[];
 const server=createWayglassMcpServer({resourceUrl:'https://wayglass.example/mcp',authorizationServerUrl:'https://auth.example',
  verifyBearer:async()=>({active:true,subject:'owner',ownerAuthorized:true,consentRef:'consent-1',scopes:['wayglass:constellation'],revoked}),
  respond:async(input,context)=>{calls.push({input,context});return {output:'captured native turn',model_inference:false};}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const post=()=>fetch('http://127.0.0.1:'+server.address().port+'/mcp',{method:'POST',headers:{authorization:'Bearer fixture','content-type':'application/json'},body:JSON.stringify(call({route_id:'local:ollama',input:'hello'}))});
 const response=await post();assert.equal(response.status,200);assert.equal((await response.json()).result.content.length,1);
 assert.deepEqual(calls[0].context,{principalId:'owner',scopes:['wayglass:constellation'],resource:'https://wayglass.example/mcp',consentRef:'consent-1'});
 revoked=true;assert.equal((await post()).status,403);assert.equal(calls.length,1);
});
