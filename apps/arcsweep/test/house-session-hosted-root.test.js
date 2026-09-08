import test from 'node:test';
import assert from 'node:assert/strict';
import {
  issueHouseSession,
  verifyHouseSessionToken,
} from '../../../netlify/functions/_shared/house-session.mjs';

const env = (values) => ({ get: (name) => values[name] });

const hostedServiceRoots = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_SECRET_KEY',
];

for (const name of hostedServiceRoots) {
  test(`hosted House session derives a stable signing key from ${name}`, () => {
    const runtimeA = env({ [name]: 'service-role-root-for-test' });
    const runtimeB = env({ [name]: 'service-role-root-for-test' });
    const issued = issueHouseSession(runtimeA, 1_000_000);
    assert.equal(verifyHouseSessionToken(issued.token, runtimeB, 1_001_000)?.role, 'steward');
  });
}

test('hosted House session signing aliases resolve to the same stable root', () => {
  const issued = issueHouseSession(env({ SUPABASE_SERVICE_KEY: 'shared-hosted-root' }), 1_000_000);
  assert.equal(
    verifyHouseSessionToken(issued.token, env({ SUPABASE_SECRET_KEY: 'shared-hosted-root' }), 1_001_000)?.role,
    'steward',
  );
});

test('hosted House session rejects a token when the Supabase service-role root differs', () => {
  const issued = issueHouseSession(env({ SUPABASE_SERVICE_ROLE_KEY: 'root-a' }), 1_000_000);
  assert.equal(verifyHouseSessionToken(issued.token, env({ SUPABASE_SERVICE_KEY: 'root-b' }), 1_001_000), null);
});