'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createPresentationStore } = require('../lib/wayglass-presentation-store.cjs');
const { createPresentationDelivery } = require('../lib/wayglass-presentation-delivery.cjs');
const { makeWayglassPresentationIngress } = require('../lib/wayglass-mcp-presentation.cjs');
const RESOURCE = 'https://wayglass.example/mcp';
const payload = () => ({presentation_id:'recovery-1',source_ref:'github:PR-563',intent:'review',phases:
 ['Perceive','Compress','Release','Verify','Integrate','Choose','Return','Transcend'].map((name,i)=>({index:i+1,name}))});
async function fixture(t,options={}) {
 const directory = await fs.mkdtemp(path.join(os.tmpdir(),'wayglass-receipts-'));
 t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const store = createPresentationStore({directory,...options}); const queue=[];
 const principal = {active:true,ownerAuthorized:true,subject:'owner',grantId:'grant-1',scopes:['wayglass:present'],verifyCurrentGrant:async()=>true};
 const present=makeWayglassPresentationIngress({store,reviewBridge:async r=>queue.push(r)});
 const submit=(p=payload(),resource=RESOURCE)=>present({principal,payload:p,resource});
 return {directory,store,queue,principal,present,submit};
}
function delivery(store,overrides={}) {
 return createPresentationDelivery({store,resource:RESOURCE,isStopped:()=>false,authorize:async()=>true,
   deliver:async r=>({accepted:true,receipt_id:r.receipt_id}),...overrides});
}
test('separate Node process discovers and delivers exact durable receipt after notification failure',async t=>{
 const f=await fixture(t);
 const ingress=makeWayglassPresentationIngress({store:f.store,reviewBridge:async()=>{throw new Error('queue offline');}});
 const first=await ingress({principal:f.principal,payload:payload(),resource:RESOURCE});
 const script=`
 const {createPresentationStore}=require('./lib/wayglass-presentation-store.cjs');
 const {createPresentationDelivery}=require('./lib/wayglass-presentation-delivery.cjs');
 (async()=>{
 const resource=process.argv[2],store=createPresentationStore({directory:process.argv[1]}),events=[];
 const page=await store.listQueued({resource});
 const run=createPresentationDelivery({store,resource,isStopped:()=>false,
 authorize:async r=>{events.push({stage:'authorization',...r});return true;},
 deliver:async r=>{events.push({stage:'delivery',...r});return {accepted:true,receipt_id:r.receipt_id};}});
 const result=await run(page.records[0]);console.log(JSON.stringify({page,result,events}));
 })().catch(e=>{console.error(e);process.exitCode=1;});`;
 const child=JSON.parse(execFileSync(process.execPath,['-e',script,f.directory,RESOURCE],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'}));
 assert.equal(child.page.records.length,1);assert.equal(child.result.receipt_id,first.receipt_id);
 assert.equal(child.result.wayglass_reply,null);assert.equal(child.events[0].stage,'authorization');
 assert.equal(child.events[0].resource,RESOURCE);assert.deepEqual(child.events[1].payload,payload());
 assert.equal((await f.submit()).duplicate,true);
});
test('revoked, unknown and thrown current grants never dispatch and preserve evidence',async t=>{
 const f=await fixture(t);await f.submit(); const before=await f.store.get(f.queue[0].key);
 for(const authorize of [async()=>false,async()=>undefined,async()=>{throw new Error('offline');}]) {
  let calls=0;await assert.rejects(delivery(f.store,{authorize,deliver:async()=>calls++})(f.queue[0]));assert.equal(calls,0);
 }
 assert.deepEqual(await f.store.get(f.queue[0].key),before);
});
test('16 concurrent submissions publish one private complete immutable receipt',async t=>{
 const f=await fixture(t);const results=await Promise.all(Array.from({length:16},()=>f.submit()));
 assert.equal(new Set(results.map(r=>r.receipt_id)).size,1);assert.equal(f.queue.length,1);
 assert.equal(results.filter(r=>!r.duplicate).length,1);
 assert.deepEqual(await fs.readdir(f.directory),[f.queue[0].key+'.json']);
 if(process.platform!=='win32')assert.equal((await fs.stat(path.join(f.directory,f.queue[0].key+'.json'))).mode & 0o777,0o600);
});
test('resource is persisted and separates idempotency and recovery queues',async t=>{
 const f=await fixture(t);await f.submit();await f.submit(payload(),'https://other.example/mcp');
 assert.notEqual(f.queue[0].key,f.queue[1].key);assert.equal((await f.store.get(f.queue[0].key)).resource,RESOURCE);
 assert.deepEqual((await f.store.listQueued({resource:RESOURCE})).records,[{key:f.queue[0].key,receipt_id:f.queue[0].receipt_id,resource:RESOURCE}]);
 let calls=0;await assert.rejects(delivery(f.store,{resource:'https://other.example/mcp',authorize:async()=>{calls++;return true;}})(f.queue[0]),/resource/);assert.equal(calls,0);
});
test('caller mutation during authorization cannot alter captured payload or identity',async t=>{
 const f=await fixture(t);let release,entered;
 const ready=new Promise(r=>entered=r);f.principal.verifyCurrentGrant=async()=>{entered();await new Promise(r=>release=r);return true;};
 const p=payload();const pending=f.submit(p);await ready;
 p.intent='changed';p.presentation_id='changed';p.phases[0].name='changed';f.principal.subject='other';f.principal.grantId='other';
 release();await pending;const record=await f.store.get(f.queue[0].key);
 assert.deepEqual(record.payload,payload());assert.equal(record.principal_id,'owner');assert.equal(record.grant_id,'grant-1');
});
test('tampering, old unbound records and wrong receipt fail before authorization',async t=>{
 const f=await fixture(t);await f.submit();const original=await f.store.get(f.queue[0].key);
 for(const record of [{...original,digest:'bad'},{...original,principal_id:'other'},
  {...original,source_ref:'other'},{...original,resource:undefined},{...original,schema:undefined}]) {
  let calls=0;await assert.rejects(delivery({get:async()=>record},{authorize:async()=>{calls++;return true;}})(f.queue[0]));assert.equal(calls,0);
 }
 await assert.rejects(delivery(f.store)({...f.queue[0],receipt_id:'wrong'}));
});
test('Feather and unknown stop state deny delivery, including stop during grant check',async t=>{
 const f=await fixture(t);await f.submit();
 for(const value of [true,undefined,null]){let calls=0;await assert.rejects(delivery(f.store,{isStopped:()=>value,authorize:async()=>{calls++;return true;}})(f.queue[0]));assert.equal(calls,0);}
 let stopped=false,calls=0;
 await assert.rejects(delivery(f.store,{isStopped:()=>stopped,authorize:async()=>{stopped=true;return true;},deliver:async()=>calls++})(f.queue[0]));assert.equal(calls,0);
});
test('failed or unacknowledged delivery never claims submission and retains queued evidence',async t=>{
 const f=await fixture(t);await f.submit();const before=await f.store.get(f.queue[0].key);
 for(const deliver of [async()=>{throw new Error('down');},async()=>undefined,async()=>({accepted:false}),async()=>({accepted:true,receipt_id:'wrong'})])
  await assert.rejects(delivery(f.store,{deliver})(f.queue[0]));
 assert.deepEqual(await f.store.get(f.queue[0].key),before);
});
test('recovery pagination is bounded, resource filtered and contains no private payload',async t=>{
 const f=await fixture(t);for(let i=0;i<3;i++)await f.submit({...payload(),presentation_id:'page-'+i});
 const seen=[];let after='';do{const page=await f.store.listQueued({resource:RESOURCE,after,limit:1});seen.push(...page.records);after=page.next;}while(after);
 assert.equal(seen.length,3);assert.equal(new Set(seen.map(r=>r.key)).size,3);assert.deepEqual(Object.keys(seen[0]).sort(),['key','receipt_id','resource']);
 await assert.rejects(f.store.listQueued({resource:RESOURCE,limit:1001}));
});
test('unsupported hard links fail explicitly without publishing or leaving temporary files',async t=>{
 const f=await fixture(t,{filesystem:{...fs,link:async()=>{const e=new Error('unsupported');e.code='ENOTSUP';throw e;}}});
 await assert.rejects(f.submit(),/unsupported/);assert.deepEqual(await fs.readdir(f.directory),[]);assert.equal(f.queue.length,0);
});
test('directory fsync failure after publication cannot become accepted duplicate on retry',async t=>{
 let syncs=0;
 const filesystem={...fs,open:async(file,...args)=>{
  const handle=await fs.open(file,...args);
  if(args[0]==='r')return {sync:async()=>{syncs++;if(syncs>=3)throw new Error('directory sync unsupported');await handle.sync();},close:()=>handle.close()};
  return handle;
 }};
 const f=await fixture(t,{filesystem});await assert.rejects(f.submit(),/sync unsupported/);
 assert.equal((await fs.readdir(f.directory)).filter(x=>x.endsWith('.json')).length,1);
 await assert.rejects(f.submit(),/sync unsupported/);await assert.rejects(f.store.listQueued({resource:RESOURCE}),/sync unsupported/);
 assert.equal(f.queue.length,0);
 // A later supported host may establish durability and recover retained evidence.
 assert.equal((await createPresentationStore({directory:f.directory}).listQueued({resource:RESOURCE})).records.length,1);
});
test('private store rejects invalid paths, insecure directory and symlink receipts',async t=>{
 const f=await fixture(t);assert.throws(()=>createPresentationStore({directory:'relative'}));await assert.rejects(f.store.get('../escape'));
 await f.submit();const key=f.queue[0].key,file=path.join(f.directory,key+'.json');
 await fs.rename(file,file+'.original');await fs.symlink(file+'.original',file);await assert.rejects(f.store.get(key));
 if(process.platform!=='win32'){await fs.chmod(f.directory,0o755);await assert.rejects(f.store.get(key),/Private host directory/);}
});
test('invalid ingress resource, payload and conflicting duplicate never enqueue',async t=>{
 const f=await fixture(t);
 for(const resource of [undefined,'http://public.example/mcp','https://user:pass@example.org/mcp','https://example.org/mcp?token=x'])await assert.rejects(f.present({principal:f.principal,payload:payload(),resource}));
 await assert.rejects(f.submit({...payload(),phases:[]}));await f.submit();
 await assert.rejects(f.submit({...payload(),intent:'different'}),/Idempotency conflict/);assert.equal(f.queue.length,1);
});
