create table if not exists public.arcsweep_feedback_cycles (
  cycle_id text primary key,
  world_id text not null,
  mode text not null check (mode in ('writing', 'roleplay')),
  source_sequence bigint not null check (source_sequence >= 0),
  next_sequence bigint not null check (next_sequence = source_sequence + 1),
  packet_id text not null references public.math_spine_packets(packet_id),
  packet_fingerprint text not null check (packet_fingerprint ~ '^[0-9a-f]{64}$'),
  voice_routes jsonb not null default '[]'::jsonb,
  canon_refs jsonb not null default '[]'::jsonb,
  work_turn jsonb not null,
  payload jsonb not null,
  status text not null default 'accepted' check (status in ('accepted', 'superseded', 'rejected')),
  created_at timestamptz not null default now(),
  check (payload ->> 'schema' = 'arcsweep.feedback-cycle/v1'),
  check (payload ->> 'cycle_id' = cycle_id),
  check (payload #>> '{world,id}' = world_id)
);

create index if not exists arcsweep_feedback_cycles_world_sequence_idx
  on public.arcsweep_feedback_cycles (world_id, next_sequence desc, created_at desc)
  where status = 'accepted';

alter table public.arcsweep_feedback_cycles enable row level security;
drop policy if exists "accepted Arcsweep feedback cycles are readable" on public.arcsweep_feedback_cycles;
create policy "accepted Arcsweep feedback cycles are readable"
on public.arcsweep_feedback_cycles for select to anon, authenticated using (status = 'accepted');
grant select on public.arcsweep_feedback_cycles to anon, authenticated;

insert into public.observatory_data_sources
  (source_key, table_name, domain, classification, contract_version, default_order, active_filter, metadata)
values
  ('arcsweep.feedback_cycles', 'arcsweep_feedback_cycles', 'relational-continuity', 'derived', 'arcsweep.feedback-cycle/v1', 'next_sequence.desc', '{"status":"accepted"}', '{"role":"world/canon/voice/work/PREMAQC feedback ledger"}')
on conflict (source_key) do update set table_name = excluded.table_name, domain = excluded.domain,
  classification = excluded.classification, contract_version = excluded.contract_version,
  default_order = excluded.default_order, active_filter = excluded.active_filter,
  is_live = true, metadata = excluded.metadata, updated_at = now();

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'arcsweep_feedback_cycles') then
    alter publication supabase_realtime add table public.arcsweep_feedback_cycles;
  end if;
end $$;
