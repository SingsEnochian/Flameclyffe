import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import {
  GITHUB_OIDC_ISSUER,
  HOUSE_SMOKE_AUDIENCE,
  HOUSE_SMOKE_REPOSITORY,
  HOUSE_SMOKE_WORKFLOW_REF,
  verifyGitHubActionsOidc,
} from '../../../api/_shared/github-actions-oidc.mjs';

const NOW = Date.parse('2026-08-24T18:55:00.000Z');
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' });
jwk.kid = 'smoke-test-key';
jwk.alg = 'RS256';
jwk.use = 'sig';

function token(overrides = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: jwk.kid })).toString('base64url');
  const claims = {
    iss: GITHUB_OIDC_ISSUER,
    aud: HOUSE_SMOKE_AUDIENCE,
    repository: HOUSE_SMOKE_REPOSITORY,
    ref: 'refs/heads/main',
    workflow_ref: HOUSE_SMOKE_WORKFLOW_REF,
    event_name: 'workflow_dispatch',
    run_id: '123456',
    run_attempt: '1',
    sha: 'deadbeef',
    iat: Math.floor(NOW / 1000) - 30,
    nbf: Math.floor(NOW / 1000) - 30,
    exp: Math.floor(NOW / 1000) + 300,
    ...overrides,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const input = `${header}.${payload}`;
  const signature = sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url');
  return `${input}.${signature}`;
}

const fetchImpl = async (url) => {
  if (url.endsWith('/.well-known/openid-configuration')) {
    return new Response(JSON.stringify({ issuer: GITHUB_OIDC_ISSUER, jwks_uri: `${GITHUB_OIDC_ISSUER}/test-jwks` }), { status: 200 });
  }
  if (url.endsWith('/test-jwks')) return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
  return new Response('not found', { status: 404 });
};

test('production circulation accepts the exact main workflow for manual and push triggers', async () => {
  const manual = await verifyGitHubActionsOidc(token(), { fetchImpl, now: NOW });
  assert.equal(manual.repository, HOUSE_SMOKE_REPOSITORY);
  assert.equal(manual.ref, 'refs/heads/main');
  assert.equal(manual.workflow_ref, HOUSE_SMOKE_WORKFLOW_REF);
  assert.equal(manual.event_name, 'workflow_dispatch');

  const pushed = await verifyGitHubActionsOidc(token({ event_name: 'push' }), { fetchImpl, now: NOW });
  assert.equal(pushed.event_name, 'push');
});

test('production circulation rejects another workflow even when repo and branch match', async () => {
  await assert.rejects(
    verifyGitHubActionsOidc(token({ workflow_ref: 'SingsEnochian/Flameclyffe/.github/workflows/other.yml@refs/heads/main' }), { fetchImpl, now: NOW }),
    /workflow is not authorised/i,
  );
});

test('production circulation rejects a non-main ref, invalid audience, and unrelated event', async () => {
  await assert.rejects(verifyGitHubActionsOidc(token({ ref: 'refs/heads/feature/test' }), { fetchImpl, now: NOW }), /ref is not authorised/i);
  await assert.rejects(verifyGitHubActionsOidc(token({ aud: 'wrong-audience' }), { fetchImpl, now: NOW }), /audience is invalid/i);
  await assert.rejects(verifyGitHubActionsOidc(token({ event_name: 'pull_request' }), { fetchImpl, now: NOW }), /event is not authorised/i);
});
