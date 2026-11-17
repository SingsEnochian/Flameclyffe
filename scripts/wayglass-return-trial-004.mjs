#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { runReturnTaskSelectionTransport } = require('../lib/wayglass-return-task-selection-live.cjs');
const { runReturnTaskSelectionViaHost } = require('../lib/wayglass-return-task-selection-host.cjs');

const inputPath = process.argv[2];
const receiptFlag = process.argv.indexOf('--receipt');
const receiptPath = receiptFlag >= 0 ? process.argv[receiptFlag + 1] : null;
const transportFlag = process.argv.indexOf('--transport');
const transport = transportFlag >= 0 ? process.argv[transportFlag + 1] : (process.env.WAYGLASS_RETURN_TRANSPORT || 'host');

if (!inputPath || inputPath.startsWith('--')) {
  console.error('Usage: node scripts/wayglass-return-trial-004.mjs INPUT.json [--receipt RECEIPT.json] [--transport host|ollama]');
  process.exit(64);
}

if (!['host', 'ollama'].includes(transport)) {
  console.error('Return Trial 004 transport must be host or ollama.');
  process.exit(64);
}

const input = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const runTransport = transport === 'host' ? runReturnTaskSelectionViaHost : runReturnTaskSelectionTransport;
const result = await runTransport({
  attempt_id: input.attempt_id || 'return-trial-004',
  stop_receipt: input.stop_receipt,
  continuation_packet: input.continuation_packet,
  evidence_scope: 'live',
});

const serialised = JSON.stringify(result, null, 2) + '\n';
if (receiptPath) {
  await fs.mkdir(path.dirname(path.resolve(receiptPath)), { recursive: true });
  const temporary = path.resolve(receiptPath) + '.tmp-' + process.pid;
  await fs.writeFile(temporary, serialised, { mode: 0o600 });
  await fs.rename(temporary, path.resolve(receiptPath));
}
process.stdout.write(serialised);
process.exitCode = result.live_model_verified ? 0 : 2;
