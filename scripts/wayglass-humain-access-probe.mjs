import fs from 'node:fs';
import path from 'node:path';
import observationModule from '../lib/wayglass-model-observation.cjs';
import registryModule from '../lib/wayglass-route-registry.cjs';

const { createModelObservation } = observationModule;
const { resolveWayglassRoute } = registryModule;

const envPath = path.resolve('apps/starwell-server/.env');

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

function safeError(data, fallback) {
  const value = data?.error?.message || data?.error || data?.message || fallback;
  return String(value || fallback).slice(0, 1200);
}

function classify(status) {
  if (status === 401) return 'credential-not-accepted';
  if (status === 403) return 'credential-accepted-but-access-not-entitled-or-forbidden';
  if (status === 404) return 'endpoint-or-model-not-enabled';
  if (status === 429) return 'rate-or-quota-limited';
  if (status >= 500) return 'provider-error';
  return 'request-failed';
}

if (!fs.existsSync(envPath)) {
  console.error('[Wayglass] apps/starwell-server/.env is missing.');
  process.exit(2);
}

const env = parseEnv(fs.readFileSync(envPath, 'utf8'));
for (const [key, value] of Object.entries(env)) {
  if (!process.env[key]) process.env[key] = value;
}

const route = resolveWayglassRoute('humain:m3-sandbox');
const key = route?.api_key?.() || '';
if (!route || !key) {
  console.error('[Wayglass] HUMAIN_NODE_SANDBOX_KEY is not configured.');
  process.exit(3);
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer ' + key,
  'x-api-key': key,
};

const catalogueResponse = await fetch(route.catalogue_endpoint(), {
  headers,
  signal: AbortSignal.timeout(30000),
});
const catalogueData = await catalogueResponse.json().catch(() => ({}));

if (!catalogueResponse.ok) {
  console.log(JSON.stringify({
    schema: 'wayglass.humain-access-probe/v0.1',
    ok: false,
    stage: 'catalogue',
    http_status: catalogueResponse.status,
    classification: classify(catalogueResponse.status),
    error: safeError(catalogueData, 'HUMAIN catalogue request failed.'),
    credential_exposed: false,
    canon_commit: false,
  }, null, 2));
  process.exit(4);
}

const models = Array.isArray(catalogueData?.data)
  ? catalogueData.data.map((m) => m?.id).filter(Boolean)
  : Array.isArray(catalogueData?.models)
    ? catalogueData.models.map((m) => m?.id || m?.name).filter(Boolean)
    : [];

const expectedModel = route.model();
if (!models.includes(expectedModel)) {
  console.log(JSON.stringify({
    schema: 'wayglass.humain-access-probe/v0.1',
    ok: false,
    stage: 'model-entitlement',
    http_status: catalogueResponse.status,
    classification: 'catalogue-reachable-model-not-listed',
    expected_model: expectedModel,
    models: models.slice(0, 50),
    credential_exposed: false,
    canon_commit: false,
  }, null, 2));
  process.exit(5);
}

const probeInput = 'Synthetic Wayglass transport probe. Reply exactly: WAYGLASS_HUMAIN_PROBE_OK';
const chatResponse = await fetch(route.endpoint(), {
  method: 'POST',
  headers,
  body: JSON.stringify({
    model: expectedModel,
    messages: [
      {
        role: 'system',
        content: 'This is a synthetic transport verification. Do not infer user identity, memory, canon, or relationship state.',
      },
      { role: 'user', content: probeInput },
    ],
    max_tokens: 48,
    stream: false,
  }),
  signal: AbortSignal.timeout(60000),
});
const chatData = await chatResponse.json().catch(() => ({}));

if (!chatResponse.ok) {
  console.log(JSON.stringify({
    schema: 'wayglass.humain-access-probe/v0.1',
    ok: false,
    stage: 'generation',
    http_status: chatResponse.status,
    classification: classify(chatResponse.status),
    error: safeError(chatData, 'HUMAIN generation request failed.'),
    model: expectedModel,
    credential_exposed: false,
    canon_commit: false,
  }, null, 2));
  process.exit(6);
}

const output = String(chatData?.choices?.[0]?.message?.content || '').trim();
const result = {
  output,
  thinking: chatData?.choices?.[0]?.message?.reasoning_content
    || chatData?.choices?.[0]?.message?.thinking
    || null,
  response_id: chatData?.id || null,
  usage: chatData?.usage || null,
};

const observation = createModelObservation({
  route,
  result,
  payload: {
    session_id: 'humain-synthetic-probe',
    surface_id: 'wayglass:probe',
    interaction: { channel: 'OOC' },
  },
});

console.log(JSON.stringify({
  schema: 'wayglass.humain-access-probe/v0.1',
  ok: true,
  stage: 'complete',
  catalogue: {
    model_count: models.length,
    models: models.slice(0, 50),
    expected_model_present: true,
  },
  generation: {
    http_status: chatResponse.status,
    response_id: result.response_id,
    output,
    thinking_exposed: Boolean(result.thinking),
    usage: result.usage,
  },
  observation,
  credential_exposed: false,
  canon_commit: false,
}, null, 2));
