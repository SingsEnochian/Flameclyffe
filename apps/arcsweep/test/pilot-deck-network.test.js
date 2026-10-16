import assert from 'node:assert/strict';
import test from 'node:test';
import {fetchPilotJSON} from '../pilot-deck/pilot-deck-network.js';

test('pilot deadline releases callers when headers never arrive, even if abort is ignored',async t=>{
  let signal;
  t.mock.method(globalThis,'fetch',async(_url,options)=>{signal=options.signal;return new Promise(()=>{});});
  await assert.rejects(fetchPilotJSON('/test',{},15),{name:'TimeoutError'});
  assert.equal(signal.aborted,true);
});
test('pilot deadline includes a response body that never finishes',async t=>{
  let signal;
  t.mock.method(globalThis,'fetch',async(_url,options)=>{
    signal=options.signal;
    return {ok:true,json:()=>new Promise(()=>{})};
  });
  await assert.rejects(fetchPilotJSON('/test',{},15),{name:'TimeoutError'});
  assert.equal(signal.aborted,true);
});
test('pilot can retry after timeout and preserves host error responses',async t=>{
  t.mock.method(globalThis,'fetch',async()=>new Promise(()=>{}));
  await assert.rejects(fetchPilotJSON('/test',{},15),{name:'TimeoutError'});
  globalThis.fetch.mock.mockImplementation(async()=>new Response(JSON.stringify({error:'Configure House sign-in'}),{status:503}));
  const {response,data}=await fetchPilotJSON('/test',{},1000);
  assert.equal(response.status,503);
  assert.equal(data.error,'Configure House sign-in');
});
test('non-JSON host fallback remains inspectable and network errors propagate',async t=>{
  t.mock.method(globalThis,'fetch',async()=>new Response('<html>Old host</html>'));
  assert.deepEqual((await fetchPilotJSON('/test')).data,{});
  globalThis.fetch.mock.mockImplementation(async()=>{throw new TypeError('Failed to fetch');});
  await assert.rejects(fetchPilotJSON('/test'),/Failed to fetch/);
});
