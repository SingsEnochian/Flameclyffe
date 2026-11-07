'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('../../apps/starwell-server/node_modules/express');
const { once } = require('node:events');
const { SCHEMA, SOURCES, readNoaaSnapshot, createWayglassNoaaRouter } =
  require('../../apps/starwell-server/wayglass/noaa-observer');

const clock = () => new Date('2026-11-07T07:10:00Z');
const data = {
  speed:[{time_tag:'2026-11-07T07:09:00Z',proton_speed:442}],
  field:[{time_tag:'2026-11-07T07:09:00Z',bt:12,bz_gsm:-3}],
  kp:[{time_tag:'2026-11-07T06:00:00',Kp:2.33}],
  xray:[{time_tag:'2026-11-07T07:09:00Z',energy:'0.05-0.4nm',flux:1e-8},
        {time_tag:'2026-11-07T07:09:00Z',energy:'0.1-0.8nm',flux:2e-7}],
};
const mock = async url => {
  const entry = Object.entries(SOURCES).find(([,value])=>value===url);
  assert.ok(entry,'only fixed NOAA sources allowed');
  return {ok:true,json:async()=>data[entry[0]]};
};

test('official NOAA sensor values remain source-bound and disjoint from model authority',async()=>{
  const p=await readNoaaSnapshot({fetchImpl:mock,now:clock});
  assert.equal(p.schema,SCHEMA);
  assert.equal(p.status,'ready');
  assert.equal(p.readings.length,5);
  assert.equal(p.readings.find(x=>x.metric_key==='solar_wind_speed_km_s').value,442);
  assert.equal(p.readings.find(x=>x.metric_key==='solar_wind_bz_gsm_nt').value,-3);
  assert.equal(p.readings.find(x=>x.metric_key==='goes_xray_flux_w_m2').value,2e-7);
  assert.ok(p.readings.every(x=>x.source_url.startsWith('https://services.swpc.noaa.gov/')));
  assert.equal(p.model_turn,false);
  assert.equal(p.canon_commit,false);
});

test('missing provider feed is explicit, never silently represented by synthetic data',async()=>{
  const packet=await readNoaaSnapshot({fetchImpl:async url=>{
    if(url===SOURCES.field)throw new Error('unavailable');
    return mock(url);
  },now:clock});
  assert.equal(packet.status,'partial');
  assert.equal(packet.readings.some(x=>x.metric_key==='solar_wind_bt_nt'),false);
  assert.equal(packet.sources.find(x=>x.source_key==='field').status,'unavailable');
});

test('stale observation is preserved but never labelled current',async()=>{
  const packet=await readNoaaSnapshot({fetchImpl:mock,now:()=>new Date('2026-11-07T12:10:00Z')});
  assert.equal(packet.status,'partial');
  assert.ok(packet.readings.some(x=>x.freshness==='stale'));
});

test('owner gate denies unauthorised requests before any NOAA network egress',async()=>{
  let calls=0;
  const app=express();
  app.use('/api/v1/wayglass/observer/noaa',createWayglassNoaaRouter({
    authorize:()=>false,fetchImpl:async url=>{calls++;return mock(url);},now:clock,
  }));
  const server=app.listen(0,'127.0.0.1');
  try {
    await once(server,'listening');
    const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/v1/wayglass/observer/noaa/live');
    assert.equal(response.status,401);
    assert.equal(calls,0);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
});
