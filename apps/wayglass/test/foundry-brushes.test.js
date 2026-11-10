import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBrush, makeBrushLibrary } from '../../starwell/src/components/glyph-studio/glyphStudioModel.js';
import { createWatercolorFluid } from '../src/watercolor-fluid.js';
import { loadFoundryBrushes, projectFoundryBrush, foundryPigmentSample, FOUNDRY_BRUSH_STORAGE_KEY } from '../src/foundry-brushes.js';

test('saved Foundry edits reach pigment without mutating the source library',()=>{
  const library=makeBrushLibrary();
  let raw=JSON.stringify(library);
  const storage={getItem(key){assert.equal(key,FOUNDRY_BRUSH_STORAGE_KEY);return raw;}};
  const before=loadFoundryBrushes(storage);
  assert.equal(before.source,'saved-foundry');
  const original=foundryPigmentSample(before.brushes[0]);
  library.brushes[0].attributes.properties.size=68;
  library.brushes[0].attributes.properties.opacity=.2;
  raw=JSON.stringify(library);
  const after=loadFoundryBrushes(storage);
  const changed=foundryPigmentSample(after.brushes[0]);
  assert.equal(changed.radius,original.radius*2);
  assert.ok(changed.amount<original.amount);
  assert.equal(raw,JSON.stringify(library));
  assert.equal(after.brushes[0].id,library.brushes[0].id);
  const fluid=createWatercolorFluid({width:32,height:24});
  fluid.inject({x:.5,y:.5,color:'#c26a46',...changed});
  assert.ok(fluid.snapshot().pigment_mass>0);
});

test('Pencil pressure affects size and opacity; zero opacity paints nothing',()=>{
  const brush=projectFoundryBrush(makeBrush());
  const light=foundryPigmentSample(brush,{pressure:.1});
  const heavy=foundryPigmentSample(brush,{pressure:1});
  assert.ok(heavy.radius>light.radius);
  assert.ok(heavy.amount>light.amount);
  assert.equal(foundryPigmentSample({...brush,opacity:0}).amount,0);
  for(const pressure of [NaN,Infinity,-20,20]){
    const sample=foundryPigmentSample(brush,{pressure,width:Infinity});
    assert.ok(Number.isFinite(sample.radius)&&Number.isFinite(sample.amount));
  }
});

test('unavailable or corrupt storage is preserved and reports recovery',()=>{
  for(const storage of [{getItem(){throw Error('blocked');}},{getItem(){return '{broken';}},{getItem(){return JSON.stringify({schemaVersion:'other',brushes:[]});}}]){
    const catalog=loadFoundryBrushes(storage);
    assert.equal(catalog.source,'foundation');
    assert.equal(catalog.brushes.length,2);
    assert.match(catalog.warning,/Originals preserved/);
  }
  assert.equal(loadFoundryBrushes().warning,null);
});

test('incomplete definitions and duplicate ids cannot silently replace brushes',()=>{
  assert.throws(()=>projectFoundryBrush({id:'bad',name:'bad',attributes:{}}),/Incomplete/);
  const library=makeBrushLibrary();
  library.brushes[1].id=library.brushes[0].id;
  assert.match(loadFoundryBrushes({getItem:()=>JSON.stringify(library)}).warning,/Duplicate/);
});
