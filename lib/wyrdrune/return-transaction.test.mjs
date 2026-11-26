import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createWyrdruneRuntime } from './runtime.mjs';
import { digest } from './canonical.cjs';

const runtime=createWyrdruneRuntime({
  hashSource:source=>createHash('sha256').update(source).digest('hex'),
  continuityDigest:digest,
});
const source=(verify='require true;')=>`mobius scoped {
  perceive { emit bridge("store","write","lantern"); }
  compress {}
  release {}
  verify { ${verify} }
  integrate {}
  choose {}
  return {}
  transcend {}
}`;

const principal={id:'owner-test',authorized:true};

test('failed Verify discards prepared effects without committing',async()=>{
  let prepared=0,committed=0;
  const result=await runtime.execute(runtime.compile(source('require false;')) ,{
    principal,
    bridges:{store:{write:{prepare:async()=>{prepared++;return {
      value:'prepared-value',receipt:{reservation:'local-test'},
      commit:async()=>{committed++;},compensate:async()=>{}
    };}}}}
  });
  assert.equal(prepared,1);
  assert.equal(committed,0);
  assert.equal(result.status,'rolled-back');
  assert.equal(result.bridgeEffectReceipts[0].status,'discarded-before-commit');
});

test('successful execution commits staged effects and returns their receipt',async()=>{
  const events=[];
  const result=await runtime.execute(runtime.compile(source()),{
    principal,
    intent:{purpose:'test-only',target:'lantern'},
    bridges:{store:{write:{prepare:async context=>{
      assert.equal(context.intentDigest,digest({purpose:'test-only',target:'lantern'}));
      events.push('prepare');
      return {value:'prepared-value',receipt:{reservation:'r1'},
        commit:async()=>{events.push('commit');return {committed:'r1'};},
        compensate:async()=>events.push('compensate')};
    }}}}
  });
  assert.deepEqual(events,['prepare','commit']);
  assert.equal(result.bridgeEffectReceipts[0].status,'committed');
  assert.deepEqual(result.bridgeEffectReceipts[0].receipt,{committed:'r1'});
  assert.equal(result.lineage.intent,digest({purpose:'test-only',target:'lantern'}));
});

test('commit failure compensates earlier committed effects in reverse order',async()=>{
  const events=[];
  const bridges={store:{
    first:{prepare:async()=>({value:1,commit:async()=>{events.push('commit-first');},compensate:async()=>{events.push('compensate-first');}})},
    second:{prepare:async()=>({value:2,commit:async()=>{events.push('commit-second');throw new Error('simulated commit failure');},compensate:async()=>{events.push('compensate-second');}})}
  }};
  const twoEffects=source().replace('emit bridge("store","write","lantern");',
    'emit bridge("store","first"); emit bridge("store","second");');
  await assert.rejects(runtime.execute(runtime.compile(twoEffects),{principal,bridges}),
    error=>error.name==='WyrdruneHardStop'&&error.message.includes('compensation completed'));
  assert.deepEqual(events,['commit-first','commit-second','compensate-first']);
});

test('different declared intents produce different lineage roots',async()=>{
  const ir=runtime.compile(source());
  const a=await runtime.execute(ir,{principal,seeds:{seed:1},intent:{purpose:'paint'}});
  const b=await runtime.execute(ir,{principal,seeds:{seed:1},intent:{purpose:'sing'}});
  assert.notEqual(a.lineage.root,b.lineage.root);
  assert.notEqual(a.lineage.intent,b.lineage.intent);
});

test('legacy immediate bridge functions are refused',async()=>{
  await assert.rejects(runtime.execute(runtime.compile(source()),{
    principal,bridges:{store:{write:async()=>({ok:true})}}
  }),/transactional adapter/);
});
