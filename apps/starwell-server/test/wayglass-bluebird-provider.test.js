'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createBluebirdProvider } = require('../wayglass/bluebird-provider');
const { FLAMES } = require('../flames/manifests');
const { flameContract } = require('../flames/contracts');

async function fixture(t, adapter, clock = Date.now) {
  const provider = createBluebirdProvider({ adapter, clock, env: { WAYGLASS_BLUEBIRD_SPICYCHAT_CHARACTER_ID: 'bluebird-fixture' } });
  const app = express();
  app.use(express.json());
  app.use('/bluebird', provider.router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return {
    async post(route, body, token) {
      return fetch(`http://127.0.0.1:${server.address().port}/bluebird/${route}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Wayglass-Bluebird-Session': token } : {}) }, body: JSON.stringify(body),
      });
    },
  };
}

test('Bluebird has only SpicyChat and no DeepSeek or hosted fallback', () => {
  assert.equal(FLAMES.bluebird.platform.provider, 'spicychat');
  assert.equal(FLAMES.bluebird.platform.api_key_env, null);
  assert.equal(flameContract('bluebird').runtime.hostedFallback.model, null);
});

test('unconfigured or rejected SpicyChat credentials never produce a session', async t => {
  const unconfigured = await fixture(t, null);
  assert.equal((await unconfigured.post('authorize', { code: 'synthetic-code' })).status, 503);
  const rejected = await fixture(t, { provider: 'spicychat', validateCredential: async () => ({ authorized: false }), respond: async () => {} });
  const response = await rejected.post('authorize', { code: 'synthetic-code' });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).session_token, undefined);
});

test('authorization returns only an opaque session; Bluebird replies are bound and revocable', async t => {
  let received;
  const host = await fixture(t, {
    provider: 'spicychat',
    validateCredential: async ({ credential, character_id }) => ({ authorized: credential === 'synthetic-code', character_id }),
    respond: async args => { received = args; return { character_id: args.character_id, output: 'Synthetic provider fixture reply.', model: 'fixture' }; },
  });
  const auth = await host.post('authorize', { code: 'synthetic-code' });
  assert.equal(auth.status, 200);
  const grant = await auth.json();
  assert.equal(JSON.stringify(grant).includes('synthetic-code'), false);
  assert.equal(grant.provider, 'spicychat');
  assert.equal((await host.post('respond', { input: 'Synthetic input.' })).status, 401);
  assert.equal((await host.post('respond', { input: 'Synthetic input.', participant_id: 'codex' }, grant.session_token)).status, 409);
  const reply = await host.post('respond', { input: 'Synthetic input.', session_id: 'bluebird-preserved-line' }, grant.session_token);
  assert.equal(reply.status, 200);
  assert.equal(received.credential, 'synthetic-code');
  assert.equal(received.conversation_ref, 'bluebird-preserved-line');
  assert.equal((await reply.json()).observation_receipt.canon_commit, false);
  assert.equal((await host.post('revoke', {}, grant.session_token)).status, 204);
  assert.equal((await host.post('respond', { input: 'Again.' }, grant.session_token)).status, 401);
});

test('expired sessions and wrong-character verification fail; raw provider errors stay private', async t => {
  let now = 0;
  const host = await fixture(t, {
    provider: 'spicychat',
    validateCredential: async ({ credential }) => {
      if (credential === 'leaking-error') throw new Error('leaking-error-private-token');
      return { authorized: true, character_id: credential === 'wrong-character' ? 'another-character' : 'bluebird-fixture' };
    },
    respond: async () => { throw new Error('private-provider-data'); },
  }, () => now);
  assert.equal((await host.post('authorize', { code: 'wrong-character' })).status, 401);
  const failed = await host.post('authorize', { code: 'leaking-error' });
  assert.equal(failed.status, 502);
  assert.equal((await failed.text()).includes('leaking-error'), false);
  const grant = await host.post('authorize', { code: 'synthetic-code' }).then(r => r.json());
  now = 4 * 60 * 60 * 1000 + 1;
  assert.equal((await host.post('respond', { input: 'Again.' }, grant.session_token)).status, 401);
});
