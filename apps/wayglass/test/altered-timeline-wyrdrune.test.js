import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWyrdruneRuntime} from '../../../lib/wyrdrune/runtime.mjs';
import {validateWyrdruneRipple} from '../../arcsweep/src/altered-timeline.js';
import {shipDeckGroup} from '../src/ship-deck-navigation.js';
import {resolveWayglassEntry} from '../src/wayglass-entry.js';

const source=readFileSync(new URL('../../../lib/wyrdrune/altered-timeline.wtl',import.meta.url),'utf8');
const runtime=createWyrdruneRuntime({hashSource:s=>createHash('sha256').update(s).digest('hex')});
const run=async magnitude=>{
  const authored=source.replace('let change_strength = 0.5;','let change_strength = '+String(magnitude)+';');
  const result=await runtime.execute(runtime.compile(authored));
  const score=result.output.find(e=>e?.schema==='wayglass.altered-timeline-ripple/v0.1');
  return {result,score,authored};
};
test('two real Wyrdrune Eightfold cycles produce an alterable, reversible ripple score',async()=>{
  const {result,score,authored}=await run(.5);
  assert.equal(result.withness.completedCycles,2);
  assert.equal(result.receipts.length,16);
  assert.equal(result.sourceHash,createHash('sha256').update(authored).digest('hex'));
  assert.deepEqual(validateWyrdruneRipple(score).map(x=>x.id),['near','middle','far','echo']);
  assert.equal(score.inferred_events,0);
  assert.equal(score.probability_claimed,false);
  assert.equal(score.requires_explicit_choice,true);
  assert.equal(score.reversible,true);
  assert.ok(result.receipts.every(r=>r.principalId===null));
  assert.ok(result.output.every(x=>x?.kind!=='wayglass.model-observation/v0.1'));
});
test('the authored scalar changes native ripple output, without JS inventing a score',async()=>{
  const [low,high]=await Promise.all([run(.25),run(.9)]);
  assert.ok(low.score.levels[0].intensity<high.score.levels[0].intensity);
  assert.ok(low.score.levels[2].intensity<high.score.levels[2].intensity);
  assert.notEqual(low.result.sourceHash,high.result.sourceHash);
});
test('new room belongs to creation and can be entered by a deliberate owner URL',()=>{
  assert.equal(shipDeckGroup('wayglass:altered-timeline'),'creation');
  const available=['wayglass:living-watercolor','wayglass:altered-timeline'];
  assert.equal(resolveWayglassEntry({available,room:'altered'}).surface_id,'wayglass:altered-timeline');
});
