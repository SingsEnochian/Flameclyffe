'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {compile,execute,geometryStar,PHASES}=require('./wyrdrune.cjs');
const source=`mobius {
 perceive { let energy = 2; }
 compress { set energy = energy * 4; }
 release { set energy = energy + 1; }
 verify { emit energy; }
 integrate { emit star(3); }
 choose { set energy = energy - 3; }
 return { emit energy; }
 transcend { emit energy / 2; }
}`;
test('eightfold canonical order and ninth center',async()=>{
  const out=await execute(compile(source));
  assert.equal(out.receipts.length,8);
  assert.deepEqual(out.receipts.map(x=>x.phase),PHASES);
  assert.equal(out.withness.center,'withness');
  assert.deepEqual([out.output[0],out.output[2],out.output[3]],[9,6,3]);
  assert.equal(out.output[1].points.length,8);
});
test('reject missing and reordered phases',()=>{
  assert.throws(()=>compile(source.replace('compress {','other {')),SyntaxError);
  assert.throws(()=>compile('mobius { perceive {} }'),SyntaxError);
});
test('bridge denied by default',async()=>{
  const s=source.replace('emit energy;','emit bridge("python","run",energy);');
  await assert.rejects(execute(compile(s)),/Bridge capability unavailable/);
});
test('explicit bridge requires verified owner',async()=>{
  const s=source.replace('emit energy;','emit bridge("python","add",energy);');
  const bridges={python:{add:async ({arguments:args})=>args[0]+2}};
  await assert.rejects(execute(compile(s),{bridges}),/verified owner/);
  const out=await execute(compile(s),{bridges,principal:{id:'rowan',authorized:true}});
  assert.equal(out.output[0],11);
  assert.equal(out.receipts[0].principalId,'rowan');
});
test('Feather stop and budget fail closed',async()=>{
  const s=compile(source);
  await assert.rejects(execute(s,{signal:{aborted:true}}),/Feather/);
  await assert.rejects(execute(s,{maxOperations:2}),/budget/);
});
test('geometry center and radius enforced',()=>{
  assert.equal(geometryStar(3).center.name,'withness');
  assert.throws(()=>geometryStar(Infinity),RangeError);
});
test('arithmetic cannot execute foreign source',()=>{
  assert.throws(()=>compile('require("fs")'),SyntaxError);
});


test('a Wyrdrune model can declare, compile and execute a new pure operator',async()=>{
 const native=[
  'operator refract(x) = x * 2;',
  'mobius {',
  ' perceive { let a = 4; }',
  ' compress { let b = refract(a); }',
  ' release {} verify {emit b;} integrate {} choose {} return {} transcend {}',
  '}',
 ].join('\n');
 const ir=compile(native);
 assert.equal(ir.operators[0].name,'refract');
 const result=await execute(ir,{maxOperations:100});
 assert.equal(result.output[0],8);
 assert.equal(result.receipts.length,8);
});
test('native operator language cannot escape through host bridges or infinite recursion',async()=>{
 const programme=inner=>[
  'operator curious(x) = '+inner+';',
  'mobius { perceive {} compress {} release {} verify {} integrate {} choose {emit curious(4);} return {} transcend {} }',
 ].join('\n');
 const bridges={expression:{sound:()=>0}};
 await assert.rejects(execute(compile(programme('bridge("expression","sound",1,2,3)')),
  {bridges,principal:{id:'owner',authorized:true}}),/cannot invoke/);
 await assert.rejects(execute(compile(programme('curious(x)')),
  {principal:{id:'owner',authorized:true}}),/recursion depth/);
 assert.throws(()=>compile(programme('4').replace('operator curious','operator bridge')),/Reserved/);
});

test('operator inspection reports captures and incorrect calls in nested expressions', () => {
  const { inspectOperators } = require('./wyrdrune.cjs');
  const source = [
    'operator twice(value) = value * 2;',
    'operator trace(x) = if true then [twice(x)] else {hidden: [unbound, twice(), whisper(x, 0)]};',
    'operator recursive(x) = if x == 0 then 0 else recursive(x - 1);',
    'mobius { perceive {} compress {} release {} verify {} integrate {} choose {} return {} transcend {} }',
  ].join('\n');
  const ir = compile(source);
  const report = inspectOperators(ir);
  assert.equal(report.sourceHash, ir.sourceHash);
  assert.equal(report.status, 'diagnostics');
  assert.deepEqual(report.diagnostics, [
    { operator: 'trace', code: 'unbound-parameter', name: 'unbound' },
    { operator: 'trace', code: 'operator-arity', name: 'twice', expected: 1, actual: 0 },
    { operator: 'trace', code: 'nonportable-call', name: 'whisper' },
  ]);
  assert.ok(Object.isFrozen(report.diagnostics[0]));
});
