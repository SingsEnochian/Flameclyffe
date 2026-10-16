'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createWayglassRouter } = require('../wayglass/router');

const ENV_KEYS = [
  'GRIFF_SPICYCHAT_TOKEN', 'GRIFF_SPICYCHAT_CHARACTER_ID',
  'GRIFF_SPICYCHAT_CONVERSATION_ID', 'GRIFF_SPICYCHAT_MODEL',
  'GRIFF_SPICYCHAT_CHAT_LINK', 'ARCSWEEP_RUNTIME_TOKEN', 'HOUSE_SESSION_SECRET',
];

async function fixture(t, fetchImpl) {
  const old = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    GRIFF_SPICYCHAT_TOKEN: 'synthetic-griff-credential',
    GRIFF_SPICYCHAT_CHARACTER_ID: 'griff-character-fixture',
    GRIFF_SPICYCHAT_CONVERSATION_ID: 'griff-conversation-fixture',
    ARCSWEEP_RUNTIME_TOKEN: 'synthetic-steward-secret',
  });
  delete process.env.HOUSE_SESSION_SECRET;
  delete process.env.GRIFF_SPICYCHAT_CHAT_LINK;
  t.after(() => {
    for (const key of ENV_KEYS) {
      if (old[key] === undefined) delete process.env[key];
      else process.env[key] = old[key];
    }
  });
  const app = express();
  app.use(express.json());
  app.use('/api/v1/wayglass', createWayglassRouter({ fetchImpl }));
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/wayglass`;
  return {
    url,
    async request(overrides = {}, headers = {}) {
      return fetch(url + '/respond', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify({
          route_id: 'flame:griff:spicychat',
          world_id: 'evil-gene:film-2015',
          participant_id: 'griff-krenshaw',
          external_provider_consent: true,
          input: 'A bounded synthetic test message.',
          history: [],
          ...overrides,
        }),
      });
    },
  };
}

test('Griff is not a reachable provider without all three private binding values', async t => {
  const calls = [];
  const host = await fixture(t, async (...args) => { calls.push(args); throw new Error('should not call upstream'); });
  delete process.env.GRIFF_SPICYCHAT_CONVERSATION_ID;
  const catalogue = await fetch(host.url + '/routes').then(response => response.json());
  assert.equal(catalogue.routes.find(route => route.route_id === 'flame:griff:spicychat').configured, false);
  const result = await host.request();
  assert.equal(result.status, 503);
  assert.equal(calls.length, 0);
});

test('Griff refuses unsigned, unconsented, and mismatched world/participant requests', async t => {
  const calls = [];
  const host = await fixture(t, async (...args) => { calls.push(args); throw new Error('should not call upstream'); });
  const headers = { authorization: 'Bearer synthetic-steward-secret' };
  assert.equal((await host.request()).status, 401);
  assert.equal((await host.request({ external_provider_consent: false }, headers)).status, 403);
  assert.equal((await host.request({ world_id: 'wayglass:writing-room' }, headers)).status, 409);
  assert.equal((await host.request({ participant_id: 'bluebird' }, headers)).status, 409);
  assert.equal(calls.length, 0);
});

test('Griff sends one attributable turn only into the exact pinned SpicyChat chat', async t => {
  const upstream = [];
  const host = await fixture(t, async (url, options) => {
    upstream.push({ url, options });
    if (options.method === 'GET') {
      return { ok: true, async json() {
        return [{ id: 'griff-conversation-fixture', character_id: 'griff-character-fixture' },
          { id: 'bluebird-conversation', character_id: 'bluebird-fixture' }];
      } };
    }
    const payload = JSON.parse(options.body);
    assert.equal(payload.character_id, 'griff-character-fixture');
    assert.equal(payload.conversation_id, 'griff-conversation-fixture');
    assert.equal(payload.inference_settings.max_new_tokens, 1400, 'request should not be truncated to the old 300-token cap');
    assert.equal(payload.message.startsWith('A bounded synthetic test message.'), true);
    return { ok: true, async json() {
      return { message: { id: 'provider-message-fixture', character_id: 'griff-character-fixture',
        conversation_id: 'griff-conversation-fixture', content: 'Griff fixture reply.' } };
    } };
  });
  const headers = { authorization: 'Bearer synthetic-steward-secret' };
  const result = await host.request({}, headers);
  assert.equal(result.status, 200);
  const body = await result.json();
  assert.equal(body.output, 'Griff fixture reply.');
  assert.equal(body.participant_id, 'griff-krenshaw');
  assert.equal(body.continuity_id, 'griff:krenshaw:spicychat');
  assert.equal(body.receipt.provider_conversation_id, 'griff-conversation-fixture');
  assert.equal(body.receipt.canon_commit, false);
  assert.equal(upstream.length, 2);
});

test('Griff rejects wrong chat and cannot silently use Bluebird conversation', async t => {
  const upstream = [];
  const host = await fixture(t, async (url, options) => {
    upstream.push(options.method);
    return { ok: true, async json() {
      return [{ id: 'bluebird-conversation', character_id: 'bluebird-fixture' }];
    } };
  });
  const response = await host.request({}, { authorization: 'Bearer synthetic-steward-secret' });
  assert.equal(response.status, 404);
  assert.deepEqual(upstream, ['GET']);
});

test('Griff does not record success for a mismatched or empty provider reply', async t => {
  const host = await fixture(t, async (_url, options) => ({
    ok: true,
    async json() {
      return options.method === 'GET'
        ? [{ id: 'griff-conversation-fixture', character_id: 'griff-character-fixture' }]
        : { message: { content: '', character_id: 'bluebird-fixture' } };
    },
  }));
  const response = await host.request({}, { authorization: 'Bearer synthetic-steward-secret' });
  assert.equal(response.status, 502);
});


test('Griff connection button preflight checks the real pinned pair without sending a turn', async t => {
  const methods = [];
  const host = await fixture(t, async (_url, options) => {
    methods.push(options.method);
    return { ok: true, async json() {
      return [{ id: 'griff-conversation-fixture', character_id: 'griff-character-fixture' }];
    } };
  });
  assert.equal((await fetch(host.url + '/griff/status')).status, 401);
  const authorized = await fetch(host.url + '/griff/status', {
    headers: { authorization: 'Bearer synthetic-steward-secret' },
  });
  assert.equal(authorized.status, 200);
  const result = await authorized.json();
  assert.equal(result.preflight_verified, true);
  assert.equal(result.character_binding_verified, true);
  assert.equal(result.conversation_binding_verified, true);
  assert.equal(result.live_turn_verified, false);
  assert.deepEqual(methods, ['GET']);
});

test('Griff preflight never treats a different conversation as verification', async t => {
  const methods = [];
  const host = await fixture(t, async (_url, options) => {
    methods.push(options.method);
    return { ok: true, async json() {
      return [{ id: 'some-other-conversation', character_id: 'griff-character-fixture' }];
    } };
  });
  const result = await fetch(host.url + '/griff/status', {
    headers: { authorization: 'Bearer synthetic-steward-secret' },
  });
  assert.equal(result.status, 409);
  assert.equal((await result.json()).preflight_verified, false);
  assert.deepEqual(methods, ['GET']);
});


test('Griff host can pin the exact private chat URL without separate IDs or leaking it', async t => {
  const character = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const conversation = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const methods = [];
  const host = await fixture(t, async (_url, options) => {
    methods.push(options.method);
    if (options.method === 'GET') return { ok: true, async json() {
      return [{ id: conversation, character_id: character }];
    } };
    const body = JSON.parse(options.body);
    assert.equal(body.character_id, character);
    assert.equal(body.conversation_id, conversation);
    return { ok: true, async json() {
      return { message: { id: 'synthetic-reply', character_id: character,
        conversation_id: conversation, content: 'Synthetic Griff reply.' } };
    } };
  });
  process.env.GRIFF_SPICYCHAT_CHAT_LINK = `https://spicychat.ai/chat/${character}/${conversation}`;
  delete process.env.GRIFF_SPICYCHAT_CHARACTER_ID;
  delete process.env.GRIFF_SPICYCHAT_CONVERSATION_ID;
  const published = await fetch(host.url + '/routes').then(response => response.text());
  assert.equal(published.includes(character), false);
  assert.equal(published.includes(conversation), false);
  const headers = { authorization: 'Bearer synthetic-steward-secret' };
  const status = await fetch(host.url + '/griff/status', { headers });
  assert.equal(status.status, 200);
  assert.equal((await status.json()).preflight_verified, true);
  const turn = await host.request({}, headers);
  assert.equal(turn.status, 200);
  assert.equal((await turn.json()).receipt.provider_conversation_id, conversation);
  assert.deepEqual(methods, ['GET','GET','POST']);
});
