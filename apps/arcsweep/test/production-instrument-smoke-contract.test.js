import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const smoke = await readFile(new URL('../../../scripts/arcsweep-terra-prime-live-smoke.mjs', import.meta.url), 'utf8');

test('Terra Prime production smoke targets the live Arcsweep mount and SoundFont worklet', () => {
  assert.match(smoke, /const appPath = '\/arcsweep\/'/);
  assert.match(smoke, /const workletPath = '\/arcsweep\/assets\/spessasynth_processor\.min\.js'/);
  assert.doesNotMatch(smoke, /request\('\/apps\/arcsweep\/'\)/);
});

test('Terra Prime production smoke understands hosted House authentication', () => {
  assert.match(smoke, /ARCSWEEP_SMOKE_COOKIE/);
  assert.match(smoke, /ARCSWEEP_SUPABASE_ACCESS_TOKEN/);
  assert.match(smoke, /supabase_access_token/);
  assert.match(smoke, /ARCSWEEP_STEWARD_KEY/);
  assert.doesNotMatch(smoke, /if \(!credential\) throw new Error\('ARCSWEEP_STEWARD_KEY is required/);
});

test('public production preflight is explicit and cannot masquerade as the authenticated smoke', () => {
  assert.match(smoke, /--public/);
  assert.match(smoke, /scope: 'public-production-instrument'/);
  assert.match(smoke, /authenticated: false/);
  assert.match(smoke, /scope: 'authenticated-production-instrument'/);
  assert.match(smoke, /authenticated: true/);
});
