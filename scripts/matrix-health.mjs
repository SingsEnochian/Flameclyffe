import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const required = [
  'dist/starwell/index.html',
  'dist/starwell/observatory-matrix.html',
  'dist/starwell/temporal-twist-renderer.html',
  'dist/starwell/starwell/mobius-audio-bus.html',
  'dist/starwell/observer-deep.html',
  'dist/starwell/assets/js/observatory_live_contract.js',
];

const checks = [];
for (const relativePath of required) {
  const absolutePath = resolve(root, relativePath);
  try {
    await access(absolutePath, constants.R_OK);
    checks.push({ id: relativePath, status: 'VERIFIED' });
  } catch {
    checks.push({ id: relativePath, status: 'FAILED' });
  }
}

try {
  const html = await readFile(resolve(root, 'dist/starwell/observatory-matrix.html'), 'utf8');
  for (const marker of ['Observer / DEEP', 'PREMAQ', 'Temporal Mechanics', 'Arcsweep', 'Tone / Audio', 'Notion Knowledge', 'Receipts / Replay']) {
    checks.push({ id: `shell:${marker}`, status: html.includes(marker) ? 'VERIFIED' : 'FAILED' });
  }
} catch {
  checks.push({ id: 'shell:read', status: 'FAILED' });
}

const failed = checks.filter((check) => check.status === 'FAILED');
const receipt = {
  schema: 'observatory.matrix.health.v1',
  observed_at: new Date().toISOString(),
  node: process.version,
  classification: 'verification',
  status: failed.length ? 'FAILED' : 'VERIFIED',
  checks,
};

console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exitCode = 1;
