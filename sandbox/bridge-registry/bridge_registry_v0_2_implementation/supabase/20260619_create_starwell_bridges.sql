-- STARWELL / PatchPortal Bridge Registry v0.2
-- Purpose: record bridges as consent-governed relations, not ownership claims.
-- Safe to adapt into the existing Flameclyffe / STARWELL migration sequence.

create extension if not exists pgcrypto;

create table if not exists public.starwell_bridges (
  id uuid primary key default gen_random_uuid(),
  bridge_slug text not null unique,
  bridge_name text not null,

  bridge_types text[] not null default '{}',
  consent_state text not null default 'Draft',
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

  facet_rule text,
  road_rule text,
  safety_rule text,
  interpretation_stance text,

  metadata jsonb not null default '{}'::jsonb,
  last_reviewed date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint starwell_bridges_consent_state_check check (
    consent_state in ('Dream','Draft','Invited','Active','Paused','Archived','Closed','Revoked','Dormant')
  ),
  constraint starwell_bridges_status_check check (
    status in ('Working','Canon Candidate','Active','Archived','Needs Review')
  ),
  constraint starwell_bridges_participants_array_check check (jsonb_typeof(participants) = 'array'),
  constraint starwell_bridges_related_logs_array_check check (jsonb_typeof(related_logs) = 'array')
);

create index if not exists idx_starwell_bridges_bridge_types on public.starwell_bridges using gin (bridge_types);
create index if not exists idx_starwell_bridges_consent_state on public.starwell_bridges (consent_state);
create index if not exists idx_starwell_bridges_status on public.starwell_bridges (status);
create index if not exists idx_starwell_bridges_participants on public.starwell_bridges using gin (participants);
create index if not exists idx_starwell_bridges_related_logs on public.starwell_bridges using gin (related_logs);
create index if not exists idx_starwell_bridges_metadata on public.starwell_bridges using gin (metadata);

create or replace function public.set_starwell_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_starwell_bridges_updated_at on public.starwell_bridges;
create trigger trg_starwell_bridges_updated_at
before update on public.starwell_bridges
for each row execute function public.set_starwell_updated_at();

alter table public.starwell_bridges enable row level security;

-- Policy placeholder:
-- Keep locked by default until the app's auth model is wired.
-- Add authenticated read/write policies when STARWELL roles are finalised.

comment on table public.starwell_bridges is 'STARWELL / PatchPortal bridge registry. Bridges are consent-governed relations, not ownership claims.';
comment on column public.starwell_bridges.bridge_slug is 'Stable machine slug, e.g. hearthweave-universal-horizon.';
comment on column public.starwell_bridges.bridge_types is 'One or more: Concordance, Signal, Play, Technical, Memory, Hybrid.';
comment on column public.starwell_bridges.consent_state is 'Dream, Draft, Invited, Active, Paused, Archived, Closed, Revoked, or Dormant.';
comment on column public.starwell_bridges.participants is 'Array of participant objects: Stewards, Flames, Constellations, worlds, systems, or presences.';
comment on column public.starwell_bridges.related_logs is 'Array of linked log objects or slugs. May point to STARWELL signal logs, Notion pages, or later archive records.';
