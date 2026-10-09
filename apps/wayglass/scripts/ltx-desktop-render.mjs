#!/usr/bin/env node
// Deliberately local-only LTX Desktop render companion. This is not a hosted route.
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { WayglassVideoAtelier, LtxDesktopLocalClient, validateVideoHandoff } from '../src/ltx-desktop-bridge.js';

const USAGE = [
  'Usage: node apps/wayglass/scripts/ltx-desktop-render.mjs <handoff.json> [--render] [--start <local-image>] [--end <local-image>]',
  'Default is dry-run; --render explicitly authorises a local generation.',
  'Set WAYGLASS_LTX_SESSION_TOKEN from LTX Desktop Logs UI (token changes each launch).',
  'Optional WAYGLASS_LTX_ENDPOINT defaults to http://127.0.0.1:41954.',
  'Remote hosts and LTX paid API fallback are never permitted.',
].join('\n');

async function verifiedLocalImage(input) {
  if (!input) return undefined;
  const fullPath = path.resolve(input);
  if (!/\.(png|jpe?g|webp)$/i.test(fullPath)) throw new Error('Reference frames must be PNG, JPG, or WebP.');
  const file = await stat(fullPath);
  if (!file.isFile()) throw new Error('Reference frame is not a file: ' + fullPath);
  return fullPath;
}

async function main(args = process.argv.slice(2)) {
  if (!args.length || args.includes('--help')) {
    console.log(USAGE);
    return;
  }
  const manifestPath = path.resolve(args[0]);
  let render = false;
  let start;
  let end;
  for (let i = 1; i < args.length; i += 1) {
    if (args[i] === '--render') render = true;
    else if (args[i] === '--start' && args[i + 1]) start = args[++i];
    else if (args[i] === '--end' && args[i + 1]) end = args[++i];
    else throw new Error('Unrecognised argument: ' + args[i]);
  }
  const handoff = validateVideoHandoff(JSON.parse(await readFile(manifestPath, 'utf8')));
  console.log('Wayglass LTX handoff:', handoff.title, '|', handoff.state);
  if (!render) {
    console.log('Dry run only. Add --render after checking prompt, hardware, and model licence.');
    return;
  }
  const token = process.env.WAYGLASS_LTX_SESSION_TOKEN;
  if (!token) throw new Error('Set WAYGLASS_LTX_SESSION_TOKEN in this terminal; do not place it in the scene JSON.');
  const client = new LtxDesktopLocalClient({
    endpoint: process.env.WAYGLASS_LTX_ENDPOINT,
    token,
  });
  const result = await client.render(handoff, {
    startImagePath: await verifiedLocalImage(start),
    endImagePath: await verifiedLocalImage(end),
  });
  // The engine can report complete even when the produced path is not
  // accessible to this user/process. Verify before recording a file receipt.
  const video = await stat(result.video_path);
  if (!video.isFile() || video.size === 0) throw new Error('LTX reported complete but the output file is missing or empty.');
  const receipt = { ...result, status: 'verified-local-output', filesystem_verified: true, output_bytes: video.size };
  const receiptPath = manifestPath.replace(/\.json$/i, '') + '.receipt.json';
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  console.log('Verified local output:', result.video_path);
  console.log('Non-canonical receipt:', receiptPath);
}

main().catch(error => {
  console.error('Wayglass LTX:', error.message);
  process.exitCode = 1;
});
