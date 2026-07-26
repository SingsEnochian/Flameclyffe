'use strict';

const fs = require('fs').promises;
const path = require('path');
const { pollAll } = require('./noaa-swpc.adapter');
const {
  hasSupabaseStoreConfig,
  persistPollResults,
  loadSnapshot,
} = require('./supabase.store');

function stamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function makeBundle(results) {
  const succeeded = results.filter((result) => result.status === 'succeeded');
  const failed = results.filter((result) => result.status === 'failed');
  return {
    observer: 'Veil Observatory signal scoop v0.1',
    classification: 'recorded companion telemetry',
    mechanism_claim: 'unknown_not_overclaimed',
    polled_at: new Date().toISOString(),
    source_count: results.length,
    succeeded_count: succeeded.length,
    failed_count: failed.length,
    packet_count: succeeded.reduce((sum, result) => sum + result.packet_count, 0),
    results,
  };
}

async function writeBundle(bundle, dataDir) {
  const outputDir = path.join(dataDir, 'observer-scoop');
  await fs.mkdir(outputDir, { recursive: true });
  const archivePath = path.join(outputDir, `${stamp(new Date(bundle.polled_at))}.json`);
  const latestPath = path.join(outputDir, 'latest.json');
  const serialized = `${JSON.stringify(bundle, null, 2)}\n`;
  await Promise.all([
    fs.writeFile(archivePath, serialized, 'utf8'),
    fs.writeFile(latestPath, serialized, 'utf8'),
  ]);
  return { archivePath, latestPath };
}

async function readLocalBundle(dataDir) {
  try {
    const raw = await fs.readFile(path.join(dataDir, 'observer-scoop', 'latest.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function localSnapshot(bundle) {
  if (!bundle) {
    return {
      generated_at: new Date().toISOString(),
      mechanism_claim: 'unknown_not_overclaimed',
      storage: 'local-empty',
      feeds: [],
      latest: [],
      timeline: [],
      anomalies: [],
    };
  }

  const packets = bundle.results
    .flatMap((result) => result.packets.map((packet) => ({
      ...packet,
      source: {
        source_key: result.source_key,
        display_name: result.source_key,
        endpoint: result.endpoint,
      },
    })))
    .sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at));

  const seen = new Set();
  const latest = packets.filter((packet) => {
    if (seen.has(packet.metric_key)) return false;
    seen.add(packet.metric_key);
    return true;
  });

  return {
    generated_at: bundle.polled_at,
    mechanism_claim: bundle.mechanism_claim,
    storage: 'local-json',
    feeds: bundle.results.map((result) => ({
      source_key: result.source_key,
      display_name: result.source_key,
      state: result.status === 'succeeded' ? 'live' : 'failed',
      last_success_at: result.status === 'succeeded' ? result.completed_at : null,
      last_error_at: result.status === 'failed' ? result.completed_at : null,
      last_error: result.error,
      packet_age_seconds: null,
      stale_after_seconds: null,
    })),
    latest,
    timeline: packets.slice(0, 180),
    anomalies: [],
  };
}

async function getObserverSnapshot(dataDir, options = {}) {
  if (hasSupabaseStoreConfig(options.env)) {
    return { ...(await loadSnapshot(options)), storage: 'supabase-private' };
  }
  return localSnapshot(await readLocalBundle(dataDir));
}

async function runObserverScoop({ dataDir, persist = true, ...options } = {}) {
  if (!dataDir) throw new Error('dataDir is required');
  const results = await pollAll(options);
  const bundle = makeBundle(results);
  const files = await writeBundle(bundle, dataDir);
  let archiveReceipts = [];
  let archiveError = null;

  if (persist && hasSupabaseStoreConfig(options.env)) {
    try {
      archiveReceipts = await persistPollResults(results, options);
    } catch (error) {
      archiveError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    bundle,
    files,
    archive: {
      configured: hasSupabaseStoreConfig(options.env),
      receipts: archiveReceipts,
      error: archiveError,
    },
    snapshot: await getObserverSnapshot(dataDir, options),
  };
}

module.exports = {
  stamp,
  makeBundle,
  writeBundle,
  readLocalBundle,
  localSnapshot,
  getObserverSnapshot,
  runObserverScoop,
};
