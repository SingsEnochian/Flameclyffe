import { createHouseObserverReportHandler } from './_shared/house-observer-reports.mjs';
import { resolveSupabaseRuntimeConfig } from './_shared/supabase-runtime-config.mjs';

export default (request) => {
  const env = { get: (name) => Netlify.env.get(name) };
  const resolved = resolveSupabaseRuntimeConfig(env);
  return createHouseObserverReportHandler({ env: resolved.env })(request);
};

export const config = { path: '/api/v1/house/observer-reports' };
