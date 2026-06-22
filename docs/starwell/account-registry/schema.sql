-- STARWELL Yggdrasil account/customisation draft schema
-- Contract-only in Portal Kernel v0.1. Review before applying to a live Supabase project.

create table if not exists public.starwell_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  display_name text not null default 'Guest Seed',
  avatar_glyph text not null default '🌱',
  profile_visibility text not null default 'private' check (profile_visibility in ('private', 'shared', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.starwell_customizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  palette text not null default 'velvet-twilight',
  branch_style text not null default 'soft-vines',
  root_accent text not null default 'moon-gold',
  preferred_rooms text[] not null default array['templehouse', 'ygg-gate'],
  accessibility jsonb not null default '{"reducedMotion":false,"sensoryQuiet":false,"captions":true,"plainPassDefault":false}'::jsonb,
  sound jsonb not null default '{"defaultPatch":"north_star_still","allowFuturePlayback":false,"maxGain":0.06,"orbitDefault":false}'::jsonb,
  privacy jsonb not null default '{"profile":"private","customizations":"private","presence":"private"}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, active)
);

create index if not exists idx_starwell_profiles_handle on public.starwell_profiles (handle);
create index if not exists idx_starwell_customizations_user_id on public.starwell_customizations (user_id);
create index if not exists idx_starwell_customizations_active on public.starwell_customizations (active);

alter table public.starwell_profiles enable row level security;
alter table public.starwell_customizations enable row level security;

grant select, insert, update, delete on public.starwell_profiles to authenticated;
grant select, insert, update, delete on public.starwell_customizations to authenticated;

create policy "Users can read own STARWELL profile"
  on public.starwell_profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can create own STARWELL profile"
  on public.starwell_profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update own STARWELL profile"
  on public.starwell_profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can delete own STARWELL profile"
  on public.starwell_profiles for delete
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can read own STARWELL customizations"
  on public.starwell_customizations for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own STARWELL customizations"
  on public.starwell_customizations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own STARWELL customizations"
  on public.starwell_customizations for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own STARWELL customizations"
  on public.starwell_customizations for delete
  to authenticated
  using ((select auth.uid()) = user_id);
