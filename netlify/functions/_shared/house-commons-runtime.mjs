import { timingSafeEqual } from 'node:crypto';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const bearer = (request) => (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
const authorised = (actual, expected) => {
  if (!actual || !expected) return false;
  const left = Buffer.from(actual), right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

export function createHouseCommonsHandler({ env, store, clock = () => new Date(), idFactory = () => crypto.randomUUID() }) {
  return async function handle(request) {
    if (!authorised(bearer(request), env.get('ARCSWEEP_RUNTIME_TOKEN'))) return json(401, { error: 'Valid House Runtime session required.' });
    if (request.method === 'GET') {
      const { blobs } = await store.list({ prefix: 'entries/' });
      const selected = blobs.sort((a, b) => b.key.localeCompare(a.key)).slice(0, 200);
      const entries = (await Promise.all(selected.map(({ key }) => store.get(key, { type: 'json' })))).filter(Boolean).sort((a, b) => a.created_at.localeCompare(b.created_at));
      return json(200, { schema: 'hearthgate.house-commons-log/v1', entries });
    }
    if (request.method !== 'POST') return json(405, { error: 'GET or POST required.' });
    let body; try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    const text = String(body.text || '').trim();
    if (!text) return json(400, { error: 'Commons entry text required.' });
    if (text.length > 24000) return json(413, { error: 'Commons entry exceeds 24,000 characters.' });
    const createdAt = clock().toISOString();
    const entry = {
      schema: 'hearthgate.house-commons-entry/v1', id: idFactory(), created_at: createdAt,
      kind: ['steward', 'voice', 'system'].includes(body.kind) ? body.kind : 'system',
      author: String(body.author || 'House').slice(0, 120), voice_id: body.voice_id ? String(body.voice_id).slice(0, 120) : null,
      status: String(body.status || 'received').slice(0, 80), world: body.world && typeof body.world === 'object' ? { id: String(body.world.id || ''), name: String(body.world.name || '') } : null,
      text,
    };
    await store.setJSON(`entries/${createdAt}-${entry.id}`, entry);
    return json(201, entry);
  };
}
