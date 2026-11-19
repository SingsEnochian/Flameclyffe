import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCellEcology} from '../src/wtl-cell-ecology.js';

test('cells compose traceable phrases and inherit recent phrase memory',()=>{
  const ecology=createCellEcology({maxCells:24,seed:11,radius:3,mutationRate:0.8});
  ecology.plant('a','explorer',0,0);
  ecology.plant('b','explorer',1,0);
  for(let i=0;i<35;i++)ecology.step();
  const state=ecology.snapshot();
  assert.equal(state.utterances.length,192);
  assert.equal(new Set(state.utterances.map(u=>u.phrase)).size,181);
  assert.ok(state.utterances.every(u=>state.lexicons[u.id]&&u.origin==='composed'));
  assert.ok(state.cells.some(c=>c.parent_id));
});
test('Feather stops further phrase composition',()=>{
  const ecology=createCellEcology({maxCells:8,seed:11});
  ecology.plant('a','explorer',0,0);
  ecology.plant('b','explorer',0.5,0);
  ecology.step();
  const before=ecology.snapshot().utterances.length;
  ecology.feather();
  ecology.step();
  assert.equal(ecology.snapshot().utterances.length,before);
});
