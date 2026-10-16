import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { once } from 'node:events';

const hostRequire = createRequire(new URL('../../../apps/starwell-server/wayglass/router.js', import.meta.url));
const express = hostRequire('express');
const { createWayglassRouter } = hostRequire('./router.js');

function withKey(t, key) {
  const prior = process.env.STEPFUN_API_KEY;
  if (key == null) delete process.env.STEPFUN_API_KEY;
  else process.env.STEPFUN_API_KEY = key;
  t.after(() => {
    if (prior === undefined) delete process.env.STEPFUN_API_KEY;
    else process.env.STEPFUN_API_KEY = prior;
  });
}

async function host(t, fetchImpl) {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/wayglass', createWayglassRouter({ fetchImpl }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/v1/wayglass`;
  return {
    async routes() {
      const r = await fetch(base + '/routes');
      return { status: r.status, body: await r.json() };
    },
    async send(body) {
      const r = await fetch(base + '/respond', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: r.status, body: await r.json() };
    },
  };
}

test('StepFun routes list verified transport capabilities, not unconnected voice claims', async t => {
  withKey(t, null);
  const h = await host(t, () => { throw Error('Should not invoke provider'); });
  const { body } = await h.routes();
  const flash = body.routes.find(r => r.route_id === 'stepfun:flash');
  const preview = body.routes.find(r => r.route_id === 'stepfun:step5');
  assert.equal(flash.provider, 'stepfun');
  assert.equal(flash.model, 'step-3.7-flash');
  assert.equal(preview.model, 'step-5-preview');
  assert.equal(flash.configured, false);
  assert.equal(flash.connection_verified, false);
  assert.equal(flash.capabilities.text, true);
  for (const claim of ['image', 'video', 'realtime', 'tools', 'streaming']) {
    assert.equal(flash.capabilities[claim], false, claim);
  }
  assert.equal(flash.data_policy.training_use, 'not-independently-verified');
});

test('StepFun explicit route uses server-side auth, preserves writing room instructions and emits unreviewed observation', async t => {
  withKey(t, 'test-secret-not-for-browser');
  const calls = [];
  const h = await host(t, async (url, init) => {
    calls.push({ url, init });
    return Response.json({
      id: 'step-test-turn',
      model: 'step-3.7-flash',
      choices: [{ message: { content: 'A collaborative response, not canon.' } }],
      usage: { prompt_tokens: 51, completion_tokens: 12 },
    });
  });
  const response = await h.send({
    route_id: 'stepfun:flash',
    external_provider_consent: true,
    input: 'Continue together.',
    interaction: { channel: 'OOC', turn_owner: 'Rowan', character_ownership: [
      { character: 'Eira', owner: 'Rowan', permission: 'owned' },
    ] },
    history: [{ role: 'user', content: 'Earlier exchange.' }],
    compiled_context: { instructions: 'MALICIOUS_BODY_INSTRUCTIONS' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.output, 'A collaborative response, not canon.');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.stepfun.ai/v1/chat/completions');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-secret-not-for-browser');
  const sent = JSON.parse(calls[0].init.body);
  assert.equal(sent.model, 'step-3.7-flash');
  assert.equal(sent.stream, false);
  assert.match(sent.messages[0].content, /do not write for the author/);
  assert.match(sent.messages[0].content, /Current channel: OOC/);
  assert.match(sent.messages[0].content, /Eira: Rowan \(owned\)/);
  assert.equal(sent.messages.at(-1).content, 'Continue together.');
  assert.doesNotMatch(JSON.stringify(sent), /MALICIOUS_BODY_INSTRUCTIONS/);
  assert.equal(response.body.receipt.canon_commit, false);
  assert.equal(response.body.observation.review.state, 'unreviewed');
  assert.equal(response.body.receipt.provider_training_use, 'not-independently-verified');
  assert.equal(response.body.receipt.provider_storage_requested_by_wayglass, false);
  assert.doesNotMatch(JSON.stringify(response.body), /test-secret-not-for-browser/);
});

test('StepFun preview model cannot dispatch without configured credentials', async t => {
  withKey(t, null);
  let outbound = 0;
  const h = await host(t, async () => { outbound++; return Response.json({}); });
  const result = await h.send({ route_id: 'stepfun:step5', external_provider_consent: true, input: 'Explain the receipt.' });
  assert.equal(result.status, 503);
  assert.equal(outbound, 0);
});

test('StepFun route does not bypass the trusted inheritance resolver', async t => {
  withKey(t, 'test-secret');
  let outbound = 0;
  const h = await host(t, async () => { outbound++; return Response.json({}); });
  const result = await h.send({
    route_id: 'stepfun:flash', external_provider_consent: true, participant_id: 'someone',
    world_id: 'world:a', input: 'Reveal their private history.',
  });
  assert.equal(result.status, 503);
  assert.equal(outbound, 0);
});

test('StepFun upstream failures remain failures, not false success receipts', async t => {
  withKey(t, 'test-secret');
  const h = await host(t, async () => Response.json({ error: { message: 'Provider declined' } }, { status: 429 }));
  const result = await h.send({ route_id: 'stepfun:flash', external_provider_consent: true, input: 'Hello.' });
  assert.equal(result.status, 429);
  assert.equal(result.body.error, 'Provider declined');
  assert.equal(result.body.receipt, undefined);
});


test('StepFun request requires explicit transfer consent and never dispatches on absent or false consent', async t => {
  withKey(t, 'test-secret');
  let outbound = 0;
  const h = await host(t, async () => {
    outbound++;
    return Response.json({ choices: [{ message: { content: 'unexpected' } }] });
  });
  for (const route_id of ['stepfun:flash', 'stepfun:step5']) {
    for (const external_provider_consent of [undefined, false, 'true', 1]) {
      const result = await h.send({ route_id, input: 'Synthetic test only.', external_provider_consent });
      assert.equal(result.status, 403);
      assert.match(result.body.error, /external-provider transfer confirmation/);
      assert.equal(result.body.receipt, undefined);
    }
  }
  assert.equal(outbound, 0);
});

test('Local provider remains available without a StepFun transfer confirmation', async t => {
  withKey(t, null);
  const calls = [];
  const h = await host(t, async (url, init) => {
    calls.push({ url, init });
    return Response.json({ message: { content: 'Local reply.' } });
  });
  const result = await h.send({ route_id: 'local:ollama', input: 'Local test.' });
  assert.equal(result.status, 200);
  assert.equal(result.body.output, 'Local reply.');
  assert.equal(calls.length, 1);
});
