'use strict';

// Read-only, owner-gated live NOAA telemetry. This complements the separately
// persisted, private Supabase high-cadence Observer archive.
const express = require('express');
const { createRequestGate } = require('../security/wayglass-request-gate');

const SCHEMA = 'wayglass.noaa-live-snapshot/v1';
const SOURCES = Object.freeze({
  speed: 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json',
  field: 'https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json',
  kp: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
  xray: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json',
});

function isoTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(value)) return null;
  const when = new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z');
  return Number.isFinite(when.getTime()) ? when.toISOString() : null;
}

function latest(rows, predicate) {
  if (!Array.isArray(rows)) return null;
  let best = null;
  for (const row of rows) {
    const timestamp = isoTime(row?.time_tag);
    if (!timestamp || !predicate(row)) continue;
    if (!best || timestamp > best.when) best = { row, when: timestamp };
  }
  return best;
}

function measured({ rows, key, field, metricKey, unit, maxAgeMs, at, filter = () => true, energy = null }) {
  const value = latest(rows, row => filter(row) && typeof row[field] === 'number' && Number.isFinite(row[field]));
  if (!value) return null;
  const age = at.getTime() - Date.parse(value.when);
  return Object.freeze({
    metric_key: metricKey,
    value: value.row[field],
    unit,
    measured_at: value.when,
    source_key: key,
    source_url: SOURCES[key],
    instrument: key === 'xray' ? 'GOES XRS' : 'NOAA SWPC',
    energy_band: energy,
    freshness: age >= -120000 && age <= maxAgeMs ? 'fresh' : 'stale',
    quality_state: 'provisional',
    classification: 'observed-data',
  });
}

async function readNoaaSnapshot({ fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  const at = now();
  if (!(at instanceof Date) || !Number.isFinite(at.getTime())) throw new TypeError('A valid capture time is required.');
  const results = await Promise.all(Object.entries(SOURCES).map(async ([key, url]) => {
    try {
      const response = await fetchImpl(url, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(9000),
      });
      if (!response?.ok) throw new Error('upstream unavailable');
      const data = await response.json();
      if (!Array.isArray(data) || data.length < 1 || data.length > 30000) throw new Error('invalid upstream shape');
      return { key, data, status: 'retrieved' };
    } catch {
      return { key, data: [], status: 'unavailable' };
    }
  }));
  const byKey = Object.fromEntries(results.map(x => [x.key, x]));
  const specs = [
    { key:'speed',field:'proton_speed',metricKey:'solar_wind_speed_km_s',unit:'km/s',maxAgeMs:15*60000 },
    { key:'field',field:'bt',metricKey:'solar_wind_bt_nt',unit:'nT',maxAgeMs:15*60000 },
    { key:'field',field:'bz_gsm',metricKey:'solar_wind_bz_gsm_nt',unit:'nT',maxAgeMs:15*60000 },
    { key:'kp',field:'Kp',metricKey:'planetary_kp',unit:'index',maxAgeMs:4*3600000 },
    { key:'xray',field:'flux',metricKey:'goes_xray_flux_w_m2',unit:'W/m^2',maxAgeMs:15*60000,
      filter:row=>row.energy==='0.1-0.8nm',energy:'0.1-0.8nm' },
  ];
  const readings = specs.map(spec => measured({ ...spec, rows: byKey[spec.key].data, at })).filter(Boolean);
  const sources = results.map(result => Object.freeze({
    source_key: result.key, source_url: SOURCES[result.key],
    status: result.status,
    observed_records: result.data.length,
  }));
  const complete = results.every(x=>x.status==='retrieved') && readings.length === specs.length &&
    readings.every(x=>x.freshness==='fresh');
  return Object.freeze({
    schema: SCHEMA,
    captured_at: at.toISOString(),
    status: complete ? 'ready' : readings.length ? 'partial' : 'unavailable',
    authority: 'NOAA SWPC public data, direct observation, no user or model-state inference',
    canon_commit: false,
    model_turn: false,
    readings,
    sources,
  });
}

function createWayglassNoaaRouter({ authorize, fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  const router = express.Router();
  router.get('/live', createRequestGate({ maxRequests: 8, maxConcurrent: 2 }), async (req,res)=>{
    res.setHeader('Cache-Control','no-store');
    if (typeof authorize !== 'function') return res.status(503).json({error:'Steward authorization is not configured.'});
    let permitted = false;
    try { permitted = await authorize(req) === true; } catch { permitted = false; }
    if (!permitted) return res.status(401).json({error:'House Steward authorization required.'});
    try {
      const packet = await readNoaaSnapshot({fetchImpl,now});
      return res.status(packet.status==='unavailable' ? 503 : 200).json(packet);
    } catch {
      return res.status(502).json({error:'NOAA observation could not be verified.'});
    }
  });
  return router;
}

module.exports = { SCHEMA, SOURCES, readNoaaSnapshot, createWayglassNoaaRouter };
