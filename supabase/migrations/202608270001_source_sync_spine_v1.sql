-- Source Sync Spine v1
--
-- Durable, append-friendly synchronization ledger for private source archives.
-- Raw source content is not stored in Git. This schema deliberately separates
-- provider access/ownership from copyright or publication rights.

create table if not exists public.source_sync_roots (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  provider text not null,
  root_item_id text not null,
  display_name text not null,
  root_url text not null,
  source_kind text not null default 'folder_tree',
  sync_mode text not null default 'metadata_and_text'
    check (sync_mode in ('metadata_only','metadata_and_text','binary_mirror','disabled')),
  enabled boolean not null default true,
  observer_feed_id uuid null references public.observer_feed_registry(id) on delete set null,
  access_level text not null default 'private'
    check (access_level in ('private','circle','public')),
  consent_scope text[] not null default array['rowan']::text[],
  rights_state text not null default 'unknown'
    check (rights_state in ('unknown','user_owned','public_domain','licensed','restricted','needs_review')),
  rights_note text null,
  traversal_policy jsonb not null default '{}'::jsonb,
  extraction_policy jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_started_at timestamptz null,
  last_success_at timestamptz null,
  last_error_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, root_item_id)
);

create table if not exists public.source_sync_runs (
  id uuid primary key default gen_random_uuid(),
  sync_epoch uuid not null default gen_random_uuid(),
  source_id uuid not null references public.source_sync_roots(id) on delete cascade,
  observer_ingestion_run_id uuid null references public.observer_ingestion_runs(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  run_status text not null default 'running'
    check (run_status in ('running','succeeded','partial','failed','cancelled')),
  operating_mode text not null default 'MANUAL'
    check (operating_mode in ('OFF','MANUAL','INTERVAL','PAUSED','DEGRADED','ERROR')),
  traversal_mode text not null default 'recursive',
  cursor_before jsonb not null default '{}'::jsonb,
  cursor_after jsonb not null default '{}'::jsonb,
  request_window jsonb not null default '{}'::jsonb,
  discovered_count integer not null default 0 check (discovered_count >= 0),
  added_count integer not null default 0 check (added_count >= 0),
  changed_count integer not null default 0 check (changed_count >= 0),
  unchanged_count integer not null default 0 check (unchanged_count >= 0),
  moved_count integer not null default 0 check (moved_count >= 0),
  renamed_count integer not null default 0 check (renamed_count >= 0),
  permission_changed_count integer not null default 0 check (permission_changed_count >= 0),
  tombstoned_count integer not null default 0 check (tombstoned_count >= 0),
  restored_count integer not null default 0 check (restored_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  extracted_count integer not null default 0 check (extracted_count >= 0),
  segment_count integer not null default 0 check (segment_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  execution_time_ms integer null check (execution_time_ms is null or execution_time_ms >= 0),
  transport_metadata jsonb not null default '{}'::jsonb,
  extractor_metadata jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  error_summary text null,
  created_at timestamptz not null default now()
);

create table if not exists public.source_sync_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.source_sync_roots(id) on delete cascade,
  provider text not null,
  provider_item_id text not null,
  item_kind text not null default 'file'
    check (item_kind in ('file','folder','shortcut','other')),
  name text not null,
  mime_type text null,
  size_bytes bigint null check (size_bytes is null or size_bytes >= 0),
  parent_provider_ids text[] not null default '{}'::text[],
  canonical_path text null,
  drive_id text null,
  web_view_url text null,
  created_time timestamptz null,
  modified_time timestamptz null,
  provider_version text null,
  head_revision_id text null,
  md5_checksum text null,
  sha1_checksum text null,
  sha256_checksum text null,
  shared boolean null,
  trashed boolean null,
  starred boolean null,
  owned_by_me boolean null,
  can_download boolean null,
  can_list_children boolean null,
  can_share boolean null,
  permission_state jsonb not null default '{}'::jsonb,
  permission_fingerprint text null,
  metadata_snapshot jsonb not null default '{}'::jsonb,
  metadata_fingerprint text not null,
  content_fingerprint text null,
  rights_state text not null default 'unknown'
    check (rights_state in ('unknown','user_owned','public_domain','licensed','restricted','needs_review')),
  ingest_scope text not null default 'metadata_only'
    check (ingest_scope in ('metadata_only','text','binary','blocked')),
  extraction_status text not null default 'not_started'
    check (extraction_status in ('not_started','queued','extracting','extracted','partial','failed','blocked','not_applicable')),
  extraction_method text null,
  extractor_version text null,
  extracted_at timestamptz null,
  extracted_text_length bigint null check (extracted_text_length is null or extracted_text_length >= 0),
  page_count integer null check (page_count is null or page_count >= 0),
  language text null,
  content_hash text null,
  index_status text not null default 'not_indexed'
    check (index_status in ('not_indexed','queued','indexed','partial','failed','blocked')),
  embedding_model text null,
  embedding_version text null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_seen_run_id uuid null references public.source_sync_runs(id) on delete set null,
  tombstoned_at timestamptz null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, provider_item_id)
);

create table if not exists public.source_sync_item_revisions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.source_sync_roots(id) on delete cascade,
  item_id uuid not null references public.source_sync_items(id) on delete cascade,
  run_id uuid null references public.source_sync_runs(id) on delete set null,
  observed_at timestamptz not null default now(),
  change_type text not null
    check (change_type in ('discovered','unchanged','metadata_changed','content_changed','renamed','moved','permission_changed','restored','tombstoned','extraction_updated','index_updated','error')),
  idempotency_key text not null unique,
  previous_metadata_fingerprint text null,
  metadata_fingerprint text not null,
  previous_content_fingerprint text null,
  content_fingerprint text null,
  field_changes jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.source_sync_edges (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.source_sync_roots(id) on delete cascade,
  run_id uuid null references public.source_sync_runs(id) on delete set null,
  parent_item_id uuid null references public.source_sync_items(id) on delete cascade,
  child_item_id uuid not null references public.source_sync_items(id) on delete cascade,
  relation_type text not null default 'parent_child'
    check (relation_type in ('parent_child','root_contains','duplicate_of','derived_from','chunk_of','references')),
  edge_fingerprint text not null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_id, edge_fingerprint, valid_from)
);

create table if not exists public.source_sync_content_segments (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.source_sync_roots(id) on delete cascade,
  item_id uuid not null references public.source_sync_items(id) on delete cascade,
  run_id uuid null references public.source_sync_runs(id) on delete set null,
  segment_index integer not null check (segment_index >= 0),
  segment_kind text not null default 'chunk'
    check (segment_kind in ('whole','page','chapter','chunk','ocr_block','caption','transcript','other')),
  source_locator jsonb not null default '{}'::jsonb,
  text_content text not null,
  text_hash text not null,
  char_count integer not null check (char_count >= 0),
  token_estimate integer null check (token_estimate is null or token_estimate >= 0),
  extraction_method text null,
  extractor_version text null,
  language text null,
  access_level text not null default 'private'
    check (access_level in ('private','circle','public')),
  consent_scope text[] not null default array['rowan']::text[],
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (item_id, text_hash, segment_index)
);

create table if not exists public.source_sync_events (
  id uuid primary key default gen_random_uuid(),
  sync_epoch uuid null,
  source_id uuid not null references public.source_sync_roots(id) on delete cascade,
  run_id uuid null references public.source_sync_runs(id) on delete set null,
  item_id uuid null references public.source_sync_items(id) on delete set null,
  event_type text not null,
  event_at timestamptz not null default now(),
  idempotency_key text not null unique,
  before_fingerprint text null,
  after_fingerprint text null,
  payload jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists source_sync_runs_source_started_idx
  on public.source_sync_runs(source_id, started_at desc);
create index if not exists source_sync_items_provider_idx
  on public.source_sync_items(provider, provider_item_id);
create index if not exists source_sync_items_source_current_idx
  on public.source_sync_items(source_id, is_current, modified_time desc);
create index if not exists source_sync_items_metadata_fp_idx
  on public.source_sync_items(metadata_fingerprint);
create index if not exists source_sync_items_content_hash_idx
  on public.source_sync_items(content_hash) where content_hash is not null;
create index if not exists source_sync_revisions_item_observed_idx
  on public.source_sync_item_revisions(item_id, observed_at desc);
create index if not exists source_sync_segments_item_idx
  on public.source_sync_content_segments(item_id, segment_index);
create index if not exists source_sync_events_source_event_idx
  on public.source_sync_events(source_id, event_at desc);

-- Foreign-key covering indexes used by traversal, replay, and cleanup paths.
create index if not exists source_sync_roots_observer_feed_idx
  on public.source_sync_roots(observer_feed_id) where observer_feed_id is not null;
create index if not exists source_sync_runs_observer_ingestion_idx
  on public.source_sync_runs(observer_ingestion_run_id) where observer_ingestion_run_id is not null;
create index if not exists source_sync_items_last_seen_run_idx
  on public.source_sync_items(last_seen_run_id) where last_seen_run_id is not null;
create index if not exists source_sync_revisions_source_idx
  on public.source_sync_item_revisions(source_id);
create index if not exists source_sync_revisions_run_idx
  on public.source_sync_item_revisions(run_id) where run_id is not null;
create index if not exists source_sync_edges_run_idx
  on public.source_sync_edges(run_id) where run_id is not null;
create index if not exists source_sync_edges_parent_idx
  on public.source_sync_edges(parent_item_id) where parent_item_id is not null;
create index if not exists source_sync_edges_child_idx
  on public.source_sync_edges(child_item_id);
create index if not exists source_sync_segments_source_idx
  on public.source_sync_content_segments(source_id);
create index if not exists source_sync_segments_run_idx
  on public.source_sync_content_segments(run_id) where run_id is not null;
create index if not exists source_sync_events_run_idx
  on public.source_sync_events(run_id) where run_id is not null;
create index if not exists source_sync_events_item_idx
  on public.source_sync_events(item_id) where item_id is not null;

alter table public.source_sync_roots enable row level security;
alter table public.source_sync_runs enable row level security;
alter table public.source_sync_items enable row level security;
alter table public.source_sync_item_revisions enable row level security;
alter table public.source_sync_edges enable row level security;
alter table public.source_sync_content_segments enable row level security;
alter table public.source_sync_events enable row level security;

-- Private by default. Service-role ingestion may operate server-side; no client
-- policy is created here, so accidental future grants remain denied by RLS.
revoke all on table public.source_sync_roots from anon, authenticated;
revoke all on table public.source_sync_runs from anon, authenticated;
revoke all on table public.source_sync_items from anon, authenticated;
revoke all on table public.source_sync_item_revisions from anon, authenticated;
revoke all on table public.source_sync_edges from anon, authenticated;
revoke all on table public.source_sync_content_segments from anon, authenticated;
revoke all on table public.source_sync_events from anon, authenticated;

grant select, insert, update, delete on table public.source_sync_roots to service_role;
grant select, insert, update, delete on table public.source_sync_runs to service_role;
grant select, insert, update, delete on table public.source_sync_items to service_role;
grant select, insert, update, delete on table public.source_sync_item_revisions to service_role;
grant select, insert, update, delete on table public.source_sync_edges to service_role;
grant select, insert, update, delete on table public.source_sync_content_segments to service_role;
grant select, insert, update, delete on table public.source_sync_events to service_role;

comment on table public.source_sync_roots is
  'Private source roots for metadata/content synchronization. Service-role first; source ownership does not imply copyright/publication rights.';
comment on table public.source_sync_runs is
  'One synchronization traversal attempt with explicit counts, cursors, transport, extraction, and failure receipts.';
comment on table public.source_sync_items is
  'Current provider-item state. Provider IDs are stable identity; paths/names are observations that may change.';
comment on table public.source_sync_item_revisions is
  'Append-only observed revision/change ledger for source synchronization.';
comment on table public.source_sync_edges is
  'Versioned source topology and semantic edges, including parent-child and duplicate relationships.';
comment on table public.source_sync_content_segments is
  'Private extracted text segments with source locators and extraction provenance. No public client access by default.';
comment on table public.source_sync_events is
  'Append-only synchronization event ledger for every meaningful source-state transition.';
