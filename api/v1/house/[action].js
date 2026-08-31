import { createEmergenceLabHandler } from '../../../netlify/functions/_shared/emergence-lab-runtime.mjs';
import { createHouseObservationRuntimeHandler } from '../../../netlify/functions/_shared/house-observation-runtime.mjs';
import { createHouseObserverReportHandler } from '../../../netlify/functions/_shared/house-observer-reports.mjs';
import { createModelLabHandler } from '../../../netlify/functions/_shared/model-lab-runtime.mjs';
import { resolveSupabaseRuntimeConfig } from '../../../netlify/functions/_shared/supabase-runtime-config.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';

const resolved = resolveSupabaseRuntimeConfig(env);
const routes = Object.freeze({
  'emergence-lab': createEmergenceLabHandler({ env: resolved.env }),
  observations: createHouseObservationRuntimeHandler({ env: resolved.env }),
  'observer-reports': createHouseObserverReportHandler({ env: resolved.env }),
  'model-lab': createModelLabHandler({ env: resolved.env }),
});

function routeName(request) {
  const pathname = new URL(request.url).pathname;
  return decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '');
}

const notFound = () => new Response(JSON.stringify({ error: 'Unknown House route.' }), {
  status: 404,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
});

export default {
  fetch(request) {
    const handle = routes[routeName(request)];
    return handle ? handle(request) : notFound();
  },
};
