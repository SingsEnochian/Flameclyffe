'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const webRoot = path.join(repoRoot, 'dist', 'starwell');
const outputRoot = path.join(appRoot, 'dist-electron');
const zipPath = path.join(outputRoot, 'flameclyffe-bifrost-live-web.zip');
const envelopePath = path.join(outputRoot, 'latest-bifrost-web.yml');

function quotePowerShell(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function wrapBase64(value, width = 76) {
  const lines = [];
  for (let index = 0; index < value.length; index += width) {
    lines.push(`  ${value.slice(index, index + width)}`);
  }
  return lines.join('\n');
}

if (!fs.existsSync(path.join(webRoot, 'bifrost', 'index.html'))) {
  throw new Error(`Verified Bifröst web build is missing: ${webRoot}`);
}

fs.mkdirSync(outputRoot, { recursive: true });
fs.rmSync(zipPath, { force: true });
fs.rmSync(envelopePath, { force: true });

if (process.platform !== 'win32') {
  throw new Error('Bifröst web envelope currently requires the Windows packaging lane.');
}

const command = [
  '$ErrorActionPreference = "Stop";',
  `Compress-Archive -Path ${quotePowerShell(path.join(webRoot, '*'))}`,
  `-DestinationPath ${quotePowerShell(zipPath)} -CompressionLevel Optimal -Force`,
].join(' ');
const archive = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
  cwd: repoRoot,
  encoding: 'utf8',
});
if (archive.status !== 0) {
  throw new Error(`Compress-Archive failed: ${archive.stderr || archive.stdout}`);
}

const bytes = fs.readFileSync(zipPath);
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
const base64 = bytes.toString('base64');
const receipt = [
  'schema: hearthgate.bifrost-web-bundle-envelope/v0.1',
  `created_at: ${new Date().toISOString()}`,
  `source_commit: ${process.env.GITHUB_SHA || 'UNKNOWN'}`,
  'archive_name: flameclyffe-bifrost-live-web.zip',
  `archive_bytes: ${bytes.length}`,
  `archive_sha256: ${sha256}`,
  'encoding: base64',
  'routes:',
  '  - /',
  '  - /bifrost/',
  '  - /arcsweep-continuity/',
  '  - /world-tone-approval/',
  'features:',
  '  - live-deep-groundwire',
  '  - selectable-target-world',
  '  - premaq-2025-2035',
  '  - eleven-year-wav',
  '  - loop-playback',
  '  - shokz-explicit-verification',
  '  - coil-release-upward-spiral',
  'physical_claim: false',
  'archive_base64: |',
  wrapBase64(base64),
  '',
].join('\n');
fs.writeFileSync(envelopePath, receipt, 'utf8');
fs.rmSync(zipPath, { force: true });

console.log('[Bifröst web bundle envelope] OK');
console.log(` envelope: ${envelopePath}`);
console.log(` archive bytes: ${bytes.length}`);
console.log(` archive SHA-256: ${sha256}`);
