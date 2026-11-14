'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createHash}=require('node:crypto');
const express=require('express');
const {createAlteredTimelineStore}=require('../../../lib/wayglass-altered-timeline-store.cjs');
const {createWayglassRouter}=require('../wayglass/router.js');

const SECRET='wayglass-automated-test-secret-not-a-production-key';
const sha=s=>createHash('sha256').update(s).digest('hex');
async function fixture(){
  const [{createTimelineOriginal},{createWyrdruneRuntime}]=await Promise.all([
    import('../../arcsweep/src/altered-timeline.js'),
    import('../../../lib/wyrdrune/runtime.mjs'),
  ]);
  const original=createTimelineOriginal({
    worldId:'scenario-laboratory',worldName:'AI-human futures',
    events:[{id:'origin-1',at:'2026-11-14',title:'A civic council considers an AI pilot.'}],
    at:'2026-11-14T10:00:00Z',
  });
  const raw=fs.readFileSync(path.join(__dirname,'../../../lib/wyrdrune/altered-timeline.wtl'),'utf8');
  const runtime=createWyrdruneRuntime({hashSource:sha});
  const execution=await runtime.execute(runtime.compile(raw));
  const score=execution.output.find(x=>x?.schema==='wayglass.altered-timeline-ripple/v0.1');
  assert.ok(score);
  return {
    original,branchId:'scenario-laboratory-altered-20261114',createdAt:'2026-11-14T10:00:00Z',
    changes:[{mode:'replace',target_id:'origin-1',title:'The council launches independent oversight.',
      reason:'Test an intentional change',magnitude:.5,source_refs:['owner:local-what-if'],
      ripple:score,wtl_source_sha256:sha(raw)}],
    evidence:[{receipt_id:'witness-1',source_refs:['source:public-audit'],
      when:{occurred_at:'2026-11-14T10:00:00Z'},
      timeline_evidence:[{timeline_id:'coevolution',relation:'context',evidence_class:'reported',
        source_refs:['source:public-audit']}]}],
  };
}
async function serverFor(dir){
  process.env.HOUSE_SESSION_SECRET=SECRET;
  process.env.WAYGLASS_DATA_DIR=dir;
  const {issueHouseSession}=await import('../wayglass-runtime/house-session.mjs');
  const token=issueHouseSession({get:key=>process.env[key]}).token;
  const app=express();
  app.use(express.json({limit:'256kb'}));
  app.use('/api/v1/wayglass',createWayglassRouter());
  const server=await new Promise(resolve=>{
    const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));
  });
  const address='http://127.0.0.1:'+server.address().port;
  const stop=()=>new Promise((ok,fail)=>server.close(err=>err?fail(err):ok()));
  const call=async(route,{method='GET',body=null,cookie=true,origin=address}={})=>{
    const headers={Accept:'application/json',...(cookie?{Cookie:'hearthgate_session='+token}:{}),
      ...(origin?{Origin:origin}:{}),
      ...(body?{'Content-Type':'application/json'}:{})};
    const response=await fetch(address+'/api/v1/wayglass/timeline/altered'+route,
      {method,headers,...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,body:await response.json()};
  };
  return {server,call,stop};
}
test('signed host Return survives cold restart and protects original/altered/evidence',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wayglass-altered-return-'));
  const prior={secret:process.env.HOUSE_SESSION_SECRET,data:process.env.WAYGLASS_DATA_DIR};
  let rig=null;
  try{
    const input=await fixture();
    rig=await serverFor(dir);
    const denied=await rig.call('/checkpoints',{cookie:false});
    assert.equal(denied.status,401);
    const csrf=await rig.call('/checkpoints',{method:'POST',body:{snapshot:input},
      origin:'https://attacker.example'});
    assert.equal(csrf.status,403);
    const forged=structuredClone(input);
    forged.changes[0].ripple.levels[0].intensity=.99;
    const invalid=await rig.call('/checkpoints',{method:'POST',
      body:{snapshot:forged,expected_storage_id:null}});
    assert.equal(invalid.status,400);
    const saved=await rig.call('/checkpoints',{method:'POST',
      body:{snapshot:input,expected_storage_id:null}});
    assert.equal(saved.status,201,JSON.stringify(saved.body));
    const receipt=saved.body.receipt;
    assert.equal(receipt.persisted,true);
    assert.equal(receipt.verified,true);
    assert.equal(receipt.revision,1);
    const listed=await rig.call('/checkpoints');
    assert.equal(listed.status,200);
    assert.equal(listed.body.checkpoints.length,1);
    assert.equal(listed.body.checkpoints[0].storage_id,receipt.storage_id);
    const returned=await rig.call('/checkpoints/'+receipt.storage_id);
    assert.equal(returned.status,200);
    assert.equal(returned.body.status,'restored-from-verified-host-checkpoint');
    assert.equal(returned.body.snapshot.original.events[0].title,
      'A civic council considers an AI pilot.');
    assert.equal(returned.body.snapshot.changes[0].title,
      'The council launches independent oversight.');
    assert.equal(returned.body.comparison.verdict,'undetermined');
    assert.equal(returned.body.comparison.timelines.find(x=>x.timeline_id==='coevolution').assessment,'context-only');
    const conflict=await rig.call('/checkpoints',{method:'POST',
      body:{snapshot:input,expected_storage_id:null}});
    assert.equal(conflict.status,409);
    const savedAgain=await rig.call('/checkpoints',{method:'POST',
      body:{snapshot:input,expected_storage_id:receipt.storage_id}});
    assert.equal(savedAgain.status,201,JSON.stringify(savedAgain.body));
    assert.equal(savedAgain.body.receipt.revision,2);
    assert.equal(savedAgain.body.receipt.previous_storage_id,receipt.storage_id);
    await rig.stop();rig=null;
    rig=await serverFor(dir);
    const cold=await rig.call('/latest/'+input.branchId);
    assert.equal(cold.status,200,JSON.stringify(cold.body));
    assert.equal(cold.body.receipt.revision,2);
    assert.equal(cold.body.snapshot.original.events[0].title,
      'A civic council considers an AI pilot.');
    assert.equal(cold.body.snapshot.evidence.length,1);
    const old=await rig.call('/checkpoints/'+receipt.storage_id);
    assert.equal(old.status,200);
    const store=createAlteredTimelineStore({directory:path.join(dir,'altered-timelines'),secret:SECRET});
    assert.equal(store.read(receipt.storage_id).verified,true);
    const file=path.join(dir,'altered-timelines',receipt.storage_id+'.json');
    fs.appendFileSync(file,'\n ');
    const tampered=await rig.call('/checkpoints/'+receipt.storage_id);
    assert.equal(tampered.status,409);
  }finally{
    if(rig)await rig.stop();
    if(prior.secret===undefined)delete process.env.HOUSE_SESSION_SECRET;
    else process.env.HOUSE_SESSION_SECRET=prior.secret;
    if(prior.data===undefined)delete process.env.WAYGLASS_DATA_DIR;
    else process.env.WAYGLASS_DATA_DIR=prior.data;
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
