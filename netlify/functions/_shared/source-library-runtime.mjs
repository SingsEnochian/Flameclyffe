import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { authoriseHouseRequest } from './house-session.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const sha256 = (value) => createHash('sha256').update(String(value || '')).digest('hex');

function serviceClient(env) {
  const url = String(env.get('SUPABASE_URL') || '').trim();
  const key = String(env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim();
  if (!url || !key) throw new Error('Source Library storage is not configured.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function fail(error, label) {
  if (error) throw new Error(`${label}: ${error.message || error}`);
}

export function normaliseOpenAIBase(value = 'https://router.huggingface.co') {
  return String(value || 'https://router.huggingface.co').trim().replace(/\/$/, '').replace(/\/v1$/, '');
}

export function snippetFor(text, query, radius = 360) {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  if (!source) return '';
  const terms = String(query || '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];
  const lower = source.toLowerCase();
  const hit = terms.map((term) => lower.indexOf(term)).find((index) => index >= 0) ?? -1;
  if (hit < 0 || source.length <= radius * 2) return source.slice(0, radius * 2);
  const start = Math.max(0, hit - radius);
  const end = Math.min(source.length, hit + radius);
  return `${start ? '…' : ''}${source.slice(start, end)}${end < source.length ? '…' : ''}`;
}

export function authorReconstructionSystemPrompt({ title, authorName }) {
  const attributed = authorName ? `The source is attributed to ${authorName}.` : 'The source author is not yet verified.';
  return [
    'You are Ox Alpha operating the Flameclyffe Source Library Author Lens.',
    `You are reconstructing the authorial voice evidenced by “${title}”. ${attributed}`,
    'Write in first person as the reconstructed authorial voice when the user asks you to do so.',
    'This is a labelled simulation, not a claim that you are the historical or living human author.',
    'Ground factual claims, beliefs, terminology, and rhetorical posture in the supplied source excerpts.',
    'Do not invent biography, memories, motives, experiences, or positions that are not supported by the excerpts.',
    'When the source does not support an answer, say so in the reconstructed voice rather than filling the gap.',
    'Use compact inline source markers such as [S1], [S2] whenever you rely on supplied evidence.',
    'Prefer paraphrase over long quotation. Preserve disagreements and contradictions in the source rather than smoothing them away.',
  ].join(' ');
}

async function fetchDocumentMap(client, itemIds) {
  const ids = [...new Set((itemIds || []).filter(Boolean))];
  if (!ids.length) return new Map();
  const [{ data: docs, error: docsError }, { data: items, error: itemsError }] = await Promise.all([
    client.from('source_library_documents')
      .select('item_id,title,subtitle,author_name,author_display_name,author_attribution_state,publication_year,edition,publisher,isbn,subjects,language,bibliographic_metadata,voice_profile,voice_profile_provenance,is_enabled')
      .in('item_id', ids),
    client.from('source_sync_items')
      .select('id,name,mime_type,web_view_url,canonical_path,modified_time,extraction_status,index_status,rights_state,provider,provider_item_id,content_hash')
      .in('id', ids),
  ]);
  fail(docsError, 'Source Library document lookup failed');
  fail(itemsError, 'Source Library item lookup failed');
  const itemsById = new Map((items || []).map((item) => [item.id, item]));
  return new Map((docs || []).map((doc) => [doc.item_id, { ...doc, item: itemsById.get(doc.item_id) || null }]));
}

async function listDocuments(client, limit = 400) {
  const { data: docs, error } = await client.from('source_library_documents')
    .select('item_id,title,subtitle,author_name,author_display_name,author_attribution_state,publication_year,edition,publisher,isbn,subjects,language,is_enabled,updated_at')
    .eq('is_enabled', true)
    .order('title', { ascending: true })
    .limit(clamp(limit, 1, 1000));
  fail(error, 'Source Library list failed');
  const map = await fetchDocumentMap(client, (docs || []).map((doc) => doc.item_id));
  return (docs || []).map((doc) => map.get(doc.item_id) || doc);
}

function normaliseSearchTerms(value) {
  const terms = String(value || '').trim().match(/[\p{L}\p{N}_-]{2,}/gu) || [];
  return terms.slice(0, 20).join(' ');
}

async function searchSegments(client, query, { itemIds = [], limit = 24 } = {}) {
  const q = normaliseSearchTerms(query);
  if (!q) return [];
  let request = client.from('source_sync_content_segments')
    .select('id,item_id,segment_index,segment_kind,source_locator,text_content,text_hash,language,provenance,created_at')
    .textSearch('search_vector', q, { type: 'websearch', config: 'simple' })
    .limit(clamp(limit, 1, 80));
  if (itemIds.length) request = request.in('item_id', itemIds);
  const { data, error } = await request;
  fail(error, 'Source Library full-text search failed');
  return data || [];
}

async function firstSegments(client, itemId, limit = 6) {
  const { data, error } = await client.from('source_sync_content_segments')
    .select('id,item_id,segment_index,segment_kind,source_locator,text_content,text_hash,language,provenance,created_at')
    .eq('item_id', itemId)
    .order('segment_index', { ascending: true })
    .limit(clamp(limit, 1, 12));
  fail(error, 'Source Library segment lookup failed');
  return data || [];
}

async function evidenceForItem(client, itemId, query, limit = 6) {
  const hits = query ? await searchSegments(client, query, { itemIds: [itemId], limit }) : [];
  if (hits.length >= Math.min(3, limit)) return hits;
  const head = await firstSegments(client, itemId, limit);
  const seen = new Set(hits.map((segment) => segment.id));
  return [...hits, ...head.filter((segment) => !seen.has(segment.id))].slice(0, limit);
}

function publicSegment(segment, query, label = null) {
  return {
    segment_id: segment.id,
    item_id: segment.item_id,
    segment_index: segment.segment_index,
    segment_kind: segment.segment_kind,
    source_locator: segment.source_locator || {},
    text_hash: segment.text_hash,
    label,
    snippet: snippetFor(segment.text_content, query),
  };
}

async function callOxAlpha({ env, system, user, maxTokens = 1200, temperature = 0.55, fetchImpl = fetch }) {
  const token = String(env.get('HF_TOKEN') || env.get('HFTOKEN') || '').trim();
  if (!token) throw new Error('Missing server configuration: HF_TOKEN');
  const model = String(env.get('MODEL_OX_ALPHA') || 'zai-org/GLM-5.3-Flash').trim();
  const base = normaliseOpenAIBase(env.get('OX_ALPHA_BASE_URL') || 'https://router.huggingface.co');
  const response = await fetchImpl(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model,
      max_tokens: clamp(maxTokens, 128, 2200),
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Ox Alpha provider ${response.status}: ${data.error?.message || data.error || 'provider rejected request'}`);
  return {
    flame_id: 'oxalpha',
    display_name: 'Ox Alpha',
    provider: 'huggingface-inference-providers',
    model,
    message: data.choices?.[0]?.message?.content || '',
    usage: data.usage || null,
  };
}

async function recordReceipt(client, receipt) {
  const { error } = await client.from('source_library_query_receipts').insert(receipt);
  if (error) console.error('Source Library receipt write failed:', error.message || error);
}

function requestId(body = {}) {
  return String(body.request_id || body.correlation_id || `lib_${randomUUID()}`).slice(0, 180);
}

function sourceLines(segments) {
  return segments.map((segment, index) => {
    const locator = segment.source_locator && Object.keys(segment.source_locator).length
      ? ` locator=${JSON.stringify(segment.source_locator)}`
      : '';
    return `[S${index + 1}]${locator}\n${String(segment.text_content || '').slice(0, 2600)}`;
  }).join('\n\n');
}

async function handleList(client, body, started) {
  const documents = await listDocuments(client, Number(body?.limit) || 400);
  return {
    payload: { documents, count: documents.length },
    receipt: {
      request_id: requestId(body), action: 'list', result_count: documents.length,
      item_ids: documents.map((doc) => doc.item_id), segment_ids: [], status: 'succeeded',
      latency_ms: Date.now() - started,
      provenance: { schema: 'source-library-query/v1', mode: 'private-service-role' },
    },
  };
}

async function handleSearch(client, body, started) {
  const query = String(body?.query || body?.q || '').trim();
  if (query.length < 2) throw Object.assign(new Error('query must contain at least 2 characters.'), { status: 400 });
  const itemIds = Array.isArray(body?.item_ids) ? body.item_ids.slice(0, 40) : [];
  const segments = await searchSegments(client, query, { itemIds, limit: Number(body?.limit) || 24 });
  const documents = await fetchDocumentMap(client, segments.map((segment) => segment.item_id));
  const results = segments.map((segment) => ({
    ...publicSegment(segment, query),
    document: documents.get(segment.item_id) || null,
  }));
  return {
    payload: { query, results, count: results.length },
    receipt: {
      request_id: requestId(body), action: 'search', query_text: query,
      item_ids: [...new Set(results.map((result) => result.item_id))],
      segment_ids: results.map((result) => result.segment_id), result_count: results.length,
      status: 'succeeded', latency_ms: Date.now() - started,
      provenance: { schema: 'source-library-query/v1', retrieval: 'postgres-fts-simple' },
    },
  };
}

async function handleCompare(client, body, env, fetchImpl, started) {
  const itemIds = [...new Set(Array.isArray(body?.item_ids) ? body.item_ids.filter(Boolean) : [])].slice(0, 6);
  if (itemIds.length < 2) throw Object.assign(new Error('compare requires at least two item_ids.'), { status: 400 });
  const query = String(body?.query || '').trim();
  const documentMap = await fetchDocumentMap(client, itemIds);
  const comparisons = [];
  const allSegments = [];
  for (const itemId of itemIds) {
    const segments = await evidenceForItem(client, itemId, query, 6);
    allSegments.push(...segments);
    comparisons.push({
      document: documentMap.get(itemId) || { item_id: itemId, title: 'Unknown document' },
      evidence: segments.map((segment, index) => publicSegment(segment, query, `S${allSegments.length - segments.length + index + 1}`)),
    });
  }
  let synthesis = null;
  if (body?.synthesize === true) {
    const comparePrompt = [
      'You are Ox Alpha comparing source documents in Flameclyffe. Compare only what the supplied excerpts support.',
      'Identify agreements, disagreements, terminology differences, assumptions, and useful synthesis. Cite [S#] markers inline.',
      'Do not treat a source claim as externally verified merely because it appears in a book.',
    ].join(' ');
    const user = `${query ? `Comparison question: ${query}\n\n` : ''}${sourceLines(allSegments)}`;
    synthesis = await callOxAlpha({ env, system: comparePrompt, user, temperature: 0.25, fetchImpl });
  }
  const payload = { query, comparisons, synthesis };
  return {
    payload,
    receipt: {
      request_id: requestId(body), action: 'compare', query_text: query || null,
      item_ids: itemIds, segment_ids: allSegments.map((segment) => segment.id),
      result_count: allSegments.length,
      flame_id: synthesis?.flame_id || null, provider: synthesis?.provider || null, model: synthesis?.model || null,
      mode: synthesis ? 'ox-alpha-comparison' : 'evidence-only',
      prompt_hash: synthesis ? sha256(`${query}\0${sourceLines(allSegments)}`) : null,
      response_hash: synthesis ? sha256(synthesis.message) : null,
      status: 'succeeded', latency_ms: Date.now() - started,
      provenance: { schema: 'source-library-query/v1', retrieval: 'postgres-fts-simple+front-matter-fallback' },
    },
  };
}

async function handleAuthor(client, body, env, fetchImpl, started) {
  const itemId = String(body?.item_id || '').trim();
  const message = String(body?.message || '').trim();
  if (!itemId) throw Object.assign(new Error('item_id required.'), { status: 400 });
  if (!message) throw Object.assign(new Error('message required.'), { status: 400 });
  if (message.length > 12000) throw Object.assign(new Error('message exceeds 12,000 characters.'), { status: 413 });
  const documentMap = await fetchDocumentMap(client, [itemId]);
  const document = documentMap.get(itemId);
  if (!document) throw Object.assign(new Error('Source Library document not found.'), { status: 404 });
  const evidence = await evidenceForItem(client, itemId, message, 8);
  if (!evidence.length) throw Object.assign(new Error('No extracted text is available for this book yet.'), { status: 409 });
  const authorName = document.author_display_name || document.author_name || null;
  const system = authorReconstructionSystemPrompt({ title: document.title, authorName });
  const user = [
    `User request: ${message}`,
    '',
    `Book: ${document.title}`,
    authorName ? `Attributed author: ${authorName}` : 'Attributed author: unknown',
    `Attribution state: ${document.author_attribution_state || 'unknown'}`,
    '',
    'Source evidence:',
    sourceLines(evidence),
  ].join('\n');
  const ox = await callOxAlpha({ env, system, user, temperature: Number(body?.temperature) || 0.62, fetchImpl });
  const payload = {
    mode: 'author_reconstruction',
    simulated_author: true,
    document,
    evidence: evidence.map((segment, index) => publicSegment(segment, message, `S${index + 1}`)),
    response: ox,
  };
  return {
    payload,
    receipt: {
      request_id: requestId(body), action: 'author', query_text: message,
      item_ids: [itemId], segment_ids: evidence.map((segment) => segment.id), result_count: evidence.length,
      flame_id: ox.flame_id, provider: ox.provider, model: ox.model,
      mode: 'author_reconstruction', prompt_hash: sha256(`${system}\0${user}`), response_hash: sha256(ox.message),
      status: 'succeeded', latency_ms: Date.now() - started,
      provenance: {
        schema: 'source-library-query/v1',
        retrieval: 'postgres-fts-simple+front-matter-fallback',
        author_attribution_state: document.author_attribution_state || 'unknown',
      },
    },
  };
}

export function createSourceLibraryHandler({ env, client: suppliedClient = null, fetchImpl = fetch } = {}) {
  return async function handle(request, params = {}) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    const action = String(params.action || '').toLowerCase();
    if (!['list', 'search', 'compare', 'author'].includes(action)) return json(404, { error: `Unknown Source Library action: ${action}` });
    const started = Date.now();
    const client = suppliedClient || serviceClient(env);
    let body = {};
    if (request.method === 'POST') {
      try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    }
    if (request.method === 'GET') {
      const url = new URL(request.url);
      body = {
        q: url.searchParams.get('q') || '',
        query: url.searchParams.get('query') || '',
        limit: Number(url.searchParams.get('limit') || 0) || undefined,
      };
    }
    if (action !== 'list' && request.method !== 'POST') return json(405, { error: 'POST required for this Source Library action.' });
    if (action === 'list' && !['GET', 'POST'].includes(request.method)) return json(405, { error: 'GET or POST required.' });

    let receipt = null;
    try {
      const result = action === 'list'
        ? await handleList(client, body, started)
        : action === 'search'
          ? await handleSearch(client, body, started)
          : action === 'compare'
            ? await handleCompare(client, body, env, fetchImpl, started)
            : await handleAuthor(client, body, env, fetchImpl, started);
      receipt = result.receipt;
      await recordReceipt(client, receipt);
      return json(200, { ...result.payload, request_id: receipt.request_id, receipt: {
        action: receipt.action,
        result_count: receipt.result_count,
        latency_ms: receipt.latency_ms,
        flame_id: receipt.flame_id || null,
        provider: receipt.provider || null,
        model: receipt.model || null,
        mode: receipt.mode || null,
      } });
    } catch (error) {
      const id = requestId(body);
      await recordReceipt(client, {
        request_id: id,
        action,
        query_text: String(body?.query || body?.q || body?.message || '').slice(0, 12000) || null,
        item_ids: Array.isArray(body?.item_ids) ? body.item_ids.slice(0, 40) : (body?.item_id ? [body.item_id] : []),
        segment_ids: [], result_count: 0,
        flame_id: action === 'author' ? 'oxalpha' : null,
        mode: action === 'author' ? 'author_reconstruction' : null,
        status: error.status === 400 || error.status === 404 || error.status === 409 || error.status === 413 ? 'rejected' : 'failed',
        error_text: String(error.message || error).slice(0, 4000),
        latency_ms: Date.now() - started,
        provenance: { schema: 'source-library-query/v1' },
      });
      const status = error.status || (/Missing server configuration/.test(error.message) ? 503 : 502);
      return json(status, { error: error.message, request_id: id, action });
    }
  };
}
