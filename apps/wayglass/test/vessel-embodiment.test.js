import test from 'node:test';
import assert from 'node:assert/strict';
import {createVesselEcology} from '../src/vessel-ecology.js';
import {projectVesselEmbodiment} from '../src/vessel-embodiment.js';
test('source-backed mapping is deterministic, bounded and passive',()=>{
 const l=createVesselEcology();l.observe({kind:'deck-settled',event_id:'x',source_ref:'ship:deck'});
 const a=projectVesselEmbodiment(l.snapshot());
 assert.equal(a.audio_started,false);
 assert.equal(a.motion_amplitude>0,true);
 assert.equal(a.source_sequence,1);
 assert.deepEqual(a,projectVesselEmbodiment(l.snapshot()));
 for(const x of [a.hull_rim_alpha,a.core_luminance,a.copper_route_clarity])assert.ok(x>=0&&x<=1);
});
test('Feather and reduced motion stop motion output',()=>{
 const l=createVesselEcology();
 assert.equal(projectVesselEmbodiment(l.snapshot(),{reducedMotion:true}).motion_amplitude,0);
 l.observe({kind:'feather-held',source_ref:'user:feather',event_id:'f'});
 assert.equal(projectVesselEmbodiment(l.snapshot()).motion_amplitude,0);
 assert.throws(()=>projectVesselEmbodiment({}));
});
