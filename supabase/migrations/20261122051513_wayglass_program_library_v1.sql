-- Wayglass native Wyrdrune programme library and execution ledger.
-- Owner writes pass through the authenticated House host and service-role store.
-- No public or authenticated Data API grants are issued.

create table if not exists public.wayglass_programs (
  program_id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  slug text not null,
  title text not null,
  description text not null default '',
  source text not null,
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft','ready','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wayglass_programs_owner_slug_unique unique (owner_key, slug),
  constraint wayglass_programs_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  constraint wayglass_programs_source_size check (octet_length(source) <= 50000)
);

create table if not exists public.wayglass_program_revisions (
  revision_id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.wayglass_programs(program_id) on delete cascade,
  owner_key text not null,
  version integer not null check (version > 0),
  source text not null,
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  change_note text not null default '',
  created_at timestamptz not null default now(),
  constraint wayglass_program_revisions_version_unique unique (program_id, version),
  constraint wayglass_program_revisions_source_size check (octet_length(source) <= 50000)
);

create table if not exists public.wayglass_program_runs (
  run_id uuid primary key default gen_random_uuid(),
  program_id uuid references public.wayglass_programs(program_id) on delete set null,
  owner_key text not null,
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  runtime_version text not null default 'wyrdrune.ir/v0.1',
  status text not null check (status in ('committed','rolled-back','failed','compiled','held')),
  execution_receipt jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wayglass_programs_owner_updated_idx
  on public.wayglass_programs (owner_key, updated_at desc);
create index if not exists wayglass_program_revisions_program_version_idx
  on public.wayglass_program_revisions (program_id, version desc);
create index if not exists wayglass_program_runs_owner_created_idx
  on public.wayglass_program_runs (owner_key, created_at desc);

alter table public.wayglass_programs enable row level security;
alter table public.wayglass_program_revisions enable row level security;
alter table public.wayglass_program_runs enable row level security;

revoke all on table public.wayglass_programs from anon, authenticated;
revoke all on table public.wayglass_program_revisions from anon, authenticated;
revoke all on table public.wayglass_program_runs from anon, authenticated;
grant select, insert, update, delete on table public.wayglass_programs to service_role;
grant select, insert, update, delete on table public.wayglass_program_revisions to service_role;
grant select, insert, update, delete on table public.wayglass_program_runs to service_role;

create or replace function public.wayglass_save_program(
  p_owner_key text,
  p_slug text,
  p_title text,
  p_description text,
  p_source text,
  p_source_hash text,
  p_metadata jsonb default '{}'::jsonb,
  p_change_note text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  saved public.wayglass_programs;
  revision_row public.wayglass_program_revisions;
begin
  if p_owner_key is null or p_owner_key <> 'rowan' then
    raise exception 'Wayglass program owner is not authorised';
  end if;
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{1,79}$' then
    raise exception 'Wayglass program slug is invalid';
  end if;
  if p_title is null or length(trim(p_title)) = 0 or length(p_title) > 160 then
    raise exception 'Wayglass program title is invalid';
  end if;
  if p_source is null or length(p_source) = 0 or octet_length(p_source) > 50000 then
    raise exception 'Wayglass program source is invalid';
  end if;
  if p_source_hash is null or p_source_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Wayglass program source hash is invalid';
  end if;

  insert into public.wayglass_programs (
    owner_key, slug, title, description, source, source_hash, metadata, version, updated_at
  ) values (
    p_owner_key, p_slug, trim(p_title), coalesce(p_description, ''), p_source, p_source_hash,
    coalesce(p_metadata, '{}'::jsonb), 1, now()
  )
  on conflict (owner_key, slug) do update set
    title = excluded.title,
    description = excluded.description,
    source = excluded.source,
    source_hash = excluded.source_hash,
    metadata = excluded.metadata,
    version = public.wayglass_programs.version + 1,
    updated_at = now()
  returning * into saved;

  insert into public.wayglass_program_revisions (
    program_id, owner_key, version, source, source_hash, change_note
  ) values (
    saved.program_id, saved.owner_key, saved.version, saved.source, saved.source_hash, coalesce(p_change_note, '')
  )
  returning * into revision_row;

  return jsonb_build_object('program', to_jsonb(saved), 'revision', to_jsonb(revision_row));
end;
$$;

revoke all on function public.wayglass_save_program(text,text,text,text,text,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.wayglass_save_program(text,text,text,text,text,text,jsonb,text) to service_role;

comment on table public.wayglass_programs is 'Owner-controlled native Wyrdrune programme library for Wayglass.';
comment on table public.wayglass_program_revisions is 'Immutable source revisions for Wayglass Wyrdrune programmes.';
comment on table public.wayglass_program_runs is 'Source-bound execution and compile receipts for native Wayglass programmes.';
comment on function public.wayglass_save_program(text,text,text,text,text,text,jsonb,text) is 'Atomically saves a Wayglass Wyrdrune programme and its immutable source revision.';
