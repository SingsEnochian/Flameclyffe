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

const packetSchemaPath = path.join(stagedStarwell, 'schemas', 'dual-aspect-packet-v1.schema.json');
const receiptSchemaPath = path.join(stagedStarwell, 'schemas', 'dual-aspect-receipt-v1.schema.json');
const manifestPath = path.join(stagedStarwell, 'modules', 'bifrost-arcsweep.module.json');
const sourceHookPath = path.join(repoRoot, 'apps', 'starwell', 'src', 'arcsweep-continuity', 'kernel-hook.js');
const sourceKernelPath = path.join(repoRoot, 'apps', 'starwell', 'src', 'hearthweave-kernel', 'dual-aspect.js');
const sourceSensoryPath = path.join(repoRoot, 'apps', 'starwell', 'src', 'hearthweave-kernel', 'sensory-bus.js');
const sourceHousePath = path.join(repoRoot, 'apps', 'starwell', 'src', 'hearthgate', 'profiles', 'ta-veren-vaen.js');
const sourceGatePath = path.join(repoRoot, 'apps', 'starwell', 'arcsweep-continuity', 'index.html');

for (const [filePath, label] of [
  [sourceKernelPath, 'DualAspectPacket kernel source'],
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
  if (manifest.version !== '0.2.0') errors.push('Bifröst manifest must be version 0.2.0.');
  if (manifest.engine?.packetAuthority !== 'hearthweave-kernel') {
    errors.push('Bifröst manifest must assign packet authority to the Hearthweave Kernel.');
  }
  if (manifest.authorityContract?.renderers !== 'derive-only-no-refetch-after-activation') {
    errors.push('Bifröst manifest must prohibit renderer refetch after activation.');
  }
  for (const capability of [
    'dual-aspect-packet-freeze',
    'single-state-sensory-activation',
    'explicit-degraded-mode',
    'deterministic-replay',
    'joined-render-receipts',
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
console.log(' packet: Hearthweave DualAspectPacket v1');
console.log(' receipts: joined activation/render/replay ledger');
console.log(' activation: Arcsweep kernel freeze + packet-bound sensory bus');
console.log(" house: Ta'veren Vaen registered as a sovereign overlay");
