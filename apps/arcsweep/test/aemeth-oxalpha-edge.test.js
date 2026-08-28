import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../../supabase/functions/oxalpha/index.ts', import.meta.url), 'utf8');

test('Ox Alpha relay is host-neutral and names the same Flame/model identity as Aemeth', () => {
  assert.match(source, /const FLAME_ID = 'oxalpha'/);
  assert.match(source, /const DISPLAY_NAME = 'Ox Alpha'/);
  assert.match(source, /const MODEL_ID = 'zai-org\/GLM-5\.3-Flash'/);
  assert.match(source, /supabase-edge-to-huggingface-router/);
  assert.match(source, /host_dependency:\s*'none'/);
  assert.doesNotMatch(source, /vercel\.app|netlify\.app/i);
});

test('Ox Alpha relay reports credential readiness without exposing credentials', () => {
  assert.match(source, /configured:\s*Boolean\(hfToken\(\)\)/);
  assert.match(source, /const hfToken = \(\) => env\('HFTOKEN'\) \|\| env\('HF_TOKEN'\)/);
  assert.doesNotMatch(source, /token:\s*hfToken\(\)/);
});

test('Ox Alpha chat authorises the Steward before contacting Hugging Face', () => {
  const authAt = source.indexOf("if (!(await stewardAuthorised(req)))");
  const tokenAt = source.indexOf('const token = hfToken();', authAt);
  const fetchAt = source.indexOf("fetch('https://router.huggingface.co/v1/chat/completions'", authAt);
  assert.ok(authAt >= 0);
  assert.ok(tokenAt > authAt);
  assert.ok(fetchAt > tokenAt);
  assert.match(source, /\/auth\/v1\/user/);
  assert.match(source, /DEFAULT_STEWARD_USER_SHA256/);
});

test('Ox Alpha relay keeps witness boundaries in its system anchor', () => {
  assert.match(source, /Never infer another participant’s Qualia/i);
  assert.match(source, /silently promote interpretation to canon/i);
  assert.match(source, /empty-oxalpha-response/);
});
