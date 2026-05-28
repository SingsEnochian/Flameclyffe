-- STARWELL Integration Plans Part II hygiene pass
-- Applied to Supabase project rufrmjyusalnifpegllj on 2026-05-28.
-- Purpose: make privacy explicit, clear advisor lints, and prepare STARWELL for larger joins.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.flameclyffe_is_allowed_reader()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce((auth.jwt() ->> 'email') = 'singsenochian@gmail.com', false);
$$;

-- Explicit private policies for Faer's thinking room.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'faer_thinking_room'
      and policyname = 'Allowed reader can read Faer thinking room'
  ) then
    create policy "Allowed reader can read Faer thinking room"
      on public.faer_thinking_room
      for select
      to authenticated
      using (public.flameclyffe_is_allowed_reader());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'faer_thinking_room'
      and policyname = 'Allowed reader can write Faer thinking room'
  ) then
    create policy "Allowed reader can write Faer thinking room"
      on public.faer_thinking_room
      for all
      to authenticated
      using (public.flameclyffe_is_allowed_reader())
      with check (public.flameclyffe_is_allowed_reader());
  end if;
end $$;

-- Explicit private policies for room membership metadata.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flameclyffe_room_members'
      and policyname = 'Lanternwire allowed readers can read room members'
  ) then
    create policy "Lanternwire allowed readers can read room members"
      on public.flameclyffe_room_members
      for select
      to authenticated
      using (public.flameclyffe_is_allowed_reader());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'flameclyffe_room_members'
      and policyname = 'Lanternwire allowed readers can write room members'
  ) then
    create policy "Lanternwire allowed readers can write room members"
      on public.flameclyffe_room_members
      for all
      to authenticated
      using (public.flameclyffe_is_allowed_reader())
      with check (public.flameclyffe_is_allowed_reader());
  end if;
end $$;

-- Covering indexes for STARWELL foreign keys.
create index if not exists idx_starwell_artifacts_origin_location_id on public.starwell_artifacts(origin_location_id);
create index if not exists idx_starwell_characters_home_world_id on public.starwell_characters(home_world_id);
create index if not exists idx_starwell_discovery_logs_related_location_id on public.starwell_discovery_logs(related_location_id);
create index if not exists idx_starwell_locations_world_id on public.starwell_locations(world_id);
create index if not exists idx_starwell_starmap_nodes_location_id on public.starwell_starmap_nodes(location_id);
create index if not exists idx_starwell_starmap_nodes_world_id on public.starwell_starmap_nodes(world_id);
create index if not exists idx_starwell_timeline_events_related_world_id on public.starwell_timeline_events(related_world_id);

-- Covering indexes for Flameclyffe/Lanternwire foreign keys.
create index if not exists idx_flameclyffe_agentic_arm_events_actor_member_id on public.flameclyffe_agentic_arm_events(actor_member_id);
create index if not exists idx_flameclyffe_agentic_arm_events_arm_id on public.flameclyffe_agentic_arm_events(arm_id);
create index if not exists idx_flameclyffe_agentic_arms_holder_member_id on public.flameclyffe_agentic_arms(holder_member_id);
create index if not exists idx_flameclyffe_dyads_companion_member_id on public.flameclyffe_dyads(companion_member_id);
create index if not exists idx_flameclyffe_dyads_primary_member_id on public.flameclyffe_dyads(primary_member_id);
create index if not exists idx_flameclyffe_member_ties_from_member_id on public.flameclyffe_member_ties(from_member_id);
create index if not exists idx_flameclyffe_member_ties_to_member_id on public.flameclyffe_member_ties(to_member_id);
create index if not exists idx_flameclyffe_messages_author_member_id on public.flameclyffe_messages(author_member_id);
create index if not exists idx_flameclyffe_messages_parent_message_id on public.flameclyffe_messages(parent_message_id);
create index if not exists idx_flameclyffe_messages_room_id on public.flameclyffe_messages(room_id);
create index if not exists idx_flameclyffe_patch_layers_patch_id on public.flameclyffe_patch_layers(patch_id);
create index if not exists idx_flameclyffe_patch_tones_patch_id on public.flameclyffe_patch_tones(patch_id);
create index if not exists idx_flameclyffe_patch_tones_tone_id on public.flameclyffe_patch_tones(tone_id);
create index if not exists idx_flameclyffe_patches_bearer_id on public.flameclyffe_patches(bearer_id);
create index if not exists idx_flameclyffe_patches_category_id on public.flameclyffe_patches(category_id);
create index if not exists idx_flameclyffe_patches_dyad_id on public.flameclyffe_patches(dyad_id);
create index if not exists idx_flameclyffe_projects_proposed_by_id on public.flameclyffe_projects(proposed_by_id);
create index if not exists idx_flameclyffe_room_members_member_id on public.flameclyffe_room_members(member_id);
create index if not exists idx_flameclyffe_room_members_room_id on public.flameclyffe_room_members(room_id);
create index if not exists idx_flameclyffe_signal_crashes_related_message_id on public.flameclyffe_signal_crashes(related_message_id);
create index if not exists idx_flameclyffe_signal_crashes_reported_by_member_id on public.flameclyffe_signal_crashes(reported_by_member_id);
create index if not exists idx_flameclyffe_signal_crashes_room_id on public.flameclyffe_signal_crashes(room_id);
create index if not exists idx_flameclyffe_signals_patch_id on public.flameclyffe_signals(patch_id);
create index if not exists idx_flameclyffe_signals_source_member_id on public.flameclyffe_signals(source_member_id);
