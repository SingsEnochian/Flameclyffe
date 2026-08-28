import { createClient } from '@supabase/supabase-js';

function requireServiceClient(env) {
  const url = String(env.get('SUPABASE_URL') || '').trim();
  const key = String(env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim();
  if (!url || !key) throw new Error('Supabase Lanternbridge storage is not configured.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function fail(error, operation) {
  if (error) throw new Error(`${operation}: ${error.message || error}`);
}

export function createSupabaseLanternbridgeStore(env, { client: suppliedClient = null } = {}) {
  const client = suppliedClient || requireServiceClient(env);

  return Object.freeze({
    async getByCursor(cursorKey) {
      const { data, error } = await client
        .from('lanternbridge_message_index')
        .select('*')
        .eq('cursor_key', String(cursorKey))
        .maybeSingle();
      fail(error, 'Lanternbridge cursor read failed');
      return data || null;
    },

    async getByBridgeId(bridgeId) {
      const { data, error } = await client
        .from('lanternbridge_message_index')
        .select('*')
        .eq('bridge_id', String(bridgeId))
        .order('source_created_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      fail(error, 'Lanternbridge bridge-id read failed');
      return data || null;
    },

    async list({ status = null, limit = 200 } = {}) {
      let query = client
        .from('lanternbridge_message_index')
        .select('*')
        .order('source_created_at', { ascending: false, nullsFirst: false })
        .limit(Math.max(1, Math.min(Number(limit) || 200, 500)));
      if (status) query = query.eq('status', String(status));
      const { data, error } = await query;
      fail(error, 'Lanternbridge index list failed');
      return data || [];
    },

    async insertNew(entry) {
      const { data, error } = await client
        .from('lanternbridge_message_index')
        .insert(entry)
        .select('*')
        .single();
      if (error?.code === '23505') return this.getByCursor(entry.cursor_key);
      fail(error, 'Lanternbridge index insert failed');
      return data;
    },

    async markProcessed(cursorKey, { commonsEntryId = null, threadId = null } = {}) {
      const patch = {
        status: 'processed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (commonsEntryId) patch.commons_entry_id = String(commonsEntryId);
      if (threadId) patch.thread_id = String(threadId);
      const { data, error } = await client
        .from('lanternbridge_message_index')
        .update(patch)
        .eq('cursor_key', String(cursorKey))
        .select('*')
        .single();
      fail(error, 'Lanternbridge processed-state update failed');
      return data;
    },

    async markBridgeStatus(bridgeId, status) {
      if (!['superseded', 'reply_emitted'].includes(status)) throw new Error(`Unsupported Lanternbridge status transition: ${status}`);
      const now = new Date().toISOString();
      const patch = { status, updated_at: now };
      if (status === 'reply_emitted') patch.reply_emitted_at = now;
      const { data, error } = await client
        .from('lanternbridge_message_index')
        .update(patch)
        .eq('bridge_id', String(bridgeId))
        .select('*');
      fail(error, `Lanternbridge ${status} update failed`);
      return data || [];
    },
  });
}
