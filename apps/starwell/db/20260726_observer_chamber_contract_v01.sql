begin;

alter table public.observer_feed_registry
  add column if not exists instrument_name text;

alter table public.observer_feed_registry
  add column if not exists stale_threshold_seconds integer not null default 3600;

update public.observer_feed_registry
set instrument_name = case source_key
  when 'noaa-swpc-solar-wind-mag-summary' then 'NOAA real-time solar-wind spacecraft feed'
  when 'noaa-swpc-solar-wind-speed-summary' then 'NOAA real-time solar-wind spacecraft feed'
  when 'noaa-swpc-planetary-k-index' then 'NOAA planetary K-index network'
  when 'noaa-goes-primary-xray-6h' then 'GOES Primary X-ray Sensor'
  else coalesce(instrument_name, display_name)
end
where instrument_name is null;

update public.observer_feed_registry
set stale_threshold_seconds = case source_key
  when 'noaa-swpc-solar-wind-mag-summary' then 900
  when 'noaa-swpc-solar-wind-speed-summary' then 900
  when 'noaa-swpc-planetary-k-index' then 14400
  when 'noaa-goes-primary-xray-6h' then 900
  else greatest(poll_interval_seconds * 3, 3600)
end;

alter table public.observer_ingestion_runs
  add column if not exists operating_mode text not null default 'MANUAL';

alter table public.observer_ingestion_runs
  add column if not exists execution_time_ms integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'observer_ingestion_runs_operating_mode_check'
  ) then
    alter table public.observer_ingestion_runs
      add constraint observer_ingestion_runs_operating_mode_check
      check (operating_mode in ('OFF', 'MANUAL', 'INTERVAL', 'PAUSED', 'DEGRADED', 'ERROR'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'observer_ingestion_runs_execution_time_ms_check'
  ) then
    alter table public.observer_ingestion_runs
      add constraint observer_ingestion_runs_execution_time_ms_check
      check (execution_time_ms is null or execution_time_ms >= 0);
  end if;
end $$;

create or replace view public.observer_metric_registry
with (security_invoker = true)
as
select
  f.id as feed_id,
  f.source_key,
  f.provider as source_name,
  coalesce(f.instrument_name, f.display_name) as instrument_name,
  metric.metric_name,
  coalesce(f.default_units ->> metric.metric_name, '') as unit_label,
  f.stale_threshold_seconds,
  f.enabled as is_active,
  f.created_at
from public.observer_feed_registry f
cross join lateral unnest(f.metric_keys) as metric(metric_name);

create or replace view public.observer_ingestion_run_contract
with (security_invoker = true)
as
select
  r.id,
  r.source_id as feed_id,
  r.started_at as run_timestamp,
  r.completed_at,
  r.operating_mode,
  upper(r.run_status) as status,
  r.packet_count as metrics_captured,
  r.duplicate_count,
  r.error_count,
  r.error_summary as error_log,
  r.execution_time_ms,
  r.transport_metadata
from public.observer_ingestion_runs r;

create or replace view public.observer_measurement_contract
with (security_invoker = true)
as
select
  m.id,
  m.source_id as feed_id,
  m.ingestion_run_id,
  m.metric_key as metric_name,
  m.measured_at as observed_at,
  m.received_at as retrieved_at,
  m.numeric_value,
  m.text_value,
  m.unit as unit_label,
  upper(m.quality_state) as quality_state,
  m.payload_hash,
  jsonb_build_object(
    'provenance', m.provenance,
    'transformation_chain', m.transformation_chain,
    'capture_method', m.capture_method,
    'instrument_used', m.instrument_used,
    'station_code', m.station_code,
    'location_context', m.location_context
  ) as provenance_chain,
  m.raw_payload as raw_source_record,
  m.created_at
from public.observer_measurements m;

comment on view public.observer_metric_registry is
  'Lean STARWELL chamber contract, flattened from the richer source-level Observer registry.';
comment on view public.observer_ingestion_run_contract is
  'Operational Observer run contract for chamber health and reliability displays.';
comment on view public.observer_measurement_contract is
  'Read-oriented Observer measurement contract preserving raw records and provenance.';

commit;
