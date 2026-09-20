#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';

import {
  processEarthGateTelemetry,
  projectEarthGateReceipt,
} from '../apps/arcsweep/src/earth-gate-telemetry.js';

const DEFAULT_URL = 'https://frqrxmshxftpylwdtsdm.supabase.co';

function usage() {
  console.log(`Usage:
  node scripts/earth-gate-telemetry.mjs <archetype> '<json-payload>' [--publish] [--step N]
  node scripts/earth-gate-telemetry.mjs <archetype> --file payload.json [--publish] [--step N]

Archetypes:
  RA-90
  Temporal Anchoring Rod
  Chrono-Spatial Matrix Grid

Examples:
  node scripts/earth-gate-telemetry.mjs "RA-90" '{"hrv_rmssd_ms":62.4,"audio_frequency_hz":432.1,"haptic_cadence_bpm":65,"user_rating":5}'
  node scripts/earth-gate-telemetry.mjs "Chrono-Spatial Matrix Grid" '{"observed_drift":0.0014,"frame_index":2048}' --publish --step 2048
`);
}

function parse(argv) {
  if (!argv.length || argv.includes('--help') || argv.includes('-h')) return { help: true };
  const archetype = argv[0];
  let payloadText = null;
  let file = null;
  let publish = false;
  let step = null;

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--file') file = argv[++index];
    else if (token === '--publish') publish = true;
    else if (token === '--step') step = Number(argv[++index]);
    else if (payloadText === null) payloadText = token;
    else throw new Error(`Unexpected argument: ${token}`);
  }
  return { archetype, payloadText, file, publish, step };
}

async function loadPayload({ payloadText, file }) {
  if (payloadText && file) throw new Error('Choose inline JSON or --file, not both.');
  if (file) return JSON.parse(await readFile(file, 'utf8'));
  if (payloadText) return JSON.parse(payloadText);
  return {};
}

async function publishToVala(receipt, stepOverride) {
  const url = (process.env.VALA_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_URL).replace(/\/$/, '');
  const key = process.env.VALA_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('Missing VALA_SUPABASE_SECRET_KEY or SUPABASE_SECRET_KEY for --publish.');

  const step = Number.isFinite(stepOverride)
    ? stepOverride
    : Number(receipt.inputs?.frame_index ?? Date.now());
  const frame = {
    step,
    raw_coordinates: {
      schema: receipt.schema,
      math_spine: receipt.math_spine,
      archetype: receipt.archetype,
      observed_at: receipt.observed_at,
      inputs: receipt.inputs,
      metrics: receipt.metrics,
      premaqc_bearing: receipt.premaqc_bearing,
    },
    projected_coordinates: projectEarthGateReceipt(receipt),
    timestamp: Date.parse(receipt.observed_at) / 1000,
  };

  const response = await fetch(`${url}/rest/v1/matrix_stream`, {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(frame),
  });
  if (!response.ok) throw new Error(`Vala Work rejected telemetry frame (${response.status}): ${await response.text()}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length) throw new Error('Vala Work returned no frame receipt.');
  return rows[0];
}

async function main() {
  const args = parse(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const payload = await loadPayload(args);
  const receipt = await processEarthGateTelemetry(args.archetype, payload);
  console.log(JSON.stringify(receipt, null, 2));

  if (args.publish) {
    const row = await publishToVala(receipt, args.step);
    console.error(`Vala frame seated: id=${row.id} step=${row.step} created_at=${row.created_at}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
