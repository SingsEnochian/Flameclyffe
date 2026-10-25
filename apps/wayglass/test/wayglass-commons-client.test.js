import test from 'node:test';
import assert from 'node:assert/strict';
import { readCommons, postCommons } from '../src/commons-client.js';

const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('Commons reads the existing same-origin authenticated House log', async () => {
  const requests = [];
  const entries = [{ id: 'entry-a', author: 'Rowan', text: 'Hello', kind: 'steward' }];
  const result = await readCommons(async (url, init) => { requests.push({ url, init }); return reply(200, { schema:'hearthgate.house-commons-log/v4', entries }); });
  assert.deepEqual(result, entries);
  assert.equal(requests[0].url, '/api/v1/house/commons');
  assert.equal(requests[0].init.credentials, 'same-origin');
});

test('Commons rejects missing or invalid House session with an explicit sign-in message', async () => {
  await assert.rejects(() => readCommons(async () => reply(401, { error:'Unauthorised' })), /Sign into the House Runtime/);
});

test('Commons posts a steward message without claiming an autonomous AI reply', async () => {
  const requests = [];
  await postCommons({ text:'  Good afternoon, Commons.  ', threadId:'wayglass:commons', replyTo:'message-1', idempotencyKey:'safe-key-1', fetchImpl:async (url,init) => {
    requests.push({url,init}); return reply(201, { id:'entry-b', kind:'steward' });
  }});
  assert.equal(requests[0].url, '/api/v1/house/commons');
  assert.equal(requests[0].init.credentials,'same-origin');
  const body = JSON.parse(requests[0].init.body);
  assert.equal(body.kind,'steward');
  assert.equal(body.author,'Rowan');
  assert.equal(body.thread_id,'wayglass:commons');
  assert.equal(body.reply_to,'message-1');
  assert.equal(body.text,'Good afternoon, Commons.');
  assert.equal(body.idempotency_key,'safe-key-1');
  assert.equal(body.runtime,undefined);
});

test('failed post preserves failure rather than fabricating success', async () => {
  await assert.rejects(() => postCommons({text:'Test',fetchImpl:async () => reply(403,{error:'Access not granted'})}),/Access not granted/);
  await assert.rejects(() => postCommons({text:'   '}),/Write something/);
  await assert.rejects(() => postCommons({text:'X'.repeat(24001)}),/exceeds 24,000/);
});
