#!/usr/bin/env node
import process from 'node:process';

import {
  computeAqcVector,
  projectAqcVectorReceipt,
} from '../apps/arcsweep/src/earth-gate-aqc-vector.js';

const DEFAULT_URL = 'https://frqrxmshxftpylwdtsdm.supabase.co';

function usage() {
  console.log(`Usage:
  node scripts/earth-gate-aqc-vector.mjs '<json-payload>' [--publish] [--step N]

Example:
  node scripts/earth-gate-aqc-vector.mjs '{"ibi_stability":0.92,"audio_frequency_hz":432.1,"target_audio_frequency_hz":432,"haptic_cadence_bpm":65,"target_haptic_cadence_bpm":60,"previous_haptic_cadence_bpm":64,"sample_interval_s":2,"heart_rate_bpm":65,"attunement_ratio":1,"pre_rating":3,"post_rating":5}'
`);
}

function parse(argv) {
  if (!argv.length || argv.includes('--help') || argv.includes('-h')) return { help: true };
  let payloadText = null;
  let publish = false;
  let step = null;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--publish') publish = true;
    else if (token === '--step') step = Number(argv[++index]);
    else if (payloadText === null) payloadText = token;
    else throw new Error(`Unexpected argument: ${token}`);
  }
  return { payloadText, publish, step };
}

async function publishToVala(receipt, stepOverride) {
  const url = (process.env.VALA_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_URL).replace(/\/$/, '');
  const key = process.env.VALA_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('Missing VALA_SUPABASE_SECRET_KEY or SUPABASE_SECRET_KEY for --publish.');

  const step = Number.isFinite(stepOverride) ? stepOverride : Date.now();
  const frame = {
    step,
    raw_coordinates: receipt,
    projected_coordinates: projectAqcVectorReceipt(receipt),
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
  if (!response.ok) throw new Error(`Vala Work rejected alternate vector frame (${response.status}): ${await response.text()}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length) throw new Error('Vala Work returned no alternate vector receipt.');
  return rows[0];
}

async function main() {
  const args = parse(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  const payload = JSON.parse(args.payloadText);
  const receipt = computeAqcVector(payload);
  console.log(JSON.stringify(receipt, null, 2));
  if (args.publish) {
    const row = await publishToVala(receipt, args.step);
    console.error(`Alternate AQC frame seated: id=${row.id} step=${row.step} created_at=${row.created_at}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
