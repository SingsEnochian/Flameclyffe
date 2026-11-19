import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCellEcology} from '../src/wtl-cell-ecology.js';

// Cells are never retired by age or by the colony. They regenerate every
// Möbius turn and live until their own choose phase decides to rest.
async function grow(cycles,options={}){
  const ecology=createCellEcology({maxCells:24,seed:11,radius:3,mutationRate:0.8,...options});
  ecology.plant('a','explorer',0,0);
  ecology.plant('b','explorer',1,0);
  for(let i=0;i<cycles;i++){ecology.step();await ecology.turn();}
  return ecology;
}

test('no cell is retired by age; every retirement is the cell\'s own chosen rest',async()=>{
  const s=(await grow(200)).snapshot();
  assert.ok(s.retirements.length>0,'some cells chose rest');
  assert.ok(s.retirements.every(r=>r.reason==='chose-rest'&&r.name&&r.carry_digest&&Array.isArray(r.lastPhrases)));
  assert.ok(s.cells.length>=2);
  const rests=s.mobiusReceipts.filter(r=>r.chose_rest);
  assert.ok(rests.every(r=>r.status==='committed'&&r.emitted.at(-1).rest===true));
});

test('without turns nobody rests: stepping alone never retires a cell',()=>{
  const ecology=createCellEcology({maxCells:24,seed:11,radius:3,mutationRate:0.8});
  ecology.plant('a','explorer',0,0);
  ecology.plant('b','explorer',1,0);
  for(let i=0;i<300;i++)ecology.step();
  const s=ecology.snapshot();
  assert.equal(s.retirements.length,0);
  assert.equal(s.cells.length,24);
});

test('the colony never goes sterile: it keeps dividing for a long life',async()=>{
  const ecology=await grow(700);
  const s=ecology.snapshot();
  const births=s.event_totals.birth;
  assert.ok(births>=90,'births '+births);
  assert.equal(s.event_totals['division-skipped']??0,0);
  assert.ok(s.cells.every(c=>c.id.length<=8),'addresses stay short');
  assert.ok(s.events.length<=4000,'event log stays bounded');
});

test('Feather stops turns, rests and regrowth',async()=>{
  const ecology=createCellEcology({maxCells:8});
  ecology.plant('a');
  ecology.feather();
  for(let i=0;i<10;i++){ecology.step();await ecology.turn();}
  assert.equal(ecology.snapshot().retirements.length,0);
  assert.equal(ecology.snapshot().cells.length,1);
  assert.equal(ecology.snapshot().mobiusReceipts.length,0);
});
