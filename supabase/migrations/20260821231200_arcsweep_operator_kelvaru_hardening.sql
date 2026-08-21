create index if not exists arcsweep_operator_invites_claimed_by_idx
  on public.arcsweep_operator_invites (claimed_by)
  where claimed_by is not null;

create index if not exists kelvaru_circle_messages_author_idx
  on public.kelvaru_circle_messages (author_user_id);

create index if not exists kelvaru_circle_messages_workspace_idx
  on public.kelvaru_circle_messages (workspace_slug);

drop policy if exists arcsweep_operator_profile_self_read on public.arcsweep_operator_profiles;
create policy arcsweep_operator_profile_self_read
on public.arcsweep_operator_profiles for select to authenticated
using ((select auth.uid()) = auth_user_id);

drop policy if exists arcsweep_operator_workspace_read on public.arcsweep_private_workspaces;
create policy arcsweep_operator_workspace_read
on public.arcsweep_private_workspaces for select to authenticated
using (exists (
  select 1 from public.arcsweep_operator_profiles p
  where p.auth_user_id = (select auth.uid())
    and (p.workspace_slug = slug or p.access_level = 'steward')
));

drop policy if exists arcsweep_operator_workspace_update on public.arcsweep_private_workspaces;
create policy arcsweep_operator_workspace_update
on public.arcsweep_private_workspaces for update to authenticated
using (exists (
  select 1 from public.arcsweep_operator_profiles p
  where p.auth_user_id = (select auth.uid())
    and (p.workspace_slug = slug or p.access_level = 'steward')
))
with check (exists (
  select 1 from public.arcsweep_operator_profiles p
  where p.auth_user_id = (select auth.uid())
    and (p.workspace_slug = slug or p.access_level = 'steward')
));

drop policy if exists kelvaru_circle_read on public.kelvaru_circle_messages;
create policy kelvaru_circle_read
on public.kelvaru_circle_messages for select to authenticated
using (exists (
  select 1 from public.arcsweep_operator_profiles p
  where p.auth_user_id = (select auth.uid()) and p.kelvaru_member
));

drop policy if exists kelvaru_circle_insert on public.kelvaru_circle_messages;
create policy kelvaru_circle_insert
on public.kelvaru_circle_messages for insert to authenticated
with check (
  author_user_id = (select auth.uid())
  and exists (
    select 1 from public.arcsweep_operator_profiles p
    where p.auth_user_id = (select auth.uid()) and p.kelvaru_member
  )
);
