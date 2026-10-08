#!/usr/bin/env node
// Wayglass StepFun consent + HTTP ingress smoke. Synthetic content only.
// Default is a captured transport. --live makes exactly one provider call.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { once } from 'node:events';

const requireHost = createRequire(new URL('../apps/starwell-server/wayglass/router.js', import.meta.url));
const express = requireHost('express');
const { createWayglassRouter } = requireHost('./router.js');

const args = process.argv.slice(2);
const live = args.includes('--live');
const routeFlag = args.find(arg => arg.startsWith('--route='));
const routeId = routeFlag ? routeFlag.slice('--route='.length) : 'stepfun:flash';
if (args.some(arg => arg !== '--live' && !arg.startsWith('--route=')) ||
    !['stepfun:flash', 'stepfun:step5'].includes(routeId)) {
  console.error('Usage: node scripts/wayglass-stepfun-smoke.mjs [--live] [--route=stepfun:flash|stepfun:step5]');
  process.exit(2);
}

if (live && !process.env.STEPFUN_API_KEY) {
  console.error('StepFun live smoke not started: STEPFUN_API_KEY is absent from the server environment.');
  process.exit(3);
}

const originalKey = process.env.STEPFUN_API_KEY;
if (!live) process.env.STEPFUN_API_KEY = 'synthetic-ci-only-not-a-real-key';

const expectedModel = routeId === 'stepfun:flash' ? 'step-3.7-flash' : 'step-5-preview';
const input = 'Synthetic Wayglass transport probe, no real participants or private canon. Reply with WAYGLASS_STEPFUN_SYNTHETIC_OK.';
let outbound = 0;
const mockTransport = async (url, options) => {
  outbound += 1;
  assert.equal(url, 'https://api.stepfun.ai/v1/chat/completions');
  assert.equal(options.headers.Authorization, 'Bearer synthetic-ci-only-not-a-real-key');
  const sent = JSON.parse(options.body);
  assert.equal(sent.model, expectedModel);
  assert.equal(sent.messages.at(-1).content, input);
  assert.equal(sent.stream, false);
  assert.equal(sent.messages.some(message => /inheritance dossier|departure checkpoint/i.test(message.content)), false);
  return Response.json({
    id: 'synthetic-transport-response',
    model: expectedModel,
    choices: [{ message: { content: 'WAYGLASS_STEPFUN_SYNTHETIC_OK' } }],
    usage: { prompt_tokens: 24, completion_tokens: 8 },
  });
};

const app = express();
app.use(express.json({ limit: '32kb' }));
app.use('/api/v1/wayglass', createWayglassRouter({
  ...(live ? {} : { fetchImpl: mockTransport }),
}));
const server = app.listen(0, '127.0.0.1');
const summary = {
  schema: 'wayglass.stepfun-smoke/v0.1',
  mode: live ? 'live-synthetic-content' : 'captured-transport',
  route_id: routeId,
  requested_model: expectedModel,
  private_canon_transferred: false,
  canon_commit: false,
  live_provider_verified: false,
  ok: false,
};

try {
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/api/v1/wayglass/respond`;
  const send = async (consent) => {
    const response = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route_id: routeId,
        input,
        external_provider_consent: consent,
        max_output_tokens: 64,
        session_id: 'synthetic-stepfun-smoke',
        surface_id: 'wayglass:smoke',
        interaction: { channel: 'OOC', turn_owner: 'synthetic-probe' },
      }),
      signal: AbortSignal.timeout(110000),
    });
    return { status: response.status, body: await response.json() };
  };

  // No external dispatch permitted without the literal affirmative flag.
  const rejected = await send(false);
  assert.equal(rejected.status, 403);
  assert.match(rejected.body.error, /external-provider transfer confirmation/);
  assert.equal(outbound, 0);

  // One explicit-consent request through the real Wayglass HTTP ingress.
  const accepted = await send(true);
  summary.http_status = accepted.status;
  if (accepted.status !== 200) {
    summary.failure_class = accepted.status === 401 ? 'credential-rejected'
      : accepted.status === 403 ? 'provider-access-forbidden'
      : accepted.status === 404 ? 'model-or-endpoint-unavailable'
      : accepted.status === 429 ? 'provider-quota-or-rate-limit'
      : accepted.status === 503 ? 'host-not-configured'
      : accepted.status >= 500 ? 'host-or-provider-error'
      : 'provider-request-rejected';
    throw new Error('Wayglass StepFun ingress returned non-success HTTP status.');
  }

  assert.equal(accepted.body.schema, 'wayglass.route-turn/v0.1');
  assert.equal(accepted.body.route_id, routeId);
  assert.equal(accepted.body.provider, 'stepfun');
  assert.equal(accepted.body.receipt?.canon_commit, false);
  assert.equal(accepted.body.receipt?.provider_storage_requested_by_wayglass, false);
  assert.equal(accepted.body.observation?.review?.state, 'unreviewed');
  assert.equal(accepted.body.receipt?.requested_model, expectedModel);
  assert.equal(typeof accepted.body.output, 'string');
  assert.ok(accepted.body.output.trim().length > 0, 'Provider must return nonempty output');
  if (!live) {
    assert.equal(outbound, 1);
    assert.equal(accepted.body.output, 'WAYGLASS_STEPFUN_SYNTHETIC_OK');
  }
  assert.ok(!JSON.stringify(accepted.body).includes(process.env.STEPFUN_API_KEY));

  summary.ok = true;
  summary.consent_denial_verified = true;
  summary.unreviewed_observation_verified = true;
  summary.observation_id = accepted.body.receipt.observation_id;
  summary.returned_model = accepted.body.receipt.returned_model;
  summary.usage = accepted.body.receipt.usage ?? null;
  summary.live_provider_verified = live;
  // Deliberately never print the model's text, provider error body, or credentials.
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  summary.failure_class ||= 'assertion-or-transport-failure';
  summary.error_kind = error?.name === 'AssertionError' ? 'assertion' : 'smoke-failed';
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} finally {
  await new Promise(resolve => server.close(resolve));
  if (!live) {
    if (originalKey === undefined) delete process.env.STEPFUN_API_KEY;
    else process.env.STEPFUN_API_KEY = originalKey;
  }
}
