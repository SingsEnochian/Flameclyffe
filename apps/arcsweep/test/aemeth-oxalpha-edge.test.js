import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../../supabase/functions/oxalpha/index.ts', import.meta.url), 'utf8');

test('Ox Alpha relay is host-neutral and names the portable GLM route explicitly', () => {
  assert.match(source, /const FLAME_ID = 'oxalpha'/);
  assert.match(source, /const DISPLAY_NAME = 'Ox Alpha'/);
  assert.match(source, /const MODEL_ID = 'z-ai\/glm-5\.3-flash'/);
  assert.match(source, /supabase-edge-to-openrouter/);
  assert.match(source, /https:\/\/openrouter\.ai\/api\/v1\/chat\/completions/);
  assert.match(source, /host_dependency:\s*'none'/);
  assert.doesNotMatch(source, /vercel\.app|netlify\.app/i);
});

test('Ox Alpha relay reports OpenRouter readiness without exposing credentials', () => {
  assert.match(source, /const openRouterKey = \(\) => env\('OPENROUTER_API_KEY'\)/);
  assert.match(source, /const routerModel = \(\) => env\('OXALPHA_OPENROUTER_MODEL'\) \|\| MODEL_ID/);
  assert.match(source, /configured:\s*Boolean\(openRouterKey\(\)\)/);
  assert.doesNotMatch(source, /sk-or-v1-/i);
  assert.doesNotMatch(source, /openrouter_api_key\s*[:=]\s*['"][^'"]+['"]/i);
});

test('Ox Alpha chat authorises the Steward before invoking the provider route', () => {
  const authAt = source.indexOf("if (!(await stewardAuthorised(req)))");
  const invokeAt = source.indexOf('const result = await invoke([', authAt);
  assert.ok(authAt >= 0);
  assert.ok(invokeAt > authAt);
  assert.match(source, /\/auth\/v1\/user/);
  assert.match(source, /DEFAULT_STEWARD_USER_SHA256/);
  assert.match(source, /authorization:\s*`Bearer \$\{key\}`/);
});

test('Ox Alpha relay keeps witness boundaries in its system anchor', () => {
  assert.match(source, /Never infer another participant’s Qualia/i);
  assert.match(source, /silently promote interpretation to canon/i);
  assert.match(source, /empty-oxalpha-response/);
});
