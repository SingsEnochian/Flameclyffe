-- REVIEW ONLY. NOT a migration. DO NOT apply to production.
-- Replaces an accidentally duplicated/truncated earlier draft.
-- Owner JWT, consent lifecycle, RLS and revocation concurrency require staging review.
begin;

create table if not exists public.wayglass_dream_consent_v1 (
  dream_id text primary key check (dream_id ~ '^[A-Za-z0-9._:-]{1,128}$'),
  owner_uid uuid not null default auth.uid() references auth.users(id),
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.wayglass_dream_receipts_v1 (
  dream_id text not null references public.wayglass_dream_consent_v1(dream_id),
  event_id text not null check (event_id ~ '^[A-Za-z0-9._:-]{1,128}$'),
  owner_uid uuid not null default auth.uid() references auth.users(id),
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  primary key (dream_id,event_id),
  constraint wayglass_dream_receipt_shape_v1 check (
    jsonb_typeof(receipt) = 'object'
    and receipt ?& array['schema','dream_id','event_id','stage','at_ms','asset','disposition']
    and receipt->>'schema' = 'wayglass.dream-receipt/v1'
    and receipt->>'dream_id' = dream_id
    and receipt->>'event_id' = event_id
    and receipt->>'stage' in ('requested','started','captured','transcribed','verified','interrupted','late-observation','returned')
    and receipt->>'disposition' = case when receipt->>'stage' in ('late-observation','interrupted')
      then 'observed-not-adopted' else 'dream-local-only' end
    and jsonb_typeof(receipt->'at_ms') = 'number'
    and receipt->>'at_ms' ~ '^[0-9]{1,16}$'
    and (receipt->>'at_ms')::numeric <= 9007199254740991
    and jsonb_typeof(receipt->'asset') in ('null','object')
    and (receipt->'asset' = 'null'::jsonb or (
      receipt->'asset' ?& array['asset_id','kind','sha256']
      and receipt->'asset'->>'asset_id' ~ '^[A-Za-z0-9._:-]{1,128}$'
      and receipt->'asset'->>'kind' in ('video','audio','transcription','spatial','image','telemetry')
      and receipt->'asset'->>'sha256' ~ '^[0-9a-f]{64}$'
      and receipt->'asset' - array['asset_id','kind','sha256'] = '{}'::jsonb
    ))
    and receipt - array['schema','dream_id','event_id','stage','at_ms','asset','disposition'] = '{}'::jsonb
  )
);

alter table public.wayglass_dream_consent_v1 enable row level security;
alter table public.wayglass_dream_receipts_v1 enable row level security;
revoke all on public.wayglass_dream_consent_v1 from public, anon, authenticated;
revoke all on public.wayglass_dream_receipts_v1 from public, anon, authenticated;
grant select on public.wayglass_dream_consent_v1 to authenticated;
grant select, insert on public.wayglass_dream_receipts_v1 to authenticated;

create policy dream_consent_owner_read on public.wayglass_dream_consent_v1
 for select to authenticated using (owner_uid = (select auth.uid()));
create policy dream_receipts_owner_read on public.wayglass_dream_receipts_v1
 for select to authenticated using (owner_uid = (select auth.uid()));
create policy dream_receipts_owner_insert on public.wayglass_dream_receipts_v1
 for insert to authenticated with check (
   owner_uid = (select auth.uid()) and exists (
     select 1 from public.wayglass_dream_consent_v1 c
     where c.dream_id = wayglass_dream_receipts_v1.dream_id
       and c.owner_uid = (select auth.uid()) and c.active
   )
 );

create or replace function public.wayglass_dream_receipt_append_v1(p_dream_id text,p_receipt jsonb)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare prior jsonb; owner_uuid uuid;
begin
 owner_uuid := (select auth.uid());
 if owner_uuid is null then raise exception 'Owner authentication required'; end if;
 if not exists (select 1 from public.wayglass_dream_consent_v1
   where dream_id=p_dream_id and owner_uid=owner_uuid and active)
 then raise exception 'Dream consent missing or revoked'; end if;
 if p_receipt->>'dream_id' is distinct from p_dream_id then raise exception 'Dream mismatch'; end if;
 insert into public.wayglass_dream_receipts_v1(dream_id,event_id,owner_uid,receipt)
 values (p_dream_id,p_receipt->>'event_id',owner_uuid,p_receipt)
 on conflict (dream_id,event_id) do nothing;
 select receipt into prior from public.wayglass_dream_receipts_v1
 where dream_id=p_dream_id and event_id=p_receipt->>'event_id' and owner_uid=owner_uuid;
 if prior is distinct from p_receipt then raise exception 'Conflicting event identity'; end if;
 return prior;
end $$;

create or replace function public.wayglass_dream_receipt_read_v1(p_dream_id text)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare result jsonb; owner_uuid uuid;
begin
 owner_uuid := (select auth.uid());
 if owner_uuid is null then raise exception 'Owner authentication required'; end if;
 if not exists (select 1 from public.wayglass_dream_consent_v1
   where dream_id=p_dream_id and owner_uid=owner_uuid and active)
 then raise exception 'Dream consent missing or revoked'; end if;
 select coalesce(jsonb_agg(receipt order by created_at,event_id),'[]'::jsonb)
 into result from public.wayglass_dream_receipts_v1
 where dream_id=p_dream_id and owner_uid=owner_uuid;
 return result;
end $$;

revoke all on function public.wayglass_dream_receipt_append_v1(text,jsonb) from public, anon;
revoke all on function public.wayglass_dream_receipt_read_v1(text) from public, anon;
grant execute on function public.wayglass_dream_receipt_append_v1(text,jsonb) to authenticated;
grant execute on function public.wayglass_dream_receipt_read_v1(text) to authenticated;
commit;

-- UNRESOLVED, BLOCKS DEPLOYMENT:
-- 1. Implement owner-authenticated consent creation/revocation separately.
-- 2. Current consent check is not serialised with revocation; revocation can race
--    an in-flight append. Do not advertise atomic revocation until transaction
--    locking and privilege/RLS requirements are tested together.
-- 3. Run actual PostgreSQL parse, RLS, concurrent idempotency, cross-owner,
--    revoked session, and malformed receipt tests in a disposable staging DB.
-- 4. Audit existing objects/policies: CREATE IF NOT EXISTS does not reconcile
--    pre-existing definitions and CREATE POLICY is not idempotent.
-- 5. Storage encryption, retention, media bytes and capture are out of scope.
