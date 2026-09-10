import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CARETAKER_GITHUB_PAGES_ORIGIN,
  DEFAULT_CARETAKER_HOSTED_MODEL,
  createHouseCaretakerHandler,
} from '../../../api/_shared/house-caretaker-runtime.mjs';

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

function plan(reply = 'This way.', actions = []) {
  return JSON.stringify({ schema: 'arcsweep.caretaker-plan/v0.1', reply, actions });
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
  assert.equal(body.execution_path, 'hearthgate-gateway');
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
        message: plan('This way.', [{ type: 'navigate', target: 'glyph-forge' }]),
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
  assert.equal(body.execution_path, 'hearthgate-gateway');
  assert.equal(body.runtime_braid, null);
  assert.match(body.message, /glyph-forge/);
});

test('hosted Caretaker has a server-side LLM fallback when Hearthgate is not present', async () => {
  let providerCall = null;
  const handler = createHouseCaretakerHandler({
    env: env({
      ARCSWEEP_RUNTIME_TOKEN: 'house-key',
      HF_TOKEN: 'server-hf-token',
      VERCEL: '1',
    }),
    fetchImpl: async (url, options = {}) => {
      providerCall = { url, options };
      assert.equal(url, 'https://router.huggingface.co/v1/chat/completions');
      assert.equal(options.headers.authorization, 'Bearer server-hf-token');
      const request = JSON.parse(options.body);
      assert.equal(request.model, DEFAULT_CARETAKER_HOSTED_MODEL);
      assert.match(request.messages[0].content, /ArcSweep Caretaker/);
      return json({ choices: [{ message: { content: plan('I am here.', []) } }] });
    },
  });

  const response = await handler(new Request('https://arcsweep.test/api/v1/house/caretaker', {
    method: 'POST',
    headers: { ...houseHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'Hello Caretaker.' }),
  }));
  const body = await response.json();
  assert.ok(providerCall);
  assert.equal(response.status, 200);
  assert.equal(body.provider, 'huggingface-inference-providers');
  assert.equal(body.model, DEFAULT_CARETAKER_HOSTED_MODEL);
  assert.equal(body.execution_path, 'huggingface-hosted-fallback');
  assert.equal(body.fallback_from, 'no-primary-runtime');
  assert.match(body.message, /I am here/);
});

test('hosted Caretaker remains explicitly unavailable only when every model path is absent', async () => {
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
  assert.deepEqual(body.missing, ['HEARTHGATE_GATEWAY_URL|OLLAMA_ENDPOINT', 'HF_TOKEN|HFTOKEN']);
});

test('GitHub Pages authenticates directly with the signed-in Supabase Steward token and receives CORS', async () => {
  const calls = [];
  const handler = createHouseCaretakerHandler({
    env: env({
      HOUSE_STEWARD_USER_IDS: 'steward-1',
      HF_TOKEN: 'server-hf-token',
      VERCEL: '1',
    }),
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      if (String(url).includes('/auth/v1/user')) {
        assert.equal(options.headers.authorization, 'Bearer supabase-user-token');
        return json({ id: 'steward-1' });
      }
      assert.equal(url, 'https://router.huggingface.co/v1/chat/completions');
      return json({ choices: [{ message: { content: plan('GitHub bridge online.', []) } }] });
    },
  });

  const preflight = await handler(new Request('https://flameclyffe.vercel.app/api/v1/house/caretaker', {
    method: 'OPTIONS',
    headers: { origin: CARETAKER_GITHUB_PAGES_ORIGIN },
  }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), CARETAKER_GITHUB_PAGES_ORIGIN);
  assert.match(preflight.headers.get('access-control-allow-headers'), /authorization/);

  const response = await handler(new Request('https://flameclyffe.vercel.app/api/v1/house/caretaker', {
    method: 'POST',
    headers: {
      origin: CARETAKER_GITHUB_PAGES_ORIGIN,
      authorization: 'Bearer supabase-user-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ message: 'Hello from GitHub Pages.' }),
  }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), CARETAKER_GITHUB_PAGES_ORIGIN);
  assert.equal(body.auth_mode, 'supabase-bearer');
  assert.equal(body.execution_path, 'huggingface-hosted-fallback');
  assert.equal(calls.length, 2);
});

test('unknown cross-origin browsers cannot use the Supabase bearer bridge', async () => {
  let called = false;
  const handler = createHouseCaretakerHandler({
    env: env({ HOUSE_STEWARD_USER_IDS: 'steward-1', HF_TOKEN: 'server-hf-token', VERCEL: '1' }),
    fetchImpl: async () => { called = true; return json({ id: 'steward-1' }); },
  });
  const response = await handler(new Request('https://flameclyffe.vercel.app/api/v1/house/caretaker', {
    method: 'POST',
    headers: {
      origin: 'https://not-arcsweep.example',
      authorization: 'Bearer supabase-user-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ message: 'Nope.' }),
  }));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(called, false);
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
