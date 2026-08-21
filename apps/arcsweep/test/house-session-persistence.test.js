import test from 'node:test';
import assert from 'node:assert/strict';
import { houseSessionCookie, issueHouseSession, verifyHouseSessionToken } from '../../../netlify/functions/_shared/house-session.mjs';

const secret = 'test-house-session-secret';
const env = { get(name) { return name === 'HOUSE_SESSION_SECRET' ? secret : null; } };

test('House Runtime sessions persist for thirty days by default', () => {
  const now = Date.parse('2026-08-21T18:00:00.000Z');
  const session = issueHouseSession(env, now);
  assert.equal(session.ttl, 30 * 24 * 60 * 60);
  assert.ok(verifyHouseSessionToken(session.token, env, now + 29 * 24 * 60 * 60 * 1000));
  assert.equal(verifyHouseSessionToken(session.token, env, now + 31 * 24 * 60 * 60 * 1000), null);
});

test('production House cookie remains HttpOnly, strict, secure, and persistent', () => {
  const cookie = houseSessionCookie(new Request('https://example.test/api/v1/house/session'), 'token', 3600);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /Max-Age=3600/);
});
