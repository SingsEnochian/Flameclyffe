import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { buildLanternbridgeInteroperabilityReceipt } from '../apps/arcsweep/src/lanternbridge-interoperability.js';

function usage() {
  return [
    'Lanternbridge v0.2 interoperability receipt',
    '',
    'Usage:',
    '  node scripts/lanternbridge-v02-interop.mjs --source <record.md> [--project-zero <inspection.json>]',
    '',
    'The command is read-only. It hashes the source and emits diagnostics only; it never embeds the Lanternbridge prose in the receipt.',
  ].join('\n');
}

function parseArgs(argv) {
  const result = { source: null, projectZero: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--source') {
      result.source = argv[++index] ?? null;
    } else if (arg === '--project-zero') {
      result.projectZero = argv[++index] ?? null;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return result;
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.source) throw new Error(`--source is required\n\n${usage()}`);

  const sourcePath = path.resolve(process.cwd(), args.source);
  const source = await readFile(sourcePath, 'utf8');

  let projectZeroInspection = null;
  if (args.projectZero) {
    const projectZeroPath = path.resolve(process.cwd(), args.projectZero);
    projectZeroInspection = JSON.parse(await readFile(projectZeroPath, 'utf8'));
  }

  const receipt = buildLanternbridgeInteroperabilityReceipt({
    source,
    sourceRef: path.basename(sourcePath),
    sourceSha256: sha256(source),
    projectZeroInspection,
  });

  console.log(JSON.stringify(receipt, null, 2));

  if (receipt.comparison.matched === false) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(`[Lanternbridge interop] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
