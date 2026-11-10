-- Wayglass private NOAA observer collector v1: idempotent, source-allowlisted, owner-private.
-- Invoke only through privileged cron or an authorized DB operator.
CREATE SCHEMA IF NOT EXISTS wayglass_observer_internal;
REVOKE ALL ON SCHEMA wayglass_observer_internal FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION wayglass_observer_internal.collect_noaa_feed(p_source_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, extensions, wayglass_observer_internal
AS $collector$
DECLARE
  v_source public.observer_feed_registry%ROWTYPE;
  v_url text;
  v_status integer;
  v_content text;
  v_rows jsonb;
  v_run_id uuid;
  v_started timestamptz := clock_timestamp();
  v_source_rows integer := 0;
  v_candidates integer := 0;
  v_inserted integer := 0;
  v_message text;
BEGIN
  v_url := CASE p_source_key
    WHEN 'noaa-goes-primary-xray-7d' THEN 'https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json'
    WHEN 'noaa-goes-primary-xray-6h' THEN 'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json'
    WHEN 'noaa-swpc-rtsw-wind-1m' THEN 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json'
    WHEN 'noaa-swpc-rtsw-mag-1m' THEN 'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json'
    WHEN 'noaa-swpc-planetary-k-index' THEN 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
    WHEN 'noaa-swpc-solar-wind-speed-summary' THEN 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json'
    WHEN 'noaa-swpc-solar-wind-mag-summary' THEN 'https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json'
    ELSE NULL
  END;
  IF v_url IS NULL THEN
    RAISE EXCEPTION 'NOAA source is not in the pinned allowlist: %', p_source_key;
  END IF;

  SELECT * INTO v_source
  FROM public.observer_feed_registry
  WHERE source_key=p_source_key AND enabled=true AND access_level='private';
  IF NOT FOUND OR v_source.endpoint_url IS DISTINCT FROM v_url THEN
    RAISE EXCEPTION 'NOAA source is disabled, nonprivate, or endpoint does not match the allowlist';
  END IF;

  IF NOT pg_try_advisory_xact_lock(hashtextextended('wayglass:noaa:' || p_source_key,0)) THEN
    RETURN jsonb_build_object('status','locked','source_key',p_source_key);
  END IF;

  INSERT INTO public.observer_ingestion_runs
    (source_id,run_status,request_window,transport_metadata,operating_mode,packet_count)
  VALUES
    (v_source.id,'running',
      jsonb_build_object('window','upstream rolling archive','source_key',p_source_key),
      jsonb_build_object('source_url',v_url,'agency','NOAA SWPC',
        'capture_time',v_started,'method','server-side official HTTPS JSON'),
      'INTERVAL',0)
  RETURNING id INTO v_run_id;

  BEGIN
    SELECT response.status,response.content INTO v_status,v_content
    FROM extensions.http_get(v_url) AS response;
    IF v_status IS DISTINCT FROM 200 THEN
      RAISE EXCEPTION 'NOAA returned HTTP %', COALESCE(v_status,-1);
    END IF;

    v_rows := v_content::jsonb;
    IF jsonb_typeof(v_rows) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'NOAA did not return a JSON array';
    END IF;
    v_source_rows := jsonb_array_length(v_rows);
    IF v_source_rows<1 OR v_source_rows>30000 THEN
      RAISE EXCEPTION 'Unexpected upstream source record count: %',v_source_rows;
    END IF;

    WITH raw AS MATERIALIZED (
      SELECT value AS payload
      FROM jsonb_array_elements(v_rows) AS incoming(value)
      WHERE value ? 'time_tag'
        AND left(value->>'time_tag',19) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}$'
    ), prepared AS MATERIALIZED (
      SELECT
        (left(raw.payload->>'time_tag',19)::timestamp AT TIME ZONE 'UTC') AS measured_at,
        metric.metric_key,metric.numeric_value,metric.unit,metric.raw_field,raw.payload,
        CASE WHEN p_source_key IN ('noaa-swpc-rtsw-wind-1m','noaa-swpc-rtsw-mag-1m')
          THEN 'raw' ELSE 'provisional' END AS quality_state,
        CASE WHEN p_source_key LIKE 'noaa-goes-%'
          THEN concat('GOES ',coalesce(raw.payload->>'satellite','primary'),' XRS')
          WHEN p_source_key LIKE 'noaa-swpc-rtsw-%'
          THEN concat('NOAA RTSW ',coalesce(raw.payload->>'source','unknown'))
          ELSE 'NOAA SWPC' END AS instrument
      FROM raw CROSS JOIN LATERAL (VALUES
        ('goes_xray_flux_w_m2',
          CASE WHEN p_source_key IN ('noaa-goes-primary-xray-7d','noaa-goes-primary-xray-6h')
          THEN nullif(raw.payload->>'flux','')::double precision END,'W/m^2','flux'),
        ('planetary_kp',
          CASE WHEN p_source_key='noaa-swpc-planetary-k-index'
          THEN nullif(raw.payload->>'Kp','')::double precision END,'index','Kp'),
        ('planetary_a_running',
          CASE WHEN p_source_key='noaa-swpc-planetary-k-index'
          THEN nullif(raw.payload->>'a_running','')::double precision END,'index','a_running'),
        ('kp_station_count',
          CASE WHEN p_source_key='noaa-swpc-planetary-k-index'
          THEN nullif(raw.payload->>'station_count','')::double precision END,'count','station_count'),
        ('solar_wind_speed_km_s',
          CASE WHEN p_source_key IN ('noaa-swpc-rtsw-wind-1m','noaa-swpc-solar-wind-speed-summary')
          THEN nullif(raw.payload->>'proton_speed','')::double precision END,'km/s','proton_speed'),
        ('solar_wind_density_cm3',
          CASE WHEN p_source_key='noaa-swpc-rtsw-wind-1m'
          THEN nullif(raw.payload->>'proton_density','')::double precision END,'cm^-3','proton_density'),
        ('solar_wind_temperature_k',
          CASE WHEN p_source_key='noaa-swpc-rtsw-wind-1m'
          THEN nullif(raw.payload->>'proton_temperature','')::double precision END,'K','proton_temperature'),
        ('solar_wind_bt_nt',
          CASE WHEN p_source_key IN ('noaa-swpc-rtsw-mag-1m','noaa-swpc-solar-wind-mag-summary')
          THEN nullif(raw.payload->>'bt','')::double precision END,'nT','bt'),
        ('solar_wind_bz_gsm_nt',
          CASE WHEN p_source_key IN ('noaa-swpc-rtsw-mag-1m','noaa-swpc-solar-wind-mag-summary')
          THEN nullif(raw.payload->>'bz_gsm','')::double precision END,'nT','bz_gsm'),
        ('solar_wind_by_gsm_nt',
          CASE WHEN p_source_key='noaa-swpc-rtsw-mag-1m'
          THEN nullif(raw.payload->>'by_gsm','')::double precision END,'nT','by_gsm')
      ) AS metric(metric_key,numeric_value,unit,raw_field)
      WHERE metric.numeric_value IS NOT NULL
        AND metric.numeric_value > -1.0e12 AND metric.numeric_value < 1.0e12
    ), inserted AS (
      INSERT INTO public.observer_measurements
        (source_id,ingestion_run_id,measured_at,metric_key,numeric_value,unit,
         quality_state,capture_method,instrument_used,raw_value,raw_payload,
         transformation_chain,payload_hash,access_level,consent_scope,provenance)
      SELECT
        v_source.id,v_run_id,p.measured_at,p.metric_key,p.numeric_value,p.unit,
        p.quality_state,'api',p.instrument,
        jsonb_build_object('value',p.numeric_value,'source',p.payload->'source',
          'active',p.payload->'active','energy',p.payload->'energy',
          'quality_code',p.payload->'overall_quality'),
        p.payload,jsonb_build_array(jsonb_build_object('field',p.raw_field,'unit',p.unit)),
        encode(sha256(convert_to(p.payload::text || '|' || p.metric_key,'UTF8')),'hex'),
        'private',ARRAY['rowan']::text[],
        jsonb_build_object('agency','NOAA SWPC','source_url',v_url,
          'classification','observed','collector','wayglass.noaa-private/v1',
          'captured_at',v_started,'source_key',p_source_key)
      FROM prepared p
      ON CONFLICT (source_id,metric_key,measured_at,payload_hash) DO NOTHING
      RETURNING id
    )
    SELECT (SELECT count(*)::integer FROM prepared),
      (SELECT count(*)::integer FROM inserted)
    INTO v_candidates,v_inserted;

    UPDATE public.observer_ingestion_runs
    SET run_status='succeeded',completed_at=clock_timestamp(),
      packet_count=v_inserted,duplicate_count=GREATEST(0,v_candidates-v_inserted),
      error_count=0,transport_metadata=transport_metadata ||
        jsonb_build_object('raw_rows',v_source_rows,'valid_metrics',v_candidates),
      execution_time_ms=GREATEST(0,(extract(epoch from (clock_timestamp()-v_started))*1000)::integer)
    WHERE id=v_run_id;

    UPDATE public.observer_feed_registry
    SET last_success_at=clock_timestamp(),last_error_at=NULL,last_error=NULL,updated_at=now()
    WHERE id=v_source.id;

    RETURN jsonb_build_object('status','succeeded','source_key',p_source_key,
      'run_id',v_run_id,'raw_rows',v_source_rows,'candidate_metrics',v_candidates,
      'inserted',v_inserted,'duplicates',v_candidates-v_inserted);

  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_message=MESSAGE_TEXT;
    UPDATE public.observer_ingestion_runs
    SET run_status='failed',completed_at=clock_timestamp(),error_count=1,
      error_summary=left(v_message,300),
      execution_time_ms=GREATEST(0,(extract(epoch from (clock_timestamp()-v_started))*1000)::integer)
    WHERE id=v_run_id;
    UPDATE public.observer_feed_registry
    SET last_error_at=clock_timestamp(),last_error=left(v_message,300),updated_at=now()
    WHERE id=v_source.id;
    RETURN jsonb_build_object('status','failed','source_key',p_source_key,
      'run_id',v_run_id,'reason',left(v_message,300));
  END;
END;
$collector$;

REVOKE ALL ON FUNCTION wayglass_observer_internal.collect_noaa_feed(text)
FROM PUBLIC,anon,authenticated;
COMMENT ON FUNCTION wayglass_observer_internal.collect_noaa_feed(text)
IS 'Privileged NOAA allowlist collector, private telemetry, source-payload hash dedupe, immutable raw input, provenance and run receipts.';
