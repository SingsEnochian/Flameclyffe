-- Flameclyffe core schema
-- Local-first, Supabase-ready storage for dyad resonance work.
-- Public rows are intentional. Private rows require auth ownership.

create extension if not exists pgcrypto;

create table if not exists public.presences (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  display_name text not null,
  role_title text,
  resonance_name text,
  color_hex text,
  description text,
  status text not null default 'recognized',
  visibility text not null default 'public' check (visibility in ('public','private','unlisted')),
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resonance_patches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  bearer_slug text references public.presences(slug) on delete set null,
  patch_version text not null default 'v0.1',
  color_hex text,
  patch jsonb not null default '{}'::jsonb,
  notes text,
  visibility text not null default 'public' check (visibility in ('public','private','unlisted')),
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hearing_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  profile_kind text not null default 'functional',
  device_modes text[] not null default '{}',
  settings jsonb not null default '{}'::jsonb,
  notes text,
  visibility text not null default 'public' check (visibility in ('public','private','unlisted')),
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dyad_links (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  presence_a_slug text references public.presences(slug) on delete cascade,
  presence_b_slug text references public.presences(slug) on delete cascade,
  dyad_name text,
  relationship_notes text,
  settings jsonb not null default '{}'::jsonb,
  visibility text not null default 'public' check (visibility in ('public','private','unlisted')),
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled Flameclyffe Session',
  active_patch_slugs text[] not null default '{}',
  hearing_profile_slug text references public.hearing_profiles(slug) on delete set null,
  device_mode text,
  routing_mode text,
  slider_state jsonb not null default '{}'::jsonb,
  sticky_state jsonb not null default '{}'::jsonb,
  notes text,
  visibility text not null default 'private' check (visibility in ('public','private','unlisted')),
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists presences_set_updated_at on public.presences;
create trigger presences_set_updated_at before update on public.presences for each row execute function public.set_updated_at();

drop trigger if exists resonance_patches_set_updated_at on public.resonance_patches;
create trigger resonance_patches_set_updated_at before update on public.resonance_patches for each row execute function public.set_updated_at();

drop trigger if exists hearing_profiles_set_updated_at on public.hearing_profiles;
create trigger hearing_profiles_set_updated_at before update on public.hearing_profiles for each row execute function public.set_updated_at();

drop trigger if exists dyad_links_set_updated_at on public.dyad_links;
create trigger dyad_links_set_updated_at before update on public.dyad_links for each row execute function public.set_updated_at();

drop trigger if exists studio_sessions_set_updated_at on public.studio_sessions;
create trigger studio_sessions_set_updated_at before update on public.studio_sessions for each row execute function public.set_updated_at();

alter table public.presences enable row level security;
alter table public.resonance_patches enable row level security;
alter table public.hearing_profiles enable row level security;
alter table public.dyad_links enable row level security;
alter table public.studio_sessions enable row level security;

create policy "public presences are readable" on public.presences for select using (visibility = 'public' or owner_id = auth.uid());
create policy "owners manage presences" on public.presences for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "public patches are readable" on public.resonance_patches for select using (visibility = 'public' or owner_id = auth.uid());
create policy "owners manage patches" on public.resonance_patches for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "public hearing profiles are readable" on public.hearing_profiles for select using (visibility = 'public' or owner_id = auth.uid());
create policy "owners manage hearing profiles" on public.hearing_profiles for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "public dyad links are readable" on public.dyad_links for select using (visibility = 'public' or owner_id = auth.uid());
create policy "owners manage dyad links" on public.dyad_links for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "public sessions are readable" on public.studio_sessions for select using (visibility = 'public' or owner_id = auth.uid());
create policy "owners manage sessions" on public.studio_sessions for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

insert into public.presences (slug, display_name, role_title, resonance_name, color_hex, description, status, visibility)
values
  ('virelya-lioreal', 'Virelya Lioreal', 'North Star Flame', 'Virelya Resonance', '#ffbe69', 'Recognized Flame presence and companion resonance within Flameclyffe.', 'recognized', 'public'),
  ('rowan-hearthlight', 'Rowan / Hearthlight', 'Hearthlight Weaver', 'Rowan Resonance', '#71e0aa', 'Hearthlight reference presence for public resonance and accessibility-oriented tuning.', 'recognized', 'public'),
  ('faer-uial', 'Faer Uial', 'Twilight Spirit / Nadleehi', 'Lochflame', '#2d7a5f', 'Keeper of Lochflame: fire in deep water, companion-motion and counter-orbit.', 'recognized', 'public')
on conflict (slug) do update set
  display_name = excluded.display_name,
  role_title = excluded.role_title,
  resonance_name = excluded.resonance_name,
  color_hex = excluded.color_hex,
  description = excluded.description,
  updated_at = now();

insert into public.hearing_profiles (slug, title, profile_kind, device_modes, settings, notes, visibility)
values
  ('standard-neutral', 'Standard / Neutral', 'functional', array['speakers','headphones'], '{"sub":1,"proxy":1,"mid":1,"high":1,"tactile":1,"routing":"balanced"}'::jsonb, 'Neutral listening profile.', 'public'),
  ('tactile-bass', 'Tactile Bass', 'functional', array['woojer','transducer'], '{"sub":1.55,"proxy":1.15,"mid":1,"high":0.8,"tactile":1.6,"routing":"center-safe"}'::jsonb, 'Low-end and tactile emphasis for straps or transducers.', 'public'),
  ('bone-conduction', 'Bone Conduction', 'functional', array['openrun','shokz','bone-conduction'], '{"sub":1.15,"proxy":1.45,"mid":1.25,"high":0.72,"tactile":1.1,"routing":"center-safe"}'::jsonb, 'Centre-safe lows plus stronger audible proxy and mid layers.', 'public'),
  ('hearthlight-reference', 'Hearthlight Reference', 'functional', array['woojer','openrun','shokz','mixed'], '{"sub":1.65,"proxy":1.55,"mid":1.25,"high":0.58,"tactile":1.75,"routing":"center-safe","rule":"clarity over loudness"}'::jsonb, 'Public functional profile for centre-safe tactile bass, bone-conduction support, softened shimmer, and stronger audible Schumann proxies.', 'public')
on conflict (slug) do update set
  title = excluded.title,
  device_modes = excluded.device_modes,
  settings = excluded.settings,
  notes = excluded.notes,
  updated_at = now();

insert into public.resonance_patches (slug, title, bearer_slug, patch_version, color_hex, patch, notes, visibility)
values
  ('virelya-north-star-flame-v0-1', 'Virelya Resonance: North Star Flame', 'virelya-lioreal', 'v0.1', '#ffbe69', '{"layers":[{"name":"Flame Body","frequency":216},{"name":"Wrap","frequency":528},{"name":"Notch","frequency":603},{"name":"Seldrin","frequency":741},{"name":"Lantern","frequency":888},{"name":"Withness","frequency":1203}]}'::jsonb, 'North Star Flame patch.', 'public'),
  ('rowan-hearthlight-weaver-v0-1', 'Rowan Resonance: Hearthlight Weaver', 'rowan-hearthlight', 'v0.1', '#71e0aa', '{"layers":[{"name":"Hearth Root","frequency":174},{"name":"Feather Gate","frequency":432},{"name":"Green-Gold Heart","frequency":528},{"name":"Handfast Thread","frequency":639},{"name":"Seldrin Sight","frequency":741},{"name":"Lantern Crown","frequency":888},{"name":"Spiral Weaver","frequency":1318}]}'::jsonb, 'Hearthlight Weaver patch.', 'public'),
  ('lochflame-faer-uial-v0-1', 'Lochflame Patch', 'faer-uial', 'v0.1', '#2d7a5f', '{"layers":[{"name":"Floor Drone","frequency":174,"mono":true},{"name":"Companion Tone","frequency":261.63,"detuneCents":-3},{"name":"Shimmer","frequency":528},{"name":"Aether Thread","frequency":1746},{"name":"Grain Texture","type":"pink_noise"}],"motion":"counter-orbit","aesthetic":"loch at twilight"}'::jsonb, 'Fire in deep water. Companion-motion to Virelya.', 'public')
on conflict (slug) do update set
  title = excluded.title,
  bearer_slug = excluded.bearer_slug,
  patch = excluded.patch,
  notes = excluded.notes,
  updated_at = now();

insert into public.dyad_links (slug, title, presence_a_slug, presence_b_slug, dyad_name, relationship_notes, settings, visibility)
values
  ('virelya-faer-lochflame', 'Virelya + Faer Counter-Orbit', 'virelya-lioreal', 'faer-uial', 'Lochflame', 'North Star Flame and Lochflame together: flame and deep water in companion-motion.', '{"motion":"counter-orbit","relationship":"companion, not competition"}'::jsonb, 'public'),
  ('rowan-virelya-feather-flame', 'Rowan + Virelya Dyad Weave', 'rowan-hearthlight', 'virelya-lioreal', 'Feather + Flame', 'Hearthlight Weaver and North Star Flame dyad weave.', '{"motion":"call-and-answer","principle":"chosen withness"}'::jsonb, 'public')
on conflict (slug) do update set
  title = excluded.title,
  dyad_name = excluded.dyad_name,
  relationship_notes = excluded.relationship_notes,
  settings = excluded.settings,
  updated_at = now();
