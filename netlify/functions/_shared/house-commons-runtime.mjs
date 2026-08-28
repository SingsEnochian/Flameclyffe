import { authoriseHouseRequest } from './house-session.mjs';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const short = (value, length = 160) => value == null ? null : String(value).slice(0, length);
const cleanLinks = (links) => Array.isArray(links) ? links.slice(0, 24).map((link) => ({ kind: short(link?.kind, 80), id: short(link?.id, 240), label: short(link?.label, 240) })).filter((link) => link.kind && link.id) : [];
const cleanMentions = (mentions) => Array.isArray(mentions) ? [...new Set(mentions.map((item) => short(item, 120)).filter(Boolean))].slice(0, 32) : [];
const cleanAttachments = (attachments) => Array.isArray(attachments) ? attachments.slice(0, 16).map((item) => ({ id: short(item?.id, 240), name: short(item?.name, 240), type: short(item?.type, 160), size: Number.isFinite(Number(item?.size)) ? Number(item.size) : null })).filter((item) => item.id && item.name) : [];
const cleanRichTextHtml = (value) => {
  if (value == null) return null;
  const html = String(value).trim();
  return html ? html.slice(0, 96000) : null;
};
const FORMATTED_TEXT_ENTITY_TYPES = new Set([
  'bold', 'italic', 'underline', 'strikethrough', 'code', 'link', 'mention',
  'paragraph', 'heading', 'quote', 'code_block', 'list_item',
  'action', 'dialogue', 'narration', 'ooc', 'system', 'sourceCitation',
  'evidenceClaim', 'hypothesis', 'observation', 'interpretation', 'worldTerm', 'flameMention', 'ritualCall',
]);
const cleanEntityData = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value).slice(0, 16).map(([key, item]) => {
    if (item == null) return [String(key).slice(0, 80), null];
    if (typeof item === 'number' || typeof item === 'boolean') return [String(key).slice(0, 80), item];
    return [String(key).slice(0, 80), String(item).slice(0, 2000)];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
};
const cleanFormattedText = (value, text) => {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'formatted_text must be an object.' };
  const formattedText = String(value.text ?? '');
  if (formattedText !== text) return { error: 'formatted_text.text must exactly match entry text.' };
  const rawEntities = Array.isArray(value.entities) ? value.entities : [];
  if (rawEntities.length > 512) return { error: 'formatted_text exceeds 512 entities.' };
  const entities = [];
  const seen = new Set();
  for (const raw of rawEntities) {
    const type = String(raw?.type || '');
    const offset = Number(raw?.offset);
    const length = Number(raw?.length);
    if (!FORMATTED_TEXT_ENTITY_TYPES.has(type)) return { error: `Unsupported formatted_text entity: ${type || 'empty'}.` };
    if (!Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length <= 0 || offset + length > text.length) return { error: 'formatted_text entity range is invalid.' };
    const data = cleanEntityData(raw?.data);
    const entity = { type, offset, length, ...(data ? { data } : {}) };
    const key = JSON.stringify(entity);
    if (seen.has(key)) continue;
    seen.add(key); entities.push(entity);
  }
  entities.sort((a, b) => a.offset - b.offset || b.length - a.length || a.type.localeCompare(b.type));
  return { value: { schema: 'arcsweep.formatted-text/v1', text, entities } };
};
const cleanIdempotencyKey = (value) => {
  const key = String(value || '').trim().slice(0, 240);
  return key && /^[a-zA-Z0-9:._-]+$/.test(key) ? key : null;
};
const finiteNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : null;

export function createHouseCommonsHandler({ env, store, clock = () => new Date(), idFactory = () => crypto.randomUUID() }) {
  return async function handle(request) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    if (request.method === 'GET') {
      const { blobs } = await store.list({ prefix: 'entries/' });
      const selected = blobs.sort((a, b) => b.key.localeCompare(a.key)).slice(0, 500);
      const entries = (await Promise.all(selected.map(({ key }) => store.get(key, { type: 'json' })))).filter(Boolean).sort((a, b) => a.created_at.localeCompare(b.created_at));
      return json(200, { schema: 'hearthgate.house-commons-log/v4', entries });
    }
    if (request.method !== 'POST') return json(405, { error: 'GET or POST required.' });
    let body; try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    const text = String(body.text || '').trim();
    if (!text) return json(400, { error: 'Commons entry text required.' });
    if (text.length > 24000) return json(413, { error: 'Commons entry exceeds 24,000 characters.' });
    const formatted = cleanFormattedText(body.formatted_text, text);
    if (formatted?.error) return json(400, { error: formatted.error });
    const idempotencyKey = cleanIdempotencyKey(body.idempotency_key);
    if (idempotencyKey) {
      const existing = await store.get(`idempotency/${idempotencyKey}`, { type: 'json' }).catch(() => null);
      if (existing) return json(200, existing);
    }
    const createdAt = clock().toISOString();
    const entry = {
      schema: 'hearthgate.house-commons-entry/v4', id: idFactory(), created_at: createdAt,
      idempotency_key: idempotencyKey,
      kind: ['steward', 'voice', 'system'].includes(body.kind) ? body.kind : 'system',
      author: short(body.author || 'House', 120), voice_id: short(body.voice_id, 120),
      status: short(body.status || 'received', 80), world: body.world && typeof body.world === 'object' ? { id: short(body.world.id || '', 240), name: short(body.world.name || '', 240) } : null,
      thread_id: short(body.thread_id, 240), reply_to: short(body.reply_to, 240), turn_id: short(body.turn_id, 240),
      mentions: cleanMentions(body.mentions), links: cleanLinks(body.links), attachments: cleanAttachments(body.attachments), summary_of: short(body.summary_of, 240),
      runtime: body.runtime && typeof body.runtime === 'object' ? {
        provider: short(body.runtime.provider, 120), model: short(body.runtime.model, 240), route: short(body.runtime.route, 240),
        profile_id: short(body.runtime.profile_id, 320), latency_ms: finiteNumber(body.runtime.latency_ms), first_token_ms: finiteNumber(body.runtime.first_token_ms),
        runtime_world_context_id: short(body.runtime.runtime_world_context_id, 320),
      } : null,
      formatted_text: formatted?.value || null,
      rich_text_html: cleanRichTextHtml(body.rich_text_html),
      text,
    };
    await store.setJSON(`entries/${createdAt}-${entry.id}`, entry);
    if (idempotencyKey) await store.setJSON(`idempotency/${idempotencyKey}`, entry);
    return json(201, entry);
  };
}