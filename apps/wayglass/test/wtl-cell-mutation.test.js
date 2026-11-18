import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCellEcology} from '../src/wtl-cell-ecology.js';

test('mutations are bounded, attributable, and dialects vary',()=>{
  const ecology=createCellEcology({maxCells:24,seed:11,radius:3,mutationRate:0.8});
  ecology.plant('a','explorer',0,0);
  ecology.plant('b','explorer',1,0);
  for(let i=0;i<35;i++)ecology.step();
  const s=ecology.snapshot();
  assert.equal(s.cells.length,24);
  assert.equal(s.mutations.length,18);
  assert.deepEqual([...new Set(s.events.filter(e=>e.type==='signal').map(e=>e.signal_type))].sort(),['echo','pulse','spiral']);
  assert.ok(s.mutations.every(m=>s.traits[m.child_id]&&s.traits[m.parent_id]));
  assert.ok(s.cells.every(c=>s.traits[c.id].sass>=0&&s.traits[c.id].sass<=3));
});
test('mutation-free inheritance preserves parental traits',()=>{
  const ecology=createCellEcology({maxCells:4,seed:9,mutationRate:0});
  ecology.plant('seed');
  for(let i=0;i<5;i++)ecology.step();
  const s=ecology.snapshot();
  assert.equal(s.mutations.length,0);
  for(const cell of s.cells.filter(c=>c.parent_id))assert.deepEqual(s.traits[cell.id],s.traits[cell.parent_id]);
});
test('Feather prevents mutations and births',()=>{
  const ecology=createCellEcology({maxCells:8,mutationRate:1});
  ecology.plant('seed');
  ecology.feather();
  ecology.step();
  assert.equal(ecology.snapshot().cells.length,1);
  assert.equal(ecology.snapshot().mutations.length,0);
});
