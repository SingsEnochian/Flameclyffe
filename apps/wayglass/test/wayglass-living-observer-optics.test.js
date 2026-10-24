import test from 'node:test';
import assert from 'node:assert/strict';
import { OBSERVER_CHANNELS } from '../src/living-observer-model.js';
import { observerNodes, platePoint, nodeAtPoint, angularDelta, createObserverRotation, OBSERVER_PLATE_SIZE } from '../src/living-observer-optics.js';

const ids=OBSERVER_CHANNELS.map(([id])=>id);

test('canvas hit-testing targets actual visible channel nodes, not empty space',()=>{
  const nodes=observerNodes(ids);
  for(const node of nodes) assert.equal(nodeAtPoint(node,ids),node.id);
  assert.equal(nodeAtPoint({x:410,y:410},ids),null);
  assert.equal(nodeAtPoint({x:2,y:2},ids),null);
  assert.equal(nodeAtPoint({x:400,y:200},ids),null);
  assert.equal(nodeAtPoint(null,ids),null);
});
test('selection remains accurate with rotation and responsive CSS canvas scaling',()=>{
  const rotated=observerNodes(ids,Math.PI/4);
  assert.equal(nodeAtPoint(rotated[0],ids,Math.PI/4),ids[0]);
  assert.notEqual(nodeAtPoint(rotated[0],ids,0),ids[0]);
  assert.deepEqual(platePoint(100,150,{left:0,top:0,width:200,height:300}),{x:OBSERVER_PLATE_SIZE/2,y:OBSERVER_PLATE_SIZE/2});
  assert.equal(platePoint(0,0,{left:0,top:0,width:0,height:0}),null);
});
test('drag wraps angles and settles with damping, but low-stim stops inertia',()=>{
  const centre=OBSERVER_PLATE_SIZE/2;
  assert.ok(Math.abs(angularDelta({x:centre+100,y:centre},{x:centre,y:centre+100})-Math.PI/2)<1e-7);
  const rot=createObserverRotation();
  rot.drag(.2);
  assert.equal(rot.angle,.2);
  const later=rot.settle();
  assert.ok(later>.2);
  rot.settle({lowStim:true});
  assert.equal(rot.settle(),rot.angle);
  rot.drag(-1);
  assert.ok(rot.angle<later);
  rot.stop();
  assert.equal(rot.settle(),rot.angle);
});
