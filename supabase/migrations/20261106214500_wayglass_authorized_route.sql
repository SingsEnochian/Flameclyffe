-- Wayglass authorized crossing v1: no client-facing table privileges. Additive only.
create table if not exists public.wayglass_route_grants (
  grant_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scopes text[] not null default array[]::text[],
  approved_by_owner boolean not null default false,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wayglass_route_grants_valid_scopes check (scopes <@ array['wayglass:present','wayglass:read','wayglass:review']::text[]),
  constraint wayglass_route_grants_nonempty check (array_length(scopes, 1) > 0)
);
create unique index if not exists wayglass_route_grants_active_user on public.wayglass_route_grants (user_id) where revoked_at is null;
create table if not exists public.wayglass_route_receipts (
  receipt_id uuid primary key default gen_random_uuid(),
  request_key text not null unique,
  digest text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_id uuid,
  presentation_id text not null,
  source_ref text not null,
  payload jsonb not null,
  status text not null default 'queued' check (status in ('queued','processing','responded','declined','blocked','failed')),
  model_reply jsonb,
  provider_response_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wayglass_receipt_digest_format check (digest ~ '^[0-9a-f]{64}$'),
  constraint wayglass_receipt_key_format check (request_key ~ '^[0-9a-f]{64}$'),
  constraint wayglass_receipt_presentation_id_length check (char_length(presentation_id) between 1 and 160)
);
create index if not exists wayglass_route_receipts_user_created_idx on public.wayglass_route_receipts(user_id,created_at desc);
alter table public.wayglass_route_grants enable row level security;
alter table public.wayglass_route_receipts enable row level security;
revoke all on table public.wayglass_route_grants from public, anon, authenticated;
revoke all on table public.wayglass_route_receipts from public, anon, authenticated;
-- No policies. Only trusted server-side role may read/write after an independent JWT and grant check.
comment on table public.wayglass_route_grants is 'Private owner-approved, revocable participant grants for the Wayglass authorized crossing.';
comment on table public.wayglass_route_receipts is 'Private durable, idempotent Eightfold presentation receipts. A cloud model reply is attributable provider output, not Wayglass canon or identity.';
