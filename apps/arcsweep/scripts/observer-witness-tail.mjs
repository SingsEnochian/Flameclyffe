#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const watch = args.has('--watch') || args.has('-w');
const jsonOnly = args.has('--json');
const intervalMs = 1000;

function defaultDataRoot() {
  if (process.env.ARCSWEEP_DATA_DIR) return path.resolve(process.env.ARCSWEEP_DATA_DIR);
  if (process.platform === 'win32' && process.env.APPDATA) return path.join(process.env.APPDATA, 'Hearthgate', 'Arcsweep');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'Hearthgate', 'Arcsweep');
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'Hearthgate', 'Arcsweep');
}

const root = defaultDataRoot();
const witnessDir = path.join(root, 'observer-witness');
const latestFile = path.join(witnessDir, 'latest.json');
const logFile = path.join(witnessDir, 'receipts.jsonl');

async function readLatest() {
  try {
    const packet = JSON.parse(await fs.readFile(latestFile, 'utf8'));
    return packet?.schema === 'arcsweep.observer-witness/v1' ? packet : null;
  } catch {
    return null;
  }
}

function printPacket(packet) {
  if (!packet) return;
  if (jsonOnly) {
    process.stdout.write(`${JSON.stringify(packet)}\n`);
    return;
  }
  const semantic = packet.observer || {};
  const counts = packet.epistemic?.counts || {};
  process.stdout.write([
    `[Observer witness] ${packet.created_at || 'unknown time'}`,
    `receipt: ${packet.receipt_id || 'unknown'}`,
    `world: ${packet.world_id || 'unassigned'}`,
    `kind: ${packet.kind || 'unknown'}`,
    `availability/integration/runtime/data: ${semantic.availability?.state || 'unknown'} / ${semantic.integration_health?.state || 'unknown'} / ${semantic.runtime_state?.state || 'unknown'} / ${semantic.data_health?.state || 'unknown'}`,
    `epistemic: ${counts.entries || 0} entries · ${counts.evidence || 0} evidence · ${counts.claims || 0} claims · ${counts.mechanism_edges || 0} edges`,
    packet.note ? `note: ${String(packet.note).replace(/\s+/g, ' ').slice(0, 220)}` : null,
    '',
  ].filter((line) => line !== null).join('\n'));
}

async function main() {
  if (!jsonOnly) {
    console.error(`[ArcSweep Observer witness] data root: ${root}`);
    console.error(`[ArcSweep Observer witness] latest: ${latestFile}`);
    console.error(`[ArcSweep Observer witness] log: ${logFile}`);
  }

  let lastReceipt = null;
  const poll = async () => {
    const packet = await readLatest();
    if (!packet || packet.receipt_id === lastReceipt) return;
    lastReceipt = packet.receipt_id;
    printPacket(packet);
  };

  await poll();
  if (!watch) return;
  if (!jsonOnly) console.error('[ArcSweep Observer witness] watching for new receipts; Ctrl+C to stop.');
  const timer = setInterval(() => void poll(), intervalMs);
  const stop = () => {
    clearInterval(timer);
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

await main();
