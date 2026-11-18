'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync, sign } = require('node:crypto');
const { accessConfiguration, createAccessVerifier } = require('../wayglass/house-access');

test('verified Access owner assertion authorises a time-bounded House session', async () => {
  const config = accessConfiguration({
    WAYGLASS_ACCESS_ISSUER: 'https://fixture.cloudflareaccess.com',
    WAYGLASS_ACCESS_AUDIENCE: 'fixture-audience',
    WAYGLASS_ACCESS_OWNER_EMAIL: 'owner@example.test',
    WAYGLASS_ACCESS_PUBLIC_ORIGIN: 'https://wayglass.example.test',
  });
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'fixture-key' };
  const now = 1800000000000;
  const seconds = now / 1000;
  let reads = 0;
  const verify = createAccessVerifier(config, {
    clock: () => now,
    fetchImpl: async url => {
      assert.equal(url, config.issuer + '/cdn-cgi/access/certs');
      reads++;
      return { ok: true, json: async () => ({ keys: [jwk] }) };
    },
  });
  const encode = data => Buffer.from(JSON.stringify(data)).toString('base64url');
  const token = claims => {
    const data = encode({ alg: 'RS256', kid: jwk.kid }) + '.' + encode({
      type: 'app', iss: config.issuer, aud: [config.audience], email: config.owner,
      sub: 'fixture-owner', iat: seconds - 10, exp: seconds + 90, ...claims,
    });
    return data + '.' + sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url');
  };
  assert.deepEqual(await verify(token({})), { expiresAt: seconds + 90 });
  assert.equal(await verify(token({ aud: ['different-app'] })), null);
  assert.equal(await verify(token({ email: 'different@example.test' })), null);
  assert.equal(await verify(token({ exp: seconds })), null);
  assert.equal(await verify(token({}) + 'A'), null);
  assert.equal(reads, 1);
  const { issueHouseSession, authoriseHouseRequest, houseSessionCookie } =
    await import('../wayglass-runtime/house-session.mjs');
  const env = { get: name => name === 'HOUSE_SESSION_SECRET' ? 'fixture-only-signing-secret' : undefined };
  const session = issueHouseSession(env, now, { expiresAt: seconds + 90 });
  const request = new Request(config.origin);
  const cookie = houseSessionCookie(request, session.token, session.ttl);
  assert.match(cookie, /^__Host-hearthgate_session=.*; Path=\/; HttpOnly; SameSite=Strict; Max-Age=90; Secure$/);
  const resume = new Request(config.origin, { headers: { cookie: cookie.split(';')[0] } });
  assert.equal(authoriseHouseRequest(resume, env, now + 1000)?.mode, 'session');
  assert.equal(authoriseHouseRequest(resume, env, now + 90_000), null);
});
