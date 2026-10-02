import { createNikolaRideAlongHandler } from '../../../_shared/nikola-ride-along-runtime.mjs';
import { vercelEnv as env } from '../../../_shared/vercel-env.mjs';

function routeParams(request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const nikolaIndex = parts.indexOf('nikola');
  return { action: nikolaIndex >= 0 ? decodeURIComponent(parts[nikolaIndex + 1] || '') : '' };
}

export default {
  async fetch(request) {
    return createNikolaRideAlongHandler({ env, fetchImpl: fetch })(request, routeParams(request));
  },
};
