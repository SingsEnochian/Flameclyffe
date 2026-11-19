import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCellEcology} from '../src/wtl-cell-ecology.js';
import {compileCellProgram,executeCellProgram} from '../src/wtl-cell-program.js';
test('offspring inherit independent executable program copies with provenance',()=>{
 const eco=createCellEcology({seed:7,maxCells:12,radius:3});
 eco.plant('founder-a','explorer',0,0);eco.plant('founder-b','explorer',1,0);
 for(let i=0;i<90;i++)eco.step();
 const s=eco.snapshot();
 assert.ok(s.programLineages.length>0,'expected program-bearing descendants');
 for(const p of s.programLineages){
  assert.equal(p.verification.status,'completed');
  assert.ok(p.ancestor_program_id);
  assert.equal(executeCellProgram(compileCellProgram(p.source)).status,'completed');
 }
 const copy=eco.snapshot();copy.programLineages[0].source='tone 999';
 assert.notEqual(eco.snapshot().programLineages[0].source,'tone 999');
});
