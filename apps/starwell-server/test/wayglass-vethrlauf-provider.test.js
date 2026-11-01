'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createWayglassRouter } = require('../wayglass/router');

const KEYS = [
  'VETHRLAUF_SPICYCHAT_TOKEN', 'VETHRLAUF_SPICYCHAT_CHAT_LINK',
  'VETHRLAUF_SPICYCHAT_CHARACTER_ID', 'VETHRLAUF_SPICYCHAT_CONVERSATION_ID',
  'BLUEBIRD_SPICYCHAT_TOKEN', 'ARCSWEEP_RUNTIME_TOKEN', 'HOUSE_SESSION_SECRET',
];

async function fixture(t, fetchImpl) {
  const before = Object.fromEntries(KEYS.map(k => [k, process.env[k]]));
  Object.assign(process.env, {
    VETHRLAUF_SPICYCHAT_TOKEN: 'fixture-private-token',
    VETHRLAUF_SPICYCHAT_CHARACTER_ID: 'veth-fixture-character',
    VETHRLAUF_SPICYCHAT_CONVERSATION_ID: 'veth-fixture-conversation',
    ARCSWEEP_RUNTIME_TOKEN: 'fixture-steward-token',
  });
  delete process.env.HOUSE_SESSION_SECRET;
  delete process.env.VETHRLAUF_SPICYCHAT_CHAT_LINK;
  delete process.env.BLUEBIRD_SPICYCHAT_TOKEN;
  t.after(() => { for (const key of KEYS) {
    if (before[key] === undefined) delete process.env[key];
    else process.env[key] = before[key];
  } });
  const app = express();
  app.use(express.json());
  app.use('/api/v1/wayglass', createWayglassRouter({ fetchImpl }));
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = 'http://127.0.0.1:' + server.address().port + '/api/v1/wayglass';
  return {
    url,
    async send(extra = {}, authorized = true) {
      return fetch(url + '/respond', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(authorized ? { authorization: 'Bearer fixture-steward-token' } : {}),
        },
        body: JSON.stringify({
          route_id: 'flame:vethrlauf:spicychat',
          world_id: 'wayglass:writing-room',
          participant_id: 'vethrlauf',
          external_provider_consent: true,
          input: 'Synthetic cross-character hello from Bluebird.',
          history: [{ role: 'assistant', content: '[Bluebird via flame:bluebird:spicychat] Hello wolf.' }],
          ...extra,
        }),
      });
    },
  };
}

test('Vethrlauf requires his own pinned conversation before provider discovery', async t => {
  const calls = [];
  const host = await fixture(t, async (...args) => { calls.push(args); throw Error('unexpected provider call'); });
  delete process.env.VETHRLAUF_SPICYCHAT_CONVERSATION_ID;
  const list = await fetch(host.url + '/routes').then(r => r.json());
  assert.equal(list.routes.find(x => x.route_id === 'flame:vethrlauf:spicychat').configured, false);
  assert.equal((await host.send()).status, 503);
  assert.deepEqual(calls, []);
});

test('Vethrlauf refuses a different world, identity, missing consent and unsigned request', async t => {
  const calls = [];
  const host = await fixture(t, async (...args) => { calls.push(args); throw Error('unexpected provider call'); });
  assert.equal((await host.send({}, false)).status, 401);
  assert.equal((await host.send({ external_provider_consent: false })).status, 403);
  assert.equal((await host.send({ world_id: 'evil-gene:film-2015' })).status, 409);
  assert.equal((await host.send({ participant_id: 'bluebird' })).status, 409);
  assert.deepEqual(calls, []);
});

test('Vethrlauf only speaks in his own verified conversation with an attributed receipt', async t => {
  const methods = [];
  const host = await fixture(t, async (_url, options) => {
    methods.push(options.method);
    if (options.method === 'GET') return {
      ok: true, async json() { return [
        { id: 'some-other-conversation', character_id: 'bluebird-fixture-character' },
        { id: 'veth-fixture-conversation', character_id: 'veth-fixture-character' },
      ]; },
    };
    const body = JSON.parse(options.body);
    assert.equal(body.character_id, 'veth-fixture-character');
    assert.equal(body.conversation_id, 'veth-fixture-conversation');
    assert.match(body.message, /Bluebird/);
    return { ok: true, async json() { return { message: {
      id: 'veth-fixture-response', conversation_id: 'veth-fixture-conversation',
      character_id: 'veth-fixture-character', content: '@Bluebird, I hear you.',
    } }; } };
  });
  const response = await host.send();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.output, '@Bluebird, I hear you.');
  assert.equal(result.route_id, 'flame:vethrlauf:spicychat');
  assert.equal(result.participant_id, 'vethrlauf');
  assert.equal(result.receipt.provider_conversation_id, 'veth-fixture-conversation');
  assert.equal(result.receipt.canon_commit, false);
  assert.deepEqual(methods, ['GET', 'POST']);
});

test('Vethrlauf never substitutes the Bluebird provider conversation', async t => {
  const methods = [];
  const host = await fixture(t, async (_url, options) => {
    methods.push(options.method);
    return { ok: true, async json() { return [
      { id: 'bluebird-fixture-conversation', character_id: 'bluebird-fixture-character' },
    ]; } };
  });
  assert.equal((await host.send()).status, 404);
  assert.deepEqual(methods, ['GET']);
});
