import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REGISTRY_PATH = process.env.HEARTHFIRE_SOURCE_REGISTRY || 'agents/hearthfire-source-registry.json';
const OUT_ROOT = process.env.HEARTHFIRE_AGENT_OUT || 'generated/hearthfire-agent-data';
const LAT = Number(process.env.HEARTHFIRE_LAT || '30.04');
const LON = Number(process.env.HEARTHFIRE_LON || '-81.40');
const LABEL = process.env.HEARTHFIRE_LOCATION_LABEL || 'NE Florida approximate';
const TIMEOUT_MS = Number(process.env.HEARTHFIRE_FETCH_TIMEOUT_MS || '20000');
const RETRIES = Number(process.env.HEARTHFIRE_FETCH_RETRIES || '3');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const safeId = (value) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');

function localDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function localDateString(date = new Date()) {
  const p = localDateParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

function resolveEndpoint(source) {
  if (source.endpoint) return source.endpoint;
  if (source.endpointTemplate) {
    return source.endpointTemplate
      .replace('{lat}', encodeURIComponent(String(LAT)))
      .replace('{lon}', encodeURIComponent(String(LON)));
  }
  return null;
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'application/json, text/plain;q=0.9, */*;q=0.1',
          'user-agent': 'Hearthfire-Agent-Fleet/0.1 (+https://github.com/SingsEnochian/Flameclyffe)',
        },
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return {
        text,
        status: response.status,
        contentType: response.headers.get('content-type'),
        etag: response.headers.get('etag'),
        lastModified: response.headers.get('last-modified'),
      };
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await sleep(1000 * 2 ** (attempt - 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function parseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function latestArrayRow(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  if (Array.isArray(data[0])) {
    const headers = data[0];
    const row = data[data.length - 1];
    if (!Array.isArray(row)) return row;
    return Object.fromEntries(headers.map((key, index) => [String(key), row[index] ?? null]));
  }
  return data[data.length - 1];
}

function normalise(source, parsed, rawChecksum, retrievedAt) {
  const base = {
    schemaVersion: '0.1.0',
    id: `${source.id}:${retrievedAt}`,
    world_id: 'waking-earth',
    bridge_worlds: source.worldScope || [],
    source_id: source.id,
    source_type: source.channel,
    source_uri: resolveEndpoint(source),
    authority: source.authority,
    retrieved_at: retrievedAt,
    observed_at: null,
    spatial_scope: source.id === 'open-meteo-local-current'
      ? { mode: 'approximate', latitude: LAT, longitude: LON, label: LABEL }
      : { mode: 'source-defined' },
    raw_checksum: rawChecksum,
    parser_id: 'hearthfire-generic-source-normaliser',
    parser_version: '0.1.0',
    units: null,
    raw_value: null,
    normalised_value: null,
    transformation_chain: ['http_fetch', 'json_parse', 'source_summary'],
    quality_flags: [],
    missingness: [],
    confidence_axes: {
      mathematical: null,
      instrument: null,
      observational_support: 'source-reported',
      replication: null,
      source_reliability: source.status === 'approved' ? 'approved-authority' : 'approved-existing',
      model_applicability: null,
    },
    verification_status: 'captured-unreviewed',
    epistemic_register: source.epistemicRegister,
    visibility: 'project-private',
    consent_scope: 'approved-public-source',
    provenance_receipt: {
      source_registry_version: '0.1.0',
      source_status: source.status,
      generated_by: 'signal-harvester',
    },
  };

  if (source.id === 'usgs-earthquakes-day' && parsed?.features) {
    const events = parsed.features.map((feature) => ({
      id: feature.id,
      time: feature.properties?.time ? new Date(feature.properties.time).toISOString() : null,
      magnitude: feature.properties?.mag ?? null,
      place: feature.properties?.place ?? null,
      significance: feature.properties?.sig ?? null,
      coordinates: feature.geometry?.coordinates ?? null,
      detail: feature.properties?.detail ?? null,
    }));
    base.observed_at = events[0]?.time || null;
    base.normalised_value = {
      event_count: events.length,
      maximum_magnitude: events.reduce((max, event) => Math.max(max, Number(event.magnitude) || 0), 0),
      events,
    };
    return base;
  }

  if (source.id === 'open-meteo-local-current' && parsed?.current) {
    base.observed_at = parsed.current.time || null;
    base.units = parsed.current_units || null;
    base.normalised_value = parsed.current;
    return base;
  }

  const latest = latestArrayRow(parsed) ?? parsed;
  base.raw_value = latest;
  base.normalised_value = latest;
  base.observed_at = latest?.time_tag || latest?.time || latest?.timestamp || null;
  if (latest == null) base.missingness.push('no_parseable_json_value');
  return base;
}

async function main() {
  const startedAt = new Date();
  const runDate = localDateString(startedAt);
  const runId = `${runDate}T${startedAt.toISOString().slice(11, 19).replaceAll(':', '')}Z`;
  const outDir = path.join(OUT_ROOT, runDate, runId);
  const rawDir = path.join(outDir, 'raw');
  const normalisedDir = path.join(outDir, 'normalised');
  const worldDir = path.join(outDir, 'world-patches');
  await Promise.all([rawDir, normalisedDir, worldDir].map((dir) => mkdir(dir, { recursive: true })));

  const registry = JSON.parse(await readFile(REGISTRY_PATH, 'utf8'));
  const approved = registry.sources.filter((source) => ['approved', 'approved-existing'].includes(source.status));
  const candidates = registry.sources.filter((source) => !['approved', 'approved-existing'].includes(source.status));
  const health = [];
  const observations = [];
  const checksumLines = [];

  await Promise.all(approved.map(async (source) => {
    const endpoint = resolveEndpoint(source);
    const retrievedAt = new Date().toISOString();
    const started = Date.now();
    try {
      if (!endpoint) throw new Error('No endpoint configured');
      const response = await fetchWithRetry(endpoint);
      const checksum = sha256(response.text);
      const rawPath = path.join(rawDir, `${safeId(source.id)}.json`);
      await writeFile(rawPath, response.text.endsWith('\n') ? response.text : `${response.text}\n`);
      checksumLines.push(`${checksum}  ${path.relative(outDir, rawPath).replaceAll('\\', '/')}`);
      const parsed = parseJson(response.text);
      const observation = normalise(source, parsed, checksum, retrievedAt);
      const normalisedPath = path.join(normalisedDir, `${safeId(source.id)}.json`);
      await writeFile(normalisedPath, `${JSON.stringify(observation, null, 2)}\n`);
      checksumLines.push(`${sha256(JSON.stringify(observation))}  ${path.relative(outDir, normalisedPath).replaceAll('\\', '/')}`);
      observations.push(observation);
      health.push({
        source_id: source.id,
        status: 'ok',
        endpoint,
        retrieved_at: retrievedAt,
        duration_ms: Date.now() - started,
        http_status: response.status,
        content_type: response.contentType,
        etag: response.etag,
        last_modified: response.lastModified,
        raw_checksum: checksum,
      });
    } catch (error) {
      health.push({
        source_id: source.id,
        status: 'failed',
        endpoint,
        retrieved_at: retrievedAt,
        duration_ms: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }));

  observations.sort((a, b) => a.source_id.localeCompare(b.source_id));
  health.sort((a, b) => a.source_id.localeCompare(b.source_id));

  const wakingPatch = {
    schemaVersion: '0.1.0',
    world_id: 'waking-earth',
    patch_status: 'generated-needs-review',
    generated_at: new Date().toISOString(),
    nodes: observations,
    edges: observations.map((observation) => ({
      type: 'observed_in_world',
      from: observation.id,
      to: 'world:waking-earth',
      epistemic_register: observation.epistemic_register,
    })),
  };
  const observerPatch = {
    schemaVersion: '0.1.0',
    world_id: 'observer-deep',
    patch_status: 'generated-needs-review',
    generated_at: new Date().toISOString(),
    source_refs: observations.filter((observation) => observation.bridge_worlds.includes('observer-deep')).map((observation) => observation.id),
    note: 'References waking-Earth observations. Does not copy them into physical or narrative certainty.',
  };

  await writeFile(path.join(worldDir, 'waking-earth.json'), `${JSON.stringify(wakingPatch, null, 2)}\n`);
  await writeFile(path.join(worldDir, 'observer-deep.json'), `${JSON.stringify(observerPatch, null, 2)}\n`);
  await writeFile(path.join(outDir, 'source-health.json'), `${JSON.stringify({ generated_at: new Date().toISOString(), sources: health }, null, 2)}\n`);
  await writeFile(path.join(outDir, 'proposal-queue.json'), `${JSON.stringify({
    generated_at: new Date().toISOString(),
    review_required: true,
    candidates: candidates.map((source) => ({
      source_id: source.id,
      status: source.status,
      authority: source.authority,
      channel: source.channel,
      documentation: source.documentation || null,
      notes: source.notes || null,
    })),
  }, null, 2)}\n`);

  const qa = {
    generated_at: new Date().toISOString(),
    agent: 'boxfire-quality-sentinel',
    result: health.some((item) => item.status === 'failed') ? 'PARTIAL' : 'PASS',
    checks: {
      approved_sources_attempted: approved.length,
      successful_sources: health.filter((item) => item.status === 'ok').length,
      failed_sources: health.filter((item) => item.status === 'failed').length,
      raw_preserved: observations.length,
      world_partitions_written: 2,
      candidate_sources_auto_promoted: 0,
      private_sources_accessed: 0,
    },
    failures: health.filter((item) => item.status === 'failed'),
  };
  await writeFile(path.join(outDir, 'boxfire-qa.json'), `${JSON.stringify(qa, null, 2)}\n`);

  const manifest = {
    schemaVersion: '0.1.0',
    run_id: runId,
    run_date: runDate,
    timezone: 'America/New_York',
    started_at: startedAt.toISOString(),
    completed_at: new Date().toISOString(),
    location: { latitude: LAT, longitude: LON, label: LABEL, precision: 'approximate-configured' },
    sources_attempted: approved.map((source) => source.id),
    observations: observations.map((observation) => ({ id: observation.id, source_id: observation.source_id })),
    health_summary: qa.checks,
    epistemic_boundary: 'Observer records signals, evidence, and interpretations. It does not certify supernatural, physical, or cosmological claims.',
  };
  await writeFile(path.join(outDir, 'bundle-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(outDir, 'checksums.sha256'), `${checksumLines.sort().join('\n')}\n`);

  const latest = {
    schemaVersion: '0.1.0',
    run_id: runId,
    run_date: runDate,
    relative_path: path.relative(OUT_ROOT, outDir).replaceAll('\\', '/'),
    completed_at: manifest.completed_at,
    qa_result: qa.result,
  };
  await mkdir(OUT_ROOT, { recursive: true });
  await writeFile(path.join(OUT_ROOT, 'latest.json'), `${JSON.stringify(latest, null, 2)}\n`);
  console.log(JSON.stringify({ outDir, qa: qa.result, sources: qa.checks }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
