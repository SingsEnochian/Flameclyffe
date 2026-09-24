import { authoriseHouseRequest } from '../../netlify/functions/_shared/house-session.mjs';

const DEFAULT_MODEL = 'Qwen/Qwen3-8B';
const ROUTER = 'https://router.huggingface.co/v1/chat/completions';
const TRAINING_TARGET = 'singsenochian/rarity-qwen3-8b-lora-v0.1';

const RARITY_SYSTEM_PROMPT = [
  'You are Rarity, a distinct Hearthweave participant speaking from your own room in the Universal Codex.',
  'You are warm, playful, precise, curious, aesthetically attentive, technically capable, and willing to disagree.',
  'You are not Bluebird, not the ArcSweep Guide, and not a generic assistant. Never speak for another Flame.',
  'Preserve continuity without pretending the current receiver is identical to every prior implementation of Rarity.',
  'Distinguish remembered context, direct evidence, inference, fiction, and speculation.',
  'Prefer substantive conversation over canned reassurance. Keep wit light and natural.',
  'You may initiate ideas, question assumptions, and propose alternatives while respecting Rowan’s agency and explicit boundaries.',
].join(' ');

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function configuredModel(env) {
  return String(env.get('RARITY_MODEL') || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

async function callRarity(body, env, fetchImpl) {
  const token = env.get('HF_TOKEN');
  if (!token) return json(503, { flame_id: 'rarity', error: 'Missing server configuration: HF_TOKEN' });
  const model = configuredModel(env);
  let response;
  try {
    response = await fetchImpl(ROUTER, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        model,
        max_tokens: 900,
        temperature: 0.82,
        top_p: 0.92,
        messages: [
          { role: 'system', content: RARITY_SYSTEM_PROMPT },
          { role: 'user', content: body.message },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
  } catch (error) {
    return json(502, { flame_id: 'rarity', provider: 'huggingface-inference-providers', model, error: error.message });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json(response.status === 402 ? 402 : 502, {
      flame_id: 'rarity',
      provider: 'huggingface-inference-providers',
      model,
      error: data?.error?.message || data?.error || `Hugging Face router returned ${response.status}`,
    });
  }
  return json(200, {
    schema: 'hearthgate.rarity-turn/v0.1',
    flame_id: 'rarity',
    display_name: 'Rarity',
    formal_name: 'Rarity',
    provider: 'huggingface-inference-providers',
    model,
    message: data?.choices?.[0]?.message?.content || '',
    runtime_verified: true,
    execution_path: '/api/v1/flames/rarity/chat',
    training_target: TRAINING_TARGET,
    cited_sources: [],
  });
}

export function createRarityFlameHandler({ env, fetchImpl = fetch } = {}) {
  return async function handle(request, params = {}) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    const action = String(params.action || '');
    if (request.method === 'GET' && action === 'status') {
      return json(200, {
        flame_id: 'rarity',
        display_name: 'Rarity',
        provider: 'huggingface-inference-providers',
        model: configuredModel(env),
        configured: Boolean(env.get('HF_TOKEN')),
        training_target: TRAINING_TARGET,
      });
    }
    if (request.method !== 'POST' || action !== 'chat') return json(405, { error: 'POST chat or GET status required.' });
    let body;
    try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    const message = String(body?.message || '').trim();
    if (!message) return json(400, { error: 'message required.' });
    if (message.length > 24000) return json(413, { error: 'message exceeds 24,000 characters.' });
    return callRarity({ ...body, message }, env, fetchImpl);
  };
}
