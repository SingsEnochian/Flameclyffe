import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve('apps/starwell-server/.env');

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

if (!fs.existsSync(envPath)) {
  console.error('[Wayglass] apps/starwell-server/.env is missing.');
  process.exit(2);
}

const env = parseEnv(fs.readFileSync(envPath, 'utf8'));
const key = env.HUMAIN_NODE_SANDBOX_KEY || process.env.HUMAIN_NODE_SANDBOX_KEY || '';
if (!key) {
  console.error('[Wayglass] HUMAIN_NODE_SANDBOX_KEY is not set.');
  process.exit(3);
}

const catalogue = env.HUMAIN_NODE_SANDBOX_CATALOGUE_URL
  || process.env.HUMAIN_NODE_SANDBOX_CATALOGUE_URL
  || 'https://api.node.humain.com/v1/models';

const response = await fetch(catalogue, {
  headers: {
    Authorization: 'Bearer ' + key,
  },
  signal: AbortSignal.timeout(30000),
});

const data = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error('[Wayglass] HUMAIN sandbox catalogue failed:', response.status, data?.error?.message || data?.error || data?.message || 'unknown error');
  process.exit(4);
}

const models = Array.isArray(data?.data)
  ? data.data.map((m) => m?.id).filter(Boolean)
  : Array.isArray(data?.models)
    ? data.models.map((m) => m?.id || m?.name).filter(Boolean)
    : [];

console.log(JSON.stringify({
  ok: true,
  provider: 'humain-node',
  environment: 'sandbox',
  model_count: models.length || null,
  models: models.slice(0, 50),
}, null, 2));
