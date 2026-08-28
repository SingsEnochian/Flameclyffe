-- Source Library Query Spine v1
--
-- Private retrieval/query layer over Source Sync Spine extracted text. The
-- library preserves source provenance, keeps author attribution explicit, and
-- records search/compare/author-lens receipts without exposing archive text to
-- browser-side Supabase clients.

alter table public.source_sync_content_segments
  add column if not exists search_vector tsvector
  generated always as (to_tsvector('simple', coalesce(text_content, ''))) stored;

create index if not exists source_sync_segments_search_gin
  on public.source_sync_content_segments using gin(search_vector);

create table if not exists public.source_library_documents (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.source_sync_items(id) on delete cascade,
  source_id uuid not null references public.source_sync_roots(id) on delete cascade,
  title text not null,
  subtitle text null,
  author_name text null,
  author_display_name text null,
  author_attribution_state text not null default 'unknown'
    check (author_attribution_state in ('unknown','extracted','inferred','verified','manual')),
  author_evidence jsonb not null default '[]'::jsonb,
  publication_year integer null check (publication_year is null or publication_year between 1 and 3000),
  edition text null,
  publisher text null,
  isbn text null,
  subjects text[] not null default '{}'::text[],
  search_aliases text[] not null default '{}'::text[],
  language text null,
  bibliographic_metadata jsonb not null default '{}'::jsonb,
  voice_profile jsonb not null default '{}'::jsonb,
  voice_profile_provenance jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  access_level text not null default 'private'
    check (access_level in ('private','circle','public')),
  consent_scope text[] not null default array['rowan']::text[],
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_library_query_receipts (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  action text not null check (action in ('list','search','compare','author')),
  query_text text null,
  item_ids uuid[] not null default '{}'::uuid[],
  segment_ids uuid[] not null default '{}'::uuid[],
  result_count integer not null default 0 check (result_count >= 0),
  flame_id text null,
  provider text null,
  model text null,
  mode text null,
  prompt_hash text null,
  response_hash text null,
  status text not null default 'succeeded'
    check (status in ('succeeded','partial','failed','rejected')),
  error_text text null,
  latency_ms integer null check (latency_ms is null or latency_ms >= 0),
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists source_library_documents_source_idx
  on public.source_library_documents(source_id, title);
create index if not exists source_library_documents_author_idx
  on public.source_library_documents(author_display_name) where author_display_name is not null;
create index if not exists source_library_documents_subjects_gin
  on public.source_library_documents using gin(subjects);
create index if not exists source_library_receipts_created_idx
  on public.source_library_query_receipts(created_at desc);
create index if not exists source_library_receipts_items_gin
  on public.source_library_query_receipts using gin(item_ids);

insert into public.source_library_documents (
  item_id,
  source_id,
  title,
  language,
  provenance
)
select
  i.id,
  i.source_id,
  regexp_replace(i.name, '\.[A-Za-z0-9]{1,8}$', ''),
  i.language,
  jsonb_build_object(
    'seed', 'source_sync_items',
    'provider', i.provider,
    'provider_item_id', i.provider_item_id,
    'seeded_at', now()
  )
from public.source_sync_items i
where i.item_kind = 'file'
  and i.is_current = true
on conflict (item_id) do nothing;

alter table public.source_library_documents enable row level security;
alter table public.source_library_query_receipts enable row level security;

revoke all on table public.source_library_documents from anon, authenticated;
revoke all on table public.source_library_query_receipts from anon, authenticated;

grant select, insert, update, delete on table public.source_library_documents to service_role;
grant select, insert, update, delete on table public.source_library_query_receipts to service_role;

comment on table public.source_library_documents is
  'Private bibliographic/query catalogue for synced source items. Author attribution remains explicit and provenance-bearing.';
comment on table public.source_library_query_receipts is
  'Private receipts for archive list/search/compare/Ox Alpha author-lens retrieval, preserving the exact source segment set used.';
comment on column public.source_sync_content_segments.search_vector is
  'Language-neutral simple-config full-text vector for private archive search.';
