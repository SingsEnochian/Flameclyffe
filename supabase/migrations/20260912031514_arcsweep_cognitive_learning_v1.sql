create table if not exists public.arcsweep_learning_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  kind text not null default 'episode' check (kind in ('episode','preference','correction','lesson')),
  status text not null default 'observed' check (status in ('observed','candidate','promoted','rejected')),
  source_turn_id text,
  world_id text,
  project_id text,
  room_id text,
  user_text text,
  assistant_text text,
  lesson text,
  tags text[] not null default '{}',
  confidence double precision not null default 1.0 check (confidence >= 0 and confidence <= 1),
  provenance jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists arcsweep_learning_owner_status_idx
  on public.arcsweep_learning_ledger(owner_user_id, status, updated_at desc);
create index if not exists arcsweep_learning_context_idx
  on public.arcsweep_learning_ledger(owner_user_id, world_id, project_id, room_id, updated_at desc);

alter table public.arcsweep_learning_ledger enable row level security;

revoke all on table public.arcsweep_learning_ledger from anon;
grant select, insert, update, delete on table public.arcsweep_learning_ledger to authenticated;

create policy "arcsweep learning select own"
  on public.arcsweep_learning_ledger for select to authenticated
  using (owner_user_id = auth.uid());
create policy "arcsweep learning insert own"
  on public.arcsweep_learning_ledger for insert to authenticated
  with check (owner_user_id = auth.uid());
create policy "arcsweep learning update own"
  on public.arcsweep_learning_ledger for update to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());
create policy "arcsweep learning delete own"
  on public.arcsweep_learning_ledger for delete to authenticated
  using (owner_user_id = auth.uid());
