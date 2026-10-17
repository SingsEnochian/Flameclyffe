'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createHouseSessionRouter } = require('../wayglass/house-session');

async function host(t, environment) {
  const app = express();app.use(express.json());
  app.use('/api/v1/house/session',createHouseSessionRouter({environment}));
  const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/api/v1/house/session`;
}
test('local House login verifies a configured credential and a signed cookie, never a seat label',async t=>{
  const url=await host(t,{ARCSWEEP_RUNTIME_TOKEN:'synthetic-private-house-test-key'});
  assert.equal((await fetch(url)).status,401);
  const wrong=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({credential:'provider-or-crew-token',role:'steward'})});
  assert.equal(wrong.status,401);assert.equal(wrong.headers.get('set-cookie'),null);
  const login=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({credential:'synthetic-private-house-test-key'})});
  assert.equal(login.status,201);assert.equal((await login.json()).role,'steward');
  const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);
  const resumed=await fetch(url,{headers:{cookie:cookie.split(';')[0]}});
  assert.equal(resumed.status,200);assert.equal((await resumed.json()).connected,true);
  assert.equal((await fetch(url,{headers:{cookie:'hearthgate_session=forged'}})).status,401);
  const logout=await fetch(url,{method:'DELETE'});assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
});
test('unconfigured local House cannot silently grant a Steward session',async t=>{
  const url=await host(t,{});
  for(const method of ['GET','POST']){
    const response=await fetch(url,{method,headers:{'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify({credential:'anything'})}:{})});
    assert.equal(response.status,503);assert.equal(response.headers.get('set-cookie'),null);assert.match((await response.json()).error,/ARCSWEEP_RUNTIME_TOKEN/);
  }
});
test('local sign-in attempts are bounded before credentials are verified',async t=>{
  const url=await host(t,{ARCSWEEP_RUNTIME_TOKEN:'synthetic-private-house-test-key'});
  for(let i=0;i<10;i++)assert.equal((await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:'{"credential":"wrong"}'})).status,401);
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:'{"credential":"wrong"}'});
  assert.equal(response.status,429);assert.ok(response.headers.get('retry-after'));
});
