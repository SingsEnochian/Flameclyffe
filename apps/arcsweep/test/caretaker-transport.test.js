import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARCSWEEP_CARETAKER_EDGE_ENDPOINT,
  CARETAKER_API_PATH,
  caretakerEndpointForLocation,
  caretakerTransportLabel,
  isArcSweepCanonicalVercel,
  isArcSweepGitHubPages,
  resolveCaretakerTransport,
} from '../src/caretaker-transport.js';

const github = { hostname: 'singsenochian.github.io' };
const vercel = { hostname: 'flameclyffe.vercel.app' };
const local = { hostname: 'localhost' };

for (const [name, location, expectedSurface] of [
  ['GitHub Pages', github, 'github-pages-to-supabase-edge'],
  ['Vercel', vercel, 'vercel-to-supabase-edge'],
]) {
  test(`${name} sends Caretaker directly to the portable Edge runtime`, async () => {
    let storedRead = false;
    let restoreCalled = false;
    const transport = await resolveCaretakerTransport({
      location,
      readStoredToken: () => { storedRead = true; return 'house-master-secret'; },
      restoreSession: async () => { restoreCalled = true; return 'cookie-session'; },
      accessTokenProvider: async () => 'supabase-user-jwt',
    });
    assert.equal(transport.endpoint, ARCSWEEP_CARETAKER_EDGE_ENDPOINT);
    assert.equal(transport.execution_surface, expectedSurface);
    assert.equal(transport.token, 'supabase-user-jwt');
    assert.equal(transport.auth_mode, 'supabase-bearer');
    assert.equal(transport.cross_origin, true);
    assert.equal(storedRead, false);
    assert.equal(restoreCalled, false);
    assert.match(caretakerTransportLabel(transport), /Caretaker Edge/);
  });
}

test('host detection keeps hosted surfaces explicit', () => {
  assert.equal(isArcSweepGitHubPages(github), true);
  assert.equal(isArcSweepCanonicalVercel(vercel), true);
  assert.equal(isArcSweepGitHubPages(local), false);
  assert.equal(isArcSweepCanonicalVercel(local), false);
  assert.equal(caretakerEndpointForLocation(github), ARCSWEEP_CARETAKER_EDGE_ENDPOINT);
  assert.equal(caretakerEndpointForLocation(vercel), ARCSWEEP_CARETAKER_EDGE_ENDPOINT);
  assert.equal(caretakerEndpointForLocation(local), CARETAKER_API_PATH);
});

test('local Caretaker keeps the existing House/Hearthgate session lane', async () => {
  let restored = 0;
  const transport = await resolveCaretakerTransport({
    location: local,
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

test('local Caretaker can use the signed-in Supabase identity if its House exchange is unavailable', async () => {
  const transport = await resolveCaretakerTransport({
    location: local,
    storage: null,
    readStoredToken: () => '',
    restoreSession: async () => '',
    accessTokenProvider: async () => 'fresh-supabase-token',
  });
  assert.equal(transport.endpoint, CARETAKER_API_PATH);
  assert.equal(transport.token, 'fresh-supabase-token');
  assert.equal(transport.auth_mode, 'supabase-bearer');
  assert.equal(transport.cross_origin, false);
});
