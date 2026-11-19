import test from 'node:test';
import assert from 'node:assert/strict';
import {RESONANCE_SCHEMA} from '../src/resonance-forge.js';
import {createResonanceNervousSystem} from '../src/resonance-nervous-system.js';
const proposal={schema:RESONANCE_SCHEMA,id:'opal-current',name:'Opal Current',meaning:'A proposed visual and sonic motif',tones:[{frequency_hz:220,gain:.03,duration_s:1,pan:0}],visual:{colour:'#aabbcc',glyph:'◇'},motion:{curl:.4,pulse:.3},rooms:['*']};
test('unverified initial state cannot inject a resonance',()=>{
 const nerve=createResonanceNervousSystem({initial:[proposal]});
 assert.equal(nerve.snapshot().patterns.length,0);
 assert.throws(()=>nerve.compose(proposal));
});
test('compose, publish, inspect and release without room dependency',()=>{
 const nerve=createResonanceNervousSystem();
 const events=[];const unsub=nerve.subscribe(event=>events.push(event));
 nerve.compose(proposal,{verifiedShipRoute:true});
 assert.equal(nerve.snapshot().patterns[0].name,'Opal Current');
 assert.equal(events[0].type,'resonance:composed');
 assert.throws(()=>nerve.release('opal-current'));
 assert.equal(nerve.release('opal-current',{verifiedShipRoute:true}),true);
 unsub();
 assert.equal(nerve.snapshot().patterns.length,0);
 assert.equal(events[1].type,'resonance:released');
});
