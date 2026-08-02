'use strict';

const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const unpackedRoot = path.join(appRoot, 'dist-electron', 'win-unpacked', 'resources', 'app.asar.unpacked');
const starwellRoot = path.join(unpackedRoot, 'public', 'starwell');
const errors = [];

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    errors.push(`Missing packed ${label}: ${filePath}`);
    return false;
  }
  return true;
}

function readJson(filePath, label) {
  if (!requireFile(filePath, label)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`Invalid packed ${label}: ${error.message}`);
    return null;
  }
}

const packetSchema = readJson(
  path.join(starwellRoot, 'schemas', 'dual-aspect-packet-v1.schema.json'),
  'DualAspectPacket schema',
);
const receiptSchema = readJson(
  path.join(starwellRoot, 'schemas', 'dual-aspect-receipt-v1.schema.json'),
  'dual-aspect receipt schema',
);
const manifest = readJson(
  path.join(starwellRoot, 'modules', 'bifrost-arcsweep.module.json'),
  'Bifröst manifest',
);
requireFile(path.join(starwellRoot, 'arcsweep-continuity', 'index.html'), 'Arcsweep route');

if (packetSchema?.properties?.schema?.const !== 'hearthweave.dual-aspect-packet/v1') {
  errors.push('Packed DualAspectPacket schema contract is wrong.');
}
if (receiptSchema?.properties?.schema?.const !== 'hearthweave.dual-aspect-receipt/v1') {
  errors.push('Packed receipt schema contract is wrong.');
}
if (manifest?.engine?.kernel !== 'src/hearthweave-kernel/index.js') {
  errors.push('Packed Bifröst manifest lost the strict kernel entrypoint.');
}
if (manifest?.engine?.packetAuthority !== 'hearthweave-kernel') {
  errors.push('Packed Bifröst manifest lost Hearthweave Kernel packet authority.');
}
if (manifest?.authorityContract?.renderers !== 'derive-only-no-refetch-after-activation') {
  errors.push('Packed Bifröst manifest lost the renderer no-refetch law.');
}

const assetsDir = path.join(starwellRoot, 'assets');
const jsFiles = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join(assetsDir, name))
  : [];
const compiledSource = jsFiles
  .map((filePath) => fs.readFileSync(filePath, 'utf8'))
  .join('\n');

for (const marker of [
  'hearthweave.dual-aspect-packet/v1',
  'hearthweave:dual-aspect-activation',
  'runa:dual-aspect-tone-activation',
  'hearthweave.packet-glyph-render/v1',
  'missing-correspondence-binding',
]) {
  if (!compiledSource.includes(marker)) {
    errors.push(`Packed STARWELL JavaScript is missing kernel marker: ${marker}`);
  }
}

if (errors.length) {
  console.error('[Packed dual-aspect verification] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[Packed dual-aspect verification] OK');
console.log(` assets scanned: ${jsFiles.length}`);
console.log(' strict packet validation, sealed glyph rendering, activation, Runa, schemas, and the no-refetch law are present');
