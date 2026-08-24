import { createPublicKey, verify as verifySignature } from 'node:crypto';

export const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com';
export const HOUSE_SMOKE_AUDIENCE = 'flameclyffe-house-smoke/v1';
export const HOUSE_SMOKE_REPOSITORY = 'SingsEnochian/Flameclyffe';
export const HOUSE_SMOKE_WORKFLOW_REF = 'SingsEnochian/Flameclyffe/.github/workflows/vercel-production-authenticated-smoke.yml@refs/heads/main';

let cachedJwks = null;
let cachedAt = 0;

const decodeJson = (value) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

async function githubJwks(fetchImpl, now) {
  if (cachedJwks && now - cachedAt < 15 * 60_000) return cachedJwks;
  const discovery = await fetchImpl(`${GITHUB_OIDC_ISSUER}/.well-known/openid-configuration`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!discovery.ok) throw new Error(`GitHub OIDC discovery failed: ${discovery.status}`);
  const metadata = await discovery.json();
  if (metadata?.issuer !== GITHUB_OIDC_ISSUER || !String(metadata?.jwks_uri || '').startsWith(`${GITHUB_OIDC_ISSUER}/`)) {
    throw new Error('GitHub OIDC discovery metadata is not trusted.');
  }
  const response = await fetchImpl(metadata.jwks_uri, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`GitHub OIDC key discovery failed: ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body?.keys)) throw new Error('GitHub OIDC key discovery returned no keys.');
  cachedJwks = body.keys;
  cachedAt = now;
  return cachedJwks;
}

function audienceIncludes(aud, expected) {
  return Array.isArray(aud) ? aud.includes(expected) : aud === expected;
}

export async function verifyGitHubActionsOidc(token, {
  fetchImpl = fetch,
  now = Date.now(),
  audience = HOUSE_SMOKE_AUDIENCE,
  repository = HOUSE_SMOKE_REPOSITORY,
  workflowRef = HOUSE_SMOKE_WORKFLOW_REF,
} = {}) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('GitHub OIDC token is malformed.');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson(encodedHeader);
  const claims = decodeJson(encodedPayload);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('GitHub OIDC token algorithm is not accepted.');

  const keys = await githubJwks(fetchImpl, now);
  const jwk = keys.find((candidate) => candidate.kid === header.kid && candidate.kty === 'RSA');
  if (!jwk) throw new Error('GitHub OIDC signing key was not found.');
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  const validSignature = verifySignature(
    'RSA-SHA256',
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    publicKey,
    Buffer.from(encodedSignature, 'base64url'),
  );
  if (!validSignature) throw new Error('GitHub OIDC signature is invalid.');

  const seconds = Math.floor(now / 1000);
  if (claims.iss !== GITHUB_OIDC_ISSUER) throw new Error('GitHub OIDC issuer is invalid.');
  if (!audienceIncludes(claims.aud, audience)) throw new Error('GitHub OIDC audience is invalid.');
  if (!Number.isFinite(claims.exp) || claims.exp <= seconds) throw new Error('GitHub OIDC token is expired.');
  if (Number.isFinite(claims.nbf) && claims.nbf > seconds + 30) throw new Error('GitHub OIDC token is not active yet.');
  if (claims.repository !== repository) throw new Error('GitHub OIDC repository is not authorised.');
  if (claims.ref !== 'refs/heads/main') throw new Error('GitHub OIDC ref is not authorised.');
  if (claims.workflow_ref !== workflowRef) throw new Error('GitHub OIDC workflow is not authorised.');
  if (!['workflow_dispatch', 'push'].includes(claims.event_name)) throw new Error('GitHub OIDC event is not authorised.');

  return Object.freeze({
    repository: claims.repository,
    ref: claims.ref,
    workflow_ref: claims.workflow_ref,
    event_name: claims.event_name,
    run_id: claims.run_id || null,
    run_attempt: claims.run_attempt || null,
    sha: claims.sha || null,
  });
}
