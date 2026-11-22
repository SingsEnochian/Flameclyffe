'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const wtl=require('./wyrdrune.cjs');
const code=`mobius scoped {
 perceive {
  let possible = almost("axiom-of-almost",["form:spiral","form:crystal","form:open"]);
  let a = resonanceNode("wayglass:codex",0.3,0);
  let b = resonanceNode("wayglass:watercolour",0.35,1);
 }
 compress {
  let related = relateAlmost(possible,"form:spiral","form:crystal","coexisting");
  let field = resonanceField([a,b],0.5,50);
 }
 release { let held = holdAlmost(related,"form:open"); }
 verify { require true else "invalid resonance"; }
 integrate { let shadowed = shadowAlmost(held,"form:spiral"); }
 choose { let proposal = proposeAlmost(shadowed,"form:crystal"); }
 return { emit proposal; emit singResonance(field); }
 transcend { carry keep = "unresolved"; }
}`;
test('Axiom of Almost remains open, with explicit unadopted possibilities and shadows',async()=>{
 const result=await wtl.execute(wtl.compile(code),{maxOperations:10000});
 assert.equal(result.status,'committed');
 const almost=result.output[0],score=result.output[1];
 assert.equal(almost.schema,'wyrdrune.almost/v0.1');
 assert.equal(almost.adopted,null);
 assert.equal(almost.possibilities.find(p=>p.id==='form:open').status,'held-open');
 assert.equal(almost.possibilities.find(p=>p.id==='form:crystal').status,'proposed-not-adopted');
 assert.deepEqual(almost.shadows,['form:spiral']);
 assert.equal(almost.relations[0].relation,'coexisting');
 assert.equal(score.kind,'wyrdrune.resonance-score/v0.1');
 assert.equal(score.audible,false);
 assert.deepEqual(score.voices.map(v=>v.id),['wayglass:codex','wayglass:watercolour']);
 assert.equal(result.continuity.carry.keep,'unresolved');
});
test('deterministic simulation and retained voices',async()=>{
 const source='mobius { perceive { let a = resonanceNode("one",0.4,0); let b = resonanceNode("two",0.5,1); } compress { let f = resonanceField([a,b],0.3,80); } release { } verify { } integrate { } choose { } return { emit f; } transcend { } }';
 const run=()=>wtl.execute(wtl.compile(source));
 const x=(await run()).output[0],y=(await run()).output[0];
 assert.deepEqual(x,y);assert.equal(x.members[0].naturalHz,0.4);assert.equal(x.members[1].naturalHz,0.5);
 assert.ok(x.coherence>=0&&x.coherence<=1);
});
test('refuse invalid candidates, duplicate voices, unbounded computation and operator shadowing',async()=>{
 const runtime=src=>wtl.execute(wtl.compile('mobius { perceive { } compress { } release { } verify { } integrate { } choose { } return { emit '+src+'; } transcend { } }'));
 await assert.rejects(()=>runtime('almost("a",["same","same"])'),/distinct/);
 await assert.rejects(()=>runtime('resonanceField([resonanceNode("x",1,0),resonanceNode("x",2,0)],0.2,1)'),/distinct/);
 await assert.rejects(()=>runtime('resonanceField([resonanceNode("x",1,0),resonanceNode("y",2,0)],0.2,201)'),/budget/);
 assert.throws(()=>wtl.compile('operator almost(x)=x; mobius { perceive { } compress { } release { } verify { } integrate { } choose { } return { } transcend { } }'),/Reserved/);
});
