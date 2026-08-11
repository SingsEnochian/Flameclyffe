create table if not exists public.math_spine_packets (
  packet_id text primary key,
  world_id text not null,
  schema_version integer not null default 1 check (schema_version = 1),
  spine_version text not null check (spine_version = 'hearthgate-braided-spine/1.8'),
  engine_version text not null,
  source_premaq_id text not null,
  source_sequence bigint not null check (source_sequence >= 0),
  source_fingerprint text not null check (source_fingerprint ~ '^[0-9a-f]{64}$'),
  packet_fingerprint text not null unique check (packet_fingerprint ~ '^[0-9a-f]{64}$'),
  observed_at timestamptz not null,
  status text not null default 'accepted' check (status in ('accepted', 'superseded', 'rejected')),
  payload jsonb not null,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (world_id, source_sequence, packet_fingerprint),
  check (payload ->> 'schema' = 'hearthgate.math-spine-packet/v1'),
  check (payload ->> 'world_id' = world_id),
  check (payload ->> 'packet_fingerprint' = packet_fingerprint),
  check (payload ->> 'source_fingerprint' = source_fingerprint)
);

create index if not exists math_spine_packets_world_sequence_idx
  on public.math_spine_packets (world_id, source_sequence desc, created_at desc)
  where status = 'accepted';

alter table public.math_spine_packets enable row level security;

drop policy if exists "accepted math spine packets are readable" on public.math_spine_packets;
create policy "accepted math spine packets are readable"
on public.math_spine_packets for select
to anon, authenticated
using (status = 'accepted');

grant select on public.math_spine_packets to anon, authenticated;

insert into public.observatory_data_sources
  (source_key, table_name, domain, classification, contract_version, default_order, active_filter, metadata)
values
  ('math.spine_packets', 'math_spine_packets', 'mathematics', 'derived', 'hearthgate.math-spine-packet/v1', 'source_sequence.desc', '{"status":"accepted"}', '{"role":"accepted shared derivation and deterministic replay ledger","spine_version":"hearthgate-braided-spine/1.8"}')
on conflict (source_key) do update set
  table_name = excluded.table_name,
  domain = excluded.domain,
  classification = excluded.classification,
  contract_version = excluded.contract_version,
  default_order = excluded.default_order,
  active_filter = excluded.active_filter,
  is_live = true,
  metadata = excluded.metadata,
  updated_at = now();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'math_spine_packets'
  ) then
    alter publication supabase_realtime add table public.math_spine_packets;
  end if;
end
$$;
