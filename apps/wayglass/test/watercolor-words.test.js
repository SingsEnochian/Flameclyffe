import test from 'node:test';
import assert from 'node:assert/strict';
import { readWordPainting, pressWordPainting } from '../src/watercolor-words.js';
import { createWatercolorFluid } from '../src/watercolor-fluid.js';

const stroke='{kind:"watercolor.stroke/v1",words:"Hope is here",color:"#EDBC53",density:0.8,spread:0.2,points:[[0.35,0.62],[0.65,0.62]]}';
const score=body=>'mobius { perceive {} compress {} release {} verify {} integrate {} choose {} return { '+body+' } transcend {} }';

test('native Wyrdrune emits an authored line onto the fluid underlay',async()=>{
  const strokes=await readWordPainting(score('emit '+stroke+';'));
  assert.equal(strokes[0].color,'#edbc53');
  assert.equal(strokes[0].words,'Hope is here');
  const settled=createWatercolorFluid(), wet=createWatercolorFluid();
  pressWordPainting(settled,strokes);
  const underlay=settled.pixels();
  const index=4*(Math.round((settled.height-1)*.62)*settled.width+Math.floor(settled.width*.5));
  assert.ok(underlay[index]>128);
  assert.equal(wet.pixels({underlay})[index],underlay[index]);
  assert.ok(wet.pixels()[index]<underlay[index]);
});

test('pseudocode, invalid coordinates and host bridge effects cannot deposit pigment',async()=>{
  assert.equal(await readWordPainting(score('emit "hello";')),null);
  await assert.rejects(readWordPainting(score('emit '+stroke.replace('0.65','1.65')+';')),/normalised path/);
  await assert.rejects(readWordPainting(score('emit '+stroke+'; emit bridge("host","write");')),/Bridge capability unavailable/);
  await assert.rejects(readWordPainting(score(('emit '+stroke+';').repeat(9))),/one to eight/);
});
