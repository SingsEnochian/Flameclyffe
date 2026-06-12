-- Flameclyffe ML registry and review boundary.
--
-- This migration is intentionally committed but not automatically applied.
-- It creates no policy that exposes records to anon or authenticated clients.
-- Application access must be added deliberately after privacy review.

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.ml_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  task text not null,
  version text not null,
  framework text not null default 'pytorch',
  source_uri text,
  licence text,
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  intended_use text not null,
  prohibited_use text not null,
  limitations text,
  deployment_lane text not null check (deployment_lane in ('batch', 'service', 'browser', 'edge')),
  status text not null default 'experimental' check (status in ('experimental', 'review', 'approved', 'retired')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, version)
);

create table if not exists public.ml_runs (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ml_models(id) on delete restrict,
  run_fingerprint text not null unique check (run_fingerprint ~ '^[0-9a-f]{64}$'),
  code_revision text not null,
  input_snapshot_hash text not null check (input_snapshot_hash ~ '^[0-9a-f]{64}$'),
  parameters jsonb not null default '{}'::jsonb,
  random_seed bigint,
  device text,
  precision text,
  runtime_ms double precision check (runtime_ms is null or runtime_ms >= 0),
  peak_memory_bytes bigint check (peak_memory_bytes is null or peak_memory_bytes >= 0),
  metrics jsonb not null default '{}'::jsonb,
  artefacts jsonb not null default '{}'::jsonb,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.ml_embeddings (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ml_models(id) on delete restrict,
  entity_type text not null,
  entity_id text not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  embedding vector not null,
  dimension integer not null check (dimension > 0),
  privacy_class text not null check (privacy_class in ('public', 'internal', 'private', 'restricted')),
  visibility text not null default 'private' check (visibility in ('private', 'review', 'public')),
  created_at timestamptz not null default now(),
  invalidated_at timestamptz,
  unique (model_id, entity_type, entity_id, content_hash)
);

create table if not exists public.ml_predictions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ml_runs(id) on delete restrict,
  entity_type text not null,
  entity_id text not null,
  task text not null,
  label text,
  value jsonb not null default '{}'::jsonb,
  confidence double precision check (confidence is null or (confidence >= 0 and confidence <= 1)),
  uncertainty double precision check (uncertainty is null or uncertainty >= 0),
  explanation jsonb not null default '{}'::jsonb,
  source_snapshot_hash text not null check (source_snapshot_hash ~ '^[0-9a-f]{64}$'),
  privacy_class text not null check (privacy_class in ('public', 'internal', 'private', 'restricted')),
  reviewer_state text not null default 'pending' check (reviewer_state in ('pending', 'accepted', 'edited', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ml_feedback (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.ml_predictions(id) on delete cascade,
  reviewer_action text not null check (reviewer_action in ('accepted', 'edited', 'rejected')),
  corrected_value jsonb,
  notes text,
  training_reuse_permitted boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists ml_runs_model_started_idx
  on public.ml_runs (model_id, started_at desc);

create index if not exists ml_embeddings_entity_idx
  on public.ml_embeddings (entity_type, entity_id, model_id)
  where invalidated_at is null;

create index if not exists ml_embeddings_privacy_idx
  on public.ml_embeddings (privacy_class, visibility)
  where invalidated_at is null;

create index if not exists ml_predictions_review_queue_idx
  on public.ml_predictions (reviewer_state, created_at desc);

create index if not exists ml_predictions_entity_idx
  on public.ml_predictions (entity_type, entity_id, task);

alter table public.ml_models enable row level security;
alter table public.ml_runs enable row level security;
alter table public.ml_embeddings enable row level security;
alter table public.ml_predictions enable row level security;
alter table public.ml_feedback enable row level security;

comment on table public.ml_models is
  'Registered ML and procedural models with source, licence, limits, and deployment status.';
comment on table public.ml_runs is
  'Reproducible experiment and inference runs identified by deterministic fingerprints.';
comment on table public.ml_embeddings is
  'Review-gated vectors with explicit privacy classes; no public policies are created here.';
comment on table public.ml_predictions is
  'Model suggestions and scores that require human review before downstream use.';
comment on table public.ml_feedback is
  'Reviewer decisions and corrections, with explicit training-reuse permission.';
