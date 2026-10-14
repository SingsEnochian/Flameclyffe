import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LivingShipEcology,SHIP_ECOLOGY_SCHEMA,MAX_ENTITIES,CELL_COLUMNS,CELL_ROWS} from '../ship-visualiser/ship-ecology.js';
import {makeSensorySignal} from '../ship-ui/ship-sensory-spine.js';

const clock=1781360000000;
const instance='instrument-20261013-abcdefgh';
const make=(kind='note-on',frequencyHz=440,id='input-20261013-abcdef123456')=>
 makeSensorySignal({kind,worldId:'luna',mode:'chromatic',frequencyHz,velocity:100},
  {now:clock,sourceInstance:instance,eventId:id});
const content=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('one seeded visual organism model is replayable locally without pretending to be a crew identity',()=>{
 const a=new LivingShipEcology({seed:34567});
 const b=new LivingShipEcology({seed:34567});
 assert.deepEqual(a.snapshot(),b.snapshot());
 assert.equal(a.snapshot().schema,SHIP_ECOLOGY_SCHEMA);
 assert.equal(a.snapshot().field.length,CELL_COLUMNS*CELL_ROWS);
 assert.equal(a.snapshot().entities.length,MAX_ENTITIES);
 a.step(12);b.step(12);
 assert.deepEqual(a.snapshot(),b.snapshot());
 assert.equal(a.snapshot().identity_attested,false);
 assert.equal(a.snapshot().flight_authority,false);
 assert.equal(a.snapshot().canonical_receipt,false);
 assert.notDeepEqual(new LivingShipEcology({seed:8}).snapshot().entities,a.snapshot().entities);
});
test('sound is accepted as local sensory observation and genuinely changes environmental history',()=>{
 const m=new LivingShipEcology({seed:123});
 const pre=m.snapshot();
 const note=make();
 assert.equal(m.observe(note,{now:clock}),true);
 assert.equal(m.observe(note,{now:clock}),false,'same event may not be replayed');
 assert.equal(m.snapshot().world_id,'luna');
 assert.ok(m.snapshot().field.some((x,i)=>x>pre.field[i]));
 assert.ok(m.snapshot().excitation>0);
 m.step(3);
 const resumed=LivingShipEcology.restore(m.snapshot());
 assert.deepEqual(resumed.step(7),m.step(7),'local stop/restart continuation is exact under one JS runtime');
 assert.equal(resumed.observe(note,{now:clock}),false,'replay protection survives local stop/restart');
});
test('bonding creates durable local simulated memory rather than visual-only trails',()=>{
 const raw=new LivingShipEcology({seed:70}).snapshot();
 raw.entities[0]={...raw.entities[0],x:.5,y:.5,vx:0,vy:0,affinity:1};
 raw.entities[1]={...raw.entities[1],x:.52,y:.51,vx:0,vy:0,affinity:1};
 const eco=LivingShipEcology.restore(raw);
 const before=eco.snapshot();
 eco.step(1);
 assert.ok(eco.bonds.some(([a,b])=>a===0&&b===1));
 assert.ok(eco.entities[0].history>before.entities[0].history);
 assert.ok(eco.field.some(v=>v>0));
 const continued=LivingShipEcology.restore(eco.snapshot());
 assert.deepEqual(continued.snapshot().bonds,eco.snapshot().bonds);
});
test('Feather ends input excitation but does not erase historical context',()=>{
 const m=new LivingShipEcology({seed:123});
 m.observe(make(),{now:clock});
 const remembered=[...m.field];
 assert.equal(m.observe(make('feather',null,'feather-20261013-abcdef12'),{now:clock}),true);
 assert.equal(m.excitation,0);
 assert.deepEqual(m.field,remembered);
 assert.equal(m.observe({status:'live',admin:true},{now:clock}),false);
});
test('snapshot corruption and authority-laundering are rejected or ignored',()=>{
 const s=new LivingShipEcology({seed:12}).snapshot();
 const bads=[
  {...s,schema:'other'}, {...s,seed:-1}, {...s,rng:0},
  {...s,field:[-1,...s.field.slice(1)]}, {...s,field:[]},
  {...s,bonds:[[9,9]]}, {...s,seen:['x']},
  {...s,entities:[{...s.entities[0],x:40},...s.entities.slice(1)]},
 ];
 for(const input of bads)assert.throws(()=>LivingShipEcology.restore(input),TypeError);
 const fake={...s,identity_attested:true,flight_authority:true,canonical_receipt:true};
 const restored=LivingShipEcology.restore(fake).snapshot();
 assert.equal(restored.identity_attested,false);
 assert.equal(restored.flight_authority,false);
 assert.equal(restored.canonical_receipt,false);
 assert.throws(()=>new LivingShipEcology({seed:0}),TypeError);
 assert.throws(()=>new LivingShipEcology({seed:1}).step(999),RangeError);
});
test('the visualiser is the ship UI itself, not a separate decorative room',()=>{
 const pages=['../index.html','../pilot-deck/index.html','../code-loom/index.html','../harmonic-keyboard/index.html'];
 for(const page of pages){
  const html=content(page);
  assert.match(html,/wayglass-living-ship\.css/);
  assert.match(html,/wayglass-living-ship\.js/);
 }
 const render=content('../ship-ui/wayglass-living-ship.js');
 const css=content('../ship-ui/wayglass-living-ship.css');
 assert.match(render,/new LivingShipEcology/);
 assert.match(render,/spine\.subscribe/);
 assert.match(render,/aria-hidden/);
 assert.match(render,/Quiet visuals/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/forced-colors/);
 assert.match(css,/focus-visible/);
 assert.match(css,/wayglass-living-tissue/);
 assert.doesNotMatch(render,/AudioContext|\.noteOn\(|sendMidi\(|\.navigate\(/);
});
