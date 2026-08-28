import { createHash } from 'node:crypto';
import { createSourceLibraryHandler } from '../netlify/functions/_shared/source-library-runtime.mjs';
import { vercelEnv as env } from './_shared/vercel-env.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const sha256 = (value) => createHash('sha256').update(String(value || '')).digest('hex');

function typedError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

async function invoke(handler, action, token, body = null) {
  const method = action === 'list' && body == null ? 'GET' : 'POST';
  const request = new Request(`https://source-library-smoke.invalid/api/v1/library/${action}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(method === 'POST' ? { 'content-type': 'application/json' } : {}),
    },
    ...(method === 'POST' ? { body: JSON.stringify(body || {}) } : {}),
  });
  const response = await handler(request, { action });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw typedError(
      `LIBRARY_${action.toUpperCase()}_${response.status}`,
      payload?.error || `Source Library ${action} returned HTTP ${response.status}.`,
      { action, status: response.status, request_id: payload?.request_id || null },
    );
  }
  return payload;
}

function usableDocument(doc) {
  return Boolean(
    doc?.item_id
    && doc?.is_enabled !== false
    && doc?.item?.extraction_status === 'extracted'
    && doc?.item?.index_status === 'indexed',
  );
}

function chooseDocuments(documents) {
  const usable = (documents || []).filter(usableDocument);
  if (usable.length < 2) {
    throw typedError('LIBRARY_NOT_READY', 'Live smoke requires at least two extracted and indexed Source Library documents.', {
      indexed_document_count: usable.length,
    });
  }
  const crowley = usable.find((doc) => /crowley/i.test(`${doc.author_name || ''} ${doc.author_display_name || ''}`));
  const astral = usable.find((doc) => /astral projection/i.test(doc.title || ''));
  const author = crowley || usable.find((doc) => ['extracted', 'verified', 'manual'].includes(doc.author_attribution_state)) || usable[0];
  const comparisonPeer = astral && astral.item_id !== author.item_id
    ? astral
    : usable.find((doc) => doc.item_id !== author.item_id);
  return { author, comparisonPeer };
}

function assertEvidence(evidence, label) {
  if (!Array.isArray(evidence) || !evidence.length) {
    throw typedError(`${label}_NO_EVIDENCE`, `${label} returned no source evidence.`);
  }
  for (const source of evidence) {
    if (!source?.segment_id || !source?.item_id || !source?.text_hash) {
      throw typedError(`${label}_BAD_PROVENANCE`, `${label} returned evidence without segment identity and hash.`);
    }
  }
}

export async function runSourceLibraryLiveSmoke({ envAdapter = env, fetchImpl = fetch } = {}) {
  const runtimeToken = String(envAdapter.get('ARCSWEEP_RUNTIME_TOKEN') || '').trim();
  const supabaseUrl = String(envAdapter.get('SUPABASE_URL') || '').trim();
  const serviceRole = String(envAdapter.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim();
  const hfTokenPresent = Boolean(String(envAdapter.get('HF_TOKEN') || envAdapter.get('HFTOKEN') || '').trim());
  const missing = [
    !runtimeToken && 'ARCSWEEP_RUNTIME_TOKEN',
    !supabaseUrl && 'SUPABASE_URL',
    !serviceRole && 'SUPABASE_SERVICE_ROLE_KEY',
    !hfTokenPresent && 'HF_TOKEN|HFTOKEN',
  ].filter(Boolean);
  if (missing.length) {
    throw typedError('HOSTED_CONFIGURATION_MISSING', 'Source Library live smoke cannot run because hosted configuration is incomplete.', { missing });
  }

  const handler = createSourceLibraryHandler({ env: envAdapter, fetchImpl });

  const list = await invoke(handler, 'list', runtimeToken);
  const { author, comparisonPeer } = chooseDocuments(list.documents);

  const searchQuery = /astral projection/i.test(comparisonPeer.title || '')
    ? 'astral consciousness'
    : String(comparisonPeer.title || '').split(/\s+/).filter((word) => word.length > 3).slice(0, 3).join(' ');
  const search = await invoke(handler, 'search', runtimeToken, {
    query: searchQuery || 'ritual',
    item_ids: [comparisonPeer.item_id],
    limit: 8,
    request_id: `live_search_${Date.now()}`,
  });
  assertEvidence(search.results, 'SEARCH');
  if (search.results.some((result) => result.item_id !== comparisonPeer.item_id)) {
    throw typedError('SEARCH_SCOPE_BLEED', 'Scoped full-text search returned evidence from a different book.');
  }

  const compare = await invoke(handler, 'compare', runtimeToken, {
    item_ids: [author.item_id, comparisonPeer.item_id],
    query: 'Compare how these texts frame ritual practice, consciousness, transformation, or authority.',
    synthesize: false,
    request_id: `live_compare_${Date.now()}`,
  });
  if (!Array.isArray(compare.comparisons) || compare.comparisons.length !== 2) {
    throw typedError('COMPARE_BAD_CARDINALITY', 'Compare did not return exactly two document evidence groups.');
  }
  for (const group of compare.comparisons) {
    assertEvidence(group.evidence, 'COMPARE');
    if (group.evidence.some((source) => source.item_id !== group.document?.item_id)) {
      throw typedError('COMPARE_SCOPE_BLEED', 'Compare mixed source segments between document evidence groups.');
    }
  }

  const authorLens = await invoke(handler, 'author', runtimeToken, {
    item_id: author.item_id,
    message: 'Explain the central purpose of this text in your own terms, grounding the answer only in the supplied book evidence.',
    request_id: `live_author_${Date.now()}`,
  });
  assertEvidence(authorLens.evidence, 'AUTHOR_LENS');
  const response = authorLens.response || {};
  if (authorLens.mode !== 'author_reconstruction' || authorLens.simulated_author !== true) {
    throw typedError('AUTHOR_LENS_MODE_DRIFT', 'Author Lens did not preserve the labelled reconstruction envelope.');
  }
  if (response.flame_id !== 'oxalpha' || response.display_name !== 'Ox Alpha') {
    throw typedError('AUTHOR_LENS_IDENTITY_DRIFT', 'Author Lens response was not identified as Ox Alpha.');
  }
  if (response.provider !== 'huggingface-inference-providers' || response.model !== 'zai-org/GLM-5.3-Flash') {
    throw typedError('AUTHOR_LENS_ROUTE_DRIFT', 'Author Lens did not use the expected Hugging Face GLM-5.3-Flash route.', {
      provider: response.provider || null,
      model: response.model || null,
    });
  }
  if (!String(response.message || '').trim()) {
    throw typedError('AUTHOR_LENS_EMPTY_RESPONSE', 'Ox Alpha returned an empty Author Lens response.');
  }
  if (authorLens.receipt?.mode !== 'author_reconstruction' || authorLens.receipt?.flame_id !== 'oxalpha') {
    throw typedError('AUTHOR_LENS_RECEIPT_DRIFT', 'Author Lens receipt lost reconstruction or Flame identity metadata.');
  }

  return {
    ok: true,
    schema: 'source-library-live-smoke/v1',
    proof: {
      list: {
        request_id: list.request_id,
        document_count: list.count,
        indexed_document_count: list.documents.filter(usableDocument).length,
      },
      search: {
        request_id: search.request_id,
        item_id: comparisonPeer.item_id,
        title: comparisonPeer.title,
        result_count: search.count,
        segment_ids: search.results.map((result) => result.segment_id),
        text_hashes: search.results.map((result) => result.text_hash),
      },
      compare: {
        request_id: compare.request_id,
        item_ids: compare.comparisons.map((group) => group.document?.item_id),
        titles: compare.comparisons.map((group) => group.document?.title),
        evidence_counts: compare.comparisons.map((group) => group.evidence.length),
        segment_ids: compare.comparisons.flatMap((group) => group.evidence.map((source) => source.segment_id)),
        text_hashes: compare.comparisons.flatMap((group) => group.evidence.map((source) => source.text_hash)),
      },
      author_lens: {
        request_id: authorLens.request_id,
        item_id: author.item_id,
        title: author.title,
        author_display_name: author.author_display_name || author.author_name || null,
        author_attribution_state: author.author_attribution_state || 'unknown',
        mode: authorLens.mode,
        simulated_author: authorLens.simulated_author,
        flame_id: response.flame_id,
        display_name: response.display_name,
        provider: response.provider,
        model: response.model,
        response_sha256: sha256(response.message),
        response_char_count: String(response.message).length,
        evidence_segment_ids: authorLens.evidence.map((source) => source.segment_id),
        evidence_text_hashes: authorLens.evidence.map((source) => source.text_hash),
        receipt: authorLens.receipt,
      },
    },
  };
}

export default {
  async fetch() {
    if (String(process.env.VERCEL_ENV || '').toLowerCase() !== 'preview') {
      return json(404, { error: 'Source Library live smoke is preview-only.' });
    }
    try {
      return json(200, await runSourceLibraryLiveSmoke());
    } catch (error) {
      return json(error.code === 'HOSTED_CONFIGURATION_MISSING' ? 503 : 502, {
        ok: false,
        schema: 'source-library-live-smoke/v1',
        code: error.code || 'LIVE_SMOKE_FAILED',
        error: String(error.message || error).slice(0, 2000),
        details: error.details || {},
      });
    }
  },
};
