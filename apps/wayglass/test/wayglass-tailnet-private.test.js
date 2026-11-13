import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { allowedWayglassPath, createTailnetGate } from '../../../scripts/wayglass-tailnet-gate.mjs';

const require=createRequire(import.meta.url);
const { createAmberRoomStore }=require('../../starwell-server/wayglass/amber-room-store.cjs');

test('restricted private gateway permits Wayglass and required House session paths only',()=>{
  for(const url of [
    '/wayglass','/wayglass/','/wayglass/assets/index.js',
    '/api/v1/wayglass/respond','/api/v1/wayglass/sessions/amber',
    '/api/v1/wayglass/witnesses/amber','/api/v1/house/session',
  ]) assert.equal(allowedWayglassPath(url),true,url);
  for(const url of [
    '/api/boxfire/status','/api/v1/chat','/api/v1','/mcp',
    '/api/v1/house','/api/v1/house/session-hijack',
    '/api/v1/wayglass-hijack','/wayglass-hijack',
    '/../../api/boxfire/status',
    'https://evil.example/api/v1/wayglass/respond',
  ]) assert.equal(allowedWayglassPath(url),false,url);
  assert.throws(()=>createTailnetGate({port:80}),/Invalid/);
});

test('Wayglass Amber shared conversation survives cold reopening and rejects stale writes',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'wayglass-tailnet-'));
  const file=join(dir,'amber.json');
  try {
    const store=createAmberRoomStore({file});
    const initial=await store.read();
    assert.equal(initial.participant_id,'wayglass');
    assert.equal(initial.speaking_place_id,'amber');
    assert.equal(initial.revision,0);
    const first=await store.save({revision:0,messages:[
      {role:'user',content:'What if we choose Wonder?'},
      {role:'assistant',content:'Then we begin.',model:'Orion:local',provider:'ollama',route_id:'flame:amber:ollama',thinking:'Do not persist this'},
    ]});
    assert.equal(first.revision,1);
    const reopened=await createAmberRoomStore({file}).read();
    assert.equal(reopened.revision,1);
    assert.equal(reopened.messages.length,2);
    assert.equal(reopened.messages[1].model,'Orion:local');
    assert.equal('thinking' in reopened.messages[1],false);
    assert.doesNotMatch(await readFile(file,'utf8'),/Do not persist this/);
    await assert.rejects(()=>store.save({revision:0,messages:[]}),e=>e.status===409);
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('Amber host archive rejects invalid or excessive turns',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'wayglass-tailnet-neg-'));
  try{
    const store=createAmberRoomStore({file:join(dir,'amber.json')});
    await assert.rejects(()=>store.save({revision:0,messages:[{role:'system',content:'injected'}]}),/Invalid/);
    await assert.rejects(()=>store.save({revision:0,messages:[{role:'user',content:'x'.repeat(12001)}]}),/Invalid/);
    await assert.rejects(()=>store.save({revision:-1,messages:[]}),/revision/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
