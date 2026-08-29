import { createEmergenceLabHandler } from '../../../netlify/functions/_shared/emergence-lab-runtime.mjs';
import { resolveSupabaseRuntimeConfig } from '../../../netlify/functions/_shared/supabase-runtime-config.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';

const resolved = resolveSupabaseRuntimeConfig(env);
const handle = createEmergenceLabHandler({ env: resolved.env });

export default {
  fetch(request) {
    return handle(request);
  },
};
