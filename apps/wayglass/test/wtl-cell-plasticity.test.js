import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCellEcology} from '../src/wtl-cell-ecology.js';

test('cell can change into open-ended roles at any stage without identity loss',()=>{
  const ecology=createCellEcology({maxCells:8,seed:11});
  ecology.plant('a','explorer');
  ecology.plant('b','sensor',0.5,0);
  for(let i=0;i<8;i++)ecology.step();
  const before=ecology.snapshot();
  const modes=[['healer','differentiate'],['memory_keeper','transdifferentiate'],['uncommitted','dedifferentiate'],['new_kind_of_cell','differentiate']];
  const receipts=modes.map(([role,mode])=>ecology.transform('a',role,{mode}));
  const after=ecology.snapshot();
  assert.deepEqual(receipts.map(r=>r.to),modes.map(([role])=>role));
  assert.equal(after.cells.find(c=>c.id==='a').role,'new_kind_of_cell');
  assert.equal(after.cells.find(c=>c.id==='a').parent_id,before.cells.find(c=>c.id==='a').parent_id);
  assert.deepEqual(after.positions.a,before.positions.a);
  assert.equal(after.events.filter(e=>e.type==='transform').length,4);
});
test('Feather blocks role changes',()=>{
  const ecology=createCellEcology();
  ecology.plant('seed');
  ecology.feather();
  assert.throws(()=>ecology.transform('seed','healer'),/Feather/);
});
