import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCellEcology} from '../src/wtl-cell-ecology.js';
test('Project Genesis selects a reviewed executable program with attributable receipts',()=>{
 const eco=createCellEcology({seed:11,maxCells:12,radius:3});
 eco.plant('a','explorer',0,0);eco.plant('b','explorer',1,0);
 for(let i=0;i<15;i++)eco.step();
 const s=eco.snapshot(),d=s.projectDecisions[0];
 assert.ok(d);assert.equal(d.generation,15);
 assert.ok(d.candidates.length>=2);
 assert.equal(d.winner,d.candidates[0].author);
 assert.ok(d.candidates.every(p=>p.reviews.length>0&&p.reviews.every(r=>typeof r.score==='number')));
 assert.equal(d.selected.result.status,'completed');
 assert.equal(d.revision.result.status,'completed');
 assert.ok(d.revision.score<=d.revision.baselineScore);
 assert.ok(d.revision.attempts.length>0);
 assert.ok(d.peerTests.length>0);
 assert.ok(d.peerTests.every(p=>p.original.passed===true));
 assert.ok(d.peerTests.every(p=>typeof p.revised.passed==='boolean'));
 assert.ok(d.revision.attempts.every(a=>a.score>=0));
 assert.ok(d.selected.result.output.length>0);
 assert.ok(s.wyrdruneExpressions.some(e=>e.semantic.project_id===d.id));
});
test('Feather stops project decisions',()=>{
 const eco=createCellEcology();eco.plant('a','explorer',0,0);eco.plant('b','explorer',1,0);
 eco.feather();for(let i=0;i<20;i++)eco.step();
 assert.equal(eco.snapshot().projectDecisions.length,0);
});

test('revisions are reproducible, bounded and reject invalid targets',async()=>{
 const {reviseCellProgram}=await import('../src/wtl-cell-program.js');
 const source='tone 12\nrest 2\necho 4';
 const a=reviseCellProgram(source,{targetTone:60});
 assert.deepEqual(a,reviseCellProgram(source,{targetTone:60}));
 assert.equal(a.score,0);
 assert.equal(a.improved,true);
 assert.ok(a.attempts.length<=12);
 assert.throws(()=>reviseCellProgram(source,{targetTone:100}));
});

test('peer-authored tests execute assertions and reject invalid input',async()=>{
 const {authorPeerTest,runPeerTest}=await import('../src/wtl-cell-peer-tests.js');
 const source=['tone 48','rest 2'].join(String.fromCharCode(10));
 const t=authorPeerTest({id:'reviewer'},{curiosity:0},source);
 assert.equal(runPeerTest(t,source).passed,true);
 assert.equal(runPeerTest(t,'tone 49').passed,false);
 assert.throws(()=>runPeerTest({...t,upper:999},source));
});
