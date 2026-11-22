'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const wtl=require('./wyrdrune.cjs');
const run=async source=>wtl.execute(wtl.compile(source),{maxOperations:10000});
test('owner-authored world runes and Return/Transcend execute through canonical IR',async()=>{
 const source='mobius { perceive { let home = @terra_prime; let other = @terra_aeterna; } compress { let meeting = @desired_timeline_shift(home,other); } release { } verify { } integrate { } choose { } @return { emit meeting; } @transcend { } }';
 const result=await run(source), encounter=result.output[0];
 assert.equal(encounter.rune,'desired_timeline_shift');
 assert.equal(encounter.perspectives.length,2);
 assert.deepEqual(encounter.perspectives.map(p=>p.world),['terra_prime','terra_aeterna']);
 assert.equal(encounter.perspectives[0].encounter,encounter.perspectives[1].encounter);
 assert.notEqual(encounter.perspectives[0].world,encounter.perspectives[1].world);
 assert.deepEqual(result.receipts.map(p=>p.phase),wtl.PHASES);
});
test('rune tokenization keeps phase names backwards-compatible',async()=>{
 const old='mobius { perceive { } compress { } release { } verify { } integrate { } choose { } return { emit 1; } transcend { } }';
 const next=old.replace('return {','@return {').replace('transcend {','@transcend {');
 assert.deepEqual((await run(old)).output,(await run(next)).output);
});
test('rune input refuses unknown tokens and invalid timeline encounters',async()=>{
 assert.throws(()=>wtl.compile('mobius { perceive { let a = @invented; } compress { } release { } verify { } integrate { } choose { } return { } transcend { } }'),/Unknown Wyrdrune rune/);
 const source='mobius { perceive { let a = @terra_prime; let b = @terra_prime; } compress { emit @desired_timeline_shift(a,b); } release { } verify { } integrate { } choose { } return { } transcend { } }';
 await assert.rejects(()=>run(source),/distinct world identities/);
});
