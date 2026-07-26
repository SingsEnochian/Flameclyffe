begin;

create table if not exists public.observer_feed_registry (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  display_name text not null,
  provider text not null,
  source_kind text not null check (source_kind in (
    'space_weather', 'geomagnetic', 'ionospheric', 'lightning', 'weather',
    'radio', 'local_sensor', 'network', 'derived', 'other'
  )),
  endpoint_url text,
  station_code text,
  metric_keys text[] not null default '{}',
  default_units jsonb not null default '{}'::jsonb,
  poll_interval_seconds integer not null default 300 check (poll_interval_seconds >= 30),
  parser_version text not null default 'v0.1',
  enabled boolean not null default true,
  access_level text not null default 'private' check (access_level in ('private', 'circle', 'public')),
  consent_scope text[] not null default array['rowan']::text[],
  provenance jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.observer_feed_registry is
  'Registry of external feeds and local instruments used by the DEEP Observer companion measurement layer.';

create table if not exists public.observer_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.observer_feed_registry(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  run_status text not null default 'running' check (run_status in ('running', 'succeeded', 'partial', 'failed', 'cancelled')),
  request_window jsonb not null default '{}'::jsonb,
  packet_count integer not null default 0 check (packet_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  error_summary text,
  transport_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.observer_measurements (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.observer_feed_registry(id) on delete restrict,
  ingestion_run_id uuid references public.observer_ingestion_runs(id) on delete set null,
  measured_at timestamptz not null,
  received_at timestamptz not null default now(),
  metric_key text not null,
  numeric_value double precision,
  text_value text,
  unit text,
  quality_state text not null default 'provisional' check (quality_state in (
    'raw', 'provisional', 'adjusted', 'quasi_definitive', 'definitive',
    'forecast', 'derived', 'stale', 'missing', 'rejected'
  )),
  capture_method text not null default 'api',
  instrument_used text,
  station_code text,
  location_context jsonb not null default '{}'::jsonb,
  raw_value jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  transformation_chain jsonb not null default '[]'::jsonb,
  payload_hash text not null,
  access_level text not null default 'private' check (access_level in ('private', 'circle', 'public')),
  consent_scope text[] not null default array['rowan']::text[],
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_id, metric_key, measured_at, payload_hash)
);

comment on table public.observer_measurements is
  'Append-only raw and normalized measurements. Symbolic interpretations belong elsewhere.';

create table if not exists public.observer_anomaly_windows (
  id uuid primary key default gen_random_uuid(),
  window_key text unique,
  detector_name text not null,
  detector_version text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  window_status text not null default 'open' check (window_status in ('open', 'closed', 'held', 'rejected', 'archived')),
  severity text not null default 'notice' check (severity in ('trace', 'notice', 'elevated', 'high', 'critical')),
  anomaly_score double precision,
  data_quality_score double precision check (data_quality_score is null or (data_quality_score >= 0 and data_quality_score <= 1)),
  metric_keys text[] not null default '{}',
  source_ids uuid[] not null default '{}',
  measurement_ids uuid[] not null default '{}',
  baseline_definition jsonb not null default '{}'::jsonb,
  detector_parameters jsonb not null default '{}'::jsonb,
  known_confounders jsonb not null default '[]'::jsonb,
  evidence_summary text,
  review_state text not null default 'unreviewed' check (review_state in ('unreviewed', 'machine_checked', 'human_reviewed', 'rejected', 'accepted_for_tracking')),
  mechanism_claim text not null default 'unknown_not_overclaimed' check (mechanism_claim in (
    'unknown_not_overclaimed', 'literal_only', 'symbolic_resonance',
    'technical_confirmed', 'archived_without_claim'
  )),
  visibility text not null default 'private' check (visibility in ('private', 'circle', 'public')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.observer_anomaly_windows is
  'Versioned measurable departures from explicit baselines; anomaly does not imply hidden cause.';

create table if not exists public.observer_correlation_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_key text unique,
  observer_event_id uuid references public.deep_observer_events(id) on delete cascade,
  bridge_signal_event_id uuid references public.bridge_signal_events(id) on delete cascade,
  anomaly_window_id uuid not null references public.observer_anomaly_windows(id) on delete cascade,
  relationship_type text not null default 'temporal_overlap' check (relationship_type in (
    'temporal_overlap', 'lagged_overlap', 'feature_similarity', 'recurrence',
    'source_agreement', 'transport_alignment', 'other'
  )),
  lag_seconds integer,
  correlation_score double precision,
  method_name text not null,
  method_version text not null,
  feature_set jsonb not null default '{}'::jsonb,
  declared_lens text not null default 'unknown',
  support_level text not null default 'L0' check (support_level in ('L0', 'L1', 'L2', 'L3', 'L4', 'L5')),
  mechanism_claim text not null default 'unknown_not_overclaimed' check (mechanism_claim in (
    'unknown_not_overclaimed', 'literal_only', 'symbolic_resonance',
    'technical_confirmed', 'archived_without_claim'
  )),
  reviewer_notes text,
  visibility text not null default 'private' check (visibility in ('private', 'circle', 'public')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.observer_correlation_receipts is
  'Traceable links between measured anomaly windows and witness or bridge events. Correlation receipts do not certify causation.';

create index if not exists observer_measurements_source_time_idx
  on public.observer_measurements (source_id, measured_at desc);
create index if not exists observer_measurements_metric_time_idx
  on public.observer_measurements (metric_key, measured_at desc);
create index if not exists observer_measurements_received_idx
  on public.observer_measurements (received_at desc);
create index if not exists observer_ingestion_runs_source_time_idx
  on public.observer_ingestion_runs (source_id, started_at desc);
create index if not exists observer_anomaly_windows_time_idx
  on public.observer_anomaly_windows (started_at desc, ended_at desc);
create index if not exists observer_correlation_event_idx
  on public.observer_correlation_receipts (observer_event_id, created_at desc);
create index if not exists observer_correlation_bridge_idx
  on public.observer_correlation_receipts (bridge_signal_event_id, created_at desc);

alter table public.observer_feed_registry enable row level security;
alter table public.observer_ingestion_runs enable row level security;
alter table public.observer_measurements enable row level security;
alter table public.observer_anomaly_windows enable row level security;
alter table public.observer_correlation_receipts enable row level security;

comment on table public.observer_feed_registry is
  'RLS-enabled and service-role-first in v0.1. Add reviewed member policies before browser writes.';

insert into public.observer_feed_registry (
  source_key, display_name, provider, source_kind, endpoint_url,
  metric_keys, default_units, poll_interval_seconds, parser_version,
  access_level, provenance, metadata
)
values
  (
    'noaa-swpc-solar-wind-mag-summary',
    'NOAA SWPC Solar Wind Magnetic Field Summary',
    'NOAA Space Weather Prediction Center',
    'space_weather',
    'https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json',
    array['solar_wind_bt_nt', 'solar_wind_bz_gsm_nt'],
    '{"solar_wind_bt_nt":"nT","solar_wind_bz_gsm_nt":"nT"}'::jsonb,
    60,
    'noaa-summary-v0.1',
    'private',
    '{"authority":"NOAA SWPC","capture":"public JSON API"}'::jsonb,
    '{"observed_recorded_layer":true}'::jsonb
  ),
  (
    'noaa-swpc-solar-wind-speed-summary',
    'NOAA SWPC Solar Wind Speed Summary',
    'NOAA Space Weather Prediction Center',
    'space_weather',
    'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json',
    array['solar_wind_speed_km_s'],
    '{"solar_wind_speed_km_s":"km/s"}'::jsonb,
    60,
    'noaa-summary-v0.1',
    'private',
    '{"authority":"NOAA SWPC","capture":"public JSON API"}'::jsonb,
    '{"observed_recorded_layer":true}'::jsonb
  ),
  (
    'noaa-swpc-planetary-k-index',
    'NOAA SWPC Planetary K Index',
    'NOAA Space Weather Prediction Center',
    'geomagnetic',
    'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
    array['planetary_kp', 'planetary_a_running', 'kp_station_count'],
    '{"planetary_kp":"index","planetary_a_running":"index","kp_station_count":"count"}'::jsonb,
    900,
    'noaa-kp-v0.1',
    'private',
    '{"authority":"NOAA SWPC","capture":"public JSON API"}'::jsonb,
    '{"cadence_note":"Kp is a 3-hour planetary index; polling more often only checks freshness."}'::jsonb
  ),
  (
    'noaa-goes-primary-xray-6h',
    'NOAA GOES Primary Soft X-ray Flux',
    'NOAA Space Weather Prediction Center',
    'space_weather',
    'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json',
    array['goes_xray_flux_w_m2'],
    '{"goes_xray_flux_w_m2":"W/m^2"}'::jsonb,
    120,
    'noaa-goes-xray-v0.1',
    'private',
    '{"authority":"NOAA SWPC","capture":"public JSON API"}'::jsonb,
    '{"channels_expected":["0.05-0.4nm","0.1-0.8nm"]}'::jsonb
  )
on conflict (source_key) do update set
  display_name = excluded.display_name,
  endpoint_url = excluded.endpoint_url,
  metric_keys = excluded.metric_keys,
  default_units = excluded.default_units,
  poll_interval_seconds = excluded.poll_interval_seconds,
  parser_version = excluded.parser_version,
  provenance = excluded.provenance,
  metadata = public.observer_feed_registry.metadata || excluded.metadata,
  updated_at = now();

commit;
