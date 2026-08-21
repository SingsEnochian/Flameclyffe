import { authoriseHouseRequest } from './house-session.mjs';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const short = (value, length = 160) => value == null ? null : String(value).slice(0, length);

export function createHouseCommonsHandler({ env, store, clock = () => new Date(), idFactory = () => crypto.randomUUID() }) {
  return async function handle(request) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    if (request.method === 'GET') {
      const { blobs } = await store.list({ prefix: 'entries/' });
      const selected = blobs.sort((a, b) => b.key.localeCompare(a.key)).slice(0, 500);
      const entries = (await Promise.all(selected.map(({ key }) => store.get(key, { type: 'json' })))).filter(Boolean).sort((a, b) => a.created_at.localeCompare(b.created_at));
      return json(200, { schema: 'hearthgate.house-commons-log/v2', entries });
    }
    if (request.method !== 'POST') return json(405, { error: 'GET or POST required.' });
    let body; try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    const text = String(body.text || '').trim();
    if (!text) return json(400, { error: 'Commons entry text required.' });
    if (text.length > 24000) return json(413, { error: 'Commons entry exceeds 24,000 characters.' });
    const createdAt = clock().toISOString();
    const entry = {
      schema: 'hearthgate.house-commons-entry/v2', id: idFactory(), created_at: createdAt,
      kind: ['steward', 'voice', 'system'].includes(body.kind) ? body.kind : 'system',
      author: short(body.author || 'House', 120), voice_id: short(body.voice_id, 120),
      status: short(body.status || 'received', 80), world: body.world && typeof body.world === 'object' ? { id: String(body.world.id || ''), name: String(body.world.name || '') } : null,
      thread_id: short(body.thread_id, 160), reply_to: short(body.reply_to, 160), turn_id: short(body.turn_id, 160),
      runtime: body.runtime && typeof body.runtime === 'object' ? {
        provider: short(body.runtime.provider, 120), model: short(body.runtime.model, 240), route: short(body.runtime.route, 160),
        profile_id: short(body.runtime.profile_id, 320), latency_ms: Number.isFinite(Number(body.runtime.latency_ms)) ? Number(body.runtime.latency_ms) : null,
        runtime_world_context_id: short(body.runtime.runtime_world_context_id, 320),
      } : null,
      text,
    };
    await store.setJSON(`entries/${createdAt}-${entry.id}`, entry);
    return json(201, entry);
  };
}
