'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {digest}=require('./canonical.cjs');

test('one canonical WTL runtime understands nursery wrap and deterministic pick without host effects',async()=>{
 const {createWyrdruneRuntime,wrapAround}=await import('./runtime.mjs');
 assert.equal(wrapAround(17,5),2);
 assert.equal(wrapAround(-1,5),4);
 assert.equal(wrapAround(1,-5),-4);
 assert.throws(()=>wrapAround(1,0),/Wrap by zero/);
 const runtime=createWyrdruneRuntime({hashSource:digest,continuityDigest:digest});
 const ir=runtime.compile(`operator choose(n) = pick(["first","second","third"], n);
mobius scoped {
  perceive { let first = 17 % 5; }
  compress { let selected = choose(-1); }
  release { let result = if first == 2 then selected else "other"; }
  verify { require first == 2 else "wrong wrap"; }
  integrate {}
  choose {}
  return { emit {result: result,wrap: first}; }
  transcend {}
}`);
 const inspection=runtime.inspectOperators(ir);
 assert.equal(inspection.status,'checked');
 const result=await runtime.execute(ir);
 assert.equal(result.status,'committed');
 assert.equal(result.output[0].result,'third');
 assert.equal(result.output[0].wrap,2);
});
test('modulo by zero cannot publish a false verified emit',async()=>{
 const {createWyrdruneRuntime}=await import('./runtime.mjs');
 const runtime=createWyrdruneRuntime({hashSource:digest,continuityDigest:digest});
 const ir=runtime.compile(`mobius scoped {
 perceive { let result = 5 % 0; }
 compress {}
 release {}
 verify {}
 integrate {}
 choose {}
 return { emit "invalid"; }
 transcend {}
}`);
 const r=await runtime.execute(ir);
 assert.equal(r.status,'rolled-back');
 assert.deepEqual(r.output,[]);
 assert.match(r.verdict.reason,/Wrap by zero/);
});
