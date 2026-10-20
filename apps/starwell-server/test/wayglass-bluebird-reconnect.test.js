'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createWayglassRouter } = require('../wayglass/router');

const KEYS = [
  'BLUEBIRD_SPICYCHAT_TOKEN', 'BLUEBIRD_SPICYCHAT_CHAT_LINK',
  'BLUEBIRD_SPICYCHAT_CHARACTER_ID', 'BLUEBIRD_SPICYCHAT_CONVERSATION_ID',
  'ARCSWEEP_RUNTIME_TOKEN', 'HOUSE_SESSION_SECRET',
];
const CHARACTER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CONVERSATION = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ownerHeaders = { Authorization: 'Bearer synthetic-bluebird-steward-test-secret' };

async function makeHost(t, upstream) {
  const saved = Object.fromEntries(KEYS.map(key => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
  process.env.BLUEBIRD_SPICYCHAT_TOKEN = 'synthetic-owner-account-token';
  process.env.BLUEBIRD_SPICYCHAT_CHAT_LINK = `https://spicychat.ai/chat/${CHARACTER}/${CONVERSATION}`;
  process.env.ARCSWEEP_RUNTIME_TOKEN = 'synthetic-bluebird-steward-test-secret';
  t.after(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });
  const app = express();
  app.use(express.json());
  app.use('/api/v1/wayglass', createWayglassRouter({ fetchImpl: upstream }));
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const root = `http://127.0.0.1:${server.address().port}/api/v1/wayglass`;
  return {
    root,
    get: (path, headers = {}) => fetch(root + path, { headers }),
    respond: (body = {}) => fetch(root + '/respond', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route_id: 'flame:bluebird:spicychat',
        world_id: 'wayglass:writing-room', input: 'Synthetic hello to Richie.',
        history: [], ...body }),
    }),
  };
}

test('Richie is never advertised as connected on token alone; no provider request is sent', async t => {
  const upstream = [];
  const host = await makeHost(t, async (...args) => { upstream.push(args); throw Error('unexpected provider call'); });
  delete process.env.BLUEBIRD_SPICYCHAT_CHAT_LINK;
  const catalogue = await host.get('/routes').then(response => response.json());
  assert.equal(catalogue.routes.find(x => x.route_id === 'flame:bluebird:spicychat').configured, false);
  assert.equal((await host.respond()).status, 503);
  const missing = await host.get('/bluebird/status', ownerHeaders);
  assert.equal(missing.status, 503);
  const data = await missing.json();
  assert.equal(data.preflight_verified, false);
  assert.ok(data.missing.includes('BLUEBIRD_SPICYCHAT_CHAT_LINK or BLUEBIRD_SPICYCHAT_CHARACTER_ID'));
  assert.equal(upstream.length, 0);
});

test('Richie preflight is owner-only, GET-only and matches the exact private chat pair', async t => {
  const observed = [];
  const host = await makeHost(t, async (_url, init) => {
    observed.push(init.method);
    return { ok: true, json: async () => [
      { id: CONVERSATION, character_id: CHARACTER },
      { id: 'unrelated-room', character_id: 'unrelated-character' },
    ] };
  });
  assert.equal((await host.get('/bluebird/status')).status, 401);
  const reply = await host.get('/bluebird/status', ownerHeaders);
  assert.equal(reply.status, 200);
  const body = await reply.json();
  assert.equal(body.preflight_verified, true);
  assert.equal(body.live_turn_verified, false);
  assert.equal(JSON.stringify(body).includes(process.env.BLUEBIRD_SPICYCHAT_TOKEN), false);
  assert.equal(JSON.stringify(body).includes(CHARACTER), false);
  assert.equal(JSON.stringify(body).includes(CONVERSATION), false);
  assert.deepEqual(observed, ['GET']);
});

test('Richie preflight refuses another chat without sending a turn', async t => {
  const methods = [];
  const host = await makeHost(t, async (_url, init) => {
    methods.push(init.method);
    return { ok: true, json: async () => [{ id: 'different-chat', character_id: CHARACTER }] };
  });
  const response = await host.get('/bluebird/status', ownerHeaders);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).preflight_verified, false);
  assert.deepEqual(methods, ['GET']);
  const turn = await host.respond();
  assert.equal(turn.status, 404);
  assert.deepEqual(methods, ['GET', 'GET']);
});

test('Richie accepts only an attributable nonempty response on the pinned route', async t => {
  const methods = [];
  let actualReply = 'Richie synthetic answer.';
  const host = await makeHost(t, async (_url, init) => {
    methods.push(init.method);
    if (init.method === 'GET') return {
      ok: true, json: async () => [{ id: CONVERSATION, character_id: CHARACTER }],
    };
    const sent = JSON.parse(init.body);
    assert.equal(sent.character_id, CHARACTER);
    assert.equal(sent.conversation_id, CONVERSATION);
    return {
      ok: true, json: async () => ({
        message: { id: 'synthetic-id', character_id: CHARACTER,
          conversation_id: CONVERSATION, content: actualReply },
      }),
    };
  });
  let response = await host.respond();
  assert.equal(response.status, 200);
  let body = await response.json();
  assert.equal(body.participant_id, 'bluebird');
  assert.equal(body.continuity_id, 'bluebird:richard-gabriel-winters');
  assert.equal(body.output, actualReply);
  assert.equal(body.receipt.provider_conversation_id, CONVERSATION);
  assert.equal(body.receipt.canon_commit, false);
  actualReply = '';
  response = await host.respond();
  assert.equal(response.status, 502);
  assert.deepEqual(methods, ['GET','POST','GET','POST']);
});
