import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import {
  GITHUB_OIDC_ISSUER,
  HOUSE_AGENT_CHATTER_AUDIENCE,
  HOUSE_AGENT_CHATTER_REPOSITORY,
  HOUSE_AGENT_CHATTER_WORKFLOW_REF,
  verifyHouseAgentChatterOidc,
} from '../../../api/_shared/house-agent-chatter-oidc.mjs';

const NOW = Date.parse('2026-09-24T15:00:00.000Z');
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' });
jwk.kid = 'chatter-test-key';
jwk.alg = 'RS256';
jwk.use = 'sig';

function token(overrides = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: jwk.kid })).toString('base64url');
  const claims = {
    iss: GITHUB_OIDC_ISSUER,
    aud: HOUSE_AGENT_CHATTER_AUDIENCE,
    repository: HOUSE_AGENT_CHATTER_REPOSITORY,
    ref: 'refs/heads/main',
    workflow_ref: HOUSE_AGENT_CHATTER_WORKFLOW_REF,
    event_name: 'schedule',
    run_id: '777',
    run_attempt: '1',
    sha: 'cafebabe',
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

test('agent chatter accepts its exact scheduled workflow identity', async () => {
  const identity = await verifyHouseAgentChatterOidc(token(), { fetchImpl, now: NOW });
  assert.equal(identity.repository, HOUSE_AGENT_CHATTER_REPOSITORY);
  assert.equal(identity.workflow_ref, HOUSE_AGENT_CHATTER_WORKFLOW_REF);
  assert.equal(identity.event_name, 'schedule');
});

test('agent chatter also accepts explicit dispatch and its narrow post-merge push trigger', async () => {
  for (const event_name of ['workflow_dispatch', 'push']) {
    const identity = await verifyHouseAgentChatterOidc(token({ event_name }), { fetchImpl, now: NOW });
    assert.equal(identity.event_name, event_name);
  }
});

test('agent chatter rejects another workflow, branch, audience, or event', async () => {
  await assert.rejects(
    verifyHouseAgentChatterOidc(token({ workflow_ref: 'SingsEnochian/Flameclyffe/.github/workflows/other.yml@refs/heads/main' }), { fetchImpl, now: NOW }),
    /workflow is not authorised/i,
  );
  await assert.rejects(
    verifyHouseAgentChatterOidc(token({ ref: 'refs/heads/feature/test' }), { fetchImpl, now: NOW }),
    /ref is not authorised/i,
  );
  await assert.rejects(
    verifyHouseAgentChatterOidc(token({ aud: 'flameclyffe-house-smoke/v1' }), { fetchImpl, now: NOW }),
    /audience is invalid/i,
  );
  await assert.rejects(
    verifyHouseAgentChatterOidc(token({ event_name: 'pull_request' }), { fetchImpl, now: NOW }),
    /event is not authorised/i,
  );
});
