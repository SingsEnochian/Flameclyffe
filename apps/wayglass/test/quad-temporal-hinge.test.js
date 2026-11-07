import {test} from 'node:test';
import assert from 'node:assert/strict';
import {temporalHingeFor,designThroughEightfold,HINGE_LENSES,TIMELINE_REGISTERS} from '../src/quad-temporal-hinge.js';
import {publishQuadGestalt,readLatestQuadGestalt,subscribeQuadGestalt} from '../src/quad-eightfold-client.js';
function fixture(){
  return {schema:'wayglass.quad-ship-observation/v1',checkpoint_hash:'wce1:'+'b'.repeat(64),
    completed_cycles:2,observed_at:'2026-11-06T23:00:00.000Z',
    evidence:[
      {id:'deep_observer_events',status:'observed',freshness:'historical',count:14},
      {id:'observer_measurements',status:'empty',freshness:'empty',count:0},
      {id:'wayglass_route_receipts',status:'observed',freshness:'fresh',count:1},
      {id:'house_runtime_events',status:'empty',freshness:'empty',count:0},
      {id:'math_spine_packets',status:'empty',freshness:'empty',count:0},
      {id:'source_library_query_receipts',status:'empty',freshness:'empty',count:0},
    ],
  };
}
test('each Terra Prime lens preserves its own epistemic register and evidence',()=>{
  const r=fixture(),frames=HINGE_LENSES.map(lens=>temporalHingeFor(r,{lens}));
  assert.equal(frames.length,3);
  assert.equal(new Set(frames.map(f=>f.summary.title)).size,3);
  for(const f of frames){
    assert.equal(f.evidence_state.observed_channels,2);
    assert.equal(f.evidence_state.total_channels,6);
    assert.equal(f.evidence_state.stale_or_age_unknown[0],'deep_observer_events');
    assert.equal(f.evidence_state.can_claim_physical_branch,false);
    assert.equal(f.evidence_state.can_claim_scientific_change_point,false);
    assert.equal(f.return_marker,'checkpoint:'+r.checkpoint_hash);
    assert.equal(f.canon_promotion,false);
  }
  assert.deepEqual(TIMELINE_REGISTERS.map(f=>f.id),
    ['documented-history','possible-history','worldseed','mythience']);
  assert.throws(()=>temporalHingeFor({schema:'unverified'}),/host-sourced/);
  assert.throws(()=>temporalHingeFor(r,{lens:'certainty'}),/Unknown/);
});
test('eightfold experience design remains reversible, readable and provenance-bound',()=>{
  const d=designThroughEightfold(fixture(),{lens:'mythience',reducedMotion:true,mono:true});
  assert.equal(d.phases.length,8);
  assert.deepEqual(d.phases.map(x=>x.phase),
    ['perceive','compress','release','verify','integrate','choose','return','transcend']);
  assert.equal(d.visuals.motion,'static');
  assert.equal(d.visuals.audio_mode,'mono-safe');
  assert.equal(d.no_autoplay,true);
  assert.equal(d.feather_stop_supported,true);
  assert.equal(d.requires_attributable_wayglass_reply_for_native_authorship,true);
  assert.equal(d.hinge.lens,'mythience');
});
test('quad event bus strips private continuity before broadcasting',()=>{
  const scope=new EventTarget();
  scope.CustomEvent=class extends Event {constructor(type,options){super(type);this.detail=options.detail;}};
  const packet={schema:'wayglass.quad-checkpoint/v1',hash:'wce1:'+'d'.repeat(64),
    completed_cycles:2,source_packet:{observed_at:'2026-11-06T23:00:00.000Z'},
    gestalt:{schema:'wayglass.quad-gestalt/v1',
      evidence:fixture().evidence,gaps:['observer_measurements'],
      soundstage:[],private_secret:'DO NOT SEND'},
    continuity:{private_secret:'DO NOT SEND'}};
  const received=[];
  const unsub=subscribeQuadGestalt(x=>received.push(x),{scope});
  const pub=publishQuadGestalt(packet,{scope});
  assert.equal(received.length,1);
  assert.equal(received[0],pub);
  assert.equal(JSON.stringify(pub).includes('DO NOT SEND'),false);
  assert.equal(pub.model_training_completed,false);
  assert.equal(pub.sound_autoplay,false);
  unsub();
});
