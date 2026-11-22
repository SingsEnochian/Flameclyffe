import test from 'node:test';import assert from 'node:assert/strict';
import {root,transform,trace,meaning} from './wtl-transform-semantics.mjs';
test('composition order has different semantics while sharing roots',()=>{
 const seed=root('worldseed');
 const a=transform('wonder',transform('tend',seed));
 const b=transform('tend',transform('wonder',seed));
 assert.notEqual(meaning(a),meaning(b));
 assert.equal(meaning(a),'question-about(conditions-for(worldseed))');
 assert.equal(meaning(b),'conditions-for(question-about(worldseed))');
 assert.equal(trace(a)[0],'worldseed');assert.equal(trace(b)[0],'worldseed');
});
test('twists are attributable, immutable, and bounded',()=>{
 const n=transform('tend',root('worldseed'),{twist:0.7});
 assert.equal(n.twist,0.7);assert.equal(Object.isFrozen(n),true);
 assert.throws(()=>transform('tend',root('worldseed'),{twist:Infinity}));
});
test('unrecognised roots and transformations fail closed',()=>{
 assert.throws(()=>root('rewrite-history'));
 assert.throws(()=>transform('erase',root('worldseed')));
});
