'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeWayglassPresentationIngress } = require('../lib/wayglass-mcp-presentation.cjs');
const { handleMcpMessage } = require('../lib/wayglass-mcp-core.cjs');
const phases = ['Perceive','Compress','Release','Verify','Integrate','Choose','Return','Transcend'].map((name,i)=>({index:i+1,name}));
const payload = {presentation_id:'opaline-v1',source_ref:'github:PR-563',intent:'request design review',phases};
function fixture() {
  const records = new Map(); const enqueued = [];
  const store = {get:async k=>records.get(k),putIfAbsent:async(k,v)=>{if(records.has(k))return false;records.set(k,v);return true}};
  const principal = {active:true,ownerAuthorized:true,subject:'authorized-reviewer',grantId:'g1',
    scopes:['wayglass:constellation','wayglass:present'],verifyCurrentGrant:async()=>true};
  const present=makeWayglassPresentationIngress({store,reviewBridge:async r=>enqueued.push(r)});
  return {records,enqueued,principal,present};
}
test('durable receipt and idempotent duplicate, never invent a reply',async()=>{
 const f=fixture();const a=await f.present({principal:f.principal,payload,resource:'https://example.org/mcp'});
 const b=await f.present({principal:f.principal,payload,resource:'https://example.org/mcp'});
 assert.equal(a.accepted,true);assert.equal(a.status,'queued_for_review');assert.equal(a.wayglass_reply,null);
 assert.equal(b.duplicate,true);assert.equal(a.receipt_id,b.receipt_id);assert.equal(f.enqueued.length,1);
});
test('missing scope, revoked grant, no owner authority and invalid shape fail closed',async()=>{
 for(const modify of [p=>p.scopes=['wayglass:constellation'],p=>p.revoked=true,
   p=>p.ownerAuthorized=false,p=>p.verifyCurrentGrant=async()=>false]){
  const f=fixture();modify(f.principal);
  await assert.rejects(f.present({principal:f.principal,payload,resource:'https://example.org/mcp'}));
  assert.equal(f.records.size,0);
 }
 const f=fixture();await assert.rejects(f.present({principal:f.principal,payload:{...payload,phases:phases.slice(1)},resource:'https://example.org/mcp'}));
});
test('idempotency conflict cannot overwrite first submission',async()=>{
 const f=fixture();await f.present({principal:f.principal,payload,resource:'https://example.org/mcp'});
 await assert.rejects(f.present({principal:f.principal,payload:{...payload,intent:'altered'},resource:'https://example.org/mcp'}));
 assert.equal(f.records.size,1);
});
test('MCP tool exposes only receipt; unauthenticated call is denied',async()=>{
 const f=fixture(),message={jsonrpc:'2.0',id:7,method:'tools/call',params:{name:'wayglass_present',arguments:payload}};
 const denied=await handleMcpMessage(message,{authenticated:false,present:f.present,principal:f.principal});
 assert.ok(denied.error);
 const result=await handleMcpMessage(message,{authenticated:true,present:f.present,principal:f.principal,resource:'https://example.org/mcp'});
 const receipt=JSON.parse(result.result.content[0].text);
 assert.equal(receipt.status,'queued_for_review');assert.equal(receipt.wayglass_reply,null);
});

test('presentation tool is not advertised until the trusted host binds ingress',async()=>{
 const list={jsonrpc:'2.0',id:8,method:'tools/list'};
 const without=await handleMcpMessage(list,{authenticated:true});
 assert.deepEqual(without.result.tools.map(t=>t.name),['wayglass_routes']);
 const withBound=await handleMcpMessage(list,{authenticated:true,present:fixture().present});
 assert.deepEqual(withBound.result.tools.map(t=>t.name),['wayglass_routes','wayglass_present']);
 const call={jsonrpc:'2.0',id:9,method:'tools/call',params:{name:'wayglass_present',arguments:payload}};
 const unbound=await handleMcpMessage(call,{authenticated:true});
 assert.equal(unbound.error.code,-32603);
});
