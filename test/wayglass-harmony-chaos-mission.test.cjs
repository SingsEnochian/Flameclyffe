'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {reconcileChaos}=require('../lib/wayglass-harmony-chaos-mission.cjs');
const source=readFileSync('lib/wyrdrune/with-002-amber.wtl','utf8');
const p=(id,signals)=>({id,agent:'crow:'+id,receipt:'local-receipt:'+id,source,signals});
const strong={coherence:.9,novelty:.7,continuity:.95,risk:.1,accessibility:.9};
const weak={coherence:.2,novelty:1,continuity:.2,risk:.9,accessibility:.3};
test('Harmony rejects highly novel but unsafe, incoherent changes',()=>{
 const result=reconcileChaos({principal:{authorized:true},mission:'Hearthweave',proposals:[p('loki',weak),p('harmony',strong)]});
 assert.equal(result.selected,'harmony');
 assert.equal(result.status,'candidate-selected-not-deployed');
 assert.equal(result.model_invoked,false);
 assert.equal(result.live_verified,false);
 assert.equal(result.withness.no_identity_merge,true);
});
test('no acceptable proposal means no deployment',()=>{
 const result=reconcileChaos({principal:{authorized:true},mission:'Hearthweave',proposals:[p('a',weak),p('b',weak)]});
 assert.equal(result.selected,null);
 assert.equal(result.status,'no-admissible-candidate');
});
test('duplicates, missing receipts and absent authority fail closed',()=>{
 assert.throws(()=>reconcileChaos({mission:'x',proposals:[p('a',strong),p('b',strong)]}),/authority/);
 assert.throws(()=>reconcileChaos({principal:{authorized:true},mission:'x',proposals:[p('a',strong),p('a',strong)]}),/Duplicate/);
 assert.throws(()=>reconcileChaos({principal:{authorized:true},mission:'x',proposals:[p('a',strong),{...p('b',strong),receipt:''}]}),/receipt/);
});
