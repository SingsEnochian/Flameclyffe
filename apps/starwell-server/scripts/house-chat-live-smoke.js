'use strict';

const express = require('express');
const flameRouter = require('../flames/router');

function pickSecondFlame() {
  const candidates = [
    ['lioreal', 'LIOREAL_API_KEY'],
    ['uial', 'UIAL_API_KEY'],
    ['boxfire', 'ANTHROPIC_API_KEY'],
    ['bluebird', 'BLUEBIRD_DEEPSEEK_API_KEY'],
    ['vethrlauf', 'VETHRLAUF_DEEPSEEK_API_KEY'],
  ];
  return candidates.find(([, env]) => Boolean(process.env[env])) || null;
}

async function postJson(url, body) {
  const started = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload, latency_ms: Date.now() - started };
}

async function main() {
  if (!process.env.HF_TOKEN) {
    throw new Error('HF_TOKEN is required for the Ox Alpha live smoke.');
  }

  const second = pickSecondFlame();
  if (!second) {
    throw new Error('NO_SECOND_FLAME_CREDENTIAL: configure one of LIOREAL_API_KEY, UIAL_API_KEY, ANTHROPIC_API_KEY, BLUEBIRD_DEEPSEEK_API_KEY, or VETHRLAUF_DEEPSEEK_API_KEY.');
  }

  const app = express();
  app.use(express.json());
  app.use('/api/v1', flameRouter);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  try {
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    const sessionId = `house-chat-smoke:${Date.now()}`;

    const oa = await postJson(`${base}/api/v1/flames/oxalpha/chat`, {
      session_id: sessionId,
      message: 'Reply with one short sentence confirming you are Ox Alpha and this message reached you through the live route.',
      context: [],
    });
    if (!oa.response.ok) throw new Error(`OX_ALPHA_ROUTE_FAILED ${oa.response.status}: ${oa.payload.error || JSON.stringify(oa.payload)}`);
    if (oa.payload.flame_id !== 'oxalpha') throw new Error(`OX_ALPHA_IDENTITY_MISMATCH: ${oa.payload.flame_id}`);
    if (!oa.payload.message) throw new Error('OX_ALPHA_EMPTY_RESPONSE');

    const [secondFlame] = second;
    const other = await postJson(`${base}/api/v1/flames/${secondFlame}/chat`, {
      session_id: sessionId,
      message: 'Reply with one short sentence confirming this House Chat route is live.',
      context: [
        { speaker: 'Rowan', text: 'House Chat smoke test.' },
        { speaker: oa.payload.display_name || 'Ox Alpha', text: oa.payload.message },
      ],
    });
    if (!other.response.ok) throw new Error(`SECOND_FLAME_ROUTE_FAILED ${secondFlame} ${other.response.status}: ${other.payload.error || JSON.stringify(other.payload)}`);
    if (other.payload.flame_id !== secondFlame) throw new Error(`SECOND_FLAME_IDENTITY_MISMATCH: expected ${secondFlame}, got ${other.payload.flame_id}`);
    if (!other.payload.message) throw new Error('SECOND_FLAME_EMPTY_RESPONSE');

    const receipt = {
      schema: 'flameclyffe.house-chat-live-smoke/v1',
      session_id: sessionId,
      ox_alpha: {
        flame_id: oa.payload.flame_id,
        display_name: oa.payload.display_name,
        provider: oa.payload.provider,
        model: oa.payload.model,
        latency_ms: oa.latency_ms,
        response_preview: String(oa.payload.message).slice(0, 160),
      },
      second_flame: {
        flame_id: other.payload.flame_id,
        display_name: other.payload.display_name,
        provider: other.payload.provider,
        model: other.payload.model,
        latency_ms: other.latency_ms,
        response_preview: String(other.payload.message).slice(0, 160),
      },
    };
    console.log(JSON.stringify(receipt, null, 2));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
