import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const PROD_COOKIE = '__Host-hearthgate_session';
const DEV_COOKIE = 'hearthgate_session';
const VERSION = 1;
const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_TTL_SECONDS = 90 * 24 * 60 * 60;
const DEFAULT_SUPABASE_URL = 'https://rufrmjyusalnifpegllj.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_z69-aAbQvzFFDRk4SHDYrQ_FuqirkLD';
const DEFAULT_STEWARD_USER_SHA256 = '9d3b4543cb480f113880f0f7f2e68b28945c09eaff37955db08ca07a55ef723b';
const BOOTSTRAP_SECONDARY_STEWARD_SHA256 = 'a644109c69176e9aedbf1695c39a83366e30bbaa1d6a7f61011ebaebad1c2d69';

function secretEqual(actual, expected) {
  if (!actual || !expected) return false;
  const left = Buffer.from(String(actual));
  const right = Buffer.from(String(expected));
  return left.length === right.length && timingSafeEqual(left, right);
}

const encode = (value) => Buffer.from(value).toString('base64url');
const decode = (value) => Buffer.from(value, 'base64url').toString('utf8');

function signingSecret(env) {
  const explicit = env.get('HOUSE_SESSION_SECRET') || env.get('ARCSWEEP_RUNTIME_TOKEN');
  if (explicit) return explicit;
  const hostedRoot = env.get('HFTOKEN') || env.get('HF_TOKEN') || env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!hostedRoot) return null;
  return createHash('sha256').update(`hearthgate-house-session/v1\0${hostedRoot}`).digest('base64url');
}

function stewardCredentials(env) {
  const primary = env.get('ARCSWEEP_STEWARD_KEY');
  const secondary = env.get('ARCSWEEP_STEWARD_KEY_SECONDARY');
  if (primary || secondary) return [primary, secondary].filter(Boolean);
  const runtime = env.get('ARCSWEEP_RUNTIME_TOKEN');
  return runtime ? [runtime] : [];
}

function stewardUserAllowed(userId, env) {
  const value = String(userId || '').trim();
  if (!value) return false;
  const explicit = new Set(String(env.get('HOUSE_STEWARD_USER_IDS') || env.get('HOUSE_STEWARD_USER_ID') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean));
  if (explicit.size) return explicit.has(value);
  const expected = env.get('HOUSE_STEWARD_USER_SHA256') || DEFAULT_STEWARD_USER_SHA256;
  const actual = createHash('sha256').update(value).digest('hex');
  return secretEqual(actual, expected);
}

function signature(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function cookiesFrom(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const split = part.indexOf('=');
    return split < 0 ? [part, ''] : [part.slice(0, split), part.slice(split + 1)];
  }));
}

function bearer(request) {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

export async function validateSupabaseStewardToken(accessToken, env, fetchImpl = fetch) {
  const token = String(accessToken || '').trim();
  if (!token) return false;
  const baseUrl = String(env.get('SUPABASE_URL') || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const publishableKey = env.get('SUPABASE_PUBLISHABLE_KEY') || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  try {
    const response = await fetchImpl(`${baseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const user = await response.json().catch(() => null);
    return stewardUserAllowed(user?.id, env);
  } catch {
    return false;
  }
}

export function issueHouseSession(env, now = Date.now()) {
  const secret = signingSecret(env);
  if (!secret) throw new Error('House Runtime session signing is not configured.');
  const ttl = Math.max(300, Math.min(Number(env.get('HOUSE_SESSION_TTL_SECONDS')) || DEFAULT_TTL_SECONDS, MAX_TTL_SECONDS));
  const claims = { v: VERSION, role: 'steward', iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + ttl, nonce: randomBytes(18).toString('base64url') };
  const payload = encode(JSON.stringify(claims));
  return { token: `${payload}.${signature(payload, secret)}`, claims, ttl };
}

export function verifyHouseSessionToken(token, env, now = Date.now()) {
  const secret = signingSecret(env);
  const [payload, supplied, extra] = String(token || '').split('.');
  if (!secret || !payload || !supplied || extra || !secretEqual(supplied, signature(payload, secret))) return null;
  try {
    const claims = JSON.parse(decode(payload));
    const seconds = Math.floor(now / 1000);
    return claims.v === VERSION && claims.role === 'steward' && claims.iat <= seconds + 60 && claims.exp > seconds ? claims : null;
  } catch { return null; }
}

export function readHouseSession(request, env, now = Date.now()) {
  const cookies = cookiesFrom(request.headers.get('cookie') || '');
  return verifyHouseSessionToken(cookies[PROD_COOKIE] || cookies[DEV_COOKIE], env, now);
}

export function authoriseHouseRequest(request, env, now = Date.now()) {
  const claims = readHouseSession(request, env, now);
  if (claims) return { mode: 'session', claims };
  if (secretEqual(bearer(request), env.get('ARCSWEEP_RUNTIME_TOKEN'))) return { mode: 'bearer', claims: { role: 'steward' } };
  return null;
}

export function validateStewardCredential(credential, env) {
  if (stewardCredentials(env).some((expected) => secretEqual(credential, expected))) return true;
  const suppliedHash = createHash('sha256').update(String(credential || '')).digest('hex');
  const expectedHash = env.get('ARCSWEEP_STEWARD_KEY_SECONDARY_SHA256') || BOOTSTRAP_SECONDARY_STEWARD_SHA256;
  return secretEqual(suppliedHash, expectedHash);
}

export function houseSessionCookie(request, token, ttl) {
  const production = new URL(request.url).protocol === 'https:';
  const name = production ? PROD_COOKIE : DEV_COOKIE;
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ttl}${production ? '; Secure' : ''}`;
}

export function clearHouseSessionCookies() {
  return [
    `${PROD_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure`,
    `${DEV_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
  ];
}
