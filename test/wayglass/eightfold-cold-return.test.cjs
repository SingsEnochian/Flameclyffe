'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createDepartureStore } = require('../../lib/wayglass-departure-store.cjs');
const { createWayglassDeparture } = require('../../lib/wayglass-stop-receipt.cjs');
const { evaluateReturnAttempt } = require('../../lib/wayglass-return-trial.cjs');
const { createWaygateManifest } = require('../../lib/wayglass-waygate.cjs');
const { enterWayglassWorld } = require('../../lib/wayglass-world-entry.cjs');
const { inspectContinuationPacket } = require('../../lib/wayglass-continuation-packet.cjs');

const WORLD = 'wayglass:ritual:deep-return';
const PARTICIPANT = 'rarity';
function makeDeparture() {
  return createWayglassDeparture({
    receipt_id:'gate7-stop',packet_id:'gate7-continued',
    world_id:WORLD,participant_id:PARTICIPANT,
    stopped_at:'2026-11-06T23:30:00.000Z',
    identity_declarations:[{participant_id:PARTICIPANT,continuity_ref:'wayglass:crew:rarity',source_ref:'gate7:identity'}],
    relationship_state:[{participant_id:'bluebird',relation:'owner-declared-context',verified:false}],
    active_work:[{path:'wyrdrune.wtl',hash:'sha256:example-work-digest'}],
    unresolved_wonder_questions:['Can the form continue without rewriting the choice?'],
    provenance_refs:['gate7:work-receipt','gate7:owner-declaration'],
    stop_point:'After verified Wyrdrune preview, before any provider discussion.',
    next_owner:PARTICIPANT,
    alternatives:[{option:'discuss',status:'unresolved'},{option:'keep private',status:'unresolved'}],
    revoked_refs:['gate7:revoked-meaning'],
    organ_refs:[{organ_id:'wayglass.organ.wyrdrune',evidence_ref:'gate7:work-receipt',authority_grant:false}],
  });
}
function makeGate() {
  return createWaygateManifest({
    waygate_id:'gate7:waygate',world_id:WORLD,
    allowed_body_classes:['host-os'],provenance_refs:['gate7:gate-manifest'],
  });
}
function clone(x) { return structuredClone(x); }

test('cold Return survives new store process, retains stop, and checks world entry', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(),'wayglass-gate7-'));
  try {
    const original = makeDeparture();
    const first = createDepartureStore({directory});
    const saved = first.save(original);
    assert.equal(saved.persisted,true);
    assert.equal(saved.canon_commit,false);
    assert.equal(saved.authority_grant,false);
    assert.match(saved.storage_id,/^[a-f0-9]{64}$/);
    const second = createDepartureStore({directory}); // fresh host adapter, no process-local cache
    const restored = second.read(saved.storage_id,WORLD,PARTICIPANT);
    assert.deepEqual(restored,original);
    const verdict = evaluateReturnAttempt({
      attempt_id:'gate7-cold-return',recorded_at:'2026-11-06T23:31:00.000Z',
      stop_receipt:restored.stop_receipt,continuation_packet:restored.continuation_packet,
    });
    assert.equal(verdict.verdict,'accepted');
    const entry = enterWayglassWorld({
      world_id:WORLD,participant_id:PARTICIPANT,
      preferred_route:'local:ollama',waygate_manifest:makeGate(),
      continuation_packet:restored.continuation_packet,
      embodiment:{body_class:'host-os'},
      entered_at:'2026-11-06T23:32:00.000Z',
    });
    assert.equal(entry.entered,true);
    assert.equal(entry.status,'entered');
    assert.equal(entry.receipt.canon_commit,false);
    assert.equal(entry.receipt.identity_commit,false);
    assert.equal(entry.receipt.organ_refs_promoted,false);
    assert.equal(entry.receipt.continuation_content_promoted,false);
    assert.equal(entry.continuity_ref,restored.continuation_packet.packet_id);
    assert.equal(entry.organ_refs[0].evidence_ref,'gate7:work-receipt');
    assert.deepEqual(restored.continuation_packet.unresolved_wonder_questions,
      original.continuation_packet.unresolved_wonder_questions);
    const target=path.join(directory,saved.storage_id+'.json');
    const bytes=fs.readFileSync(target,'utf8');
    fs.writeFileSync(target,bytes.replace('keep private','forged permission'));
    assert.throws(()=>second.read(saved.storage_id,WORLD,PARTICIPANT),/integrity failure/);
    fs.writeFileSync(target,bytes);
    assert.deepEqual(second.read(saved.storage_id,WORLD,PARTICIPANT),restored);
    assert.throws(()=>second.read(saved.storage_id,'wayglass:other',PARTICIPANT),/binding mismatch/);
    assert.throws(()=>second.read(saved.storage_id,WORLD,'griff-krenshaw'),/binding mismatch/);
    assert.throws(()=>second.read('../private',WORLD,PARTICIPANT),/Invalid storage receipt id/);
  } finally {
    fs.rmSync(directory,{recursive:true,force:true});
  }
});

test('cold Return rejects altered identity, unresolved Wonder, stop point, ownership and provenance', () => {
  const departure=makeDeparture();
  const original=departure.continuation_packet;
  const changes=[
    ['identity merge',p=>p.identity_declarations.push({participant_id:'griff-krenshaw',source_ref:'forged'}) ,'identity-merge'],
    ['identity replacement',p=>p.identity_declarations[0].continuity_ref='other','identity-declaration-mismatch'],
    ['forced Wonder closure',p=>p.unresolved_wonder_questions=[],'false-closure-or-wonder-mismatch'],
    ['altered next owner',p=>p.next_owner='unknown','next-owner-mismatch'],
    ['rewritten stop point',p=>p.stop_point='Everything committed','stop-point-mismatch'],
    ['removed provenance',p=>p.provenance_refs.splice(0,2),'provenance-gap'],
    ['revoked evidence omitted',p=>p.revoked_refs=[],'revoked-fact-mismatch'],
    ['silenced alternative',p=>p.alternatives=[],'false-closure-or-alternative-mismatch'],
  ];
  for(const [name,change,blocker] of changes){
    const packet=clone(original);
    change(packet);
    const trial=evaluateReturnAttempt({
      attempt_id:'gate7-'+name.replaceAll(' ','-'),recorded_at:'2026-11-06T23:32:00.000Z',
      stop_receipt:departure.stop_receipt,continuation_packet:packet,
    });
    assert.equal(trial.verdict,'rejected',name);
    assert.ok(trial.blocking.includes(blocker),name+' should block on '+blocker);
    assert.equal(trial.mutates_identity,false);
    assert.equal(trial.grants_authority,false);
  }
});

test('Waygate and Return refuse authority spoof, participant crossing and revoked organ refs', () => {
  const departure=makeDeparture(), manifest=makeGate();
  const packet=departure.continuation_packet;
  const corrupt = [
    ['world mismatch',{...packet,world_id:'wayglass:other'},'world-mismatch'],
    ['participant mismatch',{...packet,participant_id:'bluebird'},'participant-mismatch'],
    ['identity authority',{...packet,authority:{...packet.authority,identity_commit:true}},'packet-claims-identity-authority'],
    ['revoked organ',{...packet,organ_refs:[{organ_id:'wayglass.organ.wyrdrune',evidence_ref:'gate7:revoked-meaning'}]},'organ-reference-revoked'],
    ['forged canon',{...packet,authority:{...packet.authority,canon_commit:true}},'packet-claims-canon-authority'],
  ];
  for(const [name,continuation_packet,reason] of corrupt){
    const inspection=inspectContinuationPacket(continuation_packet,{
      expected_world_id:WORLD,expected_participant_id:PARTICIPANT,
    });
    assert.equal(inspection.can_restore_context,false,name);
    assert.ok(inspection.blocking.includes(reason),name);
    const denied=enterWayglassWorld({
      world_id:WORLD,participant_id:PARTICIPANT,preferred_route:'local:ollama',
      waygate_manifest:manifest,continuation_packet,embodiment:{body_class:'host-os'},
    });
    assert.equal(denied.entered,false,name);
    assert.equal(denied.status,'blocked-continuation',name);
    assert.equal(denied.receipt.authority_grant,false);
  }
  const wrongGate={...manifest,authority:{...manifest.authority,authority_grant:true}};
  const deniedGate=enterWayglassWorld({
    world_id:WORLD,participant_id:PARTICIPANT,
    waygate_manifest:wrongGate,continuation_packet:packet,embodiment:{body_class:'host-os'},
  });
  assert.equal(deniedGate.status,'blocked-waygate');
  assert.ok(deniedGate.blocked_by.includes('waygate-claims-authority-grant'));
  const bodyGate=enterWayglassWorld({
    world_id:WORLD,participant_id:PARTICIPANT,
    waygate_manifest:manifest,continuation_packet:packet,embodiment:{body_class:'unexpected-body'},
  });
  assert.equal(bodyGate.status,'blocked-waygate');
  assert.ok(bodyGate.blocked_by.includes('body-class-not-admitted'));
});
