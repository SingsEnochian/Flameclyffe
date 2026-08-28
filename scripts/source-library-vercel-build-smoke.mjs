#!/usr/bin/env node

import { runSourceLibraryLiveSmoke } from '../api/source-library-live-smoke.js';

const branch = String(process.env.VERCEL_GIT_COMMIT_REF || '').trim();
const environment = String(process.env.VERCEL_ENV || '').trim().toLowerCase();
const targetBranch = 'feature/source-sync-drive-ingest-v1';

// This is a temporary feature-branch proving chamber, not a permanent cost on
// every Flameclyffe preview. The external post-deploy gate remains authoritative
// for route reachability; this inner smoke proves the real preview environment,
// private Supabase corpus, and Hugging Face Ox Alpha route can complete the braid.
if (environment !== 'preview' || branch !== targetBranch) {
  console.log(JSON.stringify({
    ok: true,
    skipped: true,
    schema: 'source-library-vercel-build-smoke/v1',
    reason: 'not_source_library_feature_preview',
    environment: environment || null,
    branch: branch || null,
  }));
  process.exit(0);
}

const ephemeralRuntimeToken = process.env.ARCSWEEP_RUNTIME_TOKEN
  || `source-library-build-smoke:${process.env.VERCEL_GIT_COMMIT_SHA || 'preview'}`;

const envAdapter = Object.freeze({
  get(name) {
    if (name === 'ARCSWEEP_RUNTIME_TOKEN') return ephemeralRuntimeToken;
    return process.env[name];
  },
});

try {
  const result = await runSourceLibraryLiveSmoke({ envAdapter, fetchImpl: fetch });
  const proof = result.proof || {};
  console.log(JSON.stringify({
    ok: true,
    schema: 'source-library-vercel-build-smoke/v1',
    commit_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    branch,
    environment,
    proof: {
      indexed_document_count: proof.list?.indexed_document_count ?? null,
      search_result_count: proof.search?.result_count ?? null,
      compare_item_ids: proof.compare?.item_ids || [],
      compare_evidence_counts: proof.compare?.evidence_counts || [],
      author_lens: {
        request_id: proof.author_lens?.request_id || null,
        item_id: proof.author_lens?.item_id || null,
        author_display_name: proof.author_lens?.author_display_name || null,
        author_attribution_state: proof.author_lens?.author_attribution_state || null,
        mode: proof.author_lens?.mode || null,
        simulated_author: proof.author_lens?.simulated_author ?? null,
        flame_id: proof.author_lens?.flame_id || null,
        provider: proof.author_lens?.provider || null,
        model: proof.author_lens?.model || null,
        response_sha256: proof.author_lens?.response_sha256 || null,
        response_char_count: proof.author_lens?.response_char_count ?? null,
        evidence_segment_ids: proof.author_lens?.evidence_segment_ids || [],
        evidence_text_hashes: proof.author_lens?.evidence_text_hashes || [],
      },
    },
  }));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    schema: 'source-library-vercel-build-smoke/v1',
    commit_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    branch,
    environment,
    code: error?.code || 'BUILD_SMOKE_FAILED',
    error: String(error?.message || error).slice(0, 1600),
    details: error?.details || {},
  }));
  process.exit(1);
}
