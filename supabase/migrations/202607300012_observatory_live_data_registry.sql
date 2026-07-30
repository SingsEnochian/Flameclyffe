create table if not exists public.observatory_data_sources (
  source_key text primary key,
  table_name text not null unique,
  domain text not null,
  classification text not null default 'canonical',
  contract_version text not null default 'observatory-live-v1',
  default_order text,
  active_filter jsonb not null default '{}'::jsonb,
  is_live boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.observatory_data_sources enable row level security;

drop policy if exists "observatory data sources are publicly readable" on public.observatory_data_sources;
create policy "observatory data sources are publicly readable"
on public.observatory_data_sources for select
to anon, authenticated
using (is_live = true);

insert into public.observatory_data_sources
(source_key, table_name, domain, classification, default_order, active_filter, metadata)
values
('observer.measurements','observer_measurements','observer','observational','measured_at.desc','{}','{"role":"canonical measurements"}'),
('observer.events','deep_observer_events','observer','observational','created_at.desc','{}','{"role":"DEEP event archive"}'),
('observer.feed_registry','observer_feed_registry','observer','observational','created_at.desc','{}','{"role":"feed contracts"}'),
('observer.metric_registry','observer_metric_registry','observer','observational','created_at.asc','{}','{"role":"metric contracts"}'),
('observer.anomaly_windows','observer_anomaly_windows','observer','observational','created_at.desc','{}','{"role":"anomaly windows"}'),
('observer.correlation_receipts','observer_correlation_receipts','observer','interpretive','created_at.desc','{}','{"role":"correlation provenance"}'),
('starwell.worlds','starwell_worlds','canon','canonical','name.asc','{}','{"role":"world registry"}'),
('starwell.characters','starwell_characters','canon','canonical','name.asc','{}','{"role":"character registry"}'),
('starwell.locations','starwell_locations','canon','canonical','name.asc','{}','{"role":"location registry"}'),
('starwell.timeline','starwell_timeline_events','canon','canonical','created_at.asc','{}','{"role":"timeline"}'),
('starwell.codex','starwell_codex_entries','canon','canonical','title.asc','{}','{"role":"codex"}'),
('starwell.artifacts','starwell_artifacts','canon','canonical','name.asc','{}','{"role":"artifact registry"}'),
('starwell.starmap','starwell_starmap_nodes','canon','canonical','created_at.asc','{}','{"role":"starmap"}'),
('starwell.discovery_logs','starwell_discovery_logs','research','observational','created_at.desc','{}','{"role":"discovery log"}'),
('flameclyffe.projects','flameclyffe_projects','platform','canonical','created_at.asc','{}','{"role":"project registry"}'),
('flameclyffe.routes','flameclyffe_frontend_routes','platform','canonical','created_at.asc','{}','{"role":"route manifest"}'),
('flameclyffe.public_routes','flameclyffe_public_routes','platform','canonical','created_at.asc','{}','{"role":"public route manifest"}'),
('flameclyffe.members','flameclyffe_members','constellation','canonical','created_at.asc','{}','{"role":"member registry"}'),
('flameclyffe.signals','flameclyffe_signals','signals','observational','created_at.desc','{}','{"role":"signal archive"}'),
('flameclyffe.tones','flameclyffe_tones','audio','projected','created_at.asc','{}','{"role":"tone registry"}'),
('flameclyffe.patches','flameclyffe_patches','audio','projected','created_at.asc','{}','{"role":"patch registry"}'),
('audio.resonance_presets','resonance_presets','audio','projected','created_at.asc','{}','{"role":"resonance presets"}'),
('audio.hearing_profiles','hearing_profiles','audio','canonical','created_at.asc','{}','{"role":"accessibility profiles"}'),
('science.constants','science_constants','science','observational','created_at.asc','{}','{"role":"science constants"}'),
('bridge.registry','bridge_registry','bridge','canonical','created_at.asc','{}','{"role":"bridge registry"}'),
('bridge.events','bridge_signal_events','bridge','observational','created_at.desc','{}','{"role":"bridge signals"}'),
('temporal.progression','temporal_twist_progression','temporal','projected','horizon_index.asc','{"is_active":true}','{"role":"temporal twist calibration"}')
on conflict (source_key) do update set
  table_name = excluded.table_name,
  domain = excluded.domain,
  classification = excluded.classification,
  default_order = excluded.default_order,
  active_filter = excluded.active_filter,
  is_live = true,
  metadata = excluded.metadata,
  updated_at = now();

create or replace view public.observatory_live_contract as
select source_key, table_name, domain, classification, contract_version,
       default_order, active_filter, metadata, updated_at
from public.observatory_data_sources
where is_live = true;

grant select on public.observatory_data_sources to anon, authenticated;
grant select on public.observatory_live_contract to anon, authenticated;
