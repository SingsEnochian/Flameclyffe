import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createHouseCaretakerHandler } from '../../../api/_shared/house-caretaker-runtime.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const MODEL = 'hf.co/DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q4_K_M';
const env = (values = {}) => ({ get: (name) => values[name] });
const houseHeaders = { authorization: 'Bearer house-key' };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('hosted Caretaker status crosses the protected Hearthgate gateway instead of Vercel localhost', async () => {
  const calls = [];
  const handler = createHouseCaretakerHandler({
    env: env({
      ARCSWEEP_RUNTIME_TOKEN: 'house-key',
      HEARTHGATE_GATEWAY_URL: 'https://hearthgate.test',
      HEARTHGATE_GATEWAY_TOKEN: 'gateway-key',
      MODEL_ARCSWEEP_CARETAKER: MODEL,
      VERCEL: '1',
    }),
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      assert.equal(url, 'https://hearthgate.test/api/v1/house/caretaker/status');
      assert.equal(options.headers.authorization, 'Bearer gateway-key');
      return json({
        role: 'house-intelligence',
        provider: 'ollama',
        model: MODEL,
        runtime_reachable: true,
        model_available: true,
        installed_count: 4,
        missing: [],
      });
    },
  });

  const response = await handler(new Request('https://arcsweep.test/api/v1/house/caretaker', { headers: houseHeaders }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(body.provider, 'hearthgate-gateway');
  assert.equal(body.configured, true);
  assert.equal(body.runtime_reachable, true);
  assert.equal(body.model_available, true);
  assert.equal(body.model, MODEL);
});

test('hosted Caretaker chat relays through Hearthgate with its gateway credential', async () => {
  const handler = createHouseCaretakerHandler({
    env: env({
      ARCSWEEP_RUNTIME_TOKEN: 'house-key',
      HEARTHGATE_GATEWAY_URL: 'https://hearthgate.test/',
      HEARTHGATE_GATEWAY_TOKEN: 'gateway-key',
      MODEL_ARCSWEEP_CARETAKER: MODEL,
      VERCEL: '1',
    }),
    fetchImpl: async (url, options = {}) => {
      assert.equal(url, 'https://hearthgate.test/api/v1/house/caretaker/chat');
      assert.equal(options.headers.authorization, 'Bearer gateway-key');
      assert.equal(JSON.parse(options.body).message, 'Take me to Glyph Forge.');
      return json({
        role: 'house-intelligence',
        provider: 'ollama',
        model: MODEL,
        message: '{"schema":"arcsweep.caretaker-plan/v0.1","reply":"This way.","actions":[{"type":"navigate","target":"glyph-forge"}]}',
      });
    },
  });

  const response = await handler(new Request('https://arcsweep.test/api/v1/house/caretaker', {
    method: 'POST',
    headers: { ...houseHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Take me to Glyph Forge.' }),
  }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.role, 'house-intelligence');
  assert.equal(body.provider, 'ollama');
  assert.equal(body.model, MODEL);
  assert.equal(body.runtime_braid, null);
  assert.match(body.message, /glyph-forge/);
});

test('hosted Caretaker refuses to invent a localhost bridge when gateway configuration is absent', async () => {
  let called = false;
  const handler = createHouseCaretakerHandler({
    env: env({ ARCSWEEP_RUNTIME_TOKEN: 'house-key', VERCEL: '1' }),
    fetchImpl: async () => { called = true; throw new Error('should not fetch'); },
  });
  const response = await handler(new Request('https://arcsweep.test/api/v1/house/caretaker', { headers: houseHeaders }));
  const body = await response.json();
  assert.equal(called, false);
  assert.equal(body.configured, false);
  assert.equal(body.runtime_reachable, false);
  assert.deepEqual(body.missing, ['HEARTHGATE_GATEWAY_URL', 'HEARTHGATE_GATEWAY_TOKEN']);
});

test('local Hearthgate mounts a separate House Caretaker lane without altering Flame status parsing', () => {
  const contract = fs.readFileSync(path.join(root, 'apps/starwell-server/caretaker/contract.js'), 'utf8');
  const caretakerRouter = fs.readFileSync(path.join(root, 'apps/starwell-server/caretaker/router.js'), 'utf8');
  const flameRouter = fs.readFileSync(path.join(root, 'apps/starwell-server/flames/router.js'), 'utf8');

  assert.match(contract, /You are not a Flame/);
  assert.match(contract, /ALLOWED_ACTIONS = Object\.freeze\(\['navigate'\]\)/);
  assert.match(caretakerRouter, /\/house\/caretaker\/status/);
  assert.match(caretakerRouter, /\/house\/caretaker\/chat/);
  assert.match(caretakerRouter, /SYSTEM_PROMPT/);
  assert.match(flameRouter, /require\('\.\.\/caretaker\/router'\)/);
  assert.match(flameRouter, /router\.use\(caretakerRouter\)/);
  assert.match(flameRouter, /const response = await fetch\(`\$\{endpoint\}\/api\/tags`[\s\S]{0,240}const data = await response\.json\(\)/);
});
