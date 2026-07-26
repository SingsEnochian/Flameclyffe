'use strict';

const path = require('path');
const { runObserverScoop } = require('../services/observer-scoop/observer-scoop.service');

async function main() {
  const dataDir = process.env.HEARTHGATE_DATA_DIR || path.join(__dirname, '..', 'data');
  const result = await runObserverScoop({ dataDir });
  const { bundle, files, archive } = result;

  console.log(`[observer-scoop] ${bundle.packet_count} packets from ${bundle.succeeded_count}/${bundle.source_count} sources`);
  console.log(`[observer-scoop] wrote ${files.archivePath}`);

  if (archive.configured) {
    console.log(`[observer-scoop] archive receipts: ${archive.receipts.length}`);
    if (archive.error) console.error(`[observer-scoop] archive error: ${archive.error}`);
  } else {
    console.log('[observer-scoop] Supabase archive not configured; local JSON receipt preserved');
  }

  for (const source of bundle.results.filter((entry) => entry.status === 'failed')) {
    console.error(`[observer-scoop] ${source.source_key}: ${source.error}`);
  }

  if (bundle.failed_count || archive.error) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[observer-scoop] fatal:', error);
  process.exitCode = 1;
});
