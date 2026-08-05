export function createSupabaseSyncRemote({ client, table = 'bifrost_sync_envelopes', batchSize = 250 }) {
  if (!client?.from) throw new TypeError('Supabase client is required');

  return Object.freeze({
    async push(envelopes) {
      if (!envelopes.length) return { acceptedIds: [] };
      const rows = envelopes.map(envelope => ({
        envelope_id: envelope.envelopeId,
        device_id: envelope.deviceId,
        actor_id: envelope.actorId,
        stream: envelope.stream,
        entity_id: envelope.entityId,
        operation: envelope.operation,
        base_revision: envelope.baseRevision,
        revision: envelope.revision,
        payload: envelope.payload,
        source_runtime: envelope.sourceRuntime,
        created_at: envelope.createdAt,
      }));
      const { error } = await client.from(table).upsert(rows, { onConflict: 'envelope_id', ignoreDuplicates: true });
      if (error) throw error;
      return { acceptedIds: envelopes.map(item => item.envelopeId) };
    },

    async pull(cursor) {
      let query = client.from(table)
        .select('*')
        .order('created_at', { ascending: true })
        .order('envelope_id', { ascending: true })
        .limit(batchSize);
      if (cursor) query = query.gt('created_at', cursor);
      const { data, error } = await query;
      if (error) throw error;
      const items = (data || []).map(row => ({
        schema: 'hearthgate.bifrost-sync/v1',
        envelopeId: row.envelope_id,
        deviceId: row.device_id,
        actorId: row.actor_id,
        stream: row.stream,
        entityId: row.entity_id,
        operation: row.operation,
        baseRevision: row.base_revision,
        revision: row.revision,
        payload: row.payload,
        sourceRuntime: row.source_runtime,
        createdAt: row.created_at,
      }));
      return { items, cursor: items.at(-1)?.createdAt || cursor || null };
    },
  });
}

export const BIFROST_SYNC_SQL = `
create table if not exists public.bifrost_sync_envelopes (
  envelope_id text primary key,
  device_id text not null,
  actor_id text not null,
  stream text not null,
  entity_id text not null,
  operation text not null,
  base_revision bigint not null default 0,
  revision bigint not null,
  payload jsonb,
  source_runtime text not null,
  created_at timestamptz not null
);
create index if not exists bifrost_sync_created_at_idx on public.bifrost_sync_envelopes(created_at, envelope_id);
`;
