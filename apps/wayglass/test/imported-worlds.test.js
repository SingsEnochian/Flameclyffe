import test from 'node:test';
import assert from 'node:assert/strict';
import {HOUSE_DR_BUNDLE} from '../../arcsweep/src/house-dr-bundle.js';
import {importHouseWorlds,filterImportedWorlds,WAYGLASS_IMPORTED_WORLDS_SCHEMA} from '../src/imported-worlds.js';
test('all source-bundle worlds become attributable read-only Wayglass entries',()=>{
 const result=importHouseWorlds();
 assert.equal(result.schema,WAYGLASS_IMPORTED_WORLDS_SCHEMA);
 assert.equal(result.worlds.length,HOUSE_DR_BUNDLE.worlds.length);
 assert.ok(result.worlds.length>0);
 for(let i=0;i<result.worlds.length;i++){
  const original=HOUSE_DR_BUNDLE.worlds[i],world=result.worlds[i];
  assert.equal(world.source,original);
  assert.equal(world.source_key,original.sourceKey);
  assert.equal(world.status,'imported-read-only');
  assert.ok(Object.isFrozen(world));
 }
 assert.equal(new Set(result.worlds.map(x=>x.id)).size,result.worlds.length);
});
test('duplicate or missing source identities are refused, not silently merged',()=>{
 assert.throws(()=>importHouseWorlds({worlds:[{sourceKey:'x'},{sourceKey:'x'}]}),/duplicate/);
 assert.throws(()=>importHouseWorlds({worlds:[{name:'nameless'}]}),/Missing/);
});

test('search filters imported worlds without modifying original records',()=>{
 const archive=importHouseWorlds();
 const first=archive.worlds[0];
 assert.ok(filterImportedWorlds(archive.worlds,first.source_key).some(world=>world.id===first.id));
 assert.equal(filterImportedWorlds(archive.worlds,'___not_a_world___').length,0);
 assert.equal(filterImportedWorlds(archive.worlds,'').length,archive.worlds.length);
 assert.equal(archive.worlds[0],first);
});
