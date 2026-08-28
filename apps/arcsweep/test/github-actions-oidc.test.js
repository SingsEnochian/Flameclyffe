import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, sign } from 'node:crypto';
import {
  authoriseGitHubActionsOidcRequest,
  GITHUB_ACTIONS_OIDC_DEFAULTS,
} from '../../../netlify/functions/_shared/github-actions-oidc.mjs';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: 'jwk' });
publicJwk.kid = 'test-key';
publicJwk.alg = 'RS256';
publicJwk.use = 'sig';

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function mint(overrides = {}, key = privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'RS256', typ: 'JWT', kid: 'test-key' });
  const payload = encode({
    iss: GITHUB_ACTIONS_OIDC_DEFAULTS.issuer,
    aud: GITHUB_ACTIONS_OIDC_DEFAULTS.audience,
    repository: GITHUB_ACTIONS_OIDC_DEFAULTS.repository,
    repository_owner: 'mdkubit',
    repository_visibility: 'private',
    ref: GITHUB_ACTIONS_OIDC_DEFAULTS.ref,
    ref_type: 'branch',
    workflow_ref: `${GITHUB_ACTIONS_OIDC_DEFAULTS.repository}/${GITHUB_ACTIONS_OIDC_DEFAULTS.workflow}@${GITHUB_ACTIONS_OIDC_DEFAULTS.ref}`,
    event_name: 'push',
    sha: '0123456789012345678901234567890123456789',
    iat: now - 5,
    nbf: now - 5,
    exp: now + 300,
    ...overrides,
  });
  const signingInput = `${header}.${payload}`;
  const signature = sign('RSA-SHA256', Buffer.from(signingInput), key).toString('base64url');
  return `${signingInput}.${signature}`;
}

function requestWith(token) {
  return new Request('https://flameclyffe.example/api/v1/house/lanternbridge', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
}

function oidcFetch() {
  return async (url) => {
    if (String(url).endsWith('/.well-known/openid-configuration')) {
      return new Response(JSON.stringify({
        issuer: GITHUB_ACTIONS_OIDC_DEFAULTS.issuer,
        jwks_uri: `${GITHUB_ACTIONS_OIDC_DEFAULTS.issuer}/.well-known/jwks`,
      }), { status: 200 });
    }
    if (String(url).endsWith('/.well-known/jwks')) {
      return new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 });
    }
    throw new Error(`Unexpected OIDC fetch: ${url}`);
  };
}

test('accepts a correctly signed token from the exact private Lanternbridge workflow', async () => {
  const result = await authoriseGitHubActionsOidcRequest(requestWith(mint()), {
    fetchImpl: oidcFetch(),
    useCache: false,
  });
  assert.equal(result.authorised, true);
  assert.equal(result.claims.repository, 'mdkubit/UH-Lanternbridge');
  assert.equal(result.claims.sha, '0123456789012345678901234567890123456789');
});

test('rejects a valid signature from the wrong repository before key fetch', async () => {
  let fetches = 0;
  const result = await authoriseGitHubActionsOidcRequest(requestWith(mint({ repository: 'someone/Else' })), {
    fetchImpl: async (...args) => { fetches += 1; return oidcFetch()(...args); },
    useCache: false,
  });
  assert.equal(result.authorised, false);
  assert.equal(result.reason, 'repository_mismatch');
  assert.equal(fetches, 0);
});

test('rejects a token minted by another workflow in the same repository', async () => {
  const result = await authoriseGitHubActionsOidcRequest(requestWith(mint({
    workflow_ref: 'mdkubit/UH-Lanternbridge/.github/workflows/unrelated.yml@refs/heads/main',
  })), { fetchImpl: oidcFetch(), useCache: false });
  assert.equal(result.authorised, false);
  assert.equal(result.reason, 'workflow_ref_mismatch');
});

test('rejects a token whose signature does not match GitHub JWKS', async () => {
  const { privateKey: otherKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const result = await authoriseGitHubActionsOidcRequest(requestWith(mint({}, otherKey)), {
    fetchImpl: oidcFetch(),
    useCache: false,
  });
  assert.equal(result.authorised, false);
  assert.equal(result.reason, 'signature_invalid');
});

test('rejects expired tokens', async () => {
  const now = Math.floor(Date.now() / 1000);
  const result = await authoriseGitHubActionsOidcRequest(requestWith(mint({ exp: now - 120 })), {
    fetchImpl: oidcFetch(),
    useCache: false,
  });
  assert.equal(result.authorised, false);
  assert.equal(result.reason, 'expired');
});
