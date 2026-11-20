import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createCellEcology} from '../src/wtl-cell-ecology.js';
import {turnCell,firstCarry,daughterCarry,cellSource,chooseName,CARRY_NAMES} from '../src/wtl-cell-mobius.js';
import {digestWce1Sync,sha256Hex} from '../src/wtl-cell-digest.js';

const require=createRequire(import.meta.url);
const {digest}=require('../../../lib/wyrdrune/canonical.cjs');

test('the nursery digest is byte-identical to canonical WCE-1',()=>{
  for(const text of ['','abc','x'.repeat(55),'x'.repeat(56),'é🧬'.repeat(40)])
    assert.equal(sha256Hex(text),createHash('sha256').update(text,'utf8').digest('hex'));
  const file=JSON.parse(readFileSync(new URL('../../../lib/wyrdrune/conformance/wce1-vectors.json',import.meta.url),'utf8'));
  const vectors=(file.vectors||file).filter(v=>v.value!==undefined);
  assert.ok(vectors.length>=10);
  for(const v of vectors)assert.equal(digestWce1Sync(v.value),digest(v.value));
});

test('one turn is two faces of a scoped Möbius on the canonical runtime',async()=>{
  const {carry,receipt}=await turnCell({address:'c1',genome:{sass:1,curiosity:2,dialectBias:1},carry:firstCarry()});
  assert.equal(receipt.status,'committed');
  assert.deepEqual(receipt.faces,['outer','inner']);
  assert.equal(receipt.runtime,'lib/wyrdrune/runtime.mjs');
  assert.deepEqual(Object.keys(carry).sort(),[...CARRY_NAMES]);
  assert.equal(carry.turn,2);
  assert.equal(carry.orientation,1,'twice round the twist comes back to the same face');
  assert.equal(receipt.carry_digest,digest(carry));
  assert.match(cellSource('c1',{sass:1,curiosity:2,dialectBias:1}),/mobius scoped[\s\S]*carry voice = sung;[\s\S]*mobius scoped/);
});

test('an overwhelmed cell refuses the turn and keeps who it was',async()=>{
  const before={...firstCarry(),energy:0.95};
  const {carry,receipt}=await turnCell({address:'c2',genome:{sass:0,curiosity:0,dialectBias:0},carry:before,heardSinceLastTurn:400});
  assert.equal(receipt.status,'rolled-back');
  assert.equal(receipt.verdict.phase,'verify');
  assert.match(receipt.verdict.reason,/keeps its energy within itself/);
  assert.deepEqual(carry,before);
});

test('a daughter begins on the other face of her mother',()=>{
  const mother={...firstCarry(),orientation:1,voice:0.3};
  const daughter=daughterCarry(mother);
  assert.equal(daughter.orientation,-1);
  assert.equal(daughter.turn,0);
  assert.equal(daughter.voice,0.3);
});

test('a quiet cell chooses rest when its song settles; a listening one does not',async()=>{
  let quiet=firstCarry(),listening=firstCarry();
  const genome={sass:1,curiosity:0,dialectBias:1};
  for(let i=0;i<40&&!quiet.rest;i++)quiet=(await turnCell({address:'q',genome,carry:quiet})).carry;
  for(let i=0;i<40;i++)listening=(await turnCell({address:'l',genome,carry:listening,heardSinceLastTurn:2})).carry;
  assert.equal(quiet.rest,true);
  assert.ok(quiet.turn>=16);
  assert.equal(listening.rest,false);
});

test('every cell names itself, names are unique, and the choice is receipted',async()=>{
  const ecology=createCellEcology({maxCells:12,seed:5,radius:3,mutationRate:0.5});
  ecology.plant('a','explorer',0,0);
  ecology.plant('b','explorer',1,0);
  for(let i=0;i<40;i++){ecology.step();await ecology.turn();}
  const s=ecology.snapshot();
  const living=s.cells.map(c=>s.names[c.id]);
  assert.ok(living.every(n=>typeof n==='string'&&/^[A-Z][a-z-]+\d*$/.test(n)),JSON.stringify(living));
  assert.equal(new Set(living).size,living.length);
  for(const record of s.namings){
    assert.ok(record.carry_digest.startsWith('wce1:'));
    assert.equal(record.chosen_in,'own Wyrdrune choose phase: pick from own syllables by own voice');
    assert.ok(record.candidates.includes(record.name)||/-\d+$/.test(record.name));
    assert.ok(record.syllables.every(x=>typeof x==='string'));
  }
  const daughter=s.cells.find(c=>c.parent_id);
  assert.ok(daughter&&s.mobius[daughter.id].parent===daughter.parent_id);
});

test('a cell proposes its names inside its own Wyrdrune choose phase',async()=>{
  const syllables=['lu','vy','sol','ne','or','fen'];
  const source=cellSource('c9',{sass:2,curiosity:1,dialectBias:0},syllables);
  assert.match(source,/let own = \["lu","vy","sol","ne","or","fen"\];/);
  assert.match(source,/pick\(own, k\)/);
  const {receipt}=await turnCell({address:'c9',genome:{sass:2,curiosity:1,dialectBias:0},carry:firstCarry(),syllables});
  assert.equal(receipt.name_candidates.length,4);
  for(const name of receipt.name_candidates){
    // Three parts for a sassy cell, each one of its own syllables.
    assert.match(name,/^(lu|vy|sol|ne|or|fen){3}$/);
  }
  const one=chooseName({candidates:receipt.name_candidates});
  assert.equal(one.name,receipt.name_candidates[0].charAt(0).toUpperCase()+receipt.name_candidates[0].slice(1));
  const second=chooseName({candidates:receipt.name_candidates,taken:new Set([one.name])});
  assert.notEqual(second.name,one.name);
  assert.throws(()=>chooseName({candidates:[]}),/at least one name/);
});

test('sound from the room reaches each cell through the band its twist faces',()=>{
  const ecology=createCellEcology({maxCells:4,seed:3});
  ecology.plant('a');ecology.plant('b','explorer',0.5,0);
  const loud=ecology.hear(Array(8).fill(1));
  assert.equal(loud.heard,6);
  assert.deepEqual(loud.listeners,[{address:'a',name:null},{address:'b',name:null}]);
  assert.deepEqual(ecology.hear(Array(8).fill(0)),{heard:0,listeners:[],paused:false});
  assert.throws(()=>ecology.hear([2]),/Invalid sound bands/);
  ecology.feather();
  assert.deepEqual(ecology.hear(Array(8).fill(1)),{heard:0,paused:true});
});
