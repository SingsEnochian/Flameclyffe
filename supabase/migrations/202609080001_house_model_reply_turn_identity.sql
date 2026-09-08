-- ArcSweep House Runtime model-reply turn identity
-- Server-boundary persistence and the legacy browser persistence path may both
-- witness the same completed House turn. Treat thread + turn + Flame as one
-- semantic model-reply event while retaining the first immutable receipt.

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

  -- One House turn from one Flame is one model reply even when both the
  -- server boundary and a legacy browser client submit evidence for it.
  select * into v_existing
  from public.house_runtime_events
  where event_type = 'model-reply-receipted'
    and thread_id = p_event ->> 'thread_id'
    and turn_id = p_event ->> 'turn_id'
    and voice_id = p_event ->> 'voice_id'
  order by event_sequence desc
  limit 1;

  if found then
    if v_existing.world_id <> p_event ->> 'world_id'
      or v_existing.provider <> p_event ->> 'provider'
      or v_existing.model <> p_event ->> 'model'
      or v_existing.route <> p_event ->> 'route' then
      raise exception 'House turn identity is already bound to different runtime evidence';
    end if;
    return jsonb_build_object(
      'applied', false,
      'idempotent', true,
      'semantic_turn_match', true,
      'event_id', v_existing.event_id,
      'event_sequence', v_existing.event_sequence,
      'packet_fingerprint', v_existing.packet_fingerprint
    );
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
