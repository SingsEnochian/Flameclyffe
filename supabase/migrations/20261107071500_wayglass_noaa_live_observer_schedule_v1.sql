-- Scheduled private NOAA ingestion for the Wayglass Living Observer.
-- All HTTP destinations are fixed inside the allowlisted, SECURITY INVOKER collector.
-- No project API key, database password, or exposed HTTP ingress is involved.
SELECT cron.schedule(
  'wayglass-noaa-summary-fast-v1',
  '*/2 * * * *',
  $$SELECT
      wayglass_observer_internal.collect_noaa_feed('noaa-swpc-solar-wind-speed-summary'),
      wayglass_observer_internal.collect_noaa_feed('noaa-swpc-solar-wind-mag-summary');$$
);
SELECT cron.schedule(
  'wayglass-noaa-goes-six-hour-v1',
  '*/5 * * * *',
  $$SELECT wayglass_observer_internal.collect_noaa_feed('noaa-goes-primary-xray-6h');$$
);
SELECT cron.schedule(
  'wayglass-noaa-planetary-kp-v1',
  '13 * * * *',
  $$SELECT wayglass_observer_internal.collect_noaa_feed('noaa-swpc-planetary-k-index');$$
);
SELECT cron.schedule(
  'wayglass-noaa-rtsw-minute-archives-v1',
  '*/30 * * * *',
  $$SELECT
      wayglass_observer_internal.collect_noaa_feed('noaa-swpc-rtsw-wind-1m'),
      wayglass_observer_internal.collect_noaa_feed('noaa-swpc-rtsw-mag-1m');$$
);
SELECT cron.schedule(
  'wayglass-noaa-goes-weekly-window-v1',
  '17 */12 * * *',
  $$SELECT wayglass_observer_internal.collect_noaa_feed('noaa-goes-primary-xray-7d');$$
);