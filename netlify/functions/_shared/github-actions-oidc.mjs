import { createPublicKey, verify as verifySignature } from 'node:crypto';

const DEFAULT_ISSUER = 'https://token.actions.githubusercontent.com';
const DEFAULT_AUDIENCE = 'flameclyffe-lanternbridge';
const DEFAULT_REPOSITORY = 'mdkubit/UH-Lanternbridge';
const DEFAULT_REF = 'refs/heads/main';
const DEFAULT_WORKFLOW = '.github/workflows/flameclyffe-lanternbridge-delivery.yml';
const CLOCK_SKEW_SECONDS = 60;
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedJwks = null;
let cachedJwksAt = 0;

function decodeBase64Url(value) {
  return Buffer.from(String(value || ''), 'base64url');
}

function decodeJsonSegment(value, label) {
  try {
    return JSON.parse(decodeBase64Url(value).toString('utf8'));
  } catch {
    throw new Error(`GitHub OIDC ${label} is not valid JSON.`);
  }
}

function bearerToken(request) {
  const value = String(request?.headers?.get?.('authorization') || '').trim();
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function audienceMatches(actual, expected) {
  if (Array.isArray(actual)) return actual.includes(expected);
  return String(actual || '') === expected;
}

function validateClaims(claims, {
  nowSeconds,
  issuer,
  audience,
  repository,
  ref,
  workflow,
}) {
  if (claims.iss !== issuer) return 'issuer_mismatch';
  if (!audienceMatches(claims.aud, audience)) return 'audience_mismatch';
  if (claims.repository !== repository) return 'repository_mismatch';
  if (claims.ref !== ref) return 'ref_mismatch';
  if (claims.ref_type && claims.ref_type !== 'branch') return 'ref_type_mismatch';
  if (claims.repository_visibility && claims.repository_visibility !== 'private') return 'repository_visibility_mismatch';

  const workflowRef = String(claims.workflow_ref || '');
  if (!workflowRef.startsWith(`${repository}/${workflow}@`)) return 'workflow_ref_mismatch';

  const exp = Number(claims.exp);
  const nbf = claims.nbf == null ? null : Number(claims.nbf);
  const iat = Number(claims.iat);
  if (!Number.isFinite(exp) || exp < nowSeconds - CLOCK_SKEW_SECONDS) return 'expired';
  if (nbf != null && (!Number.isFinite(nbf) || nbf > nowSeconds + CLOCK_SKEW_SECONDS)) return 'not_yet_valid';
  if (!Number.isFinite(iat) || iat > nowSeconds + CLOCK_SKEW_SECONDS) return 'issued_in_future';

  return null;
}

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { accept: 'application/json', 'user-agent': 'Flameclyffe-Lanternbridge-OIDC/1.0' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GitHub OIDC metadata fetch failed: ${response.status}`);
  return response.json();
}

async function resolveJwks({ issuer, fetchImpl, useCache }) {
  if (useCache && cachedJwks && Date.now() - cachedJwksAt < JWKS_CACHE_TTL_MS) return cachedJwks;

  const discovery = await fetchJson(`${issuer}/.well-known/openid-configuration`, fetchImpl);
  if (discovery.issuer !== issuer) throw new Error('GitHub OIDC discovery issuer mismatch.');
  const jwksUrl = new URL(String(discovery.jwks_uri || ''));
  if (jwksUrl.protocol !== 'https:' || jwksUrl.hostname !== 'token.actions.githubusercontent.com') {
    throw new Error('GitHub OIDC discovery returned an untrusted JWKS endpoint.');
  }

  const jwks = await fetchJson(jwksUrl.href, fetchImpl);
  if (!Array.isArray(jwks.keys)) throw new Error('GitHub OIDC JWKS contains no keys.');
  if (useCache) {
    cachedJwks = jwks;
    cachedJwksAt = Date.now();
  }
  return jwks;
}

export async function authoriseGitHubActionsOidcRequest(request, {
  fetchImpl = fetch,
  issuer = DEFAULT_ISSUER,
  audience = DEFAULT_AUDIENCE,
  repository = DEFAULT_REPOSITORY,
  ref = DEFAULT_REF,
  workflow = DEFAULT_WORKFLOW,
  now = Date.now(),
  useCache = true,
} = {}) {
  const token = bearerToken(request);
  if (!token || token.split('.').length !== 3) return { authorised: false, reason: 'missing_or_non_jwt_bearer', claims: null };

  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  let header;
  let claims;
  try {
    header = decodeJsonSegment(encodedHeader, 'header');
    claims = decodeJsonSegment(encodedPayload, 'payload');
  } catch (error) {
    return { authorised: false, reason: 'malformed_jwt', claims: null, error: error.message };
  }

  if (header.alg !== 'RS256' || !header.kid) return { authorised: false, reason: 'unsupported_header', claims: null };

  const claimProblem = validateClaims(claims, {
    nowSeconds: Math.floor(now / 1000), issuer, audience, repository, ref, workflow,
  });
  if (claimProblem) return { authorised: false, reason: claimProblem, claims: null };

  try {
    const jwks = await resolveJwks({ issuer, fetchImpl, useCache });
    const jwk = jwks.keys.find((candidate) => candidate.kid === header.kid && candidate.kty === 'RSA');
    if (!jwk) return { authorised: false, reason: 'signing_key_not_found', claims: null };

    const key = createPublicKey({ key: jwk, format: 'jwk' });
    const valid = verifySignature(
      'RSA-SHA256',
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      key,
      decodeBase64Url(encodedSignature),
    );
    if (!valid) return { authorised: false, reason: 'signature_invalid', claims: null };
  } catch (error) {
    return { authorised: false, reason: 'verification_unavailable', claims: null, error: error?.message || String(error) };
  }

  return { authorised: true, reason: null, claims };
}

export const GITHUB_ACTIONS_OIDC_DEFAULTS = Object.freeze({
  issuer: DEFAULT_ISSUER,
  audience: DEFAULT_AUDIENCE,
  repository: DEFAULT_REPOSITORY,
  ref: DEFAULT_REF,
  workflow: DEFAULT_WORKFLOW,
});
