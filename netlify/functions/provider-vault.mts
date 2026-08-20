import { createClient } from '@supabase/supabase-js';
import { authoriseHouseRequest } from './_shared/house-session.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const SUPPORTED = new Set(['huggingface']);

function supabaseFor(env) {
  const url = env.get('SUPABASE_URL');
  const key = env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Provider Vault database connection is not configured.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function runRpc(client, name, params) {
  const { data, error } = await client.rpc(name, params);
  if (error) throw new Error(error.message || `Provider Vault ${name} failed.`);
  return Array.isArray(data) ? data[0] : data;
}

export default async (request, context) => {
  const env = { get: (name) => Netlify.env.get(name) };
  if (!authoriseHouseRequest(request, env)) {
    return json(401, { error: 'Valid House Runtime session required.' });
  }

  const provider = String(context?.params?.provider || '').trim().toLowerCase();
  if (!SUPPORTED.has(provider)) return json(404, { error: 'Unknown provider.' });

  let client;
  try { client = supabaseFor(env); }
  catch (error) { return json(503, { error: error.message }); }

  try {
    if (request.method === 'GET') {
      const status = await runRpc(client, 'provider_vault_status', { p_provider: provider });
      return json(200, { provider, configured: Boolean(status?.configured), updated_at: status?.updated_at || null });
    }

    if (request.method === 'POST') {
      let body;
      try { body = await request.json(); }
      catch { return json(400, { error: 'Valid JSON body required.' }); }
      const secret = String(body?.secret || '').trim();
      if (!secret) return json(400, { error: 'Provider token required.' });
      const status = await runRpc(client, 'provider_vault_set', { p_provider: provider, p_secret: secret });
      return json(200, { provider, configured: Boolean(status?.configured), updated_at: status?.updated_at || null });
    }

    if (request.method === 'DELETE') {
      const status = await runRpc(client, 'provider_vault_delete', { p_provider: provider });
      return json(200, { provider, configured: Boolean(status?.configured), updated_at: null });
    }

    return json(405, { error: 'GET, POST, or DELETE required.' });
  } catch (error) {
    return json(502, { error: error.message || 'Provider Vault operation failed.' });
  }
};

export const config = { path: '/api/v1/house/providers/:provider' };
