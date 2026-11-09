import test from 'node:test';
import assert from 'node:assert/strict';
import {probeLocalSoundscape} from '../../../scripts/wayglass-local.mjs';

function makeFetch({ui='current',host='current'}={}) {
  return async (url, options={})=>{
    if(String(url).includes('5186')){
      if(ui==='offline')throw new Error('offline');
      return {ok:true,status:200,text:async()=>ui==='current'
        ? 'const x="wc-score-compose wc-score-play";':'const x="old-wayglass";'};
    }
    assert.equal(options.method,'POST');
    assert.equal(options.body,'{}');
    if(host==='offline')throw new Error('offline');
    if(host==='current')return {status:401,text:async()=>'{"error":"House Steward sign-in required to score the writing room."}'};
    if(host==='stale')return {status:404,text:async()=>'Not found'};
    return {status:401,text:async()=>'{"error":"Generic proxy authorization"}'};
  };
}
test('soundscape preflight recognises current running browser and protected host without authenticating',async()=>{
  assert.deepEqual(await probeLocalSoundscape({fetchImpl:makeFetch()}),{frontend:'current',host:'current'});
});
test('soundscape preflight distinguishes stale and generic-auth hosts from verified scoring route',async()=>{
  assert.deepEqual(await probeLocalSoundscape({fetchImpl:makeFetch({ui:'stale',host:'stale'})}),
    {frontend:'stale-or-not-vite',host:'stale-or-missing-route'});
  assert.deepEqual(await probeLocalSoundscape({fetchImpl:makeFetch({ui:'offline',host:'generic'})}),
    {frontend:'offline',host:'unverified'});
});
test('soundscape preflight handles both services offline without throwing or sending user text',async()=>{
  assert.deepEqual(await probeLocalSoundscape({fetchImpl:makeFetch({ui:'offline',host:'offline'})}),
    {frontend:'offline',host:'offline'});
});
