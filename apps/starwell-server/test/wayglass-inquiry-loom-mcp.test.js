'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const { createWayglassMcpRouter } = require('../wayglass/mcp-bridge');
const { createWayglassInquiryRouter } = require('../wayglass/inquiry-loom');

const DIRECTORY_PREFIX = 'wayglass-inquiry-mcp-';
async function launch(t, directory) {
  const app=express();app.use(express.json());
  app.use('/mcp',createWayglassMcpRouter({
    inquiryDirectory:directory,
    workspaceDirectory:path.join(directory,'projects'),
    storePath:path.join(directory,'conversations.json'),
    tokenLoader:()=> 'rarity-inquiry-fixture-credential',
    codexTokenLoader:()=> 'codex-inquiry-fixture-credential',
    flameIds:[],fetchImpl:async ()=> {throw new Error('No provider sends in Inquiry test.');},
  }));
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  return { base:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve)) };
}
async function tool(base,seat,name,args={}) {
  const credentials={rarity:'rarity-inquiry-fixture-credential',codex:'codex-inquiry-fixture-credential'};
  const response=await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json',...(seat?{authorization:`Bearer ${credentials[seat]}`}:{})},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});
  return {status:response.status,body:await response.json()};
}
function content(r) {assert.equal(r.status,200);assert.equal(r.body.error,undefined,JSON.stringify(r.body));return r.body.result.structuredContent;}

// Uses actual test-only distinct bearer credentials. Does not claim live OAuth provider pairing.
test('MCP Rarity/Codex seats co-author inquiry without spoofed membership, and cold restart preserves dissent',async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),DIRECTORY_PREFIX));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  let server=await launch(t,directory);t.after(async()=>{if(server)await server.close();});
  assert.equal((await tool(server.base,null,'list_inquiries')).status,401);
  const initial=content(await tool(server.base,'rarity','open_inquiry',{question:'What is changing in our coastal estuary?',world_ref:'starwell:canopy-tide',source_refs:['map:source-1']}));
  const id=initial.inquiry_id;
  const hidden=await tool(server.base,'codex','read_inquiry',{inquiry_id:id});
  assert.match(hidden.body.error.message,/membership/);
  assert.equal(content(await tool(server.base,'codex','list_inquiries')).inquiries.length,0);
  content(await tool(server.base,'rarity','invite_to_inquiry',{inquiry_id:id,target_participant_id:'codex'}));
  assert.match((await tool(server.base,'codex','read_inquiry',{inquiry_id:id})).body.error.message,/membership/);
  content(await tool(server.base,'codex','join_inquiry',{inquiry_id:id}));
  const r=content(await tool(server.base,'rarity','contribute_to_inquiry',{inquiry_id:id,kind:'interpretation',text:'The tidal line reflects seasonal variation.'}));
  const first=r.events.at(-1).event_id;
  const challenged=content(await tool(server.base,'codex','contribute_to_inquiry',{inquiry_id:id,kind:'challenge',text:'We should also test estuary datum.',reply_to:first}));
  assert.equal(challenged.events.at(-1).participant_id,'codex');
  assert.notEqual(challenged.events.at(-1).principal_ref,r.events.at(-1).principal_ref);
  assert.match((await tool(server.base,'codex','contribute_to_inquiry',{inquiry_id:id,kind:'revision',text:'Spoof Rowan',participant_id:'rowan',reply_to:first})).body.error.message,/Unexpected tool arguments/);
  const revised=content(await tool(server.base,'rarity','contribute_to_inquiry',{inquiry_id:id,kind:'revision',text:'Season and datum both require tests.',reply_to:first}));
  assert.equal(revised.events.filter(x=>x.kind==='contributed').length,3);
  content(await tool(server.base,'codex','pause_inquiry',{inquiry_id:id,stop_point:'Run tidal benchmark.',next_owner:'rarity'}));
  await server.close();server=await launch(t,directory);
  const returned=content(await tool(server.base,'rarity','read_inquiry',{inquiry_id:id}));
  assert.equal(returned.events.filter(x=>x.kind==='contributed').length,3);
  assert.equal(returned.return_marker.next_owner,'rarity');
  assert.equal(returned.return_marker.adopted_by_return_engine,false);
  assert.equal(returned.event_integrity,'local-hash-chain-not-participant-signature');
});

test('HTTP Inquiry entrance denies unsigned requests before reading disk and never accepts caller role',async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),DIRECTORY_PREFIX));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const app=express();app.use(express.json());
  // Test-only injected authenticator, NOT a header accepted by the production router.
  app.use('/api/v1/wayglass/inquiries',createWayglassInquiryRouter({
    loom:require('../wayglass/inquiry-loom').createInquiryLoom({directory}),
    authenticate:async req=> req.headers['x-fixture-auth'] === 'signed-house-fixture' ? {verified:true,participant_id:'rowan',principal_ref:'house:test'} : null,
  }));
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});t.after(()=>new Promise(resolve=>server.close(resolve)));
  const uri=`http://127.0.0.1:${server.address().port}/api/v1/wayglass/inquiries`;
  assert.equal((await fetch(uri)).status,401);
  assert.equal(fs.existsSync(path.join(directory,'journal.json')),false);
  const forged=await fetch(uri,{method:'POST',headers:{'content-type':'application/json','x-fixture-auth':'signed-house-fixture'},body:JSON.stringify({question:'A real question?',participant_id:'rarity'})});
  assert.equal(forged.status,400);
  const opened=await fetch(uri,{method:'POST',headers:{'content-type':'application/json','x-fixture-auth':'signed-house-fixture'},body:JSON.stringify({question:'A real question?'})});
  assert.equal(opened.status,201);assert.equal((await opened.json()).events[0].participant_id,'rowan');
});