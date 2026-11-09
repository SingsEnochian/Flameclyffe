'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createWayglassCloudHost, REQUIRED_CHECKS } = require('../lib/wayglass-cloud-host.cjs');
const { startWayglassCloudHost } = require('../scripts/wayglass-cloud-host.cjs');
const sha = 'a'.repeat(40);
const time = Date.parse('2026-11-08T16:00:00Z');
function evidence() {
  return { schema: 'wayglass.cloud-readiness/v1', source_sha: sha, observed_at: new Date(time).toISOString(),
    checks: Object.fromEntries(REQUIRED_CHECKS.map(name => [name, { ok: true, evidence_id: 'fixture:'+name }])) };
}
async function running(t, options = {}) {
  let calls = 0;
  const server = createWayglassCloudHost({ sourceSha: sha, now: () => time, isStopped: () => false,
    gatewayHandler: (req,res) => { calls++; res.end('protocol-fixture'); }, ...options });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { url: 'http://127.0.0.1:'+server.address().port, calls: () => calls };
}
test('liveness is distinct from unverified readiness and does not probe native routes', async t => {
  const host=await running(t);
  assert.equal((await fetch(host.url+'/healthz')).status,200);
  const readiness=await fetch(host.url+'/readyz');assert.equal(readiness.status,503);
  assert.deepEqual(await readiness.json(),{ready:false,service:'wayglass-cloud-host'});assert.equal(host.calls(),0);
});
test('missing, stale, future, wrong-source and failed evidence cannot publish ready',async t=>{
  for(const change of [e=>delete e.checks.oauth_pkce,e=>e.checks.native_router.ok=false,
    e=>e.source_sha='b'.repeat(40),e=>e.observed_at=new Date(time-60001).toISOString(),
    e=>e.observed_at=new Date(time+1).toISOString(),e=>e.checks.durable_receipts.evidence_id='',
    e=>e.checks.grant_revocation.evidence_id='https://secret.example/token']) {
    const data=evidence();change(data);const host=await running(t,{checkReadiness:async()=>data});
    assert.equal((await fetch(host.url+'/readyz')).status,503);
  }
});
test('fresh fixture evidence covers all required adapters without leaking probe details',async t=>{
 const host=await running(t,{checkReadiness:async()=>({...evidence(),secret:'do-not-project'})});
 const response=await fetch(host.url+'/readyz');assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{ready:true,service:'wayglass-cloud-host'});
 assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(host.calls(),0);
});
test('unavailable or hung readiness remains bounded and redacted',async t=>{
 for(const checkReadiness of [async()=>{throw new Error('secret-token');},async()=>new Promise(()=>{})]) {
   const host=await running(t,{checkReadiness,readinessTimeoutMs:20});
   const response=await fetch(host.url+'/readyz');assert.equal(response.status,503);
   assert.doesNotMatch(await response.text(),/secret-token/);
 }
});
test('Feather true, unknown and unavailable hold delegation while liveness survives',async t=>{
 for(const isStopped of [()=>true,()=>undefined,()=>{throw new Error('secret');}]) {
  const host=await running(t,{isStopped,checkReadiness:async()=>evidence()});
  assert.equal((await fetch(host.url+'/readyz')).status,503);
  assert.equal((await fetch(host.url+'/mcp',{method:'POST'})).status,503);
  assert.equal((await fetch(host.url+'/healthz')).status,200);assert.equal(host.calls(),0);
 }
});
test('Feather is rechecked after readiness probe and every protocol dispatch',async t=>{
 let stop=false;
 const host=await running(t,{isStopped:()=>stop,checkReadiness:async()=>{stop=true;return evidence();}});
 assert.equal((await fetch(host.url+'/readyz')).status,503);
 stop=false;assert.equal(await (await fetch(host.url+'/mcp',{method:'POST'})).text(),'protocol-fixture');
 stop=true;assert.equal((await fetch(host.url+'/mcp',{method:'POST'})).status,503);assert.equal(host.calls(),1);
});
test('launcher rejects missing trusted adapters, invalid bind, source and ports',async()=>{
 for(const environment of [{},{WAYGLASS_CLOUD_ADAPTER:'relative'},
  {WAYGLASS_CLOUD_ADAPTER:'/trusted.cjs',PORT:'0'},
  {WAYGLASS_CLOUD_ADAPTER:'/trusted.cjs',PORT:'7860',WAYGLASS_BIND_HOST:'attacker.example'},
  {WAYGLASS_CLOUD_ADAPTER:'/trusted.cjs',PORT:'7860',WAYGLASS_SOURCE_SHA:'unknown'}]) {
   await assert.rejects(startWayglassCloudHost({environment,loadAdapter:()=>({createCloudAdapters:async()=>({})})}));
 }
});

test('hung Feather adapter cannot stall readiness or protocol indefinitely',async t=>{
 const host=await running(t,{isStopped:async()=>new Promise(()=>{}),readinessTimeoutMs:20,checkReadiness:async()=>evidence()});
 assert.equal((await fetch(host.url+'/readyz')).status,503);
 assert.equal((await fetch(host.url+'/mcp',{method:'POST'})).status,503);
 assert.equal(host.calls(),0);
});
test('CLI startup failure never prints credentialed adapter error details',async t=>{
 const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
 const {spawnSync}=require('node:child_process');const directory=await fs.mkdtemp(path.join(os.tmpdir(),'wayglass-cloud-launch-'));
 t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const adapter=path.join(directory,'adapter.cjs');
 await fs.writeFile(adapter,"exports.createCloudAdapters=async()=>{throw new Error('private-credential-value');};\n");
 const child=spawnSync(process.execPath,[path.resolve(__dirname,'../scripts/wayglass-cloud-host.cjs')],{
   encoding:'utf8',env:{WAYGLASS_CLOUD_ADAPTER:adapter,WAYGLASS_SOURCE_SHA:sha,PORT:'7860'}});
 assert.equal(child.status,1);assert.equal(child.stdout,'');
 assert.match(child.stderr,/startup failed/);assert.doesNotMatch(child.stderr,/private-credential-value/);
});
