import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARCSWEEP_CANONICAL_RUNTIME_ORIGIN,
  CARETAKER_API_PATH,
  caretakerEndpointForLocation,
  caretakerTransportLabel,
  isArcSweepGitHubPages,
  resolveCaretakerTransport,
} from '../src/caretaker-transport.js';

const github = { hostname: 'singsenochian.github.io' };
const vercel = { hostname: 'flameclyffe.vercel.app' };

test('GitHub Pages sends Caretaker to the canonical protected runtime', () => {
  assert.equal(isArcSweepGitHubPages(github), true);
  assert.equal(caretakerEndpointForLocation(github), `${ARCSWEEP_CANONICAL_RUNTIME_ORIGIN}${CARETAKER_API_PATH}`);
  assert.equal(caretakerEndpointForLocation(vercel), CARETAKER_API_PATH);
});

test('GitHub Pages uses the signed-in Supabase Steward token and never forwards a stored House credential', async () => {
  let storedRead = false;
  let restoreCalled = false;
  const transport = await resolveCaretakerTransport({
    location: github,
    readStoredToken: () => { storedRead = true; return 'house-master-secret'; },
    restoreSession: async () => { restoreCalled = true; return 'cookie-session'; },
    accessTokenProvider: async () => 'supabase-user-jwt',
  });
  assert.equal(storedRead, false);
  assert.equal(restoreCalled, false);
  assert.equal(transport.token, 'supabase-user-jwt');
  assert.equal(transport.auth_mode, 'supabase-bearer');
  assert.equal(transport.cross_origin, true);
  assert.match(caretakerTransportLabel(transport), /GitHub Pages/);
});

test('same-origin Caretaker automatically restores the existing sealed House session', async () => {
  let restored = 0;
  const transport = await resolveCaretakerTransport({
    location: vercel,
    storage: null,
    readStoredToken: () => '',
    restoreSession: async () => { restored += 1; return 'cookie-session'; },
    accessTokenProvider: async () => 'unused-supabase-token',
  });
  assert.equal(restored, 1);
  assert.equal(transport.endpoint, CARETAKER_API_PATH);
  assert.equal(transport.token, 'cookie-session');
  assert.equal(transport.auth_mode, 'house-cookie');
  assert.equal(transport.cross_origin, false);
});

test('same-origin Caretaker can fall back to the current Supabase Steward token when cookie exchange is unavailable', async () => {
  const transport = await resolveCaretakerTransport({
    location: vercel,
    storage: null,
    readStoredToken: () => '',
    restoreSession: async () => '',
    accessTokenProvider: async () => 'fresh-supabase-token',
  });
  assert.equal(transport.token, 'fresh-supabase-token');
  assert.equal(transport.auth_mode, 'supabase-bearer');
  assert.equal(transport.cross_origin, false);
});
