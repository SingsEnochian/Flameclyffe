import { timingSafeEqual } from 'node:crypto';

const SMOKE_KEY = '0w6pxuxSE8B7kkgYRiQDrMENhU8SDXe7Lh0r5mhajLU';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function sameSecret(actual, expected) {
  if (!actual || !expected) return false;
  const left = Buffer.from(String(actual));
  const right = Buffer.from(String(expected));
  return left.length === right.length && timingSafeEqual(left, right);
}

export default async (request) => {
  const url = new URL(request.url);
  const supplied = url.searchParams.get('key') || '';
  if (!sameSecret(supplied, SMOKE_KEY)) return json(404, { error: 'not found' });
  const hfToken = String(Netlify.env.get('HF_TOKEN') || Netlify.env.get('HFTOKEN') || '').trim();
  if (!hfToken) return json(503, { ok: false, stage: 'credential', error: 'HF token unavailable' });

  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${hfToken}` },
    body: JSON.stringify({
      model: 'thinkingmachines/Inkling-Small:baseten',
      max_tokens: 128,
      stream: false,
      messages: [
        { role: 'system', content: 'You are a connectivity smoke test. Follow the user instruction exactly.' },
        { role: 'user', content: 'Reply exactly: trenchcoat online' },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json(502, {
      ok: false,
      stage: 'provider',
      provider_status: response.status,
      error: data.error?.message || data.error || data.message || 'provider rejected request',
    });
  }
  return json(200, {
    ok: true,
    model: 'thinkingmachines/Inkling-Small:baseten',
    provider: 'huggingface-inference-providers',
    reply: data.choices?.[0]?.message?.content || '',
    usage: data.usage || null,
  });
};

export const config = { path: '/api/v1/ops/inkling-smoke' };
