create table if not exists public.lanternbridge_message_index (
  cursor_key text primary key,
  bridge_id text not null,
  source_ref text not null,
  source_system text,
  source_repo text,
  source_path text,
  source_commit text,
  protocol text not null,
  origin text,
  authors jsonb not null default '[]'::jsonb,
  addressed_to jsonb not null default '[]'::jsonb,
  responds_to text,
  supersedes text,
  thread_id text not null,
  commons_entry_id text,
  status text not null default 'new'
    check (status in ('new', 'processed', 'superseded', 'reply_emitted')),
  payload jsonb not null,
  source_created_at timestamptz,
  ingested_at timestamptz not null default now(),
  processed_at timestamptz,
  reply_emitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (bridge_id, source_ref)
);

create index if not exists lanternbridge_message_index_bridge_id_idx
  on public.lanternbridge_message_index (bridge_id);

create index if not exists lanternbridge_message_index_responds_to_idx
  on public.lanternbridge_message_index (responds_to)
  where responds_to is not null;

create index if not exists lanternbridge_message_index_status_idx
  on public.lanternbridge_message_index (status, source_created_at desc nulls last);

create index if not exists lanternbridge_message_index_thread_idx
  on public.lanternbridge_message_index (thread_id, source_created_at asc nulls last);

alter table public.lanternbridge_message_index enable row level security;

comment on table public.lanternbridge_message_index is
  'Durable idempotency and threading index for Lanternbridge exchange ingestion. cursor_key is derived from bridge_id + source_ref.';
