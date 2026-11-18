import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCellEcology} from '../src/wtl-cell-ecology.js';

test('local neighbours communicate and colony populates within capacity',()=>{
  const ecology=createCellEcology({maxCells:12,seed:11,radius:3});
  ecology.plant('a','explorer',0,0);
  ecology.plant('b','explorer',1,0);
  const steps=Array.from({length:15},()=>ecology.step());
  const snapshot=ecology.snapshot();
  assert.equal(snapshot.cells.length,12);
  assert.equal(steps.reduce((n,s)=>n+s.births.length,0),10);
  assert.equal(steps.reduce((n,s)=>n+s.signals,0),71);
  assert.ok(snapshot.events.some(e=>e.type==='perceive'));
  assert.ok(snapshot.cells.every(c=>Number.isFinite(snapshot.positions[c.id].x)));
});
test('distant cells do not communicate',()=>{
  const ecology=createCellEcology({radius:1});
  ecology.plant('a','explorer',0,0);
  ecology.plant('b','explorer',10,10);
  assert.deepEqual(ecology.neighbours('a'),[]);
  assert.equal(ecology.step().signals,0);
});
test('Feather halts ecological generations and reproduction',()=>{
  const ecology=createCellEcology({maxCells:12});
  ecology.plant('seed');
  ecology.feather();
  const prior=ecology.snapshot();
  assert.equal(ecology.step().paused,true);
  assert.equal(ecology.snapshot().generation,prior.generation);
  assert.equal(ecology.snapshot().cells.length,1);
});
