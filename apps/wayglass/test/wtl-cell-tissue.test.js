import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCellTissue} from '../src/wtl-cell-tissue.js';

test('signals consume energy and produce attributable receipts',()=>{
  const tissue=createCellTissue();
  tissue.spawn({id:'a',role:'observer'});
  tissue.spawn({id:'b',role:'watercolour'});
  tissue.signal('a','b','wtl:colour',{hue:120});
  const after=tissue.tick();
  const b=after.cells.find(c=>c.id==='b');
  assert.equal(b.energy,98);
  assert.equal(after.events.find(e=>e.type==='perceive').from,'a');
  assert.equal(after.events.find(e=>e.type==='perceive').signal_type,'wtl:colour');
});
test('mitosis preserves lineage and forbids identity collision',()=>{
  const tissue=createCellTissue({maxCells:2});
  tissue.spawn({id:'a',role:'audio'});
  tissue.divide('a','daughter');
  assert.equal(tissue.snapshot().cells[1].parent_id,'a');
  assert.throws(()=>tissue.divide('a','daughter'),/Invalid daughter/);
  assert.throws(()=>tissue.divide('a','third'),/capacity/);
});
test('Feather clears signals and stops work until explicit resume',()=>{
  const tissue=createCellTissue();
  tissue.spawn({id:'a',role:'observer'});
  tissue.signal('a','a','tick',{});
  tissue.feather();
  const paused=tissue.tick();
  assert.equal(paused.paused,undefined); // paused tick returns a receipt, not a snapshot
  assert.equal(tissue.snapshot().cells[0].signals.length,0);
  assert.throws(()=>tissue.signal('a','a','tick',{}),/Feather/);
  tissue.resume();
  tissue.tick();
  assert.equal(tissue.snapshot().events.some(e=>e.type==='perceive'),false);
});
test('snapshot mutations cannot alter the tissue',()=>{
  const tissue=createCellTissue();
  tissue.spawn({id:'a',role:'observer'});
  const copy=tissue.snapshot();copy.cells[0].energy=0;copy.events.length=0;
  assert.equal(tissue.snapshot().cells[0].energy,100);
  assert.equal(tissue.snapshot().events.length,1);
});
