'use strict';

const fs = require('fs').promises;
const path = require('path');
const { pollAll } = require('../services/observer-scoop/noaa-swpc.adapter');

function stamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const results = await pollAll();
  const succeeded = results.filter((result) => result.status === 'succeeded');
  const failed = results.filter((result) => result.status === 'failed');
  const packetCount = succeeded.reduce((sum, result) => sum + result.packet_count, 0);

  const output = {
    observer: 'Veil Observatory signal scoop v0.1',
    classification: 'recorded companion telemetry',
    mechanism_claim: 'unknown_not_overclaimed',
    polled_at: new Date().toISOString(),
    source_count: results.length,
    succeeded_count: succeeded.length,
    failed_count: failed.length,
    packet_count: packetCount,
    results,
  };

  const outputDir = path.join(__dirname, '..', 'data', 'observer-scoop');
  await fs.mkdir(outputDir, { recursive: true });

  const archivePath = path.join(outputDir, `${stamp()}.json`);
  const latestPath = path.join(outputDir, 'latest.json');
  const serialized = `${JSON.stringify(output, null, 2)}\n`;

  await Promise.all([
    fs.writeFile(archivePath, serialized, 'utf8'),
    fs.writeFile(latestPath, serialized, 'utf8'),
  ]);

  console.log(`[observer-scoop] ${packetCount} packets from ${succeeded.length}/${results.length} sources`);
  console.log(`[observer-scoop] wrote ${archivePath}`);

  for (const result of failed) {
    console.error(`[observer-scoop] ${result.source_key}: ${result.error}`);
  }

  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[observer-scoop] fatal:', error);
  process.exitCode = 1;
});
