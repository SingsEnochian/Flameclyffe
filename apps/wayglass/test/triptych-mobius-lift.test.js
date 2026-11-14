import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWyrdruneRuntime} from '../../../lib/wyrdrune/runtime.mjs';
import {shipDeckGroup} from '../src/ship-deck-navigation.js';

const source=readFileSync(new URL('../../../lib/wyrdrune/triptych-mobius-lift.wtl',import.meta.url),'utf8');
const runtime=createWyrdruneRuntime({hashSource:s=>createHash('sha256').update(s).digest('hex')});

test('native Wyrdrune runs both Eightfold cycles and emits three lift rooms',async()=>{
  const ir=runtime.compile(source),result=await runtime.execute(ir);
  assert.equal(result.withness.completedCycles,2);
  assert.equal(result.receipts.length,16);
  const score=result.output.find(item=>item?.schema==='wayglass.triptych-lift/v0.1');
  assert.ok(score,'native Wyrdrune must generate the navigation and sound score');
  assert.equal(score.room_count,3);
  assert.equal(score.autoplay,false);
  assert.equal(score.reversible,true);
  assert.deepEqual(score.panels.map(x=>x.id),['monolith','twist','arrival']);
  assert.deepEqual(score.panels.map(x=>x.destination),[
    'wayglass:living-watercolor','wayglass:journey-before-destination','wayglass:living-observer']);
  for(const p of score.panels){
    assert.ok(p.root_hz>=50 && p.root_hz<=1000);
    assert.ok(p.gain>0 && p.gain<=0.12);
  }
  assert.equal(shipDeckGroup('wayglass:triptych-lift'),'creation');
  assert.equal(result.sourceHash,createHash('sha256').update(source).digest('hex'));
});

test('Wyrdrune does not execute model routes or audio playback as a side-effect',async()=>{
  const result=await runtime.execute(runtime.compile(source));
  const score=result.output.find(x=>x?.schema==='wayglass.triptych-lift/v0.1');
  assert.equal(score.autoplay,false);
  assert.ok(result.receipts.every(x=>x.principalId===null));
  assert.ok(result.output.every(x=>x?.kind!=='wayglass.model-observation/v0.1'));
});
