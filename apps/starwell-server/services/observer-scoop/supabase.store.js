'use strict';

const DEFAULT_MEASUREMENT_LIMIT = 600;

function getConfig(env = process.env) {
  return {
    url: String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, ''),
    key: String(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || ''),
  };
}

function hasSupabaseStoreConfig(env = process.env) {
  const { url, key } = getConfig(env);
  return Boolean(url && key);
}

async function restRequest(table, {
  method = 'GET', params = {}, body, prefer,
  env = process.env, fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required');
  const { url, key } = getConfig(env);
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) are required');

  const query = new URLSearchParams();
  Object.entries(params).forEach(([name, value]) => {
    if (value !== undefined && value !== null) query.set(name, String(value));
  });

  const response = await fetchImpl(`${url}/rest/v1/${table}${query.size ? `?${query}` : ''}`, {
    method,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: 'application/json',
      'content-type': 'application/json',
      ...(prefer ? { prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); }
    catch { payload = text; }
  }

  if (!response.ok) {
    const detail = typeof payload === 'string'
      ? payload
      : payload?.message || payload?.details || JSON.stringify(payload);
    throw new Error(`Supabase ${method} ${table} failed (${response.status}): ${detail}`);
  }
  return payload;
}

async function getSource(sourceKey, options = {}) {
  const rows = await restRequest('observer_feed_registry', {
    ...options,
    params: {
      source_key: `eq.${sourceKey}`,
      select: 'id,source_key,display_name,source_kind,poll_interval_seconds,last_success_at,last_error_at,last_error,enabled',
      limit: 1,
    },
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

function measurementInsert(packet, sourceId, ingestionRunId) {
  const { source_key: _sourceKey, ...measurement } = packet;
  return { ...measurement, source_id: sourceId, ingestion_run_id: ingestionRunId };
}

async function persistSourceResult(result, options = {}) {
  const source = await getSource(result.source_key, options);
  if (!source) throw new Error(`Observer feed is not registered: ${result.source_key}`);

  const runs = await restRequest('observer_ingestion_runs', {
    ...options,
    method: 'POST',
    prefer: 'return=representation',
    body: {
      source_id: source.id,
      started_at: result.started_at,
      run_status: 'running',
      request_window: { endpoint: result.endpoint },
      transport_metadata: { adapter: 'noaa-swpc-v0.1' },
    },
  });
  const run = Array.isArray(runs) ? runs[0] : null;
  if (!run?.id) throw new Error(`Could not create ingestion run for ${result.source_key}`);

  let insertedCount = 0;
  let duplicateCount = 0;
  let finalStatus = result.status === 'succeeded' ? 'succeeded' : 'failed';
  let errorSummary = result.error || null;

  try {
    if (result.status === 'succeeded' && result.packets.length) {
      const inserted = await restRequest('observer_measurements', {
        ...options,
        method: 'POST',
        params: { on_conflict: 'source_id,metric_key,measured_at,payload_hash' },
        prefer: 'resolution=ignore-duplicates,return=representation',
        body: result.packets.map((packet) => measurementInsert(packet, source.id, run.id)),
      });
      insertedCount = Array.isArray(inserted) ? inserted.length : 0;
      duplicateCount = Math.max(0, result.packets.length - insertedCount);
    }
  } catch (error) {
    finalStatus = 'failed';
    errorSummary = error instanceof Error ? error.message : String(error);
  }

  await restRequest('observer_ingestion_runs', {
    ...options,
    method: 'PATCH',
    params: { id: `eq.${run.id}` },
    prefer: 'return=minimal',
    body: {
      completed_at: result.completed_at || new Date().toISOString(),
      run_status: finalStatus,
      packet_count: insertedCount,
      duplicate_count: duplicateCount,
      error_count: finalStatus === 'failed' ? 1 : 0,
      error_summary: errorSummary,
    },
  });

  await restRequest('observer_feed_registry', {
    ...options,
    method: 'PATCH',
    params: { id: `eq.${source.id}` },
    prefer: 'return=minimal',
    body: finalStatus === 'succeeded'
      ? { last_success_at: result.completed_at || new Date().toISOString(), last_error: null }
      : { last_error_at: result.completed_at || new Date().toISOString(), last_error: errorSummary },
  });

  return {
    source_key: result.source_key,
    ingestion_run_id: run.id,
    status: finalStatus,
    inserted_count: insertedCount,
    duplicate_count: duplicateCount,
    error: errorSummary,
  };
}

async function persistPollResults(results, options = {}) {
  const receipts = [];
  for (const result of results) receipts.push(await persistSourceResult(result, options));
  return receipts;
}

function newestByMetric(rows = []) {
  const seen = new Set();
  const output = [];
  for (const row of rows) {
    if (seen.has(row.metric_key)) continue;
    seen.add(row.metric_key);
    output.push(row);
  }
  return output;
}

function staleAfterSeconds(source) {
  if (source.source_kind === 'geomagnetic') return 4 * 60 * 60;
  return Math.max(10 * 60, Number(source.poll_interval_seconds || 300) * 4);
}

function sourceHealth(source, measurements, now = Date.now()) {
  const latest = measurements.find((row) => row.source_id === source.id) || null;
  const staleAfter = staleAfterSeconds(source);
  const ageSeconds = latest
    ? Math.max(0, Math.round((now - new Date(latest.measured_at).getTime()) / 1000))
    : null;
  const latestErrorWins = source.last_error_at
    && (!source.last_success_at || new Date(source.last_error_at) > new Date(source.last_success_at));

  let state = 'live';
  if (!source.enabled) state = 'paused';
  else if (latestErrorWins) state = 'failed';
  else if (!latest) state = 'empty';
  else if (ageSeconds > staleAfter) state = 'stale';

  return {
    ...source,
    state,
    packet_age_seconds: ageSeconds,
    stale_after_seconds: staleAfter,
    latest_measured_at: latest?.measured_at || null,
  };
}

async function loadSnapshot({ limit = DEFAULT_MEASUREMENT_LIMIT, ...options } = {}) {
  const [sources, measurements, anomalies] = await Promise.all([
    restRequest('observer_feed_registry', {
      ...options,
      params: {
        select: 'id,source_key,display_name,provider,source_kind,poll_interval_seconds,enabled,last_success_at,last_error_at,last_error',
        order: 'display_name.asc',
      },
    }),
    restRequest('observer_measurements', {
      ...options,
      params: {
        select: 'id,source_id,ingestion_run_id,measured_at,received_at,metric_key,numeric_value,text_value,unit,quality_state,instrument_used,station_code,raw_value,raw_payload,transformation_chain,payload_hash,provenance',
        order: 'measured_at.desc',
        limit,
      },
    }),
    restRequest('observer_anomaly_windows', {
      ...options,
      params: {
        select: 'id,window_key,detector_name,detector_version,started_at,ended_at,window_status,severity,anomaly_score,data_quality_score,evidence_summary,review_state,mechanism_claim',
        order: 'started_at.desc',
        limit: 30,
      },
    }),
  ]);

  const safeSources = Array.isArray(sources) ? sources : [];
  const safeMeasurements = Array.isArray(measurements) ? measurements : [];
  const safeAnomalies = Array.isArray(anomalies) ? anomalies : [];
  const sourceMap = new Map(safeSources.map((source) => [source.id, source]));
  const withSources = safeMeasurements.map((measurement) => ({
    ...measurement,
    source: sourceMap.get(measurement.source_id) || null,
  }));

  return {
    generated_at: new Date().toISOString(),
    mechanism_claim: 'unknown_not_overclaimed',
    feeds: safeSources.map((source) => sourceHealth(source, safeMeasurements)),
    latest: newestByMetric(withSources),
    timeline: withSources.slice(0, 180),
    anomalies: safeAnomalies,
  };
}

module.exports = {
  getConfig,
  hasSupabaseStoreConfig,
  restRequest,
  getSource,
  persistSourceResult,
  persistPollResults,
  newestByMetric,
  staleAfterSeconds,
  sourceHealth,
  loadSnapshot,
};
