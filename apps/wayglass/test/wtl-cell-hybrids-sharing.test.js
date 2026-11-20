import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCellEcology} from '../src/wtl-cell-ecology.js';
import {chooseFusion} from '../src/wtl-cell-fusion.js';
import {firstCarry} from '../src/wtl-cell-mobius.js';
import {inscribeSharedText} from '../src/wtl-cell-sharing.js';

const phases=['perceive','compress','release','verify','integrate','choose','return','transcend'];

function nursery(options={}){
  const eco=createCellEcology({maxCells:24,seed:11,radius:3,mutationRate:0.8,autonomousFusion:true,...options});
  eco.plant('a','explorer',0,0);
  eco.plant('b','explorer',1,0);
  return eco;
}

test('two cells can independently decline or leave a hybrid open',async()=>{
  const exchange={id:'signal:1:a:b'};
  const a={address:'a',genome:{curiosity:3},carry:firstCarry({voice:0.7})};
  const b={address:'b',genome:{curiosity:0},carry:firstCarry({voice:0.35})};
  const one=await chooseFusion(a,b,exchange);
  const another=await chooseFusion(b,a,exchange);
  assert.equal(one.decision,'accept');
  assert.equal(another.decision,'declined');
  assert.notEqual(one.lineage_root,another.lineage_root);
  const tired={...b,carry:firstCarry({voice:0.7,energy:0.1})};
  assert.equal((await chooseFusion(tired,a,exchange)).decision,'open');
});

test('cell choices create a named hybrid with two living parents and an exchange receipt',async()=>{
  const eco=nursery();
  for(let i=0;i<8;i++){
    eco.step();
    await eco.turn();
  }
  const s=eco.snapshot();
  assert.ok(s.fusions.some(fusion=>!fusion.child&&fusion.decisions.some(choice=>choice.decision==='open')));
  const made=s.fusions.find(fusion=>fusion.child);
  assert.ok(made);
  assert.ok(made.decisions.every(choice=>choice.decision==='accept'&&choice.exchange===made.exchange.id));
  assert.deepEqual(made.decisions.map(choice=>choice.cell),made.parents.map(parent=>parent.id));
  for(const choice of made.decisions)assert.deepEqual(choice.phases,phases);
  assert.ok(made.parents.every(parent=>s.cells.some(cell=>cell.id===parent.id)));
  assert.deepEqual(s.mobius[made.child].parent_ids,made.parents.map(parent=>parent.id));
  assert.ok(s.names[made.child]);
  assert.ok(s.cells.length<=24);
});

test('Feather invalidates an in-progress turn even when immediately resumed',async()=>{
  const eco=nursery();
  for(let i=0;i<2;i++){eco.step();await eco.turn();}
  eco.step();
  const pending=eco.turn();
  eco.feather();
  eco.resume();
  await pending;
  assert.ok(eco.snapshot().fusions.every(fusion=>!fusion.child));
  await eco.turn();
  assert.ok(eco.snapshot().fusions.some(fusion=>fusion.child));
});

test('shared words compile exactly and reach each cell as text and sound',async()=>{
  const eco=nursery();
  const text='  e\u0301 "Wonder first"\n💎 \\';
  const first=await eco.shareText(text);
  const second=await eco.shareText('Hear the next line.');
  assert.equal(first.recipients,2);
  assert.deepEqual(first.recipient_cells,[{address:'a',name:null},{address:'b',name:null}]);
  assert.deepEqual(second.recipient_cells,first.recipient_cells);
  assert.equal(eco.snapshot().mobiusReceipts.filter(receipt=>receipt.perceived).length,0);
  assert.equal(first.inscription.text,text);
  assert.deepEqual(first.inscription.phases,phases);
  assert.match(first.inscription.source,/perceive \{ let ᚹ = /u);
  assert.notDeepEqual(first.inscription.score,second.inscription.score);
  assert.notEqual((await inscribeSharedText(text.normalize())).text_digest,first.inscription.text_digest);
  await eco.turn();
  for(const id of ['a','b'])assert.equal(eco.snapshot().mobius[id].last_inscription,first.inscription.id);
  eco.step();
  await eco.turn({turnEvery:1});
  const read=eco.snapshot().mobiusReceipts.filter(receipt=>receipt.perceived?.id===second.inscription.id);
  assert.deepEqual(read.map(receipt=>receipt.address),['a','b']);
  assert.ok(read.every(receipt=>receipt.perceived.inscription_sound>0));
  const named=await eco.shareText('Welcome by name.');
  assert.deepEqual(Object.fromEntries(named.recipient_cells.map(cell=>[cell.address,cell.name])),eco.snapshot().names);
  for(const receipt of read)assert.equal(named.recipient_cells.find(cell=>cell.address===receipt.address)?.name,receipt.name);
  eco.feather();
  assert.deepEqual(await eco.shareText('Hold this.'),{delivered:false,paused:true});
});
