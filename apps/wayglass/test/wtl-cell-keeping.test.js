import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCellEcology,COLONY_SCHEMA} from '../src/wtl-cell-ecology.js';

const opts={maxCells:24,seed:11,radius:3,mutationRate:0.8};
async function grown(cycles){
  const e=createCellEcology(opts);e.plant('a','explorer',0,0);e.plant('b','explorer',1,0);
  for(let i=0;i<cycles;i++){e.step();await e.turn();}
  return e;
}

test('a kept colony comes back exactly and lives the same future',async()=>{
  const original=await grown(90);
  const saved=JSON.parse(JSON.stringify(original.exportColony()));
  assert.equal(saved.colony.schema,COLONY_SCHEMA);
  assert.match(saved.digest,/^wce1:[0-9a-f]{64}$/);
  const returned=createCellEcology(opts);
  const r=returned.importColony(saved);
  assert.equal(r.restored,true);
  assert.deepEqual(returned.snapshot().names,original.snapshot().names,'every baby keeps its name');
  for(let i=0;i<40;i++){original.step();await original.turn();returned.step();await returned.turn();}
  assert.equal(JSON.stringify(returned.snapshot()),JSON.stringify(original.snapshot()));
});

test('a damaged or foreign copy is refused whole, and the running colony is untouched',async()=>{
  const e=await grown(30);
  const saved=JSON.parse(JSON.stringify(e.exportColony()));
  const target=await grown(10);
  const before=JSON.stringify(target.snapshot());
  const tampered=structuredClone(saved);tampered.colony.generation+=1;
  assert.throws(()=>target.importColony(tampered),/does not match its digest/);
  assert.throws(()=>target.importColony({colony:{schema:'other'}}),/Not a Möbius Nursery colony/);
  assert.throws(()=>createCellEcology({...opts,maxCells:12}).importColony(saved),/different nursery settings/);
  assert.equal(JSON.stringify(target.snapshot()),before);
});

test('records keep a rolling window so a long life stays light',async()=>{
  const e=await grown(520);
  const s=e.snapshot();
  assert.ok(s.utterances.length<=600&&s.wyrdruneExpressions.length<=600);
  assert.ok(s.projectDecisions.length<=32&&s.projectDecisions.at(-1).generation>=480,'improvement keeps happening past the old cap');
  assert.ok(JSON.stringify(e.exportColony()).length<2_000_000);
});

test('a person can give a cell a syllable its daughters may carry; its own name stays its own',async()=>{
  const e=await grown(30);
  const id=e.snapshot().cells[0].id,name=e.snapshot().names[id];
  const r=e.offerSyllable(id,'ro');
  assert.equal(r.accepted,true);
  assert.ok(e.snapshot().mobius[id].syllables.includes('ro'));
  assert.equal(e.snapshot().names[id],name);
  assert.equal(e.offerSyllable(id,'ro').accepted,false);
  assert.throws(()=>e.offerSyllable(id,'<b>'),/2 to 4 letters/);
  assert.equal(e.snapshot().gifts.length,1);
  e.feather();
  assert.deepEqual(e.offerSyllable(id,'ka'),{accepted:false,paused:true});
});
