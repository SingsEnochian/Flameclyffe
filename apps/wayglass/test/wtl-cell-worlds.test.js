import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createCellEcology} from '../src/wtl-cell-ecology.js';
import {turnWorld,foundingCarry,worldSource,WORLD_CARRY,TEXTURES} from '../src/wtl-cell-worlds.js';

const require=createRequire(import.meta.url);
const {digest}=require('../../../lib/wyrdrune/canonical.cjs');
const a={address:'c1',name:'Solsol',voice:0.1487,syllables:['sol','lu','vy']};
const b={address:'c2',name:'Elor',voice:0.1601,syllables:['el','or','ra']};

async function grow(cycles){
  const e=createCellEcology({maxCells:24,seed:11,radius:3,mutationRate:0.8});
  e.plant('a','explorer',0,0);e.plant('b','explorer',1,0);
  for(let i=0;i<cycles;i++){e.step();await e.turn();}
  return e;
}

test('a world is a two-faced scoped Möbius written from its two founders',async()=>{
  const source=worldSource([a,b]);
  assert.match(source,/world of Solsol & Elor/);
  assert.match(source,/operator drift\(h, d\) = mod\(h \+ d, 360\);/);
  assert.equal((source.match(/mobius scoped/g)||[]).length,2);
  const {carry,receipt}=await turnWorld({founders:[a,b],carry:foundingCarry(a,b),members:2});
  assert.equal(receipt.status,'committed');
  assert.deepEqual(receipt.faces,['outer','inner']);
  assert.deepEqual(Object.keys(carry).sort(),[...WORLD_CARRY]);
  assert.equal(receipt.carry_digest,digest(carry));
  assert.ok(TEXTURES.includes(receipt.texture));
  assert.ok(receipt.name_parts.every(part=>[...a.syllables,...b.syllables].includes(part)),'named from its founders\' syllables');
  assert.ok(carry.hue>=0&&carry.hue<360,'hue wraps round');
});

test('a touch changes the world: its note lifts and wraps, its texture can turn',async()=>{
  const start=foundingCarry(a,b);
  const quiet=await turnWorld({founders:[a,b],carry:start,members:2});
  const touched=await turnWorld({founders:[a,b],carry:start,members:2,touches:3});
  assert.equal(quiet.carry.pulse,start.pulse);
  assert.notEqual(touched.carry.pulse,start.pulse);
  assert.ok(touched.carry.pulse>=110&&touched.carry.pulse<770);
  assert.equal(touched.carry.texture,(start.texture+1)%TEXTURES.length);
  assert.ok(touched.carry.breadth>quiet.carry.breadth);
});

test('a world past its sky refuses the turn and keeps itself',async()=>{
  const swollen={...foundingCarry(a,b),breadth:3.6};
  const {carry,receipt}=await turnWorld({founders:[a,b],carry:swollen,members:8,touches:40});
  assert.equal(receipt.status,'rolled-back');
  assert.match(receipt.verdict.reason,/keeps within its sky/);
  assert.equal(carry.breadth,3.6);
  assert.equal(carry.hue,swollen.hue);
});

test('babies found named worlds, live in one at a time, and empty quiet worlds rest remembered',async()=>{
  const e=await grow(320);
  const s=e.snapshot();
  assert.ok(s.worlds.length>0&&s.worlds.length<=6);
  for(const w of s.worlds){
    assert.ok(w.name&&/^[A-Z]/.test(w.name));
    assert.equal(w.founders.length,2);
    assert.ok(w.carry_digest.startsWith('wce1:'));
  }
  const homes=s.worlds.flatMap(w=>w.members);
  assert.equal(new Set(homes).size,homes.length,'a cell lives in at most one world');
  assert.ok(s.rememberedWorlds.every(w=>w.status==='remembered'&&w.carry.quiet>=6));
  assert.ok(s.worldReceipts.length>0);
});

test('a person\'s touch reaches everyone living in the world; Feather stops touches and world turns',async()=>{
  const e=await grow(60);
  const world=e.snapshot().worlds.find(w=>w.members.length>0);
  assert.ok(world);
  const before=world.members.map(id=>e.snapshot().mobius[id].heard_since_turn);
  const result=e.touchWorld(world.id,{strength:2});
  assert.equal(result.touched,true);
  const after=world.members.map(id=>e.snapshot().mobius[id].heard_since_turn);
  after.forEach((n,i)=>assert.equal(n,before[i]+4));
  assert.throws(()=>e.touchWorld(world.id,{strength:9}),/Invalid touch/);
  assert.throws(()=>e.touchWorld('w999'),/Unknown world/);
  e.feather();
  assert.deepEqual(e.touchWorld(world.id),{touched:false,paused:true});
  const receipts=e.snapshot().worldReceipts.length;
  e.step();const turned=await e.turn();
  assert.equal(turned.paused,true);
  assert.equal(e.snapshot().worldReceipts.length,receipts);
});
