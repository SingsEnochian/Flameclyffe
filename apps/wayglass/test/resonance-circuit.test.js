import test from 'node:test';
import assert from 'node:assert/strict';
import {createResonanceCircuit} from '../src/resonance-circuit.js';
import {RESONANCE_SCHEMA} from '../src/resonance-forge.js';
const proposal={schema:RESONANCE_SCHEMA,id:'new-sense',name:'New Sense',meaning:'Experimental',tones:[{frequency_hz:223,gain:.02,duration_s:.2,pan:0}],visual:{colour:'#aabbcc',glyph:'◇'},motion:{curl:.3,pulse:.4},rooms:['*']};
const source={participant_id:'wayglass',route_id:'wayglass:ship',receipt_id:'verified-observation-001'};
test('one verified resonance projects across four lanes without autoplay',()=>{
 const events=[];const circuit=createResonanceCircuit({emit:e=>events.push(e)});
 const result=circuit.compose(proposal,{verifiedShipRoute:true,source});
 assert.equal(result.status,'projection-only');
 assert.deepEqual(events.map(e=>e.lane),['wyrdrune','sensory','observer','return']);
 assert.equal(events.some(e=>e.kind==='audio'),false);
 assert.equal(events[0].provenance.route_id,'wayglass:ship');
});
test('opt-in adds audio but never bypasses Feather',()=>{
 const events=[];let feather=false;
 const circuit=createResonanceCircuit({emit:e=>events.push(e),audioAllowed:()=>true,feather:()=>feather});
 circuit.compose(proposal,{verifiedShipRoute:true,source});
 assert.equal(events.some(e=>e.kind==='audio'),true);
 feather=true;assert.equal(circuit.compose(proposal,{verifiedShipRoute:true,source}).status,'feather-stopped');
 const count=events.length;circuit.stop();assert.equal(events.length,count);
 assert.throws(()=>circuit.resume());
});
test('source forgery cannot emit anything',()=>{
 const events=[];const circuit=createResonanceCircuit({emit:e=>events.push(e)});
 assert.throws(()=>circuit.compose(proposal,{verifiedShipRoute:true,source:{...source,route_id:'other:ship'}}));
 assert.equal(events.length,0);
});

test('Feather raised by a sink prevents later sound, Observer and Return projection',()=>{
 const events=[];let feather=false;
 const circuit=createResonanceCircuit({emit:event=>{events.push(event);feather=true;},feather:()=>feather,audioAllowed:()=>true,hapticsAllowed:()=>true});
 const result=circuit.compose(proposal,{verifiedShipRoute:true,source});
 assert.equal(result.status,'feather-stopped');
 assert.equal(result.delivered,1);
 assert.deepEqual(events.map(e=>e.lane),['wyrdrune']);
});
test('a failing sink reports partial delivery and does not claim a checkpoint',()=>{
 const events=[];
 const circuit=createResonanceCircuit({emit:event=>{if(event.lane==='observer')throw Error('observer offline');events.push(event);}});
 const result=circuit.compose(proposal,{verifiedShipRoute:true,source});
 assert.equal(result.status,'projection-failed');
 assert.equal(result.delivered,2);
 assert.equal(events.some(e=>e.lane==='return'),false);
});
