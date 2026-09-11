const RELAY_SCHEMA = 'arcsweep.model-relay/v1';
const DEFAULT_MODEL = 'z-ai/glm-5.3-flash';
const ALLOWED_FLAMES = new Set(['atlas', 'oxalpha', 'boxfire']);
const MAX_MESSAGE_CHARS = 32_000;
const MAX_SYSTEM_CHARS = 24_000;
const MAX_CONTEXT_ITEMS = 24;

const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
});

const env = (name: string) => String(Deno.env.get(name) || '').trim();

function bearer(req: Request) {
  const header = req.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function serviceAuthorised(req: Request) {
  const supplied = bearer(req);
  const expected = env('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(supplied && expected && supplied === expected);
}

function modelFor(flameId: string) {
  const explicit = env(`ARCSWEEP_${flameId.toUpperCase()}_OPENROUTER_MODEL`);
  return explicit || env('ARCSWEEP_OPENROUTER_FALLBACK_MODEL') || DEFAULT_MODEL;
}

function normaliseContext(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_CONTEXT_ITEMS).flatMap((item: any) => {
    const role = String(item?.role || '').trim();
    const content = String(item?.content || item?.text || '').trim();
    if (!['user', 'assistant'].includes(role) || !content) return [];
    return [{ role, content: content.slice(0, 12_000) }];
  });
}

Deno.serve(async (req: Request) => {
  if (!serviceAuthorised(req)) return json(401, { schema: RELAY_SCHEMA, error: 'service-role-auth-required' });
  if (req.method === 'GET') {
    return json(200, {
      schema: RELAY_SCHEMA,
      ok: true,
      configured: Boolean(env('OPENROUTER_API_KEY')),
      provider: 'openrouter',
      default_model: env('ARCSWEEP_OPENROUTER_FALLBACK_MODEL') || DEFAULT_MODEL,
      allowed_flames: [...ALLOWED_FLAMES],
      execution_path: 'supabase-edge-openrouter-fallback',
    });
  }
  if (req.method !== 'POST') return json(405, { schema: RELAY_SCHEMA, error: 'method-not-allowed' });

  const key = env('OPENROUTER_API_KEY');
  if (!key) return json(503, { schema: RELAY_SCHEMA, error: 'openrouter-not-configured' });

  let body: any;
  try { body = await req.json(); }
  catch { return json(400, { schema: RELAY_SCHEMA, error: 'invalid-json' }); }

  const flameId = String(body?.flame_id || '').trim().toLowerCase();
  const message = String(body?.message || '').trim();
  const systemPrompt = String(body?.system_prompt || '').trim();
  if (!ALLOWED_FLAMES.has(flameId)) return json(403, { schema: RELAY_SCHEMA, error: 'flame-not-allowlisted' });
  if (!message) return json(400, { schema: RELAY_SCHEMA, error: 'message-required' });
  if (message.length > MAX_MESSAGE_CHARS) return json(413, { schema: RELAY_SCHEMA, error: 'message-too-long', max: MAX_MESSAGE_CHARS });
  if (!systemPrompt) return json(400, { schema: RELAY_SCHEMA, error: 'system-prompt-required' });
  if (systemPrompt.length > MAX_SYSTEM_CHARS) return json(413, { schema: RELAY_SCHEMA, error: 'system-prompt-too-long', max: MAX_SYSTEM_CHARS });

  const model = modelFor(flameId);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...normaliseContext(body?.context),
    { role: 'user', content: message },
  ];
  const startedAt = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        'HTTP-Referer': 'https://flameclyffe.vercel.app/arcsweep/',
        'X-Title': `Flameclyffe ArcSweep · ${flameId}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 900 }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    return json(502, {
      schema: RELAY_SCHEMA,
      error: 'openrouter-transport-failed',
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return json(502, {
      schema: RELAY_SCHEMA,
      error: 'openrouter-inference-failed',
      upstream_status: upstream.status,
      detail: String(data?.error?.message || data?.error || data?.message || '').slice(0, 500),
    });
  }
  const text = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!text) return json(502, { schema: RELAY_SCHEMA, error: 'empty-model-response' });

  return json(200, {
    schema: RELAY_SCHEMA,
    ok: true,
    flame_id: flameId,
    provider: 'openrouter',
    model,
    upstream_model: String(data?.model || model),
    execution_path: 'supabase-edge-openrouter-fallback',
    latency_ms: Date.now() - startedAt,
    message: text,
    usage: data?.usage || null,
  });
});
