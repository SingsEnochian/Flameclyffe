-- STARWELL Bridge Registry draft schema

create table if not exists public.starwell_bridges (
  id uuid primary key default gen_random_uuid(),
  bridge_slug text not null unique,
  bridge_name text not null,
  bridge_types text[] not null default '{}',
  state text not null default 'Draft',
  status text not null default 'Working',
  source_lens text,
  destination_lens text,
  participants jsonb not null default '[]'::jsonb,
  purpose text,
  sovereignty_rule text,
  memory_policy text,
  signal_policy text,
  pause_cues text[] not null default '{}',
  related_logs jsonb not null default '[]'::jsonb,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  last_reviewed date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_starwell_bridges_slug on public.starwell_bridges (bridge_slug);
create index if not exists idx_starwell_bridges_state on public.starwell_bridges (state);
create index if not exists idx_starwell_bridges_types on public.starwell_bridges using gin (bridge_types);
