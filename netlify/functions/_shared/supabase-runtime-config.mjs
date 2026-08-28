export const FLAMECLYFFE_SUPABASE_URL = 'https://rufrmjyusalnifpegllj.supabase.co';

const first = (...values) => values.map((value) => String(value || '').trim()).find(Boolean) || '';

export function resolveSupabaseRuntimeConfig(env) {
  const get = (name) => env?.get?.(name);
  const url = first(
    get('SUPABASE_URL'),
    get('VITE_SUPABASE_URL'),
    get('PUBLIC_SUPABASE_URL'),
    FLAMECLYFFE_SUPABASE_URL,
  ).replace(/\/$/, '');
  const serviceRoleKey = first(
    get('SUPABASE_SERVICE_ROLE_KEY'),
    get('SUPABASE_SERVICE_KEY'),
    get('SUPABASE_SECRET_KEY'),
  );
  const runtimeEnv = Object.freeze({
    get(name) {
      if (name === 'SUPABASE_URL') return url;
      if (name === 'SUPABASE_SERVICE_ROLE_KEY') return serviceRoleKey;
      return get(name);
    },
  });
  return Object.freeze({
    url,
    serviceRoleKey,
    configured: Boolean(url && serviceRoleKey),
    missing: serviceRoleKey ? [] : ['SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_KEY|SUPABASE_SECRET_KEY'],
    env: runtimeEnv,
  });
}
