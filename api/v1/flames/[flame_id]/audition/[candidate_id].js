import { createHostedModelAuditionHandler } from '../../../../../netlify/functions/_shared/model-audition-runtime.mjs';
import { vercelEnv as env } from '../../../../_shared/vercel-env.mjs';

function routeParams(request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const flameIndex = parts.indexOf('flames');
  const auditionIndex = parts.indexOf('audition');
  return {
    flame_id: flameIndex >= 0 ? decodeURIComponent(parts[flameIndex + 1] || '') : '',
    candidate_id: auditionIndex >= 0 ? decodeURIComponent(parts[auditionIndex + 1] || '') : '',
  };
}

const handle = createHostedModelAuditionHandler({ env });

export const config = { maxDuration: 120 };

export default {
  fetch(request) {
    return handle(request, routeParams(request));
  },
};
