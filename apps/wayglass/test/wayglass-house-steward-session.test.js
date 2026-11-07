import test from 'node:test';
import assert from 'node:assert/strict';
import { signInHouseSteward, checkHouseSteward } from '../src/house-steward-session.js';

test('House sign-in uses the existing host contract with same-origin cookies and no storage', async () => {
  let request;
  const result = await signInHouseSteward('private-test-credential', async (...args) => {
    request = args;
    return { ok:true, json:async()=>({connected:true,role:'steward'}) };
  });
  assert.deepEqual(result,{connected:true,role:'steward'});
  assert.equal(request[0],'/api/v1/house/session');
  assert.equal(request[1].method,'POST');
  assert.equal(request[1].credentials,'same-origin');
  assert.equal(request[1].cache,'no-store');
  assert.deepEqual(JSON.parse(request[1].body),{credential:'private-test-credential'});
  assert.equal(JSON.stringify(result).includes('private-test-credential'),false);
});

test('House refusal does not become a connected session', async () => {
  await assert.rejects(signInHouseSteward('', async()=>{throw new Error('should not dispatch')}),/Enter/);
  await assert.rejects(signInHouseSteward('wrong',async()=>({
    ok:false,json:async()=>({connected:false,error:'Steward identity refused.'})
  })),/Steward identity refused/);
  await assert.rejects(signInHouseSteward('wrong',async()=>({
    ok:true,json:async()=>({connected:false,role:'steward'})
  })),/authorization failed/);
});

test('House status checks only verified status, never a caller-provided role', async () => {
  assert.equal(await checkHouseSteward(async()=>({ok:true,json:async()=>({connected:true,role:'steward'})})),true);
  assert.equal(await checkHouseSteward(async()=>({ok:false,json:async()=>({connected:false,role:'steward'})})),false);
  assert.equal(await checkHouseSteward(async()=>({ok:true,json:async()=>({connected:true,role:'visitor'})})),false);
});
