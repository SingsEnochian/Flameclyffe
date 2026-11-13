'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {mote,encounter}=require('./wayglass-mote-encounter.cjs');
const sha='a'.repeat(40),a=mote('a',.2,{memory:'A'}),b=mote('b',.8,{memory:'B'});
const events=[{id:'e1',from:'a',channel:'touch',intensity:.5},{id:'e2',from:'b',channel:'wtl',intensity:1}];
test('consenting distinct worlds yield deterministic audiovisual proposals and preserve identity',()=>{
 const input={left:a,right:b,events,sourceSha:sha,consent:{a:true,b:true}};
 const x=encounter(input),y=encounter(input);
 assert.deepEqual(x,y);assert.equal(x.status,'proposal-only');
 assert.equal(x.proposal.a.memory,'A');assert.equal(x.proposal.b.memory,'B');
 assert.equal(x.identity_spins[0],.2);assert.equal(x.identity_spins[1],.8);
 assert.ok(x.proposal.shared_environment.resonance>0);
 assert.equal(x.persisted,false);assert.equal(x.model_invoked,false);
});
test('refusal and Feather stop without applying input',()=>{
 for(const options of [{consent:{a:true,b:false}},{consent:{a:true,b:true},feather:true}]){
  const x=encounter({left:a,right:b,events,sourceSha:sha,...options});
  assert.equal(x.status,'not-run');assert.equal(x.proposal,null);assert.equal(x.events_applied.length,0);
 }
});
test('tampered events and duplicate identity fail closed',()=>{
 assert.throws(()=>encounter({left:a,right:a,sourceSha:sha}),/Distinct/);
 assert.throws(()=>encounter({left:a,right:b,sourceSha:sha,consent:{a:true,b:true},events:[events[0],events[0]]}),/Duplicate/);
 assert.throws(()=>encounter({left:a,right:b,sourceSha:sha,consent:{a:true,b:true},events:[{...events[0],intensity:9}]}),/Invalid event/);
});
