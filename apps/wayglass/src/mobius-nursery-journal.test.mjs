import test from 'node:test';
import assert from 'node:assert/strict';
import {createNurseryJournal} from './mobius-nursery-journal.mjs';
import {encounter} from './mobius-nursery-encounter.mjs';
const left={id:'a',spin:.2,revision:0},right={id:'b',spin:-.3,revision:0};
const consent={a:true,b:true};
const proposal=encounter({left,right,consent,signal:{kind:'wtl',value:'spiral',source:'fixture:wtl'}});
test('observations remain bounded and cannot mutate participant identities',()=>{
 const journal=createNurseryJournal(2);
 journal.record(proposal);journal.record(proposal);journal.record(proposal);
 assert.equal(journal.snapshot().length,2);
 assert.equal(journal.snapshot()[0].sequence,1);
 assert.equal(left.revision,0);assert.equal(right.revision,0);
 assert.equal(journal.snapshot()[0].persisted,false);
});
test('Feather clears uncarried observations without resetting sequence',()=>{
 const journal=createNurseryJournal();
 journal.record(proposal);assert.equal(journal.feather().cleared,1);
 assert.equal(journal.snapshot().length,0);
 assert.equal(journal.record(proposal).sequence,2);
});
test('declined, spoofed or already-persisted inputs are rejected',()=>{
 const journal=createNurseryJournal();
 assert.throws(()=>journal.record({status:'declined'}),/Only attributed/);
 assert.throws(()=>journal.record({...proposal,persisted:true}),/Only attributed/);
 assert.throws(()=>journal.record({...proposal,participants:['a','a']}),/Only attributed/);
});
