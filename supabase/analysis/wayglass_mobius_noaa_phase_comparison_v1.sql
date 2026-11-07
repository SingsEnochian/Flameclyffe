-- Wayglass Möbius/chaos exploratory comparison v1.
-- Observed NOAA records only; 70% chronological train, last 30% validation.
-- Candidate cycle lengths are MINUTES, not Wayglass's architectural eight folds.
-- Read-only; no model turn, canon action or prediction.
WITH raw AS (
SELECT
 CASE WHEN f.source_key='noaa-goes-primary-xray-7d' AND m.metric_key='goes_xray_flux_w_m2'
   AND m.raw_payload->>'energy'='0.1-0.8nm' THEN 'GOES XRS long'
 WHEN f.source_key='noaa-swpc-rtsw-wind-1m' AND m.metric_key='solar_wind_speed_km_s'
   AND m.raw_payload->>'active'='true' THEN 'RTSW speed active'
 WHEN f.source_key='noaa-swpc-rtsw-mag-1m' AND m.metric_key='solar_wind_bz_gsm_nt'
   AND m.raw_payload->>'active'='true' THEN 'RTSW Bz active'
 END AS signal,
 m.measured_at,
 m.received_at,
 CASE WHEN f.source_key='noaa-goes-primary-xray-7d' THEN
   CASE WHEN m.numeric_value > 0 THEN ln(m.numeric_value)/ln(10) END
 ELSE m.numeric_value END AS y
FROM public.observer_measurements m
JOIN public.observer_feed_registry f ON f.id=m.source_id
WHERE f.source_key IN ('noaa-goes-primary-xray-7d','noaa-swpc-rtsw-wind-1m','noaa-swpc-rtsw-mag-1m')
), chosen AS (
 SELECT DISTINCT ON (signal,measured_at) signal, measured_at,y
 FROM raw WHERE signal IS NOT NULL AND y IS NOT NULL
 ORDER BY signal,measured_at,received_at DESC
), numbered AS (
 SELECT signal, measured_at,y,
 (extract(epoch from measured_at)::bigint/60 - min(extract(epoch from measured_at)::bigint/60) OVER (PARTITION BY signal))::bigint AS minute_index,
 row_number() OVER(PARTITION BY signal ORDER BY measured_at) AS rn,
 count(*) OVER(PARTITION BY signal) AS total
 FROM chosen
), splits AS (
 SELECT *,rn <= floor(total*0.7) AS train FROM numbered
), folds AS (SELECT * FROM (VALUES (3),(5),(7),(8),(11),(42)) AS v(n)),
 candidates AS (
 SELECT s.*, f.n,
 (s.minute_index % f.n)::integer AS phase,
 CASE WHEN (s.minute_index/f.n)%2=0 THEN 1.0 ELSE -1.0 END AS orientation
 FROM splits s CROSS JOIN folds f
), baselines AS (
 SELECT signal,n,avg(y) AS train_mean
 FROM candidates WHERE train GROUP BY signal,n
), phasefit AS (
 SELECT c.signal,c.n,c.phase,
 avg(c.y) AS plain_mean,
 avg((c.y - b.train_mean)*c.orientation) AS twisted_coefficient
 FROM candidates c JOIN baselines b USING(signal,n)
 WHERE c.train GROUP BY c.signal,c.n,c.phase
), scores AS (
 SELECT c.signal,c.n,
 count(*) AS validation_points,
 sum(power(c.y-b.train_mean,2)) AS baseline_sse,
 sum(power(c.y-coalesce(p.plain_mean,b.train_mean),2)) AS untwisted_sse,
 sum(power(c.y-(b.train_mean+c.orientation*coalesce(p.twisted_coefficient,0)),2)) AS mobius_sse
 FROM candidates c JOIN baselines b USING(signal,n)
 LEFT JOIN phasefit p ON p.signal=c.signal AND p.n=c.n AND p.phase=c.phase
 WHERE NOT c.train
 GROUP BY c.signal,c.n
)
SELECT signal,n,validation_points,
round((1-untwisted_sse/nullif(baseline_sse,0))::numeric,6) AS periodic_test_r2,
round((1-mobius_sse/nullif(baseline_sse,0))::numeric,6) AS twisted_test_r2
FROM scores ORDER BY signal,n;
