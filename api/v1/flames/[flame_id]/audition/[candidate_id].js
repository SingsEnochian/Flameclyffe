import { createWebModelAuditionHandler } from '../../../../../netlify/functions/_shared/web-model-audition.mjs';
import { vercelEnv } from '../../../../_shared/vercel-env.mjs';

export default {
  async fetch(request) {
    const parts = new URL(request.url).pathname.split('/').filter(Boolean);
    const index = parts.indexOf('flames');
    const params = {
      flame_id: index >= 0 ? decodeURIComponent(parts[index + 1] || '') : '',
      candidate_id: index >= 0 ? decodeURIComponent(parts[index + 3] || '') : '',
    };
    return createWebModelAuditionHandler({ env: vercelEnv })(request, { params });
  },
};
