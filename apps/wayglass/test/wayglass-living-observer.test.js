import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  OBSERVATION_SCHEMA, OBSERVER_CHANNELS,
  createWayglassObservation, formatObservationForLLM,
  recordWayglassRouteObservation, subscribeWayglassObserver,
  readWayglassRouteObservation, queueObserverContextForWriting,
  consumeObserverContextForWriting,
} from '../src/living-observer-model.js';

const sample = overrides => createWayglassObservation({
  now:'2026-10-08T21:00:00.000Z',
  surface:'wayglass:living-observer',
  surfaces:['arcsweep:writing-room','wayglass:systems','wayglass:living-observer'],
  organs:['wayglass.organ.sensorium'],
  touches:3, reducedMotion:true, sound:false,
  route:null, ...overrides,
});

test('Direct readings remain independent of the labelled model projection',()=>{
  const packet=sample();
  assert.equal(packet.schema,OBSERVATION_SCHEMA);
  assert.equal(packet.direct.browser_time,'2026-10-08T21:00:00.000Z');
  assert.equal(packet.direct.prefers_reduced_motion,true);
  assert.equal(packet.direct.registered_organs.length,1);
  assert.equal(packet.direct.last_route,null);
  assert.match(packet.projection.note,/not measured minds/i);
  assert.equal(packet.transformation_receipt.math_spine,'local UI translation; not DEEP theoretical state inference');
  assert.equal(OBSERVER_CHANNELS.length,8);
  for(const value of Object.values(packet.projection.variables)) assert.ok(value>=0&&value<=1);
});
test('Projection responds to actual UI controls, not invented psychological readings',()=>{
  const quiet=sample({touches:0,sound:false,focus:'time'});
  const busy=sample({touches:8,sound:true,focus:'touch'});
  assert.ok(busy.projection.variables.R>quiet.projection.variables.R);
  assert.ok(busy.projection.variables.M>quiet.projection.variables.M);
  assert.ok(busy.projection.variables.A>quiet.projection.variables.A);
  assert.equal(quiet.direct.last_route,null);
});
test('Route sample keeps evidence metadata, not private model/user text or untrusted declarations',()=>{
  const events=[];
  const unsubscribe=subscribeWayglassObserver(route=>events.push(route.status));
  const result=recordWayglassRouteObservation({
    status:'completed',routeId:'local:ollama',provider:'ollama',model:'ornith',
    receipt:{completed_at:'2026-10-08T21:01:00Z',epistemic_register:'external-observation',output:'SECRET'},
  });
  unsubscribe();
  assert.equal(result.provider,'ollama');
  assert.equal(result.receipt_time,'2026-10-08T21:01:00Z');
  assert.equal(JSON.stringify(result).includes('SECRET'),false);
  assert.deepEqual(events,['completed']);
  assert.equal(readWayglassRouteObservation().sequence,result.sequence);
  assert.throws(()=>recordWayglassRouteObservation({status:'approved-canon'}),/completed or failed/);
});
test('LLM observation uses deliberate single-consumption handoff; no hidden auto-submit',()=>{
  const packet=sample({route:null});
  assert.throws(()=>formatObservationForLLM({schema:'wrong'}),/Invalid/);
  queueObserverContextForWriting(packet);
  const message=consumeObserverContextForWriting();
  assert.match(message,/explicitly shared by the user/);
  assert.match(message,/not a measurement of identity/);
  assert.equal(consumeObserverContextForWriting(),null);
});
test('Wiring includes registered room and user-mediated LLM composer route',()=>{
  const base=new URL('../src/',import.meta.url);
  const main=readFileSync(new URL('main.js',base),'utf8');
  const writing=readFileSync(new URL('surfaces/arcsweep-writing.js',base),'utf8');
  const donors=readFileSync(new URL('organ-donors.js',base),'utf8');
  assert.match(main,/wayglass:living-observer/);
  assert.match(writing,/consumeObserverContextForWriting/);
  assert.match(writing,/recordWayglassRouteObservation/);
  assert.match(donors,/wayglass\.organ\.living-observer/);
});
