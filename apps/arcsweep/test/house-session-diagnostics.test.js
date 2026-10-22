import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const diagnosticsUrl = new URL('../src/house-session-diagnostics.js', import.meta.url);
const guardUrl = new URL('../src/startup-fetch-guard.js', import.meta.url);

test('House session audit uses the real Supabase-to-House exchange contract', async () => {
  const source = await readFile(diagnosticsUrl, 'utf8');

  assert.match(source, /getKelyranSupabase/);
  assert.match(source, /supabase_access_token/);
  assert.match(source, /credentials:\s*'same-origin'/);
  assert.match(source, /\/api\/v1\/house\/session/);
  assert.match(source, /\/api\/v1\/house\/commons/);
  assert.match(source, /data\?\.entries/);
  assert.doesNotMatch(source, /Authorization\s*:/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /COMMUNICATIONS RESTORED/);
});

test('House session audit is opt-in and waits for core readiness', async () => {
  const source = await readFile(guardUrl, 'utf8');

  assert.match(source, /HOUSE_SESSION_AUDIT_QUERY = 'houseaudit'/);
  assert.match(source, /params\.get\(HOUSE_SESSION_AUDIT_QUERY\) !== '1'/);
  assert.match(source, /arcsweep:core-ready/);
  assert.match(source, /house-session-diagnostics\.js/);
  assert.match(source, /\{ once: true \}/);
});
