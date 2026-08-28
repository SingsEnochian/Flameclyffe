import { createSourceLibraryHandler } from '../../../netlify/functions/_shared/source-library-runtime.mjs';
import { runSourceLibraryLiveSmoke } from '../../../netlify/functions/_shared/source-library-live-smoke.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function routeParams(request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const libraryIndex = parts.indexOf('library');
  return {
    action: libraryIndex >= 0 ? decodeURIComponent(parts[libraryIndex + 1] || '') : '',
  };
}

async function handleLiveSmoke() {
  if (String(process.env.VERCEL_ENV || '').toLowerCase() !== 'preview') {
    return json(404, { error: 'Source Library live smoke is preview-only.' });
  }
  try {
    return json(200, await runSourceLibraryLiveSmoke({ envAdapter: env }));
  } catch (error) {
    return json(error.code === 'HOSTED_CONFIGURATION_MISSING' ? 503 : 502, {
      ok: false,
      schema: 'source-library-live-smoke/v1',
      code: error.code || 'LIVE_SMOKE_FAILED',
      error: String(error.message || error).slice(0, 2000),
      details: error.details || {},
    });
  }
}

export default {
  async fetch(request) {
    const params = routeParams(request);
    if (params.action === 'live-smoke') return handleLiveSmoke();
    return createSourceLibraryHandler({ env })(request, params);
  },
};
