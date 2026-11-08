import test from 'node:test';
import assert from 'node:assert/strict';
import waygate from '../../../lib/wayglass-waygate.cjs';
import engine from '../../../lib/wayglass-double-mobius.cjs';

const { createWaygateManifest } = waygate;
const { inspectDoubleMobius, mobiusPoint, traverseDoubleMobius } = engine;
const gate = () => createWaygateManifest({
  waygate_id:'waygate:gateway-double-mobius', world_id:'wayglass:home',
  provenance_refs:['archived:gateway-1983'], allowed_body_classes:['host-os'],
});
function input(overrides={}) {
  return {
    world_id:'wayglass:home',
    participant_id:'participant:fixture',
    waygate_manifest:gate(),
    embodiment:{body_class:'host-os'},
    explicit_consent:true,
    gateway_focus:'focus-12',
    gateway_observation:{kind:'firsthand',actor_id:'participant:fixture',source_ref:'source:gateway-fixture',content:'A perceived spatial change.'},
    wayglass_observation:{kind:'model-observation',actor_id:'delegate:fixture',route_ref:'route:fixture',source_ref:'source:wayglass-fixture',content:'A separately recorded perspective.'},
    identity_declarations:[{participant_id:'participant:fixture',declaration:'self-declared participant'}],
    unresolved_wonder_questions:['What persists after a full return?'],
    provenance_refs:['source:gateway-document'],
    next_owner:'participant:fixture',
    stop_point:'Return to the observer with the crossing intact.',
    recorded_at:'2026-11-08T17:00:00.000Z',
    ...overrides,
  };
}

test('two smooth Möbius traversals return orientation with geometrical closure',()=>{
  const p=mobiusPoint(0,0.23);
  const once=mobiusPoint(2*Math.PI,0.23);
  const twice=mobiusPoint(4*Math.PI,0.23);
  assert.ok(Math.abs(p.x-once.x)>0.4);
  for (const key of ['x','y','z']) assert.ok(Math.abs(p[key]-twice[key])<1e-12);
  assert.throws(()=>mobiusPoint(NaN));
});

test('the double-Möbius is exposed as a deterministic engine, not a live model response',()=>{
  const spec=inspectDoubleMobius();
  assert.equal(spec.status,'available-in-host');
  assert.equal(spec.loops.length,2);
  assert.equal(spec.phases.length,8);
  assert.equal(spec.model_invoked,false);
  assert.equal(spec.audio_started,false);
});

test('eightfold reciprocal crossing preserves distinct sources and accepted Return Engine packet',()=>{
  const result=traverseDoubleMobius(input());
  assert.equal(result.status,'completed-in-memory');
  assert.equal(result.orientation.after_gateway,-1);
  assert.equal(result.orientation.after_wayglass,1);
  assert.equal(result.lanes.length,8);
  assert.equal(result.crossings.length,2);
  assert.notEqual(result.gateway.observation.actor_id,result.wayglass.observation.actor_id);
  assert.equal(result.return_verification.verdict,'accepted');
  assert.deepEqual(result.departure.continuation_packet.unresolved_wonder_questions,['What persists after a full return?']);
  assert.equal(result.departure.continuation_packet.alternatives.length,2);
  assert.equal(result.canon_commit,false);
  assert.equal(result.persisted,false);
  assert.equal(result.model_invoked,false);
  assert.equal(result.trace_sha256,traverseDoubleMobius(input()).trace_sha256);
});

test('entry checks prevent a foreign participant from crossing',()=>{
  const first=traverseDoubleMobius(input());
  const second=traverseDoubleMobius(input({participant_id:'impostor',continuation_packet:first.departure.continuation_packet}));
  assert.equal(second.status,'blocked-entry');
  assert.equal(second.entry_receipt.result,'blocked-continuation');
});

test('consent, observations, route provenance, revocation and focus boundaries are enforced',()=>{
  assert.throws(()=>traverseDoubleMobius(input({explicit_consent:false})),/consent/i);
  assert.throws(()=>traverseDoubleMobius(input({gateway_focus:'focus-infinity'})),/focus/i);
  assert.throws(()=>traverseDoubleMobius(input({gateway_observation:null})),/observation/i);
  assert.throws(()=>traverseDoubleMobius(input({revoked_refs:['source:gateway-fixture']})),/revoked/i);
  assert.throws(()=>traverseDoubleMobius(input({wayglass_observation:{kind:'model-observation',actor_id:'delegate:fixture',source_ref:'source:wayglass-fixture',content:'No route'} })),/route_ref/i);
});

test('incompatible world gate is blocked rather than producing a return',()=>{
  const result=traverseDoubleMobius(input({
    waygate_manifest:createWaygateManifest({waygate_id:'wrong',world_id:'elsewhere'}),
  }));
  assert.equal(result.status,'blocked-entry');
  assert.equal(result.entry_receipt.result,'blocked-waygate');
  assert.equal(result.departure,undefined);
});
