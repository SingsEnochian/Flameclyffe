import { createClient } from '@supabase/supabase-js';

const DEFAULT_BUCKET = 'house-commons-attachments';

function requireServiceClient(env) {
  const url = String(env.get('SUPABASE_URL') || '').trim();
  const key = String(env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim();
  if (!url || !key) throw new Error('Supabase House Runtime storage is not configured.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function fail(error, operation) {
  if (!error) return;
  throw new Error(`${operation}: ${error.message || error}`);
}

function missing(error) {
  return /not found|object not found|no rows/i.test(String(error?.message || ''));
}

export function createSupabaseCommonsLedgerStore(env, { client: suppliedClient = null } = {}) {
  const client = suppliedClient || requireServiceClient(env);
  return Object.freeze({
    async list({ prefix = '' } = {}) {
      const start = String(prefix || '');
      // Commons entry keys begin with an ISO timestamp, so descending key order is newest-first.
      // Limit only after choosing that order or a large Commons will strand new messages past row 1000.
      let query = client.from('house_commons_entries').select('key').order('key', { ascending: false }).limit(1000);
      if (start) query = query.gte('key', start).lt('key', `${start}\uffff`);
      const { data, error } = await query;
      fail(error, 'House Commons ledger list failed');
      return { blobs: (data || []).map(({ key }) => ({ key })) };
    },

    async get(key, { type = 'json' } = {}) {
      if (type !== 'json') throw new Error(`House Commons ledger does not support ${type} reads.`);
      const { data, error } = await client
        .from('house_commons_entries')
        .select('payload')
        .eq('key', String(key))
        .maybeSingle();
      fail(error, 'House Commons ledger read failed');
      return data?.payload ?? null;
    },

    async setJSON(key, payload) {
      const createdAt = payload?.created_at || new Date().toISOString();
      const { error } = await client.from('house_commons_entries').upsert({
        key: String(key),
        payload,
        created_at: createdAt,
      }, { onConflict: 'key' });
      fail(error, 'House Commons ledger write failed');
    },
  });
}

export function createSupabaseCommonsAttachmentStore(env, { bucket = DEFAULT_BUCKET } = {}) {
  const client = requireServiceClient(env);
  const storage = client.storage.from(bucket);
  return Object.freeze({
    async get(key, { type = null } = {}) {
      const value = String(key || '');
      if (value.startsWith('meta/')) {
        const id = value.slice('meta/'.length);
        const { data, error } = await client
          .from('house_commons_attachments')
          .select('metadata')
          .eq('id', id)
          .maybeSingle();
        fail(error, 'House Commons attachment metadata read failed');
        return data?.metadata ?? null;
      }
      if (value.startsWith('file/')) {
        const { data, error } = await storage.download(value);
        if (error) {
          if (missing(error)) return null;
          fail(error, 'House Commons attachment download failed');
        }
        if (!data) return null;
        if (type === 'arrayBuffer') return data.arrayBuffer();
        return data;
      }
      throw new Error(`Unsupported House Commons attachment key: ${value}`);
    },

    async set(key, bytes) {
      const value = String(key || '');
      if (!value.startsWith('file/')) throw new Error(`Unsupported House Commons attachment key: ${value}`);
      const { error } = await storage.upload(value, bytes, {
        upsert: true,
        contentType: 'application/octet-stream',
        cacheControl: '0',
      });
      fail(error, 'House Commons attachment upload failed');
    },

    async setJSON(key, metadata) {
      const value = String(key || '');
      if (!value.startsWith('meta/')) throw new Error(`Unsupported House Commons attachment metadata key: ${value}`);
      const id = value.slice('meta/'.length);
      const { error } = await client.from('house_commons_attachments').upsert({
        id,
        metadata,
        created_at: metadata?.created_at || new Date().toISOString(),
      }, { onConflict: 'id' });
      fail(error, 'House Commons attachment metadata write failed');
    },
  });
}
