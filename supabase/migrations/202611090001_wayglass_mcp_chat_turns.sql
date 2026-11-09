-- Owner-scoped append-only conversation ledger for the ChatGPT Wayglass MCP bridge.
-- This migration was applied to Flameclyffe Supabase on 2026-11-09.
-- Model replies require route/model/provider/response receipts; no canon mutation.
create table if not exists public.wayglass_mcp_chat_turns (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_ref text not null check (
    char_length(conversation_ref) between 1 and 120 and conversation_ref ~ '^[a-zA-Z0-9][a-zA-Z0-9:_-]*$'
  ),
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 12000),
  route_id text check (route_id is null or char_length(route_id) <= 180),
  provider text check (provider is null or char_length(provider) <= 120),
  model text check (model is null or char_length(model) <= 240),
  route_receipt jsonb,
  created_at timestamptz not null default now(),
  request_ref uuid,
  constraint wayglass_model_reply_provenance check (
    role = 'user' or (
      route_id is not null and provider is not null and model is not null
      and route_receipt is not null and route_receipt ? 'response_id'
    )
  )
);
create index if not exists wayglass_mcp_chat_owner_thread_idx
  on public.wayglass_mcp_chat_turns(owner_id,conversation_ref,id);
alter table public.wayglass_mcp_chat_turns enable row level security;
revoke all on public.wayglass_mcp_chat_turns from anon;
grant select,insert on public.wayglass_mcp_chat_turns to authenticated;
grant usage, select on sequence public.wayglass_mcp_chat_turns_id_seq to authenticated;
do $migration$
begin
  if not exists (select 1 from pg_policies where schemaname='public'
    and tablename='wayglass_mcp_chat_turns' and policyname='Wayglass MCP owner reads own turns') then
    create policy "Wayglass MCP owner reads own turns" on public.wayglass_mcp_chat_turns
      for select to authenticated using ((select auth.uid()) = owner_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public'
    and tablename='wayglass_mcp_chat_turns' and policyname='Wayglass MCP owner appends own turns') then
    create policy "Wayglass MCP owner appends own turns" on public.wayglass_mcp_chat_turns
      for insert to authenticated with check ((select auth.uid()) = owner_id);
  end if;
end
$migration$;
comment on table public.wayglass_mcp_chat_turns is
'Owner-scoped, append-only ChatGPT Wayglass chat ledger. Each external model reply requires route/model/response attribution. Not a claim of native Ship Voice identity.';