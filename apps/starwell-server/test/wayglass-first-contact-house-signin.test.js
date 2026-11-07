'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { createHouseSessionRouter } = require('../wayglass/house-session');
const wayglass = require('../wayglass/router');

test('signed-in House session unlocks First Contact route discovery, not anonymous traffic', async () => {
  const saved = process.env.ARCSWEEP_RUNTIME_TOKEN;
  const credential = 'test-only-steward-' + 'c'.repeat(48);
  process.env.ARCSWEEP_RUNTIME_TOKEN = credential;
  const app = express();
  app.use(express.json());
  app.use('/api/v1/house/session', createHouseSessionRouter());
  app.use('/api/v1/wayglass', wayglass);
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server,'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    const denied = await fetch(base+'/wayglass/routes');
    assert.equal(denied.status,401);

    const failed = await fetch(base+'/house/session', {
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({credential:'invalid'})
    });
    assert.equal(failed.status,401);
    assert.equal(failed.headers.get('set-cookie'),null);

    const signed = await fetch(base+'/house/session', {
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({credential})
    });
    assert.equal(signed.status,201);
    assert.deepEqual(await signed.json(), { connected:true,role:'steward',mode:'credential' });
    const cookie = signed.headers.get('set-cookie')?.split(';')[0];
    assert.match(cookie, /^hearthgate_session=/);
    assert.equal(cookie.includes(credential),false,'credential must not be embedded in cookie');

    const session = await fetch(base+'/house/session',{headers:{cookie}});
    assert.equal(session.status,200);
    assert.equal((await session.json()).connected,true);

    const authorized = await fetch(base+'/wayglass/routes',{headers:{cookie}});
    assert.equal(authorized.status,200);
    assert.ok(Array.isArray((await authorized.json()).routes));

    const after = await fetch(base+'/wayglass/routes');
    assert.equal(after.status,401,'successful sign-in never grants access to a different caller');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
    if(saved===undefined)delete process.env.ARCSWEEP_RUNTIME_TOKEN;
    else process.env.ARCSWEEP_RUNTIME_TOKEN=saved;
  }
});