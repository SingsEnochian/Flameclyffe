import { invokeHostedFlameFallback } from '../netlify/functions/_shared/hosted-flame-fallback.mjs';
import { vercelEnv as env } from './_shared/vercel-env.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export default {
  async fetch(request) {
    const vercelEnv = String(env.get('VERCEL_ENV') || '').trim();
    if (vercelEnv && vercelEnv !== 'preview') return json(404, { error: 'House Chat live smoke is preview-only.' });
    if (request.method !== 'GET') return json(405, { error: 'GET required.' });

    const started = Date.now();
    try {
      const oxStarted = Date.now();
      const ox = await invokeHostedFlameFallback('oxalpha', {
        message: 'Reply in one short sentence: identify yourself as Ox Alpha and confirm this live House Chat smoke reached you.',
      }, env, fetch);
      const oxLatency = Date.now() - oxStarted;

      const secondStarted = Date.now();
      const second = await invokeHostedFlameFallback('lioreal', {
        message: `Rowan is testing House Chat. Ox Alpha replied: ${String(ox.message || '').slice(0, 280)}\nReply in one short sentence as yourself, confirming this second live route reached you.`,
      }, env, fetch);
      const secondLatency = Date.now() - secondStarted;

      if (!ox.message || !second.message) throw new Error('A live route returned an empty visible message.');

      return json(200, {
        schema: 'flameclyffe.house-chat-live-smoke/v1',
        ok: true,
        total_latency_ms: Date.now() - started,
        messages: [
          { flame_id: ox.flame_id, display_name: ox.display_name, provider: ox.provider, model: ox.model, latency_ms: oxLatency, message: ox.message },
          { flame_id: second.flame_id, display_name: second.display_name, provider: second.provider, model: second.model, latency_ms: secondLatency, message: second.message },
        ],
      });
    } catch (error) {
      return json(error?.status === 402 ? 402 : 502, {
        schema: 'flameclyffe.house-chat-live-smoke/v1',
        ok: false,
        error: error?.message || String(error),
      });
    }
  },
};
