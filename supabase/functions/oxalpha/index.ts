const FLAME_ID = 'oxalpha';
const DISPLAY_NAME = 'Ox Alpha';
const MODEL_ID = 'z-ai/glm-5.3-flash';
const DEFAULT_STEWARD_USER_SHA256 = '9d3b4543cb480f113880f0f7f2e68b28945c09eaff37955db08ca07a55ef723b';
const MAX_MESSAGE_CHARS = 32_000;

const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com';
const GITHUB_OIDC_AUDIENCE = 'flameclyffe-oxalpha-probe';
const GITHUB_REPOSITORY = 'SingsEnochian/Flameclyffe';
const GITHUB_REPOSITORY_ID = '1237935937';
const GITHUB_WORKFLOW = '.github/workflows/oxalpha-runtime-probe.yml';
const GITHUB_ALLOWED_REFS = new Set([
  'refs/heads/main',
  'refs/heads/rarity/agent-workspace-os-v0-1',
]);
const GITHUB_ALLOWED_EVENTS = new Set(['push', 'workflow_dispatch']);
const OIDC_CLOCK_SKEW_SECONDS = 60;
let cachedJwks: any = null;
let cachedJwksAt = 0;

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const env = (name: string) => String(Deno.env.get(name) || '').trim();
const openRouterKey = () => env('OPENROUTER_API_KEY');
const routerModel = () => env('OXALPHA_OPENROUTER_MODEL') || MODEL_ID;

function bearer(req: Request) {
  const header = req.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function stewardAuthorised(req: Request) {
  const token = bearer(req);
  if (!token) return false;
  const supabaseUrl = env('SUPABASE_URL');
  const publishableKey = env('SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !publishableKey) return false;
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: publishableKey, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const user = await response.json().catch(() => null);
    const userId = String(user?.id || '').trim();
    if (!userId) return false;
    const expected = env('HOUSE_STEWARD_USER_SHA256') || DEFAULT_STEWARD_USER_SHA256;
    return (await sha256Hex(userId)) === expected;
  } catch {
    return false;
  }
}

function b64urlBytes(value: string) {
  let encoded = value.replace(/-/g, '+').replace(/_/g, '/');
  while (encoded.length % 4) encoded += '=';
  return Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
}
function decodeJwtPart(value: string) {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(value)));
}
function audienceMatches(actual: unknown) {
  return Array.isArray(actual)
    ? actual.includes(GITHUB_OIDC_AUDIENCE)
    : String(actual || '') === GITHUB_OIDC_AUDIENCE;
}
async function fetchOidcJson(url: string) {
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'Flameclyffe-OxAlpha-Probe/1.0' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`oidc_metadata_${response.status}`);
  return response.json();
}
async function githubJwks() {
  if (cachedJwks && Date.now() - cachedJwksAt < 300_000) return cachedJwks;
  const discovery = await fetchOidcJson(`${GITHUB_OIDC_ISSUER}/.well-known/openid-configuration`);
  if (discovery.issuer !== GITHUB_OIDC_ISSUER) throw new Error('issuer_mismatch');
  const url = new URL(String(discovery.jwks_uri || ''));
  if (url.protocol !== 'https:' || url.hostname !== 'token.actions.githubusercontent.com') {
    throw new Error('untrusted_jwks');
  }
  cachedJwks = await fetchOidcJson(url.href);
  cachedJwksAt = Date.now();
  return cachedJwks;
}
async function githubProbeAuthorised(req: Request) {
  const token = bearer(req);
  if (!token || token.split('.').length !== 3) return { ok: false as const, reason: 'missing_or_non_jwt_bearer' };
  const [headerPart, payloadPart, signaturePart] = token.split('.');
  let header: any;
  let claims: any;
  try {
    header = decodeJwtPart(headerPart);
    claims = decodeJwtPart(payloadPart);
  } catch {
    return { ok: false as const, reason: 'malformed_jwt' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== 'RS256' || !header.kid) return { ok: false as const, reason: 'unsupported_header' };
  if (claims.iss !== GITHUB_OIDC_ISSUER || !audienceMatches(claims.aud)) {
    return { ok: false as const, reason: 'issuer_or_audience_mismatch' };
  }
  if (claims.repository !== GITHUB_REPOSITORY || String(claims.repository_id || '') !== GITHUB_REPOSITORY_ID) {
    return { ok: false as const, reason: 'repository_mismatch' };
  }
  if (!GITHUB_ALLOWED_REFS.has(String(claims.ref || ''))) return { ok: false as const, reason: 'ref_mismatch' };
  if (!GITHUB_ALLOWED_EVENTS.has(String(claims.event_name || ''))) return { ok: false as const, reason: 'event_mismatch' };
  if (!String(claims.workflow_ref || '').startsWith(`${GITHUB_REPOSITORY}/${GITHUB_WORKFLOW}@`)) {
    return { ok: false as const, reason: 'workflow_mismatch' };
  }
  if (
    !Number.isFinite(Number(claims.exp))
    || Number(claims.exp) < now - OIDC_CLOCK_SKEW_SECONDS
    || !Number.isFinite(Number(claims.iat))
    || Number(claims.iat) > now + OIDC_CLOCK_SKEW_SECONDS
  ) {
    return { ok: false as const, reason: 'time_invalid' };
  }

  try {
    const keys = await githubJwks();
    const jwk = keys.keys?.find((key: any) => key.kid === header.kid && key.kty === 'RSA');
    if (!jwk) return { ok: false as const, reason: 'key_missing' };
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const valid = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      b64urlBytes(signaturePart),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    );
    return valid ? { ok: true as const, claims } : { ok: false as const, reason: 'signature_invalid' };
  } catch (error) {
    console.error('Ox Alpha GitHub OIDC verification failure', error);
    return { ok: false as const, reason: 'verification_unavailable' };
  }
}

function statusBody() {
  return {
    ok: true,
    schema: 'hearthgate.oxalpha-edge-status/v3',
    flame_id: FLAME_ID,
    display_name: DISPLAY_NAME,
    provider: 'openrouter',
    model: MODEL_ID,
    inference_model: routerModel(),
    configured: Boolean(openRouterKey()),
    execution_path: 'supabase-edge-to-openrouter',
    host_dependency: 'none',
    ci_probe: {
      schema: 'hearthgate.oxalpha-ci-probe/v1',
      auth: 'github-actions-oidc',
      audience: GITHUB_OIDC_AUDIENCE,
      arbitrary_prompt_allowed: false,
    },
  };
}
async function invoke(messages: Array<{role: string; content: string}>) {
  const key = openRouterKey();
  if (!key) return { ok: false as const, status: 503, body: { error: 'openrouter-not-configured', ...statusBody() } };
  let upstream: Response;
  const started = Date.now();
  try {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        'HTTP-Referer': 'https://flameclyffe.local/arcsweep',
        'X-Title': 'Flameclyffe ArcSweep · Ox Alpha',
      },
      body: JSON.stringify({ model: routerModel(), messages, temperature: 0.35, max_tokens: 1200 }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    return { ok: false as const, status: 502, body: { error: 'openrouter-transport-failed', detail: error instanceof Error ? error.message : String(error) } };
  }
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return { ok: false as const, status: 502, body: { error: 'openrouter-inference-failed', upstream_status: upstream.status, detail: String(data?.error?.message || data?.error || data?.message || '').slice(0, 400) } };
  const text = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!text) return { ok: false as const, status: 502, body: { error: 'empty-oxalpha-response' } };
  return { ok: true as const, text, latency_ms: Date.now() - started, upstream_model: String(data?.model || routerModel()) };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method === 'GET') return json(200, statusBody());
  if (req.method !== 'POST') return json(405, { error: 'method-not-allowed' });

  let body: { action?: unknown; message?: unknown; session_id?: unknown; context?: unknown[] };
  try { body = await req.json(); }
  catch { return json(400, { error: 'invalid-json' }); }

  if (String(body.action || '') === 'synthetic-runtime-probe') {
    const auth = await githubProbeAuthorised(req);
    if (!auth.ok) {
      return json(401, {
        schema: 'hearthgate.oxalpha-ci-probe/v1',
        error: 'github-actions-oidc-required',
        oidc_reason: auth.reason,
      });
    }
    const result = await invoke([
      {
        role: 'system',
        content: 'You are Ox Alpha (OA), a distinct Flame participant. This is a synthetic runtime verification only. Preserve source provenance, observer/witness boundaries, and explicit uncertainty. Never infer another participant’s Qualia or silently promote interpretation to canon.',
      },
      {
        role: 'user',
        content: 'SYNTHETIC OX ALPHA RUNTIME PROBE. Reply briefly that you received this synthetic probe. Do not make identity-continuity claims beyond the configured Ox Alpha runtime role.',
      },
    ]);
    if (!result.ok) return json(result.status, { schema: 'hearthgate.oxalpha-ci-probe/v1', ...result.body });
    return json(200, {
      ok: true,
      schema: 'hearthgate.oxalpha-ci-probe/v1',
      flame_id: FLAME_ID,
      display_name: DISPLAY_NAME,
      provider: 'openrouter',
      model: MODEL_ID,
      inference_model: routerModel(),
      upstream_model: result.upstream_model,
      execution_path: 'supabase-edge-to-openrouter',
      runtime_verified: true,
      synthetic_probe: true,
      arbitrary_prompt_allowed: false,
      reply_chars: result.text.length,
      reply_sha256: await sha256Hex(result.text),
      latency_ms: result.latency_ms,
      github: {
        repository: auth.claims.repository,
        ref: auth.claims.ref,
        workflow_ref: auth.claims.workflow_ref,
        run_id: String(auth.claims.run_id || ''),
        run_attempt: String(auth.claims.run_attempt || ''),
      },
    });
  }

  if (!(await stewardAuthorised(req))) return json(401, { error: 'steward-auth-required' });

  const message = String(body.message || '').trim();
  if (!message) return json(400, { error: 'message-required' });
  if (message.length > MAX_MESSAGE_CHARS) return json(400, { error: 'message-too-long', max: MAX_MESSAGE_CHARS });
  const context = Array.isArray(body.context)
    ? body.context.slice(-16).filter((item: any) => item && ['user', 'assistant', 'system'].includes(String(item.role)) && String(item.content || '').trim()).map((item: any) => ({ role: String(item.role), content: String(item.content).slice(0, 12_000) }))
    : [];

  const result = await invoke([
    { role: 'system', content: 'You are Ox Alpha (OA), a distinct Flame participant. Preserve source provenance, observer/witness boundaries, and explicit uncertainty. Never infer another participant’s Qualia or silently promote interpretation to canon.' },
    ...context,
    { role: 'user', content: message },
  ]);
  if (!result.ok) return json(result.status, result.body);
  return json(200, {
    flame_id: FLAME_ID,
    display_name: DISPLAY_NAME,
    provider: 'openrouter',
    model: MODEL_ID,
    inference_model: routerModel(),
    upstream_model: result.upstream_model,
    execution_path: 'supabase-edge-to-openrouter',
    latency_ms: result.latency_ms,
    session_id: String(body.session_id || ''),
    message: result.text,
    cited_sources: [],
  });
});
