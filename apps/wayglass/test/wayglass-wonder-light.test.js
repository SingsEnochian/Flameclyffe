import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  WONDER_LIGHT_SCHEMA, createWonderLightEvent, publishWonderLight,
  readWonderLights, subscribeWonderLight, resetWonderLightsForTest,
  recordRouteAsWonderLight, recordCommonsAsWonderLight, wonderLightVisual, drawWonderLight,
} from '../src/wonder-light.js';

test.beforeEach(() => resetWonderLightsForTest());

test('light derives from explicit source/kind and refuses invented authority', () => {
  assert.throws(() => createWonderLightEvent({kind:'imagined-presence',source_ref:'a'}),/Unknown/);
  assert.throws(() => createWonderLightEvent({kind:'route-completed'}),/source reference/);
  assert.throws(() => createWonderLightEvent({kind:'return-verified',source_ref:'fake'}),/Unknown/);
  const route=createWonderLightEvent({kind:'route-completed',source_ref:'wayglass-route:ollama',event_id:'route:8:completed'});
  assert.equal(route.schema,WONDER_LIGHT_SCHEMA);
  assert.equal(route.verification_state,'transport-confirmed');
  assert.match(route.boundary,/answer not verified/i);
  assert.ok(Object.isFrozen(route));
});

test('same event and status deduplicate, new status remains a separate truthful event', () => {
  const seen=[];
  const stop=subscribeWonderLight(e=>seen.push(e.kind));
  recordCommonsAsWonderLight({stage:'pending',request_id:'req-1'});
  recordCommonsAsWonderLight({stage:'pending',request_id:'req-1'});
  recordCommonsAsWonderLight({stage:'accepted',request_id:'req-1'});
  stop();
  recordCommonsAsWonderLight({stage:'failed',request_id:'req-1'});
  assert.deepEqual(seen,['commons-pending','commons-accepted']);
  assert.equal(readWonderLights().length,3);
  assert.equal(readWonderLights()[0].verification_state,'failed');
  assert.equal(readWonderLights()[1].verification_state,'http-confirmed');
});

test('stored Commons state requires a genuine entry reference, not an HTTP response', () => {
  assert.equal(recordCommonsAsWonderLight({stage:'stored',request_id:'req'}),null);
  assert.throws(()=>createWonderLightEvent({kind:'commons-stored',source_ref:'commons-request:req'}),/persisted entry reference/);
  recordCommonsAsWonderLight({stage:'stored',entry_id:'entry-52'});
  assert.equal(readWonderLights()[0].source_ref,'commons-entry:entry-52');
  assert.equal(readWonderLights()[0].verification_state,'stored-receipt');
});

test('Commons read failure differs from message rejection and unknown state', () => {
  recordCommonsAsWonderLight({stage:'unavailable',request_id:'refresh-1'});
  recordCommonsAsWonderLight({stage:'failed',request_id:'send-1'});
  assert.equal(readWonderLights()[0].verification_state,'failed');
  assert.equal(readWonderLights()[1].verification_state,'unavailable');
  assert.equal(recordCommonsAsWonderLight({stage:'phantom',request_id:'x'}),null);
});

test('route transport completion cannot become canon or identity proof', () => {
  const result=recordRouteAsWonderLight({status:'completed',sequence:3,route_id:'ollama',receipt_time:'2026-10-08T20:00:00Z',text:'private',author:'Nocturne'});
  assert.equal(result.event_id,'route:3:completed');
  assert.equal(JSON.stringify(result).includes('private'),false);
  assert.equal(JSON.stringify(result).includes('Nocturne'),false);
  assert.equal(recordRouteAsWonderLight({status:'imagined',sequence:9}),null);
});

test('synthetic demo and continuity candidate remain visibly unverified', () => {
  const demo=publishWonderLight({kind:'synthetic-demo',source_ref:'tap:local'});
  const candidate=publishWonderLight({kind:'return-candidate',source_ref:'return:unreviewed'});
  assert.equal(demo.verification_state,'synthetic');
  assert.equal(candidate.verification_state,'unverified-continuity');
  assert.equal(wonderLightVisual(demo,200,false).dashed,true);
  assert.equal(wonderLightVisual(candidate,200,false).dashed,false);
});

test('low-stim and reduced-motion render deterministic zero-motion geometry', () => {
  const e=createWonderLightEvent({kind:'route-started',source_ref:'route:1'});
  const reduced=wonderLightVisual(e,999,true);
  const normal=wonderLightVisual(e,999,false);
  assert.equal(reduced.phase,.5);
  assert.ok(normal.phase>0);
  const output=[];
  const ctx={
    save(){output.push('save');},restore(){output.push('restore');},
    beginPath(){},setLineDash(){},
    arc(x,y,r){output.push(['arc',x,y,r]);},stroke(){output.push('stroke');},
  };
  drawWonderLight(ctx,e,1200,{reducedMotion:true,lowStim:true});
  assert.deepEqual(output[1],['arc',410,410,338]);
  assert.ok(output.includes('stroke'));
  assert.equal(output.at(-1),'restore');
});

test('retains bounded activity without collecting messages', () => {
  for(let i=0;i<32;i++)recordCommonsAsWonderLight({stage:'pending',request_id:'r-'+i});
  assert.equal(readWonderLights().length,12);
  assert.equal(readWonderLights()[0].source_ref,'commons-request:r-31');
  assert.equal(readWonderLights()[11].source_ref,'commons-request:r-20');
});

test('wiring connects real route and Commons lifecycle; Feather does not enable haptics', () => {
  const src=new URL('../src/',import.meta.url);
  const main=readFileSync(new URL('main.js',src),'utf8');
  const observer=readFileSync(new URL('surfaces/living-observer.js',src),'utf8');
  const commons=readFileSync(new URL('surfaces/commons.js',src),'utf8');
  assert.match(main,/subscribeWayglassObserver\(recordRouteAsWonderLight\)/);
  assert.match(main,/wayglass:commons/);
  assert.match(observer,/data-observer-haptics aria-pressed="false"/);
  assert.match(observer,/data-observer-feather/);
  assert.match(observer,/if\(haptics&&!paused&&!lowStim&&!reduced/);
  assert.match(commons,/recordCommonsAsWonderLight\(\{ stage: 'pending'/);
  assert.match(commons,/recordCommonsAsWonderLight\(\{ stage: 'failed'/);
});
