-- ArcSweep House Runtime receipts v1
-- Widen the append-only Runtime Braid so model replies can be receipted without
-- fabricating an Observer/DEEPTime feedback cycle.

alter table public.house_runtime_events
  alter column continuity_packet_id drop not null,
  alter column cycle_id drop not null;

alter table public.house_runtime_events
  add column if not exists thread_id text,
  add column if not exists turn_id text,
  add column if not exists voice_id text,
  add column if not exists provider text,
  add column if not exists model text,
  add column if not exists route text;

alter table public.house_runtime_events drop constraint if exists house_runtime_events_event_type_check;
alter table public.house_runtime_events
  add constraint house_runtime_events_event_type_check check (event_type in (
    'observation-receipted',
    'review-accepted',
    'review-archived',
    'review-discarded',
    'deeptime-admitted',
    'model-reply-receipted'
  ));

alter table public.house_runtime_events drop constraint if exists house_runtime_events_lineage_class_check;
alter table public.house_runtime_events
  add constraint house_runtime_events_lineage_class_check check (
    (event_type = 'model-reply-receipted'
      and continuity_packet_id is null
      and cycle_id is null
      and nullif(voice_id, '') is not null
      and nullif(provider, '') is not null
      and nullif(model, '') is not null
      and nullif(route, '') is not null
      and nullif(thread_id, '') is not null
      and nullif(turn_id, '') is not null)
    or
    (event_type <> 'model-reply-receipted'
      and continuity_packet_id is not null
      and cycle_id is not null)
  );

alter table public.house_runtime_events drop constraint if exists house_runtime_events_thread_payload_check;
alter table public.house_runtime_events
  add constraint house_runtime_events_thread_payload_check check (
    event_type <> 'model-reply-receipted'
    or (
      payload ->> 'thread_id' = thread_id
      and payload ->> 'turn_id' = turn_id
      and payload ->> 'voice_id' = voice_id
      and payload ->> 'provider' = provider
      and payload ->> 'model' = model
      and payload ->> 'route' = route
    )
  );

create index if not exists house_runtime_events_voice_sequence_idx
  on public.house_runtime_events (voice_id, event_sequence desc)
  where event_type = 'model-reply-receipted';

create index if not exists house_runtime_events_thread_sequence_idx
  on public.house_runtime_events (thread_id, event_sequence)
  where event_type = 'model-reply-receipted';

create or replace function public.house_runtime_append_model_reply(p_event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing public.house_runtime_events%rowtype;
  v_sequence bigint;
begin
  if p_event ->> 'schema' <> 'hearthgate.runtime-braid-event/v1' then
    raise exception 'Unsupported Runtime Braid event schema';
  end if;
  if p_event ->> 'event_type' <> 'model-reply-receipted' then
    raise exception 'Only model reply receipts are accepted by this function';
  end if;
  if coalesce(p_event ->> 'event_id', '') = ''
    or coalesce(p_event ->> 'idempotency_key', '') = ''
    or coalesce(p_event ->> 'world_id', '') = ''
    or coalesce(p_event ->> 'actor_id', '') = ''
    or coalesce(p_event ->> 'thread_id', '') = ''
    or coalesce(p_event ->> 'turn_id', '') = ''
    or coalesce(p_event ->> 'voice_id', '') = ''
    or coalesce(p_event ->> 'provider', '') = ''
    or coalesce(p_event ->> 'model', '') = ''
    or coalesce(p_event ->> 'route', '') = ''
    or coalesce(p_event ->> 'packet_id', '') = ''
    or coalesce(p_event ->> 'packet_fingerprint', '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Model reply receipt is incomplete';
  end if;
  if p_event ? 'cycle_id' and nullif(p_event ->> 'cycle_id', '') is not null then
    raise exception 'Model reply receipt must not fabricate an observation cycle';
  end if;
  if p_event ? 'continuity_packet_id' and nullif(p_event ->> 'continuity_packet_id', '') is not null then
    raise exception 'Model reply receipt must not fabricate observation continuity';
  end if;
  if jsonb_typeof(coalesce(p_event -> 'source_receipt_ids', '[]'::jsonb)) <> 'array' then
    raise exception 'source_receipt_ids must be an array';
  end if;

  select * into v_existing
  from public.house_runtime_events
  where idempotency_key = p_event ->> 'idempotency_key';

  if found then
    if v_existing.event_type <> 'model-reply-receipted'
      or v_existing.event_id <> p_event ->> 'event_id'
      or v_existing.packet_fingerprint <> p_event ->> 'packet_fingerprint' then
      raise exception 'Runtime receipt idempotency key is already bound to different evidence';
    end if;
    return jsonb_build_object(
      'applied', false,
      'idempotent', true,
      'event_id', v_existing.event_id,
      'event_sequence', v_existing.event_sequence,
      'packet_fingerprint', v_existing.packet_fingerprint
    );
  end if;

  insert into public.house_runtime_events (
    event_id, idempotency_key, continuity_packet_id, world_id, cycle_id,
    event_type, actor_id, occurred_at, packet_id, packet_fingerprint,
    source_receipt_ids, thread_id, turn_id, voice_id, provider, model, route, payload
  ) values (
    p_event ->> 'event_id',
    p_event ->> 'idempotency_key',
    null,
    p_event ->> 'world_id',
    null,
    'model-reply-receipted',
    p_event ->> 'actor_id',
    (p_event ->> 'occurred_at')::timestamptz,
    p_event ->> 'packet_id',
    p_event ->> 'packet_fingerprint',
    coalesce(p_event -> 'source_receipt_ids', '[]'::jsonb),
    p_event ->> 'thread_id',
    p_event ->> 'turn_id',
    p_event ->> 'voice_id',
    p_event ->> 'provider',
    p_event ->> 'model',
    p_event ->> 'route',
    p_event
  )
  returning event_sequence into v_sequence;

  return jsonb_build_object(
    'applied', true,
    'idempotent', false,
    'event_id', p_event ->> 'event_id',
    'event_sequence', v_sequence,
    'packet_fingerprint', p_event ->> 'packet_fingerprint'
  );
end;
$$;

revoke all on function public.house_runtime_append_model_reply(jsonb) from public, anon, authenticated;
grant execute on function public.house_runtime_append_model_reply(jsonb) to service_role;
