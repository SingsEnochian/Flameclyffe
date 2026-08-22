import { authoriseHouseRequest } from './house-session.mjs';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const MAX_BYTES = 5 * 1024 * 1024;
const safeName = (value) => String(value || 'attachment').replace(/[\r\n\\/]+/g, '_').slice(0, 240);

export function createHouseCommonsAttachmentHandler({ env, store, idFactory = () => crypto.randomUUID(), clock = () => new Date() }) {
  return async function handle(request) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    const url = new URL(request.url);
    if (request.method === 'GET') {
      const id = String(url.searchParams.get('id') || '').trim(); if (!id) return json(400, { error: 'Attachment id required.' });
      const meta = await store.get(`meta/${id}`, { type: 'json' }); if (!meta) return json(404, { error: 'Attachment not found.' });
      const bytes = await store.get(`file/${id}`, { type: 'arrayBuffer' }); if (!bytes) return json(404, { error: 'Attachment bytes missing.' });
      return new Response(bytes, { status: 200, headers: { 'content-type': meta.type || 'application/octet-stream', 'content-disposition': `inline; filename="${safeName(meta.name)}"`, 'cache-control': 'private, no-store' } });
    }
    if (request.method !== 'POST') return json(405, { error: 'GET or POST required.' });
    let body; try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    const data = String(body.data_base64 || ''); const size = Number(body.size || 0); if (!data || !Number.isFinite(size) || size < 0) return json(400, { error: 'Attachment payload required.' });
    if (size > MAX_BYTES) return json(413, { error: 'Commons attachments are limited to 5 MiB each.' });
    const bytes = Uint8Array.from(Buffer.from(data, 'base64')); if (bytes.byteLength !== size) return json(400, { error: 'Attachment size mismatch.' });
    const id = idFactory(); const meta = { schema: 'hearthgate.house-commons-attachment/v1', id, name: safeName(body.name), type: String(body.type || 'application/octet-stream').slice(0, 160), size, created_at: clock().toISOString() };
    await store.set(`file/${id}`, bytes); await store.setJSON(`meta/${id}`, meta); return json(201, meta);
  };
}
