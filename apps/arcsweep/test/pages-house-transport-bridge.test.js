import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('Pages House transport is nested under the startup guard before ArcSweep core boot', async () => {
  const html = await source('index.html');
  const scripts = [...html.matchAll(/<script type="module" src="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(scripts, [
    './src/canonical-runtime-host.js',
    './src/startup-fetch-guard.js',
    './src/main-bootstrap.js',
  ]);
  const guard = await source('src/startup-fetch-guard.js');
  assert.match(guard, /^import '\.\/pages-house-transport-bridge\.js';/);
});

test('Pages transport bridges session and Commons to Supabase and exposes Ox Alpha route truth', async () => {
  const bridge = await source('src/pages-house-transport-bridge.js');
  assert.match(bridge, /singsenochian\.github\.io/);
  assert.match(bridge, /functions\/v1\/arcsweep-house/);
  assert.match(bridge, /functions\/v1\/oxalpha/);
  assert.match(bridge, /\/api\/v1\/house\/session/);
  assert.match(bridge, /\/api\/v1\/house\/commons/);
  assert.match(bridge, /\/api\/v1\/flames\/oxalpha\/status/);
  assert.match(bridge, /authorization.*Bearer/si);
});

test('portable House edge preserves durable Commons idempotency', async () => {
  const edge = await source('../../supabase/functions/arcsweep-house/index.ts');
  assert.match(edge, /house_commons_entries/);
  assert.match(edge, /idempotency_key/);
  assert.match(edge, /maybeSingle\(\)/);
  assert.match(edge, /Steward Supabase session required/);
  assert.match(edge, /hearthgate\.arcsweep-house-portable\/v1/);
});
