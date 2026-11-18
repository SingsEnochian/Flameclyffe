'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {fork}=require('node:child_process');
const {once}=require('node:events');
test('Packaged Wayglass HTTP: biscuit objection, actual effect exclusion, Return receipt and cold host restart',async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'loki-host-')),token='loki-test-'+ 'b'.repeat(48);let child;
  t.after(async()=>{if(child&&!child.killed){child.kill();await once(child,'exit').catch(()=>{});}fs.rmSync(directory,{recursive:true,force:true});});
  async function boot(){
    child=fork(path.join(__dirname,'wayglass-authority-host-fixture.cjs'),[],{env:{...process.env,WAYGLASS_DATA_DIR:directory,ARCSWEEP_RUNTIME_TOKEN:token},stdio:['ignore','pipe','pipe','ipc']});
    let errors='';child.stderr.on('data',data=>errors+=data);
    const port=await Promise.race([once(child,'message').then(([m])=>m.port),once(child,'exit').then(([code])=>{throw new Error('Host exited '+code+': '+errors);})]);
    return 'http://127.0.0.1:'+port;
  }
  let base=await boot();
  async function request(command,headers={authorization:'Bearer '+token}){
    return fetch(base+'/api/v1/wayglass/authority/loki',{method:command?'POST':'GET',headers:{'content-type':'application/json',...headers},...(command?{body:JSON.stringify({command})}:{})});
  }
  assert.equal((await request(null,{})).status,401);
  assert.equal((await request('prepare',{authorization:'Bearer '+token,origin:'https://foreign.example'})).status,403);
  let response=await request('prepare');assert.equal(response.status,200,await response.clone().text());
  const prepared=await response.json();assert.equal(prepared.decisions.find(d=>d.action==='transformation-b').status,'Continue');
  response=await request('object');assert.equal(response.status,200);
  const challenged=await response.json();assert.equal(challenged.snapshot.objections.length,1);
  const exit=once(child,'exit');child.send('stop');await exit;child=null;
  base=await boot();
  const restored=await (await request()).json();assert.equal(restored.snapshot.head,challenged.snapshot.head);
  response=await request('run');assert.equal(response.status,200,await response.clone().text());
  const ran=await response.json();assert.equal(ran.effects.length,2);assert.ok(ran.effects.every(name=>name.endsWith('-biscuits.json')));
  assert.equal(ran.snapshot.jobs['transformation-a-job'].status,'held');
  assert.equal(ran.snapshot.jobs['transformation-b-job'].status,'held');
  assert.equal(ran.decisions.find(d=>d.action==='mixed').status,'Narrow');
  const returned=await (await request('return')).json();assert.equal(returned.return_receipt.persisted,true);
  const artifact=JSON.parse(fs.readFileSync(path.join(directory,returned.return_receipt.storage_id+'.json'),'utf8'));
  assert.equal(artifact.authority_head,ran.snapshot.head);assert.equal(artifact.authority_grant,false);
  assert.match(await (await fetch(base+'/wayglass/')).text(),/Wayglass/i);
  console.log(JSON.stringify({evidence:'loki-http-cold-return',before:prepared.snapshot.head,after:ran.snapshot.head,decisions:ran.decisions.map(d=>({action:d.action,status:d.status})),effects:ran.effects,return_storage_id:returned.return_receipt.storage_id}));
});
