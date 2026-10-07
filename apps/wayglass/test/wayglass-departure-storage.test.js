import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createWaygateManifest } from '../../../lib/wayglass-waygate.js';
const require = createRequire(import.meta.url);
const { createDepartureStore } = require('../../../lib/wayglass-departure-store.cjs');

async function host(directory) {
  const script = `const express=require('./apps/starwell-server/node_modules/express'); const {createWayglassRouter}=require('./apps/starwell-server/wayglass/router'); const {createDepartureStore}=require('./lib/wayglass-departure-store.cjs');const app=express();app.use(express.json());app.use('/api/v1/wayglass',createWayglassRouter({fetchImpl:async(url,options)=>Response.json({message:{content:JSON.stringify(JSON.parse(options.body).messages)}}),departureStore:createDepartureStore({directory:process.env.TRIAL_DIRECTORY})}));const server=app.listen(0,'127.0.0.1',()=>console.log(server.address().port));`;
  const child = spawn(process.execPath, ['-e', script], { env: { ...process.env, TRIAL_DIRECTORY: directory }, stdio: ['ignore', 'pipe', 'pipe'] });
  const [data] = await once(child.stdout, 'data');
  const base = `http://127.0.0.1:${String(data).trim()}/api/v1/wayglass`;
  return { base, stop: async () => { const done = once(child, 'exit'); child.kill(); await done; } };
}
test('HTTP departure survives a fresh process; recovery preserves open alternatives and rejects substitution and tampering', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-return-'));
  let server;
  try {
    server = await host(directory);
    const state = { world_id: 'ship', participant_id: 'rowan', organ_refs:[{organ_id:'wayglass.organ.presence-nervous-system',evidence_ref:'receipt:presence-1',authority_grant:false,canon_commit:false,identity_commit:false},{organ_id:'wayglass.organ.memory-flight-recorder',evidence_ref:'receipt:memory-1',authority_grant:false,canon_commit:false,identity_commit:false},{organ_id:'wayglass.organ.sensorium',evidence_ref:'receipt:somatic-1',authority_grant:false,canon_commit:false,identity_commit:false}], identity_declarations: [{entity_id:'rowan',declaration:'Rowan'}], provenance_refs:['trial:clock'], active_work:[{description:'Proposed clock four minutes fast; nobody correcting it.'}], unresolved_wonder_questions:['Fault or instruction?', 'Clock fast or ship slow?'], alternatives:[{a:'fault',b:'instruction',selected:null}], stop_point:'Before any canon write', next_owner:'Rowan' };
    const response = await fetch(server.base + '/kernel/leave', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(state)});
    assert.equal(response.status,201);
    const saved = await response.json();
    assert.equal(saved.storage_receipt.persisted,true);
    assert.equal(saved.continuation_packet.organ_refs[0].organ_id,'wayglass.organ.presence-nervous-system');
    assert.equal(saved.continuation_packet.organ_refs[1].organ_id,'wayglass.organ.memory-flight-recorder');
    assert.equal(saved.continuation_packet.organ_refs[2].organ_id,'wayglass.organ.sensorium');
    const id = saved.storage_receipt.storage_id;
    await server.stop(); server = await host(directory);
    const restored = await (await fetch(server.base + `/kernel/departures/${id}?world_id=ship&participant_id=rowan`)).json();
    assert.deepEqual(restored.continuation_packet,saved.continuation_packet);
    assert.equal((await fetch(server.base + `/kernel/departures/${id}?world_id=ship&participant_id=other`)).status,409);
    const entry = { world_id:'ship',participant_id:'rowan',storage_id:id,waygate_manifest:createWaygateManifest({waygate_id:'gate',world_id:'ship',allowed_body_classes:['host-os'],provenance_refs:['trial:gate']}),embodiment:{body_class:'host-os'} };
    const enter = body => fetch(server.base+'/kernel/enter',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const returned = await enter(entry);
    assert.equal(returned.status,200);
    const returnedBody = await returned.json();
    assert.equal(returnedBody.entry.organ_refs.length,3);
    assert.equal(returnedBody.entry.receipt.organ_refs_promoted,false);
    assert.deepEqual(returnedBody.entry.organ_refs.map(ref=>ref.organ_id),[
      'wayglass.organ.presence-nervous-system',
      'wayglass.organ.memory-flight-recorder',
      'wayglass.organ.sensorium'
    ]);
    const turn = await fetch(server.base + '/respond', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({route_id:'local:ollama',input:'Recover the checkpoint',checkpoint_storage_id:id,checkpoint_world_id:'ship',checkpoint_participant_id:'rowan',_storedCheckpoint:{fake:'BODY MUST NOT BECOME CHECKPOINT'}})});
    assert.equal(turn.status,200);
    const captured = await turn.json();
    assert.match(captured.output,/Clock fast or ship slow/);
    assert.match(captured.output,/Before any canon write/);
    assert.match(captured.output,/wayglass\.organ\.presence-nervous-system/);
    assert.match(captured.output,/wayglass\.organ\.memory-flight-recorder/);
    assert.match(captured.output,/wayglass\.organ\.sensorium/);
    assert.doesNotMatch(captured.output,/BODY MUST NOT BECOME CHECKPOINT/);
    assert.equal(captured.receipt.checkpoint_storage_id,id);

    assert.equal((await enter({...entry,continuation_packet:{...saved.continuation_packet,unresolved_wonder_questions:[]}})).status,409);
    const changedEmbodimentEntry = {...entry,embodiment:{body_id:'return-host',body_class:'host-os',haptics:false}};
    assert.equal((await enter(changedEmbodimentEntry)).status,200);
    const badNamespace = {...state, organ_refs:[{organ_id:'arcsweep.memory',evidence_ref:'receipt:bad'}]};
    const badNamespaceSaved = await (await fetch(server.base + '/kernel/leave',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(badNamespace)})).json();
    assert.equal((await enter({...entry,storage_id:badNamespaceSaved.storage_receipt.storage_id})).status,409);
    const illicitAuthority = {...state, organ_refs:[{organ_id:'wayglass.organ.memory-flight-recorder',evidence_ref:'receipt:bad-authority',authority_grant:true}]};
    const illicitSaved = await (await fetch(server.base + '/kernel/leave',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(illicitAuthority)})).json();
    assert.equal((await enter({...entry,storage_id:illicitSaved.storage_receipt.storage_id})).status,409);
    const revoked = {...state, revoked_refs:['receipt:memory-1']};
    const revokedDeparture = await fetch(server.base + '/kernel/leave',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(revoked)});
    assert.equal(revokedDeparture.status,201);
    const revokedSaved = await revokedDeparture.json();
    const revokedEntry = {...entry,storage_id:revokedSaved.storage_receipt.storage_id};
    assert.equal((await enter(revokedEntry)).status,409);
    const file = path.join(directory,id+'.json'); fs.appendFileSync(file,' ');
    assert.throws(()=>createDepartureStore({directory}).read(id,'ship','rowan'),/integrity/);
  } finally { if(server) await server.stop(); fs.rmSync(directory,{recursive:true,force:true}); }
});
