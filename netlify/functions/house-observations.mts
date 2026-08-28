import { createHouseObservationRuntimeHandler } from './_shared/house-observation-runtime.mjs';
import { resolveSupabaseRuntimeConfig } from './_shared/supabase-runtime-config.mjs';

export default (request) => {
  const env = { get: (name) => Netlify.env.get(name) };
  const resolved = resolveSupabaseRuntimeConfig(env);
  return createHouseObservationRuntimeHandler({ env: resolved.env })(request);
};

export const config = { path: '/api/v1/house/observations' };
