'use strict';

const crypto = require('crypto');

const DEFAULT_PROVIDER = 'NOAA Space Weather Prediction Center';
const DEFAULT_PARSER_VERSION = '0.1.0';

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

function generatePayloadHash({ sourceKey, observedAt, metricKey, numericValue, textValue = null, rawValue = null }) {
  return payloadHash({
    source_key: sourceKey,
    observed_at: observedAt,
    metric_key: metricKey,
    numeric_value: numericValue,
    text_value: textValue,
    raw_value: rawValue,
  });
}

function isoTime(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const hasZone = /(?:Z|[+-]\d\d:\d\d)$/i.test(raw);
  const parsed = new Date(hasZone ? raw : `${raw}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function classifyNumeric(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return { numericValue: null, qualityState: 'missing', transformation: 'missing_value_preserved_as_null' };
  }

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    return { numericValue: null, qualityState: 'rejected', error: `Invalid numeric value: ${String(rawValue)}` };
  }

  // NOAA commonly uses large negative sentinels such as -999.9 for unavailable values.
  if (numericValue <= -999) {
    return { numericValue: null, qualityState: 'missing', transformation: 'missing_sentinel_preserved_as_null' };
  }

  return { numericValue, qualityState: 'provisional', transformation: 'number_cast' };
}

function normalizeNOAAPayload(rawTimelineItem, metricType, options = {}) {
  const {
    sourceKey = 'noaa-swpc',
    metricKey = metricType,
    unit = null,
    instrumentUsed = 'NOAA SWPC feed',
    stationCode = null,
    provider = DEFAULT_PROVIDER,
    parserVersion = DEFAULT_PARSER_VERSION,
    provenance = {},
    retrievedAt = new Date().toISOString(),
  } = options;

  try {
    if (!rawTimelineItem || typeof rawTimelineItem !== 'object' || Array.isArray(rawTimelineItem)) {
      throw new TypeError('NOAA timeline item must be an object');
    }

    const observedAt = isoTime(rawTimelineItem.time_tag ?? rawTimelineItem.time);
    if (!observedAt) throw new Error('Invalid upstream timestamp');

    const rawValue = rawTimelineItem[metricType];
    const classification = classifyNumeric(rawValue);
    if (classification.qualityState === 'rejected') throw new Error(classification.error);

    const rawValueRecord = { [metricType]: rawValue ?? null };
    const transformations = ['extracted_key', classification.transformation];
    const hash = generatePayloadHash({
      sourceKey,
      observedAt,
      metricKey,
      numericValue: classification.numericValue,
      rawValue: rawValueRecord,
    });

    return {
      source_key: sourceKey,
      measured_at: observedAt,
      observed_at: observedAt,
      received_at: retrievedAt,
      retrieved_at: retrievedAt,
      metric_key: metricKey,
      metric: metricKey,
      numeric_value: classification.numericValue,
      value: classification.numericValue,
      text_value: null,
      unit,
      quality_state: classification.qualityState,
      capture_method: 'api',
      instrument_used: instrumentUsed,
      station_code: stationCode,
      location_context: {},
      raw_value: rawValueRecord,
      raw_payload: rawTimelineItem,
      raw_source_record: rawTimelineItem,
      transformation_chain: transformations,
      payload_hash: hash,
      access_level: 'private',
      consent_scope: ['rowan'],
      provenance: {
        provider,
        parser_version: parserVersion,
        classification: 'recorded',
        mechanism_claim: 'literal_only',
        transformations,
        ...provenance,
      },
    };
  } catch (error) {
    return {
      source_key: sourceKey,
      metric_key: metricKey,
      metric: metricKey,
      quality_state: 'rejected',
      error: error instanceof Error ? error.message : String(error),
      raw_payload: rawTimelineItem,
      raw_source_record: rawTimelineItem,
    };
  }
}

function requireNormalizedPacket(packet) {
  if (!packet || packet.quality_state === 'rejected') {
    throw new TypeError(packet?.error || 'NOAA payload normalization failed');
  }
  return packet;
}

module.exports = {
  canonicalJson,
  payloadHash,
  generatePayloadHash,
  isoTime,
  classifyNumeric,
  normalizeNOAAPayload,
  requireNormalizedPacket,
};
