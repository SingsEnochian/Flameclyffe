import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthorizationSession } from '../src/authorization-session.js';

test('a new opening has no saved provider code or session', async () => {
  const session = createAuthorizationSession(async code => {
    assert.equal(code, 'synthetic-provider-code');
    return { authorized: true, session_token: 'synthetic-host-session', provider: 'test', route_id: 'flame:bluebird:test' };
  });
  assert.deepEqual(session.headers(), {});
  await session.authorize('synthetic-provider-code');
  assert.deepEqual(session.headers(), { 'X-Wayglass-Bluebird-Session': 'synthetic-host-session' });
  assert.equal(JSON.stringify(session.headers()).includes('synthetic-provider-code'), false);
  session.clear();
  assert.deepEqual(session.headers(), {});
  assert.equal(session.route(), null);
});

test('rejected or unverified credentials never authorize the page', async () => {
  const session = createAuthorizationSession(async () => ({ authorized: false }));
  await assert.rejects(session.authorize('wrong'), /did not authorize/);
  assert.deepEqual(session.headers(), {});
  await assert.rejects(session.authorize(''), /Enter Bluebird/);
});

test('leaving during provider verification cannot revive the old session', async () => {
  let finish;
  const session = createAuthorizationSession(() => new Promise(resolve => { finish = resolve; }));
  const pending = session.authorize('synthetic-code');
  session.clear();
  finish({ authorized: true, session_token: 'old-session' });
  await assert.rejects(pending, /interrupted/);
  assert.deepEqual(session.headers(), {});
});
