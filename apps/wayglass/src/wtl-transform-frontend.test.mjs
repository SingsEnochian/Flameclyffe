import test from 'node:test';import assert from 'node:assert/strict';
import {compileWTL,parseWTL} from './wtl-transform-frontend.mjs';
test('parses and lowers noncommutative nested transformations',()=>{
 const a=compileWTL('wonder(tend(worldseed))');
 const b=compileWTL('tend(wonder(worldseed))');
 assert.notEqual(a.meaning,b.meaning);assert.equal(a.ir.semanticType,'OpenQuestion');assert.equal(b.ir.semanticType,'TendedPossibility');
 assert.equal(a.lineage[0],'worldseed');assert.deepEqual(a.effects,[]);
});
test('retains custom Möbius twists in typed IR',()=>{
 const x=compileWTL('tend(wonder(worldseed, twist@-0.25), twist@0.8)');
 assert.equal(x.ir.node.twist,0.8);assert.equal(x.ir.node.subject.twist,-0.25);assert.equal(x.persisted,false);
});
test('rejects unknown roots, invalid operators, injection and trailing tokens',()=>{
 for(const source of ['erase(worldseed)','tend(rewrite_history)','tend(worldseed);evil','worldseed worldseed','tend(worldseed, twist@2)','tend('.repeat(30)+'worldseed'+')'.repeat(30)])assert.throws(()=>compileWTL(source));
 assert.throws(()=>parseWTL(''.padEnd(513,'a')));
});

test('tokenizer rejects split identifiers and maintains normal spaced syntax',()=>{
 assert.throws(()=>compileWTL('wo rldseed'));
 assert.throws(()=>compileWTL('wonder(world seed)'));
 assert.throws(()=>compileWTL('tend(worldseed, twist@0 .5)'));
 assert.equal(compileWTL('wonder ( tend ( worldseed ) )').ir.semanticType,'OpenQuestion');
});
