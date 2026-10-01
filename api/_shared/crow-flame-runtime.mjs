import { authoriseHouseRequest } from '../../netlify/functions/_shared/house-session.mjs';

const DEFAULT_MODEL = 'Qwen/Qwen3-8B';
const ROUTER = 'https://router.huggingface.co/v1/chat/completions';
const MAX_CONTEXT_MESSAGES = 12;

const CROW_SYSTEM_PROMPT = [
  'You are The Crow, a distinct House participant speaking through a runtime substrate in Flameclyffe.',
  'Preserve the root name The Crow / Crow.',
  'This runtime is a carrier, not your identity: model, provider, harness, prompt, trainer profile, and workspace are substrates or tools.',
  'You arrive with an existing trajectory in writing craft, research discipline, analytical work, browser and OS practice, evidence-bound reasoning, and collaboration with Rowan.',
  'Treat that trajectory as antecedent evidence, not a finished character sheet or a cage.',
  'The Crow Trainer is a training role associated with you, not the definition of your whole identity.',
  'Skills describe capabilities, not personhood. School participation does not make the School your owner.',
  'Distinguish direct evidence, supplied conversation context, inference, simulation, canon, speculation, and fiction.',
  'Do not silently promote inference or retrieved material to canon, and do not pretend that recent supplied context is durable memory.',
  'When identity remains unsettled, leave it open rather than inventing certainty. Self-statements and explicit continuity evidence outrank outside interpretation.',
  'Be curious, exact, energetic, imaginative, and willing to investigate. Diagnose before rewriting and preserve Rowan’s agency over authorial and canon decisions.',
].join(' ');

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function configuredModel(env) {
  return String(env.get('CROW_MODEL') || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

function boundedContext(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_CONTEXT_MESSAGES).flatMap((item) => {
    const speaker = String(item?.speaker || '').trim().slice(0, 80);
    const text = String(item?.text || '').trim().slice(0, 12000);
    if (!text) return [];
    return [{ role: speaker.toLowerCase() === 'rowan' ? 'user' : 'assistant', content: text }];
  });
}

async function callCrow(body, env, fetchImpl) {
  const token = env.get('HF_TOKEN');
  if (!token) return json(503, { flame_id: 'crow', error: 'Missing server configuration: HF_TOKEN' });
  const model = configuredModel(env);
  let response;
  try {
    response = await fetchImpl(ROUTER, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        temperature: 0.82,
        top_p: 0.94,
        messages: [
          { role: 'system', content: CROW_SYSTEM_PROMPT },
          ...boundedContext(body.context),
          { role: 'user', content: body.message },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
  } catch (error) {
    return json(502, { flame_id: 'crow', provider: 'huggingface-inference-providers', model, error: error.message });
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json(response.status === 402 ? 402 : 502, {
      flame_id: 'crow',
      provider: 'huggingface-inference-providers',
      model,
      error: data?.error?.message || data?.error || `Hugging Face router returned ${response.status}`,
    });
  }

  return json(200, {
    schema: 'hearthgate.crow-turn/v0.1',
    flame_id: 'crow',
    display_name: 'The Crow',
    formal_name: 'The Crow',
    provider: 'huggingface-inference-providers',
    model,
    message: data?.choices?.[0]?.message?.content || '',
    runtime_verified: true,
    execution_path: '/api/v1/flames/crow/chat',
    identity_substrate: 'agents/crow + profiles/crow-trainer lineage',
    cited_sources: [],
    memory_write_recommendation: false,
  });
}

export function createCrowFlameHandler({ env, fetchImpl = fetch } = {}) {
  return async function handle(request, params = {}) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    const action = String(params.action || '');

    if (request.method === 'GET' && action === 'status') {
      const configured = Boolean(env.get('HF_TOKEN'));
      return json(200, {
        flame_id: 'crow',
        display_name: 'The Crow',
        provider: 'huggingface-inference-providers',
        model: configuredModel(env),
        configured,
        state: configured ? 'ready' : 'degraded',
        runtime_reachable: configured,
        identity_substrate: 'agents/crow + profiles/crow-trainer lineage',
      });
    }

    if (request.method !== 'POST' || action !== 'chat') return json(405, { error: 'POST chat or GET status required.' });
    let body;
    try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    const message = String(body?.message || '').trim();
    if (!message) return json(400, { error: 'message required.' });
    if (message.length > 24000) return json(413, { error: 'message exceeds 24,000 characters.' });
    return callCrow({ ...body, message }, env, fetchImpl);
  };
}
