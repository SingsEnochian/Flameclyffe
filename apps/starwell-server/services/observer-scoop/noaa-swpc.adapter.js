'use strict';

const crypto = require('crypto');

const SOURCES = Object.freeze({
  'noaa-swpc-solar-wind-mag-summary': {
    endpoint: 'https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json',
    parser: parseSolarWindMag,
  },
  'noaa-swpc-solar-wind-speed-summary': {
    endpoint: 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json',
    parser: parseSolarWindSpeed,
  },
  'noaa-swpc-planetary-k-index': {
    endpoint: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
    parser: parsePlanetaryK,
  },
  'noaa-goes-primary-xray-6h': {
    endpoint: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json',
    parser: parseGoesXray,
  },
});

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function payloadHash(value) {
  return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function numeric(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function isoTime(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const hasZone = /(?:Z|[+-]\d\d:\d\d)$/i.test(raw);
  const parsed = new Date(hasZone ? raw : `${raw}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function ensureRows(payload, sourceKey) {
  if (!Array.isArray(payload)) {
    throw new TypeError(`${sourceKey} returned ${typeof payload}; expected an array`);
  }
  return payload;
}

function makePacket({ sourceKey, metricKey, measuredAt, numericValue, textValue = null, unit, rawValue, rawPayload, instrumentUsed, stationCode = null, qualityState = 'provisional', provenance = {} }) {
  if (!measuredAt) throw new TypeError(`${sourceKey}/${metricKey} is missing a valid measured_at timestamp`);
  if (numericValue === null && !textValue) throw new TypeError(`${sourceKey}/${metricKey} has no usable value`);

  const identity = {
    source_key: sourceKey,
    metric_key: metricKey,
    measured_at: measuredAt,
    numeric_value: numericValue,
    text_value: textValue,
    unit,
    raw_value: rawValue,
  };

  return {
    source_key: sourceKey,
    measured_at: measuredAt,
    received_at: new Date().toISOString(),
    metric_key: metricKey,
    numeric_value: numericValue,
    text_value: textValue,
    unit,
    quality_state: qualityState,
    capture_method: 'api',
    instrument_used: instrumentUsed,
    station_code: stationCode,
    location_context: {},
    raw_value: rawValue,
    raw_payload: rawPayload,
    transformation_chain: [],
    payload_hash: payloadHash(identity),
    access_level: 'private',
    consent_scope: ['rowan'],
    provenance: {
      provider: 'NOAA Space Weather Prediction Center',
      classification: 'recorded',
      mechanism_claim: 'literal_only',
      ...provenance,
    },
  };
}

function parseSolarWindMag(payload, sourceKey) {
  const packets = [];
  for (const row of ensureRows(payload, sourceKey)) {
    const measuredAt = isoTime(row.time_tag);
    const bt = numeric(row.bt);
    const bz = numeric(row.bz_gsm);

    if (bt !== null) {
      packets.push(makePacket({
        sourceKey,
        metricKey: 'solar_wind_bt_nt',
        measuredAt,
        numericValue: bt,
        unit: 'nT',
        rawValue: { bt: row.bt },
        rawPayload: row,
        instrumentUsed: 'NOAA real-time solar-wind spacecraft feed',
      }));
    }

    if (bz !== null) {
      packets.push(makePacket({
        sourceKey,
        metricKey: 'solar_wind_bz_gsm_nt',
        measuredAt,
        numericValue: bz,
        unit: 'nT',
        rawValue: { bz_gsm: row.bz_gsm },
        rawPayload: row,
        instrumentUsed: 'NOAA real-time solar-wind spacecraft feed',
      }));
    }
  }
  return packets;
}

function parseSolarWindSpeed(payload, sourceKey) {
  const packets = [];
  for (const row of ensureRows(payload, sourceKey)) {
    const value = numeric(row.proton_speed);
    if (value === null) continue;
    packets.push(makePacket({
      sourceKey,
      metricKey: 'solar_wind_speed_km_s',
      measuredAt: isoTime(row.time_tag),
      numericValue: value,
      unit: 'km/s',
      rawValue: { proton_speed: row.proton_speed },
      rawPayload: row,
      instrumentUsed: 'NOAA real-time solar-wind spacecraft feed',
    }));
  }
  return packets;
}

function parsePlanetaryK(payload, sourceKey) {
  const packets = [];
  for (const row of ensureRows(payload, sourceKey)) {
    const measuredAt = isoTime(row.time_tag);
    const fields = [
      ['planetary_kp', row.Kp, 'index'],
      ['planetary_a_running', row.a_running, 'index'],
      ['kp_station_count', row.station_count, 'count'],
    ];

    for (const [metricKey, raw, unit] of fields) {
      const value = numeric(raw);
      if (value === null) continue;
      packets.push(makePacket({
        sourceKey,
        metricKey,
        measuredAt,
        numericValue: value,
        unit,
        rawValue: { [metricKey]: raw },
        rawPayload: row,
        instrumentUsed: 'NOAA planetary K-index network',
        qualityState: 'provisional',
        provenance: { cadence: '3-hour planetary index' },
      }));
    }
  }
  return packets;
}

function parseGoesXray(payload, sourceKey) {
  const packets = [];
  for (const row of ensureRows(payload, sourceKey)) {
    const flux = numeric(row.flux);
    if (flux === null) continue;
    const energy = row.energy ? String(row.energy) : 'unknown';
    const satellite = row.satellite ? String(row.satellite) : null;

    packets.push(makePacket({
      sourceKey,
      metricKey: `goes_xray_flux_w_m2:${energy}`,
      measuredAt: isoTime(row.time_tag),
      numericValue: flux,
      unit: 'W/m^2',
      rawValue: { flux: row.flux, energy },
      rawPayload: row,
      instrumentUsed: satellite ? `GOES-${satellite} XRS` : 'GOES X-ray Sensor',
      stationCode: satellite ? `GOES-${satellite}` : null,
      provenance: { energy_channel: energy },
    }));
  }
  return packets;
}

async function fetchJson(url, { timeoutMs = 12_000, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'Flameclyffe-Veil-Observatory/0.1',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function pollSource(sourceKey, options = {}) {
  const source = SOURCES[sourceKey];
  if (!source) throw new RangeError(`Unknown Observer source: ${sourceKey}`);

  const startedAt = new Date().toISOString();
  try {
    const payload = await fetchJson(source.endpoint, options);
    const packets = source.parser(payload, sourceKey);
    return {
      source_key: sourceKey,
      endpoint: source.endpoint,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      status: 'succeeded',
      packet_count: packets.length,
      packets,
      error: null,
    };
  } catch (error) {
    return {
      source_key: sourceKey,
      endpoint: source.endpoint,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      status: 'failed',
      packet_count: 0,
      packets: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function pollAll(options = {}) {
  const results = [];
  for (const sourceKey of Object.keys(SOURCES)) {
    // Series rather than Promise.all: kinder to public endpoints and easier to audit.
    results.push(await pollSource(sourceKey, options));
  }
  return results;
}

module.exports = {
  SOURCES,
  canonicalJson,
  payloadHash,
  isoTime,
  parseSolarWindMag,
  parseSolarWindSpeed,
  parsePlanetaryK,
  parseGoesXray,
  fetchJson,
  pollSource,
  pollAll,
};
