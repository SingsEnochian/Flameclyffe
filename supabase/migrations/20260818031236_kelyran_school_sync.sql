create table if not exists public.kelyran_school_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version text not null default 'arcsweep.kelyran-school/v0.1'
    check (schema_version = 'arcsweep.kelyran-school/v0.1'),
  canon_revision text not null,
  school jsonb not null
    check (jsonb_typeof(school) = 'object' and school ->> 'schema' = schema_version),
  updated_at timestamptz not null default now()
);

alter table public.kelyran_school_snapshots enable row level security;

revoke all on table public.kelyran_school_snapshots from anon;
revoke all on table public.kelyran_school_snapshots from authenticated;
grant select, insert, update, delete on table public.kelyran_school_snapshots to authenticated;

drop policy if exists "learners read their Kelyran school" on public.kelyran_school_snapshots;
create policy "learners read their Kelyran school"
  on public.kelyran_school_snapshots for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "learners create their Kelyran school" on public.kelyran_school_snapshots;
create policy "learners create their Kelyran school"
  on public.kelyran_school_snapshots for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "learners update their Kelyran school" on public.kelyran_school_snapshots;
create policy "learners update their Kelyran school"
  on public.kelyran_school_snapshots for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "learners delete their Kelyran school" on public.kelyran_school_snapshots;
create policy "learners delete their Kelyran school"
  on public.kelyran_school_snapshots for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.kelyran_school_snapshots is
  'Authenticated portable mirror of the local-first ArcSweep Kelyran School. Canon proposals remain distinct from approved lexicon entries inside the receipted document.';
