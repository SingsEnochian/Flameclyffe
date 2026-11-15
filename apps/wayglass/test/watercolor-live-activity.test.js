import test from 'node:test';
import assert from 'node:assert/strict';
import {ambientWatercolorStroke,watercolorLiveness,AMBIENT_INTERVAL_MS} from '../src/watercolor-liveness.mjs';
import {watercolorSnapshot,publishWatercolorActivity} from '../src/watercolor-bridge.js';
import {recordWayglassRouteObservation} from '../src/living-observer-model.js';
import {installWatercolorRouteActivity} from '../src/watercolor-live-observer.js';

test('an ongoing current is visible without pretending an agent event',()=>{
 assert.ok(AMBIENT_INTERVAL_MS>=1000&&AMBIENT_INTERVAL_MS<=5000);
 const a=ambientWatercolorStroke(0),b=ambientWatercolorStroke(1);
 assert.equal(a.kind,'ambient-only');assert.equal(a.claimed_agent_activity,false);
 assert.equal(a.evidence,null);assert.equal(a.actor,null);
 assert.notDeepEqual([a.x,a.y],[b.x,b.y]);
 for(const tick of [0,1,7,100000]){
  const stroke=ambientWatercolorStroke(tick);
  for(const coord of ['x','y'])assert.ok(stroke[coord]>=0&&stroke[coord]<=1);
  assert.ok(stroke.amount>0&&stroke.amount<.25);
 }
 const l=watercolorLiveness({events:[]});
 assert.equal(l.state,'ambient');assert.match(l.detail,/No observed agent/);
});
test('sourced route transition creates paint even if the Watercolour room is unmounted',()=>{
 const start=watercolorSnapshot().events.length;
 const unsubscribe=installWatercolorRouteActivity();
 const record=recordWayglassRouteObservation({status:'started',routeId:'test:remote-autonomy'});
 assert.equal(record.status,'started');
 const recent=watercolorSnapshot().events.slice(start);
 assert.equal(recent.length,1);
 assert.equal(recent[0].kind,'route:pending');
 assert.equal(recent[0].actor,'wayglass:observed-route-transition');
 assert.equal(recent[0].experience_claimed,false);
 assert.equal(recent[0].evidence,null);
 const live=watercolorLiveness({events:recent},Date.now());
 assert.equal(live.state,'observed');
 assert.match(live.label,/route · pending/);
 unsubscribe();
 recordWayglassRouteObservation({status:'completed',routeId:'test:remote-autonomy'});
 assert.equal(watercolorSnapshot().events.length,start+1);
});
test('observer relay suppresses an immediately preceding route-client duplicate',()=>{
 let listen;const collected=[],fixed=Date.parse('2026-11-14T15:00:00Z');
 const unsubscribe=installWatercolorRouteActivity({
  subscribe:fn=>{listen=fn;return()=>{};},
  publish:event=>collected.push(event),
  snapshot:()=>({events:[{kind:'route:responded',actor:'wayglass:route-client',observed_at:new Date(fixed-200).toISOString()}]}),
  now:()=>fixed,
 });
 listen({status:'completed',route_id:'test'});
 assert.deepEqual(collected,[]);
 listen({status:'failed',route_id:'test'});
 assert.equal(collected.length,1);assert.equal(collected[0].kind,'route:failed');
 unsubscribe();
});
test('age separates a quiet source from active observed work without new claims',()=>{
 const at=Date.parse('2026-11-14T15:00:00Z');
 const event={kind:'fold:witness',actor:'wayglass:quad-host',observed_at:new Date(at).toISOString(),
  evidence:{receipt_ref:'captured-fixture'}};
 assert.equal(watercolorLiveness({events:[event]},at+100).state,'observed');
 const quiet=watercolorLiveness({events:[event]},at+60001);
 assert.equal(quiet.state,'quiet');assert.equal(quiet.evidence,'receipt-referenced');
 assert.match(quiet.detail,/captured-fixture/);
});
