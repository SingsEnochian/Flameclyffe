create extension if not exists pgcrypto;

create table if not exists public.arcsweep_operator_profiles (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  operator_key text not null unique check (operator_key in ('rowan','nocturne')),
  display_name text not null,
  workspace_slug text not null unique check (workspace_slug in ('rowan-arcsweep','nocturne-arcsweep')),
  access_level text not null default 'operator' check (access_level in ('operator','steward')),
  kelvaru_member boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arcsweep_private_workspaces (
  slug text primary key check (slug in ('rowan-arcsweep','nocturne-arcsweep')),
  owner_operator_key text not null check (owner_operator_key in ('rowan','nocturne')),
  display_name text not null,
  variant_label text not null,
  config jsonb not null default '{}'::jsonb,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.arcsweep_private_workspaces (slug, owner_operator_key, display_name, variant_label, config)
values
  ('rowan-arcsweep', 'rowan', 'Rowan · Arcsweep', 'Steward / worldgarden', '{"variant":"rowan","private":true,"language":"kelvaru"}'::jsonb),
  ('nocturne-arcsweep', 'nocturne', 'Nocturne Glint · Arcsweep', 'Nocturne / glintwork', '{"variant":"nocturne","private":true,"language":"kelvaru"}'::jsonb)
on conflict (slug) do update set
  display_name = excluded.display_name,
  variant_label = excluded.variant_label,
  config = public.arcsweep_private_workspaces.config || excluded.config,
  updated_at = now();

create table if not exists public.arcsweep_operator_invites (
  id uuid primary key default gen_random_uuid(),
  operator_key text not null check (operator_key in ('rowan','nocturne')),
  display_name text not null,
  workspace_slug text not null check (workspace_slug in ('rowan-arcsweep','nocturne-arcsweep')),
  access_level text not null default 'operator' check (access_level in ('operator','steward')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists arcsweep_operator_invites_open_idx
  on public.arcsweep_operator_invites (operator_key, expires_at)
  where claimed_at is null;

create table if not exists public.kelvaru_circle_messages (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid references auth.users(id) on delete set null,
  author_identity text not null check (author_identity in ('rowan','nocturne-glint','virelya','ezra','twilight')),
  workspace_slug text references public.arcsweep_private_workspaces(slug) on delete set null,
  cipher_schema text not null default 'kelvaru.aes-gcm-pbkdf2/v1',
  key_version integer not null default 1 check (key_version > 0),
  salt_b64 text not null,
  iv_b64 text not null,
  ciphertext_b64 text not null,
  aad jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists kelvaru_circle_messages_created_idx
  on public.kelvaru_circle_messages (created_at desc);

alter table public.arcsweep_operator_profiles enable row level security;
alter table public.arcsweep_private_workspaces enable row level security;
alter table public.arcsweep_operator_invites enable row level security;
alter table public.kelvaru_circle_messages enable row level security;

drop policy if exists arcsweep_operator_profile_self_read on public.arcsweep_operator_profiles;
create policy arcsweep_operator_profile_self_read
on public.arcsweep_operator_profiles for select to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists arcsweep_operator_workspace_read on public.arcsweep_private_workspaces;
create policy arcsweep_operator_workspace_read
on public.arcsweep_private_workspaces for select to authenticated
using (exists (
  select 1 from public.arcsweep_operator_profiles p
  where p.auth_user_id = auth.uid()
    and (p.workspace_slug = slug or p.access_level = 'steward')
));

drop policy if exists arcsweep_operator_workspace_update on public.arcsweep_private_workspaces;
create policy arcsweep_operator_workspace_update
on public.arcsweep_private_workspaces for update to authenticated
using (exists (
  select 1 from public.arcsweep_operator_profiles p
  where p.auth_user_id = auth.uid()
    and (p.workspace_slug = slug or p.access_level = 'steward')
))
with check (exists (
  select 1 from public.arcsweep_operator_profiles p
  where p.auth_user_id = auth.uid()
    and (p.workspace_slug = slug or p.access_level = 'steward')
));

drop policy if exists kelvaru_circle_read on public.kelvaru_circle_messages;
create policy kelvaru_circle_read
on public.kelvaru_circle_messages for select to authenticated
using (exists (
  select 1 from public.arcsweep_operator_profiles p
  where p.auth_user_id = auth.uid() and p.kelvaru_member
));

drop policy if exists kelvaru_circle_insert on public.kelvaru_circle_messages;
create policy kelvaru_circle_insert
on public.kelvaru_circle_messages for insert to authenticated
with check (
  author_user_id = auth.uid()
  and exists (
    select 1 from public.arcsweep_operator_profiles p
    where p.auth_user_id = auth.uid() and p.kelvaru_member
  )
);

revoke all on public.arcsweep_operator_invites from anon, authenticated;
grant select on public.arcsweep_operator_profiles to authenticated;
grant select, update on public.arcsweep_private_workspaces to authenticated;
grant select, insert on public.kelvaru_circle_messages to authenticated;

create or replace function public.claim_arcsweep_operator_invite(p_token text)
returns table(operator_key text, display_name text, workspace_slug text, access_level text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_invite public.arcsweep_operator_invites%rowtype;
  v_user uuid := auth.uid();
  v_hash text;
begin
  if v_user is null then
    raise exception 'Authenticate before claiming an operator invitation.';
  end if;
  if coalesce(length(trim(p_token)), 0) < 24 then
    raise exception 'Invalid operator invitation.';
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  select * into v_invite
  from public.arcsweep_operator_invites
  where token_hash = v_hash
    and claimed_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Operator invitation is invalid, expired, or already claimed.';
  end if;

  if exists (select 1 from public.arcsweep_operator_profiles where operator_key = v_invite.operator_key) then
    raise exception 'That operator identity is already bound.';
  end if;

  insert into public.arcsweep_operator_profiles (
    auth_user_id, operator_key, display_name, workspace_slug, access_level, kelvaru_member
  ) values (
    v_user, v_invite.operator_key, v_invite.display_name, v_invite.workspace_slug, v_invite.access_level, true
  );

  update public.arcsweep_operator_invites
  set claimed_at = now(), claimed_by = v_user
  where id = v_invite.id;

  return query
  select v_invite.operator_key, v_invite.display_name, v_invite.workspace_slug, v_invite.access_level;
end;
$$;

revoke all on function public.claim_arcsweep_operator_invite(text) from public, anon;
grant execute on function public.claim_arcsweep_operator_invite(text) to authenticated;
