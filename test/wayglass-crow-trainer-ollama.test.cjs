'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {mkdtemp,readFile,rm}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {localEndpoint,chooseAmber,runAmberCohort}=require('../lib/wayglass-crow-trainer-ollama.cjs');
const source='mobius { perceive { let a = 220; } compress { let b = a + 5.5; } release { emit b; } verify { emit "checked"; } integrate { emit "distinct"; } choose { emit b; } return { emit "held"; } transcend { emit "withness"; } }';
test('local-only route rejects remote hosts',()=>{assert.throws(()=>localEndpoint('https://example.org/'));assert.throws(()=>localEndpoint('http://192.168.1.2:11434/'));assert.equal(localEndpoint(),'http://127.0.0.1:11434');});
test('Amber selection requires an unambiguous installed model',()=>{assert.equal(chooseAmber({models:[{name:'orion:26b'}]}),'orion:26b');assert.throws(()=>chooseAmber({models:[{name:'orion:a'},{name:'orion:b'}]}));});
test('four model calls are attributed and written to local return receipt',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'crow-trainer-'));
 let calls=0;
 const fetcher=async(url,init)=>{
  if(url.endsWith('/api/tags'))return {ok:true,json:async()=>({models:[{name:'orion:26b'}]})};
  calls++;
  const request=JSON.parse(init.body);
  assert.equal(request.model,'orion:26b');
  return {ok:true,json:async()=>({model:'orion:26b',message:{content:source},done:true,created_at:'2026-11-14T00:00:00Z'})};
 };
 try{
  const run=await runAmberCohort({fetcher,outDir:dir});
  assert.equal(calls,4);
  assert.equal(run.results.length,4);
  assert.ok(run.results.every(x=>x.status==='compiled'));
  const receipt=JSON.parse(await readFile(run.path,'utf8'));
  assert.equal(receipt.results.length,4);
  assert.equal(receipt.bluebird_contacted,false);
  assert.equal(receipt.weights_finetuned,false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
