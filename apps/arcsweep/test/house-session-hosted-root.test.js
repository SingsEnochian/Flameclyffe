import test from 'node:test';
import assert from 'node:assert/strict';
import {
  issueHouseSession,
  verifyHouseSessionToken,
} from '../../../netlify/functions/_shared/house-session.mjs';

const env = (values) => ({ get: (name) => values[name] });

test('hosted House session derives a stable signing key from the Supabase service-role root', () => {
  const runtimeA = env({ SUPABASE_SERVICE_ROLE_KEY: 'service-role-root-for-test' });
  const runtimeB = env({ SUPABASE_SERVICE_ROLE_KEY: 'service-role-root-for-test' });
  const issued = issueHouseSession(runtimeA, 1_000_000);
  assert.equal(verifyHouseSessionToken(issued.token, runtimeB, 1_001_000)?.role, 'steward');
});

test('hosted House session rejects a token when the Supabase service-role root differs', () => {
  const issued = issueHouseSession(env({ SUPABASE_SERVICE_ROLE_KEY: 'root-a' }), 1_000_000);
  assert.equal(verifyHouseSessionToken(issued.token, env({ SUPABASE_SERVICE_ROLE_KEY: 'root-b' }), 1_001_000), null);
});
