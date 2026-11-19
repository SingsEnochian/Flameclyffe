import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCellEcology} from '../src/wtl-cell-ecology.js';

test('ageing colony renews while preserving retiree receipts and lineage',()=>{
  const ecology=createCellEcology({maxCells:24,seed:11,radius:3,mutationRate:0.8,renewalAge:18});
  ecology.plant('a','explorer',0,0);
  ecology.plant('b','explorer',1,0);
  for(let i=0;i<100;i++)ecology.step();
  const s=ecology.snapshot();
  assert.equal(s.cells.length,2);
  assert.equal(s.retirements.length,22);
  assert.equal(s.events.filter(e=>e.type==='birth').length,24);
  assert.ok(s.retirements.every(r=>r.reason==='age-renewal'&&Array.isArray(r.lastPhrases)));
  assert.ok(s.cells.length>=2);
});
test('Feather stops retirements and regrowth',()=>{
  const ecology=createCellEcology({renewalAge:3});
  ecology.plant('a');
  ecology.feather();
  for(let i=0;i<10;i++)ecology.step();
  assert.equal(ecology.snapshot().retirements.length,0);
  assert.equal(ecology.snapshot().cells.length,1);
});
