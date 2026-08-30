import { createHouseObserverReportHandler } from '../../../netlify/functions/_shared/house-observer-reports.mjs';
import { resolveSupabaseRuntimeConfig } from '../../../netlify/functions/_shared/supabase-runtime-config.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';

const resolved = resolveSupabaseRuntimeConfig(env);
const handle = createHouseObserverReportHandler({ env: resolved.env });

export default {
  fetch(request) {
    return handle(request);
  },
};
