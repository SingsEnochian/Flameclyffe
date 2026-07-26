'use strict';

const {
  canonicalJson,
  payloadHash,
  isoTime,
  normalizeNOAAPayload,
  requireNormalizedPacket,
} = require('./normalization');

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

function ensureRows(payload, sourceKey) {
  if (!Array.isArray(payload)) {
    throw new TypeError(`${sourceKey} returned ${typeof payload}; expected an array`);
  }
  return payload;
}

function normalized(row, rawMetricKey, options) {
  return requireNormalizedPacket(normalizeNOAAPayload(row, rawMetricKey, options));
}

function parseSolarWindMag(payload, sourceKey) {
  const packets = [];
  for (const row of ensureRows(payload, sourceKey)) {
    packets.push(normalized(row, 'bt', {
      sourceKey,
      metricKey: 'solar_wind_bt_nt',
      unit: 'nT',
      instrumentUsed: 'NOAA real-time solar-wind spacecraft feed',
      provenance: { source_family: 'solar_wind_magnetic_field' },
    }));
    packets.push(normalized(row, 'bz_gsm', {
      sourceKey,
      metricKey: 'solar_wind_bz_gsm_nt',
      unit: 'nT',
      instrumentUsed: 'NOAA real-time solar-wind spacecraft feed',
      provenance: { source_family: 'solar_wind_magnetic_field', coordinate_frame: 'GSM' },
    }));
  }
  return packets;
}

function parseSolarWindSpeed(payload, sourceKey) {
  return ensureRows(payload, sourceKey).map((row) => normalized(row, 'proton_speed', {
    sourceKey,
    metricKey: 'solar_wind_speed_km_s',
    unit: 'km/s',
    instrumentUsed: 'NOAA real-time solar-wind spacecraft feed',
    provenance: { source_family: 'solar_wind_plasma' },
  }));
}

function parsePlanetaryK(payload, sourceKey) {
  const packets = [];
  const fields = [
    ['Kp', 'planetary_kp', 'index'],
    ['a_running', 'planetary_a_running', 'index'],
    ['station_count', 'kp_station_count', 'count'],
  ];

  for (const row of ensureRows(payload, sourceKey)) {
    for (const [rawMetricKey, metricKey, unit] of fields) {
      packets.push(normalized(row, rawMetricKey, {
        sourceKey,
        metricKey,
        unit,
        instrumentUsed: 'NOAA planetary K-index network',
        provenance: { cadence: '3-hour planetary index', source_family: 'geomagnetic_index' },
      }));
    }
  }
  return packets;
}

function parseGoesXray(payload, sourceKey) {
  const packets = [];
  for (const row of ensureRows(payload, sourceKey)) {
    const energy = row.energy ? String(row.energy) : 'unknown';
    const satellite = row.satellite ? String(row.satellite) : null;
    packets.push(normalized(row, 'flux', {
      sourceKey,
      metricKey: `goes_xray_flux_w_m2:${energy}`,
      unit: 'W/m^2',
      instrumentUsed: satellite ? `GOES-${satellite} XRS` : 'GOES X-ray Sensor',
      stationCode: satellite ? `GOES-${satellite}` : null,
      provenance: { energy_channel: energy, source_family: 'solar_xray_flux' },
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
  ensureRows,
  parseSolarWindMag,
  parseSolarWindSpeed,
  parsePlanetaryK,
  parseGoesXray,
  fetchJson,
  pollSource,
  pollAll,
};
