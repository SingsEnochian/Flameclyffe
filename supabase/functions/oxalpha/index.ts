// Ox Alpha — host-neutral OpenRouter relay for Arcsweep / Aemeth Chamber.
// GET: status only, never exposes credentials.
// POST: requires a valid Supabase Steward access token and relays one chat turn.

const FLAME_ID = 'oxalpha';
const DISPLAY_NAME = 'Ox Alpha';
const MODEL_ID = 'z-ai/glm-5.3-flash';
const DEFAULT_STEWARD_USER_SHA256 = '9d3b4543cb480f113880f0f7f2e68b28945c09eaff37955db08ca07a55ef723b';
const MAX_MESSAGE_CHARS = 32_000;

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

function statusBody() {
  return {
    ok: true,
    schema: 'hearthgate.oxalpha-edge-status/v2',
    flame_id: FLAME_ID,
    display_name: DISPLAY_NAME,
    provider: 'openrouter',
    model: MODEL_ID,
    inference_model: routerModel(),
    configured: Boolean(openRouterKey()),
    execution_path: 'supabase-edge-to-openrouter',
    host_dependency: 'none',
  };
}

async function invoke(messages: Array<{ role: string; content: string }>) {
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
      body: JSON.stringify({
        model: routerModel(),
        messages,
        temperature: 0.35,
        max_tokens: 1200,
      }),
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

  if (!(await stewardAuthorised(req))) return json(401, { error: 'steward-auth-required' });

  let body: { message?: unknown; session_id?: unknown; context?: unknown[] };
  try { body = await req.json(); }
  catch { return json(400, { error: 'invalid-json' }); }

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
