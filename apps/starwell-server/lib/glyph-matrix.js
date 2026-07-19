'use strict';

const crypto = require('crypto');

const VECTOR_KEYS = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];
const VECTOR_MEANINGS = Object.freeze({
  P: 'pulse/presence', C: 'coherence', R: 'resonance', E: 'entropy/energy',
  M: 'memory', A: 'axis/attention', Q: 'quality',
});

function unit(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(1, numeric > 1 ? numeric / 100 : numeric));
}

function normaliseSource(source, index = 0) {
  if (!source || typeof source !== 'object') throw new TypeError(`Source ${index + 1} must be an object.`);
  const sourceId = String(source.sourceId || source.id || '').trim();
  if (!sourceId) throw new TypeError(`Source ${index + 1} needs a sourceId.`);
  const raw = source.metrics || source.vector || source.telemetry;
  if (!raw || typeof raw !== 'object') throw new TypeError(`Source “${sourceId}” needs metrics.`);
  const metrics = {};
  for (const key of VECTOR_KEYS) {
    const value = unit(raw[key]);
    if (value !== null) metrics[key] = value;
  }
  if (!Object.keys(metrics).length) throw new TypeError(`Source “${sourceId}” contains no PREMAQ metrics.`);
  return {
    sourceId,
    sourceKind: String(source.sourceKind || source.kind || 'unspecified'),
    capturedAt: source.capturedAt || source.timestamp || null,
    metrics,
  };
}

function combineSources(sources, targetSources) {
  if (!Array.isArray(sources) || !sources.length) throw new TypeError('At least one real source payload is required.');
  const normalised = sources.map(normaliseSource);
  const requested = Array.isArray(targetSources) && targetSources.length ? new Set(targetSources.map(String)) : null;
  const active = requested ? normalised.filter(source => requested.has(source.sourceId)) : normalised;
  if (!active.length) throw new TypeError('None of the requested source IDs were supplied.');

  const vector = {};
  const anomalies = {};
  const metricCounts = {};
  for (const key of VECTOR_KEYS) {
    const values = active.map(source => source.metrics[key]).filter(Number.isFinite);
    if (!values.length) continue;
    vector[key] = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(6));
    metricCounts[key] = values.length;
    anomalies[key] = {
      minimum: Math.min(...values), maximum: Math.max(...values),
      spread: Number((Math.max(...values) - Math.min(...values)).toFixed(6)),
    };
  }
  return { active, vector, anomalies, metricCounts };
}

function generateGlyphMatrix({ sources, targetSources } = {}) {
  const { active, vector, anomalies, metricCounts } = combineSources(sources, targetSources);
  const value = key => vector[key] ?? 0;
  const entropyDistortion = value('E') * (1 - value('Q') * 0.5);
  return {
    schema: 'hearthgate.glyph-matrix/v1',
    glyph_id: `GLYPH_SET_${crypto.randomUUID()}`,
    generated_at: new Date().toISOString(),
    canonical_vector: vector,
    canonical_meanings: VECTOR_MEANINGS,
    geometry_matrix: {
      base_vertex_count: Math.max(3, Math.round(3 + value('P') * 9)),
      interlocking_density: value('C'),
      rotation_matrix_rad: Number((value('R') * Math.PI * 2).toFixed(6)),
      entropy_jitter: value('E'),
      memory_layer_depth: Math.max(1, Math.round(1 + value('M') * 5)),
      axis_bias: Number((value('A') * 2 - 1).toFixed(6)),
      quality: value('Q'),
    },
    vector_render_attributes: {
      stroke_weight_px: Number((1 + value('E') * 4).toFixed(3)),
      primary_vector_color: [value('M'), value('A'), value('Q'), 1],
      frequency_wave_distortion: Number(entropyDistortion.toFixed(6)),
    },
    aggregation: { method: 'per-metric arithmetic mean', metric_counts: metricCounts, anomalies },
    provenance: active.map(({ sourceId, sourceKind, capturedAt, metrics }) => ({ source_id: sourceId, source_kind: sourceKind, captured_at: capturedAt, metrics })),
    boundary: 'Geometry is derived from canonical PREMAQ meanings. It is a render instruction, not proof of causation or an independently measured phenomenon.',
  };
}

function routeGlyphRequest({ instruction, sources, targetSources } = {}) {
  const lowered = String(instruction || '').toLowerCase();
  if (!/(combine|set|matrix)/.test(lowered)) return null;
  return generateGlyphMatrix({ sources, targetSources });
}

module.exports = { VECTOR_KEYS, VECTOR_MEANINGS, unit, normaliseSource, combineSources, generateGlyphMatrix, routeGlyphRequest };
