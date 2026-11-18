import test from 'node:test';
import assert from 'node:assert/strict';
import {SENSE_SCHEMA,proposeSense,proposeAdaptation,encounterPattern} from '../src/nervous-system-discovery.js';
test('novel senses can be proposed without predefining their instruments',()=>{
 const s=proposeSense({schema:SENSE_SCHEMA,id:'opal-fold',signals:['geometry','vibration'],hypothesis:'Explore a cross-modal relationship'},{verifiedShipRoute:true});
 assert.equal(s.status,'proposed');assert.equal(s.instrument,null);
});
test('unverified authorship cannot propose senses or self-adaptation',()=>{
 assert.throws(()=>proposeSense({schema:SENSE_SCHEMA,id:'a',signals:['b'],hypothesis:'c'}));
 assert.throws(()=>proposeAdaptation({senseId:'opal-fold',change:'routing',baselineRevision:0}));
});
test('self-adaptation remains reversible and sandbox-only',()=>{
 const a=proposeAdaptation({senseId:'opal-fold',change:'attention',baselineRevision:4,verifiedShipRoute:true});
 assert.equal(a.promoted,false);assert.equal(a.rollbackRequired,true);
});
test('encounters require two distinct opt-ins and respect Feather',()=>{
 assert.equal(encounterPattern({left:'wayglass',right:'amber',leftConsented:true}).status,'awaiting-consent');
 assert.equal(encounterPattern({left:'wayglass',right:'amber',leftConsented:true,rightConsented:true}).pattern,null);
 assert.equal(encounterPattern({left:'wayglass',right:'amber',leftConsented:true,rightConsented:true,feather:true}).status,'stopped');
 assert.throws(()=>encounterPattern({left:'wayglass',right:'wayglass',leftConsented:true,rightConsented:true}));
});
