import test from 'node:test';
import assert from 'node:assert/strict';
import kernel from '../../../lib/wayglass-kernel.cjs';
import { createWaygateManifest } from '../../../lib/wayglass-waygate.js';
const {inspectWayglassCognitionPreflight,COGNITION_PREFLIGHT_SCHEMA}=kernel;

test('actual kernel preflights local and non-OpenAI model routes without provider execution',()=>{
  for(const route_id of ['local:ollama','humain:m3-sandbox']){
    const result=inspectWayglassCognitionPreflight({
      route_id,world_id:'wayglass:watercolor',
      participant_id:'wayglass:distinct-seat',
      embodiment:{body_class:'host-os',touch:true},
    });
    assert.equal(result.schema,COGNITION_PREFLIGHT_SCHEMA);
    assert.equal(result.status,'ready-for-route');
    assert.equal(result.kernel_route_id,route_id);
    assert.equal(result.world_id,'wayglass:watercolor');
    assert.equal(result.boot_status,'boot-contract');
    assert.equal(result.owner_authenticated,false);
    assert.equal(result.world_entry_verified,false);
  }
});
test('missing or unknown route cannot silently fall back to another provider',()=>{
  for(const route_id of [null,'','openai:nonexistent']){
    const result=inspectWayglassCognitionPreflight({route_id});
    assert.equal(result.status,'blocked-route');
    assert.notEqual(result.kernel_route_id,'openai:gpt');
  }
});
test('stop receipt needs the kernel entry integrity path, never generic model dispatch',()=>{
  const inspection=inspectWayglassCognitionPreflight({
    route_id:'local:ollama',stop_receipt:{schema:'wayglass.stop-receipt/v0.1'},
  });
  assert.equal(inspection.status,'blocked-entry-required');
  assert.equal(inspection.world_entry_verified,false);
});
test('Waygate mismatch rejects model dispatch rather than bypassing a blocked kernel',()=>{
  const manifest=createWaygateManifest({
    waygate_id:'gate:watercolor',
    world_id:'wayglass:different-world',
    allowed_body_classes:['host-os'],
    provenance_refs:['receipt:gate-reference'],
  });
  const inspection=inspectWayglassCognitionPreflight({
    route_id:'local:ollama',world_id:'wayglass:watercolor',
    waygate_manifest:manifest,embodiment:{body_class:'host-os'},
  });
  assert.equal(inspection.status,'blocked-kernel');
  assert.equal(inspection.boot_status,'blocked-waygate');
});
test('successful Waygate inspection is not falsely presented as owner authentication',()=>{
  const manifest=createWaygateManifest({
    waygate_id:'gate:watercolor',
    world_id:'wayglass:watercolor',
    allowed_body_classes:['host-os'],
    provenance_refs:['receipt:gate-reference'],
  });
  const inspection=inspectWayglassCognitionPreflight({
    route_id:'local:ollama',world_id:'wayglass:watercolor',
    waygate_manifest:manifest,embodiment:{body_class:'host-os'},
  });
  assert.equal(inspection.status,'ready-for-route');
  assert.equal(inspection.waygate_checked,true);
  assert.equal(inspection.world_entry_verified,false);
  assert.equal(inspection.owner_authenticated,false);
});

