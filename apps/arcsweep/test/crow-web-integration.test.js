import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebModelAuditionHandler } from '../../../netlify/functions/_shared/web-model-audition.mjs';
import vercelAudition from '../../../api/v1/flames/[flame_id]/audition/[candidate_id].js';
import { invokeConstellationRuntimeCandidate } from '../src/constellation-candidate-runtime.js';
import { updateCodexChatMarkup } from '../src/codex-chat-dom.js';

const params = { flame_id: 'bluebird', candidate_id: 'bluebird-the-crow' };
const url = 'https://example.test/api/v1/flames/bluebird/audition/bluebird-the-crow';
const values = { ARCSWEEP_RUNTIME_TOKEN: 'test-house', HFTOKEN: 'test-hf' };
const env = { get: (name) => values[name] };
const request = (method = 'GET', body = {}, authorised = true) => new Request(url, {
  method,
  headers: { 'content-type': 'application/json', ...(authorised ? { authorization: 'Bearer test-house' } : {}) },
  ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
});

test('Crow requires House auth before status or inference', async () => {
  const handler = createWebModelAuditionHandler({ env, fetchImpl: () => assert.fail('No upstream request allowed') });
  for (const method of ['GET', 'POST']) {
    const response = await handler(request(method, { message: 'hello' }, false), { params });
    assert.equal(response.status, 401);
  }
});

test('an HF token alone does not falsely advertise Crow as configured', async () => {
  const handler = createWebModelAuditionHandler({ env, fetchImpl: () => assert.fail('No hosting configured') });
  const response = await handler(request(), { params });
  const data = await response.json();
  assert.equal(data.configured, false);
  assert.equal(data.runtime_reachable, null);
  assert.deepEqual(data.missing, ['BLUEBIRD_CROW_BASE_URL']);
  const attempt = await handler(request('POST', { message: 'CROW_ALIVE' }), { params });
  assert.equal(attempt.status, 503);
  assert.match((await attempt.json()).error, /running inference endpoint/);
});

test('Crow forwards calibrated sampling to the configured endpoint, not the HF shared router', async () => {
  const configuredEnv = { get: (name) => name === 'BLUEBIRD_CROW_BASE_URL' ? 'https://crow.example.test/v1/' : values[name] };
  const handler = createWebModelAuditionHandler({ env: configuredEnv, fetchImpl: async (endpoint, options) => {
    assert.equal(endpoint, 'https://crow.example.test/v1/chat/completions');
    assert.equal(options.headers.authorization, 'Bearer test-hf');
    const payload = JSON.parse(options.body);
    assert.match(payload.model, /Crownelius\/The-Crow/);
    assert.equal(payload.temperature, 0.9);
    assert.equal(payload.top_p, 0.82);
    assert.equal(payload.max_tokens, 300);
    assert.equal(payload.top_k, undefined);
    assert.equal(payload.reasoning_effort, undefined);
    assert.match(payload.messages.at(-1).content, /inherited context/);
    return Response.json({ choices: [{ message: { content: 'Fixture reply, not a live model.' } }] });
  } });
  const response = await handler(request('POST', { message: 'hello', context: [{ role: 'user', content: 'inherited context' }], reasoning_effort: 'high' }), { params });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.audition, true);
  assert.equal(data.primary_route_unchanged, true);
  assert.equal(data.candidate_id, params.candidate_id);
  assert.equal(data.reasoning_effort, null);
  assert.equal(data.execution_path, 'web-direct');
  assert.ok(!JSON.stringify(data).includes('test-hf'));
});

test('Crow rejects empty completions and wrong-voice candidates', async () => {
  const configuredEnv = { get: (name) => name === 'BLUEBIRD_CROW_BASE_URL' ? 'https://crow.example.test/v1' : values[name] };
  let calls = 0;
  const handler = createWebModelAuditionHandler({ env: configuredEnv, fetchImpl: async () => {
    calls += 1;
    return Response.json({ choices: [{ message: { content: '' } }] });
  } });
  assert.equal((await handler(request('POST', { message: 'hello' }), { params })).status, 502);
  assert.equal(calls, 1);
  assert.equal((await handler(request('POST', { message: 'hello' }), { params: { ...params, flame_id: 'uial' } })).status, 404);
  assert.equal(calls, 1);
});

test('Vercel mounts the nested audition route with the same House auth boundary', async () => {
  const old = process.env.ARCSWEEP_RUNTIME_TOKEN;
  process.env.ARCSWEEP_RUNTIME_TOKEN = 'test-house';
  try {
    assert.equal((await vercelAudition.fetch(request('GET', {}, false))).status, 401);
    const response = await vercelAudition.fetch(request());
    assert.equal(response.status, 200);
    assert.equal((await response.json()).candidate_id, params.candidate_id);
  } finally {
    if (old === undefined) delete process.env.ARCSWEEP_RUNTIME_TOKEN;
    else process.env.ARCSWEEP_RUNTIME_TOKEN = old;
  }
});

test('chat and attachment observer renders converge without erasing sibling controls', () => {
  let writes = 0;
  let markup = '';
  const chat = { set innerHTML(value) { writes += 1; markup = value; } };
  assert.equal(updateCodexChatMarkup(chat, '<form>draft</form>'), true);
  markup += '<section>attachment controls</section>';
  for (let turn = 0; turn < 100; turn += 1) {
    assert.equal(updateCodexChatMarkup(chat, '<form>draft</form>'), false);
  }
  assert.equal(writes, 1);
  assert.match(markup, /attachment controls/);
  assert.equal(updateCodexChatMarkup(chat, '<form>new reply</form>'), true);
  assert.equal(writes, 2);
  assert.equal(updateCodexChatMarkup({ set innerHTML(_) { writes += 1; } }, '<form>new reply</form>'), true);
  assert.equal(writes, 3, 'a remounted element still receives its initial markup');
});

test('Codex candidate client preserves session context and requires an attested, non-empty audition reply', async () => {
  const originalStorage = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem: () => 'test-house' };
  const attestation = { flame_id: 'bluebird', candidate_id: params.candidate_id, provider: 'fixture', model: 'fixture-crow', audition: true, primary_route_unchanged: true, message: 'fixture reply' };
  let responseBody = attestation;
  const fetchImpl = async (_url, options) => {
    assert.equal(options.credentials, 'same-origin');
    assert.equal(JSON.parse(options.body).session_id, 'test-continuity-session');
    return Response.json(responseBody);
  };
  const invoke = () => invokeConstellationRuntimeCandidate({ voiceId: 'bluebird', candidateId: params.candidate_id, message: 'hello', sessionId: 'test-continuity-session', fetchImpl });
  try {
    assert.equal((await invoke()).status, 'replied');
    responseBody = { ...attestation, message: '' };
    assert.equal((await invoke()).status, 'empty-reply');
    responseBody = { ...attestation, audition: false };
    assert.equal((await invoke()).status, 'runtime-mismatch');
    responseBody = { ...attestation, candidate_id: 'other-receiver' };
    assert.equal((await invoke()).status, 'runtime-mismatch');
  } finally {
    if (originalStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = originalStorage;
  }
});
