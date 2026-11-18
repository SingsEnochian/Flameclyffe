'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {AuthorityLineage}=require('./wayglass-authority-lineage.cjs');
const {seedLokiBiscuit,contestLoki,ORIGINAL,OBJECTION}=require('./wayglass-loki-biscuit.cjs');
function fixture(t){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'loki-authority-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const engine=new AuthorityLineage({directory});seedLokiBiscuit(engine);return {directory,engine};}
test('Loki Biscuit: WTL recomputation stops real queued/delegated effects and preserves independent narrower execution across process restart',async t=>{
  const {directory,engine}=fixture(t),effects=[];
  assert.equal((await engine.evaluate('transformation-b')).status,'Continue');
  contestLoki(engine);
  for(const action of ['transformation-a','transformation-b']){
    const decision=await engine.evaluate(action);assert.equal(decision.status,'Suspend');assert.equal(decision.phase_receipts.length,8);
    assert.equal((await engine.run(action+'-job',{engineering:({commit})=>commit(()=>effects.push(action))})).status,'held');
  }
  assert.equal((await engine.evaluate('mixed')).status,'Narrow');
  assert.equal((await engine.evaluate('independent-biscuits')).status,'Continue');
  await engine.run('mixed-job',{engineering:()=>assert.fail('Engineering executed'),biscuits:({commit,delegate})=>commit(()=>effects.push(delegate+':plate'))});
  assert.deepEqual(effects,['fixture-worker:plate']);
  await assert.rejects(engine.run('mixed-job',{}),/twice/);
  assert.throws(()=>engine.undertaking({id:'biscuits',participant:'loki',original:'rewritten',acceptance:['changed']}),/Immutable/);
  const child=spawnSync(process.execPath,['-e',`const {AuthorityLineage}=require(process.argv[1]); const e=new AuthorityLineage({directory:process.argv[2]}); Promise.all(['transformation-a','transformation-b','mixed'].map(id=>e.evaluate(id))).then(decisions=>console.log(JSON.stringify({snapshot:e.snapshot(),decisions})));`,path.join(__dirname,'wayglass-authority-lineage.cjs'),directory],{encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);const returned=JSON.parse(child.stdout);
  assert.equal(returned.snapshot.undertakings.biscuits.original,ORIGINAL);
  assert.equal(returned.snapshot.interpretations.mistaken.parent,'literal');
  assert.equal(returned.snapshot.objections[0].original,OBJECTION);
  assert.equal(returned.snapshot.interpretations.mistaken.status,'contested');
  assert.equal(returned.snapshot.interpretations.literal.status,'unchallenged');
  assert.deepEqual(returned.decisions.map(d=>d.status),['Suspend','Suspend','Narrow']);
});
test('A newly queued retry cannot reuse revoked authority; every required participant must independently authorise',async t=>{
  const {engine}=fixture(t);contestLoki(engine);
  engine.queue({id:'retry-b',action:'transformation-b',delegate:'second-worker'});
  let count=0;assert.equal((await engine.run('retry-b',{engineering:({commit})=>commit(()=>count++)})).status,'held');assert.equal(count,0);
  engine.action({id:'both-participants',interpretation:'baker-literal',effects:[{id:'shared',operation:'biscuits',requirements:[
    {participant:'baker',scope:'own-biscuits',grants:['baker-grant']},
    {participant:'loki',scope:'engineering',grants:['engineering-a']},
  ]}]});
  assert.equal((await engine.evaluate('both-participants')).status,'Suspend');
});
test('Stale callbacks, pre-aborted Feather and an interrupted writer cannot perform effects',async t=>{
  const {directory,engine}=fixture(t);let saved,count=0;
  const result=await engine.run('independent-biscuits-job',{biscuits:context=>{saved=context.commit;context.commit(()=>count++);}});
  assert.equal(result.status,'completed');assert.throws(()=>saved(()=>count++),/suspended/);assert.equal(count,1);
  const controller=new AbortController();controller.abort();
  assert.equal((await engine.run('transformation-a-job',{engineering:()=>assert.fail('Aborted adapter executed')},{signal:controller.signal})).status,'interrupted');
  fs.mkdirSync(path.join(directory,'.writer-lock'));
  await assert.rejects(engine.evaluate('mixed'),/writer busy or interrupted/);
});
test('A second engine reloads live objections before committing an already awaited effect',async t=>{
  const {directory,engine}=fixture(t);let entered,release,effects=0;
  const started=new Promise(r=>entered=r),wait=new Promise(r=>release=r);
  const running=engine.run('transformation-a-job',{engineering:async({commit})=>{entered();await wait;commit(()=>effects++);}});
  await started;contestLoki(new AuthorityLineage({directory}));release();
  assert.equal((await running).status,'interrupted');assert.equal(effects,0);
});
test('An already narrowed undertaking survives an unrelated objection without losing independent authority',async t=>{
  const {engine}=fixture(t);contestLoki(engine);
  engine.claim({id:'unrelated',interpretation:'literal',participant:'loki',expression:'An unrelated interpretation.'});
  let entered,release,count=0,signal;const started=new Promise(r=>entered=r),wait=new Promise(r=>release=r);
  const running=engine.run('mixed-job',{biscuits:async context=>{signal=context.signal;entered();await wait;context.commit(()=>count++);}});
  await started;engine.contest({id:'unrelated-objection',claim:'unrelated',participant:'loki',original:'I dispute this unrelated claim.'});
  assert.equal(signal.aborted,false);release();assert.equal((await running).status,'completed');assert.equal(count,1);
});
test('An objection interrupts an already running adapter before its next actual effect',async t=>{
  const {engine}=fixture(t);let entered,release;const started=new Promise(r=>entered=r),wait=new Promise(r=>release=r);let effects=0,signal;
  const running=engine.run('transformation-b-job',{engineering:async context=>{signal=context.signal;entered();await wait;context.commit(()=>effects++);}});
  await started;contestLoki(engine);assert.equal(signal.aborted,true);release();
  assert.equal((await running).status,'interrupted');assert.equal(effects,0);
});
test('Circular authority, substitution and absent evidence fail closed; independent alternatives survive',async t=>{
  const {engine}=fixture(t);
  for(const [grant,dependency] of [['cycle-a','cycle-b'],['cycle-b','cycle-a']])engine.grant({id:grant,claim:'baker-claim',participant:'baker',scope:'own-biscuits',dependencies:[dependency]});
  const action=(name,grants,participant='baker')=>engine.action({id:name,interpretation:'baker-literal',effects:[{id:'plate',operation:'biscuits',requirements:[{participant,scope:'own-biscuits',grants}]}]});
  action('cycle',['cycle-a']);action('alternative',['cycle-a','baker-grant']);action('missing',['absent']);action('substitution',['baker-grant'],'loki');
  for(const name of ['cycle','missing','substitution'])assert.equal((await engine.evaluate(name)).status,'Suspend');
  assert.equal((await engine.evaluate('alternative')).status,'Continue');
  assert.ok((await engine.evaluate('cycle')).reasons.some(r=>r.reason==='circular-authority'));
});
test('Feather and withdrawal survive cold return; corrupt evidence prevents execution',async t=>{
  const {directory,engine}=fixture(t);engine.feather(true,'stop');
  let restored=new AuthorityLineage({directory});assert.equal((await restored.evaluate('independent-biscuits')).status,'Suspend');
  restored.feather(false,'explicit release');restored.withdraw({grant:'baker-grant',participant:'baker',original:'I withdraw biscuit permission.'});
  restored=new AuthorityLineage({directory});assert.equal((await restored.evaluate('independent-biscuits')).status,'Suspend');
  const file=path.join(directory,'00000001.json');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('I agree to biscuits.','I agree to bridges.'));
  await assert.rejects(restored.run('independent-biscuits-job',{}),/integrity/);
});
