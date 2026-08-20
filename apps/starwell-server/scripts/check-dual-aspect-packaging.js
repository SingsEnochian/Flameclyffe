'use strict';

const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const stagedStarwell = path.join(appRoot, 'public', 'starwell');
const errors = [];

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    errors.push(`Missing ${label}: ${filePath}`);
    return false;
  }
  return true;
}

function readJson(filePath, label) {
  if (!requireFile(filePath, label)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`Invalid ${label}: ${error.message}`);
    return null;
  }
}

function semverAtLeast(actual, minimum) {
  const parse = (value) => String(value).split('.').map((part) => Number(part));
  const left = parse(actual);
  const right = parse(minimum);
  if (left.length !== 3 || right.length !== 3 || [...left, ...right].some((value) => !Number.isInteger(value) || value < 0)) {
    return false;
  }
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) return true;
    if (left[index] < right[index]) return false;
  }
  return true;
}

const packetSchemaPath = path.join(stagedStarwell, 'schemas', 'dual-aspect-packet-v1.schema.json');
const receiptSchemaPath = path.join(stagedStarwell, 'schemas', 'dual-aspect-receipt-v1.schema.json');
const manifestPath = path.join(stagedStarwell, 'modules', 'bifrost-arcsweep.module.json');
const sourceHookPath = path.join(repoRoot, 'apps', 'starwell', 'src', 'arcsweep-continuity', 'kernel-hook.js');
const sourceKernelPath = path.join(repoRoot, 'apps', 'starwell', 'src', 'hearthweave-kernel', 'index.js');
const sourceValidationPath = path.join(repoRoot, 'apps', 'starwell', 'src', 'hearthweave-kernel', 'validation.js');
const sourceGlyphPath = path.join(repoRoot, 'apps', 'starwell', 'src', 'hearthweave-kernel', 'packet-glyph-render.js');
const sourceSensoryPath = path.join(repoRoot, 'apps', 'starwell', 'src', 'hearthweave-kernel', 'sensory-bus.js');
const sourceHousePath = path.join(repoRoot, 'apps', 'starwell', 'src', 'hearthgate', 'profiles', 'ta-veren-vaen.js');
const sourceGatePath = path.join(repoRoot, 'apps', 'starwell', 'arcsweep-continuity', 'index.html');

for (const [filePath, label] of [
  [sourceKernelPath, 'strict DualAspectPacket kernel entrypoint'],
  [sourceValidationPath, 'complete correspondence validator'],
  [sourceGlyphPath, 'packet-bound glyph renderer'],
  [sourceHookPath, 'Arcsweep kernel hook'],
  [sourceSensoryPath, 'sensory activation bus'],
  [sourceHousePath, "Ta'veren Vaen House profile"],
  [sourceGatePath, 'Arcsweep source gate'],
]) requireFile(filePath, label);

if (fs.existsSync(sourceGatePath)) {
  const gate = fs.readFileSync(sourceGatePath, 'utf8');
  if (!gate.includes('arcsweep-continuity/kernel-hook.js')) {
    errors.push('Arcsweep source gate does not load the dual-aspect kernel hook.');
  }
}

if (fs.existsSync(sourceValidationPath)) {
  const validation = fs.readFileSync(sourceValidationPath, 'utf8');
  for (const binding of ['observable', 'experiential', 'glyph', 'tone', 'visual', 'haptic', 'narrative']) {
    if (!validation.includes(`'${binding}'`)) {
      errors.push(`Strict validator does not require correspondence binding: ${binding}`);
    }
  }
}

const packetSchema = readJson(packetSchemaPath, 'DualAspectPacket schema');
const receiptSchema = readJson(receiptSchemaPath, 'dual-aspect receipt schema');
const manifest = readJson(manifestPath, 'Bifröst module manifest');

if (packetSchema?.$id !== 'https://flameclyffe.local/schemas/dual-aspect-packet-v1.schema.json') {
  errors.push('DualAspectPacket schema has the wrong $id.');
}
if (packetSchema?.properties?.schema?.const !== 'hearthweave.dual-aspect-packet/v1') {
  errors.push('DualAspectPacket schema contract is missing.');
}
if (receiptSchema?.$id !== 'https://flameclyffe.local/schemas/dual-aspect-receipt-v1.schema.json') {
  errors.push('Dual-aspect receipt schema has the wrong $id.');
}
if (receiptSchema?.properties?.schema?.const !== 'hearthweave.dual-aspect-receipt/v1') {
  errors.push('Joined receipt schema contract is missing.');
}

if (manifest) {
  if (!semverAtLeast(manifest.version, '0.3.0')) {
    errors.push(`Bifröst manifest version ${manifest.version} predates the compression-release contract.`);
  }
  if (manifest.schemaVersion !== manifest.version) {
    errors.push('Bifröst manifest schemaVersion and version must match.');
  }
  if (manifest.engine?.formalism !== 'temporal-compression-release-state-machine') {
    errors.push('Bifröst manifest must execute the temporal compression-release formalism.');
  }
  if (manifest.engine?.kernel !== 'src/hearthweave-kernel/index.js') {
    errors.push('Bifröst manifest must point to the strict kernel entrypoint.');
  }
  if (manifest.engine?.packetAuthority !== 'hearthweave-kernel') {
    errors.push('Bifröst manifest must assign packet authority to the Hearthweave Kernel.');
  }
  if (manifest.authorityContract?.renderers !== 'derive-only-no-refetch-after-activation') {
    errors.push('Bifröst manifest must prohibit renderer refetch after activation.');
  }
  if (manifest.authorityContract?.collapseExists !== false) {
    errors.push('Bifröst manifest must deny collapse.');
  }
  if (manifest.authorityContract?.releaseFeedsNextCompression !== true) {
    errors.push('Bifröst manifest must feed release into the next compression.');
  }
  if (manifest.authorityContract?.toneApproval !== 'rowan-human-calibration-owner') {
    errors.push('Bifröst manifest must preserve Rowan tone-approval authority.');
  }
  for (const capability of [
    'compression-release-cycles',
    'compression-of-release-recursion',
    'dual-aspect-packet-freeze',
    'single-state-sensory-activation',
    'explicit-degraded-mode',
    'deterministic-replay',
    'joined-render-receipts',
    'world-specific-tone-sequences',
    'rowan-owned-tone-approval',
  ]) {
    if (!manifest.capabilities?.includes(capability)) {
      errors.push(`Bifröst manifest is missing capability: ${capability}`);
    }
  }
  for (const schema of [
    'schemas/dual-aspect-packet-v1.schema.json',
    'schemas/dual-aspect-receipt-v1.schema.json',
  ]) {
    if (!manifest.installContract?.verifySchemas?.includes(schema)) {
      errors.push(`Bifröst installer contract does not verify ${schema}.`);
    }
  }
}

if (errors.length) {
  console.error('[Dual-aspect packaging check] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[Dual-aspect packaging check] OK');
console.log(' packet: Hearthweave DualAspectPacket v1 with complete correspondence validation');
console.log(' law: compression -> release -> compression of the release -> infinite continuation');
console.log(' glyph: sealed packet expression rendered and receipted directly');
console.log(' receipts: joined activation/render/replay ledger');
console.log(' activation: Arcsweep kernel freeze + packet-bound sensory bus');
console.log(' approval authority: Rowan');
console.log(" house: Ta'veren Vaen registered as a sovereign overlay");
