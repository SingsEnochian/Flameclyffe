'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { makeMcpHttpHandler } = require('../lib/wayglass-mcp-http.cjs');
const { makeWayglassPresentationIngress } = require('../lib/wayglass-mcp-presentation.cjs');
const phases = ['Perceive','Compress','Release','Verify','Integrate','Choose','Return','Transcend'].map((name,i)=>({name,index:i+1}));
const payload = {presentation_id:'opaline-v1',source_ref:'github:SingsEnochian/Flameclyffe@4d2eb0c',intent:'design review',phases};
async function withHost({currentGrant=true}={},fn) {
  const rows=new Map(),calls=[];
  const store={get:async k=>rows.get(k),putIfAbsent:async(k,v)=>{
    if(rows.has(k))return false;rows.set(k,v);return true;
  }};
  const ingress=makeWayglassPresentationIngress({store,reviewBridge:async value=>{calls.push(value);}});
  const handler=makeMcpHttpHandler({
    resourceUrl:'https://wayglass.example/mcp',
    verifyBearer:async bearer=>{
      if(bearer!=='valid')return null;
      return {active:true,subject:'owner-1',ownerAuthorized:true,grantId:'grant-1',
        scopes:['wayglass:constellation','wayglass:present'],verifyCurrentGrant:async()=>currentGrant};
    },present:ingress,listRoutes:()=>[]
  });
  const server=createServer((req,res)=>{handler(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end();});});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url='http://127.0.0.1:'+server.address().port+'/mcp';
  const call=(token,method,params)=>fetch(url,{method:'POST',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  try{await fn({call,calls,rows});}finally{await new Promise(done=>server.close(done));}
}
test('HTTP announces presentation tool only on bound host and creates durable receipt',async()=>{
 await withHost({},async({call,calls,rows})=>{
   const list=await (await call('valid','tools/list')).json();
   assert.deepEqual(list.result.tools.map(x=>x.name),['wayglass_routes','wayglass_present']);
   const submitted=await (await call('valid','tools/call',{name:'wayglass_present',arguments:payload})).json();
   const receipt=JSON.parse(submitted.result.content[0].text);
   assert.equal(receipt.status,'queued_for_review');assert.equal(receipt.wayglass_reply,null);
   assert.equal(calls.length,1);assert.equal(rows.size,1);
   const repeated=await (await call('valid','tools/call',{name:'wayglass_present',arguments:payload})).json();
   assert.equal(JSON.parse(repeated.result.content[0].text).duplicate,true);
   assert.equal(calls.length,1);
 });
});
test('HTTP rejects missing token or revoked current grant before queueing',async()=>{
 await withHost({currentGrant:false},async({call,calls,rows})=>{
   const anon=await call('bad','tools/call',{name:'wayglass_present',arguments:payload});
   assert.equal(anon.status,401);
   const revoked=await (await call('valid','tools/call',{name:'wayglass_present',arguments:payload})).json();
   assert.ok(revoked.error);assert.equal(calls.length,0);assert.equal(rows.size,0);
 });
});
