'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {linkedMobius,point}=require('./wayglass-linked-mobius-motion.cjs');
const sha='a'.repeat(40);
test('linked moving Möbius engines retain eight canonical lanes and one Withness',()=>{
 const a=linkedMobius({sourceSha:sha,speed:.2}),b=linkedMobius({sourceSha:sha,speed:.2,step:1,previous:a});
 assert.equal(b.engines.length,2);
 assert.equal(b.engines.flatMap(e=>e.lanes).length,8);
 assert.equal(b.link.shared_center,'withness');
 assert.equal(b.parent_hash,a.motion_hash);
 assert.notDeepEqual(a.engines[0].lanes[0].coordinate,b.engines[0].lanes[0].coordinate);
});
test('Möbius half-turn changes strip side; complete double traversal restores it',()=>{
 const p=point(.3,.5),flipped=point(.3+2*Math.PI,-.5),restored=point(.3+4*Math.PI,.5);
 for(const axis of ['x','y','z']){
  assert.ok(Math.abs(p[axis]-flipped[axis])<1e-10);
  assert.ok(Math.abs(p[axis]-restored[axis])<1e-10);
 }
});
test('Feather and invalid ancestral hashes stop progression',()=>{
 const a=linkedMobius({sourceSha:sha});
 assert.throws(()=>linkedMobius({sourceSha:sha,step:1,previous:a,feather:true}),/Feather/);
 assert.throws(()=>linkedMobius({sourceSha:sha,step:1,previous:{...a,theta:99}}),/ancestry/);
});

test('changing engine speed integrates motion without jumping to absolute step times speed',()=>{
 const a=linkedMobius({sourceSha:sha,phase:1.1,speed:.2});
 const b=linkedMobius({sourceSha:sha,step:1,previous:a,speed:.4});
 const c=linkedMobius({sourceSha:sha,step:2,previous:b,speed:.1});
 assert.ok(Math.abs(a.theta-1.1)<1e-12);
 assert.ok(Math.abs(b.theta-1.5)<1e-12);
 assert.ok(Math.abs(c.theta-1.6)<1e-12);
 assert.throws(()=>linkedMobius({sourceSha:sha,step:3,previous:c,phase:1}),/initial-only/);
});
