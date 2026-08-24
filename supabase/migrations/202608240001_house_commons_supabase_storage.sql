create table if not exists public.house_commons_entries (
  key text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists house_commons_entries_created_at_idx
  on public.house_commons_entries (created_at desc);

alter table public.house_commons_entries enable row level security;

create table if not exists public.house_commons_attachments (
  id text primary key,
  metadata jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists house_commons_attachments_created_at_idx
  on public.house_commons_attachments (created_at desc);

alter table public.house_commons_attachments enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('house-commons-attachments', 'house-commons-attachments', false, 5242880)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;
