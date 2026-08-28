create table if not exists public.lanternbridge_outbox (
  id uuid primary key default gen_random_uuid(),
  bridge_id text not null unique,
  responds_to text not null,
  body text not null,
  title text,
  state text not null default 'queued' check (state in ('queued','claimed','committed','failed')),
  requested_by uuid,
  requested_at timestamptz not null default now(),
  claimed_at timestamptz,
  committed_at timestamptz,
  repo_path text,
  commit_sha text,
  error text,
  updated_at timestamptz not null default now()
);

create index if not exists lanternbridge_outbox_state_requested_idx
  on public.lanternbridge_outbox(state, requested_at);
create index if not exists lanternbridge_outbox_responds_to_idx
  on public.lanternbridge_outbox(responds_to);

create table if not exists public.lanternbridge_house_state (
  user_id uuid primary key,
  last_seen_at timestamptz,
  last_seen_bridge_id text,
  updated_at timestamptz not null default now()
);

alter table public.lanternbridge_outbox enable row level security;
alter table public.lanternbridge_house_state enable row level security;
revoke all on table public.lanternbridge_outbox from anon, authenticated;
revoke all on table public.lanternbridge_house_state from anon, authenticated;
grant all on table public.lanternbridge_outbox to service_role;
grant all on table public.lanternbridge_house_state to service_role;
