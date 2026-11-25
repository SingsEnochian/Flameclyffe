import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseWayglassDesign,compileWayglassDesign,createWayglassDesignMemory,WAYGLASS_DESIGN_CHOICES} from '../src/wayglass-design-choice.js';
test('Wayglass selects distinct Wyrdrune materials based on observable context and Feather',()=>{
 assert.equal(chooseWayglassDesign().id,'garden');
 assert.equal(chooseWayglassDesign({audioEnabled:true}).id,'watercolour');
 assert.equal(chooseWayglassDesign({routeActive:true}).id,'labradorite');
 assert.equal(chooseWayglassDesign({featherStopped:true,routeActive:true}).id,'quiet');
 for(const design of WAYGLASS_DESIGN_CHOICES){
  const compiled=compileWayglassDesign({id:design.id}).ir.proposal;
  assert.equal(compiled.material,design.material);
  assert.ok(compiled.nodes.some(x=>x.action==='feather'));
 }
});
test('local design choice receipt records source without asserting model preference',()=>{
 const entries=new Map(),storage={getItem:key=>entries.get(key),setItem:(key,value)=>entries.set(key,value)};
 const memory=createWayglassDesignMemory({storage}),choice=chooseWayglassDesign({routeActive:true});
 memory.save(choice);
 assert.equal(memory.read().id,'labradorite');
 assert.equal(memory.read().source,'deterministic-local-design-policy');
 assert.equal(choice.notModelPreference,true);
});
