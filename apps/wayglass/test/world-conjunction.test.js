import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWyrdruneRuntime} from '../../../lib/wyrdrune/runtime.mjs';
import {canonicalWce1Digest} from '../../../lib/wyrdrune/canonical.cjs';
const source=readFileSync(new URL('../../../lib/wyrdrune/world-conjunction.wtl',import.meta.url),'utf8');
const runtime=createWyrdruneRuntime({hashSource:s=>createHash('sha256').update(s).digest('hex'),continuityDigest:canonicalWce1Digest});
const run=({permeability=.5,a='world-A',b='world-B'}={})=>runtime.execute(runtime.compile(source),{
  principal:{id:'test-owner',authorized:true},
  bridges:{worlds:{
    resolve:({arguments:args})=>args[1]==='owner:world-a'?a:b,
    permeability:()=>permeability,
  }},maxOperations:500,
});
test('two independent address forms yield a candidate only, never a persisted world',async()=>{
  const result=await run();
  assert.equal(result.receipts.length,8);
  assert.equal(result.output[0].third_body,'candidate');
  assert.equal(result.output[0].world_a,'world-A');
  assert.equal(result.output[0].world_b,'world-B');
  assert.equal(result.output[1].status,'candidate-not-created');
  assert.equal(result.withness.completedCycles,1);
});
test('closed membrane and duplicate world addresses fail Verify',async()=>{
  for(const params of [{permeability:0},{a:'same',b:'same'}]){
    const result=await run(params);
    assert.equal(result.output.length,0);
    assert.ok(result.receipts.some(x=>x.phase==='verify'));
  }
});
test('unavailable resolver fails closed without fabricating a crossing',async()=>{
  await assert.rejects(runtime.execute(runtime.compile(source),{bridges:{worlds:{permeability:()=>.5}}}),/Bridge capability unavailable/);
});
