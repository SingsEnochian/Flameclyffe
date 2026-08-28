import { createHouseObservationRuntimeHandler } from '../../../netlify/functions/_shared/house-observation-runtime.mjs';
import { resolveSupabaseRuntimeConfig } from '../../../netlify/functions/_shared/supabase-runtime-config.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';

const resolved = resolveSupabaseRuntimeConfig(env);
const handle = createHouseObservationRuntimeHandler({ env: resolved.env });

export default {
  fetch(request) {
    return handle(request);
  },
};
