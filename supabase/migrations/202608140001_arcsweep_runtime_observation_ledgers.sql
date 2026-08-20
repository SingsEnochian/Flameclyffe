alter table public.arcsweep_feedback_cycles
  drop constraint if exists arcsweep_feedback_cycles_mode_check;
alter table public.arcsweep_feedback_cycles
  add constraint arcsweep_feedback_cycles_mode_check
  check (mode in ('writing', 'roleplay', 'observation', 'reflection'));

create table if not exists public.arcsweep_feedback_reviews (
  review_receipt_id text primary key,
  cycle_id text not null unique references public.arcsweep_feedback_cycles(cycle_id),
  world_id text not null,
  observation_source text not null check (observation_source in ('field', 'relational-observation', 'relational-feedback')),
  decision text not null check (decision in ('accepted', 'archived', 'discarded')),
  reviewed_by text not null,
  reviewed_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  check (payload ->> 'cycle_id' = cycle_id),
  check (coalesce(payload ->> 'review_receipt_id', payload ->> 'receipt_id') = review_receipt_id)
);

create index if not exists arcsweep_feedback_reviews_world_time_idx
  on public.arcsweep_feedback_reviews (world_id, reviewed_at desc);

create table if not exists public.arcsweep_deep_time_records (
  record_id text primary key,
  cycle_id text not null unique references public.arcsweep_feedback_cycles(cycle_id),
  review_receipt_id text not null references public.arcsweep_feedback_reviews(review_receipt_id),
  world_id text not null,
  sequence_id text not null,
  lambda bigint not null,
  observed_at timestamptz not null,
  record_fingerprint text not null unique check (record_fingerprint ~ '^[0-9a-f]{64}$'),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  check (payload ->> 'id' = record_id),
  check (payload ->> 'dataset_kind' = 'deep_time'),
  check (payload ->> 'world_id' = world_id),
  check (payload #>> '{provenance,observation_run_id}' = cycle_id),
  check (payload #>> '{provenance,feedback_review_receipt_id}' = review_receipt_id)
);

create index if not exists arcsweep_deep_time_records_world_lambda_idx
  on public.arcsweep_deep_time_records (world_id, sequence_id, lambda desc, observed_at desc);

alter table public.arcsweep_feedback_reviews enable row level security;
alter table public.arcsweep_deep_time_records enable row level security;

revoke all on public.arcsweep_feedback_reviews from anon, authenticated;
revoke all on public.arcsweep_deep_time_records from anon, authenticated;

insert into public.observatory_data_sources
  (source_key, table_name, domain, classification, contract_version, default_order, active_filter, metadata)
values
  ('arcsweep.feedback_reviews', 'arcsweep_feedback_reviews', 'relational-continuity', 'reviewed', 'arcsweep.feedback-cycle-queue-receipt/v1', 'reviewed_at.desc', '{}'::jsonb, '{"role":"private human observation review ledger","access":"sealed-house-runtime"}'::jsonb),
  ('arcsweep.deep_time_records', 'arcsweep_deep_time_records', 'temporal-observation', 'reviewed', 'deep_time/0.1.0', 'observed_at.desc', '{}'::jsonb, '{"role":"private accepted observation continuity ledger","access":"sealed-house-runtime"}'::jsonb)
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
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'arcsweep_feedback_reviews') then
    alter publication supabase_realtime add table public.arcsweep_feedback_reviews;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'arcsweep_deep_time_records') then
    alter publication supabase_realtime add table public.arcsweep_deep_time_records;
  end if;
end
$$;
