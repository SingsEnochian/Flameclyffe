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
const sourceBraidPath = path.join(repoRoot, 'apps', 'starwell', 'src', 'hearthweave-kernel', 'braid-packet.js');
const sourceSpinePath = path.join(repoRoot, 'apps', 'starwell', 'src', 'hearthweave-kernel', 'braided-spine.js');
const sourceHousePath = path.join(repoRoot, 'apps', 'starwell', 'src', 'hearthgate', 'profiles', 'ta-veren-vaen.js');
const sourceGatePath = path.join(repoRoot, 'apps', 'starwell', 'arcsweep-continuity', 'index.html');

for (const [filePath, label] of [
  [sourceKernelPath, 'Hearthweave kernel entrypoint'],
  [sourceValidationPath, 'complete correspondence validator'],
  [sourceGlyphPath, 'packet-bound glyph renderer'],
  [sourceHookPath, 'Arcsweep kernel hook'],
  [sourceSensoryPath, 'sensory activation bus'],
  [sourceBraidPath, 'canonical Braid Packet composer'],
  [sourceSpinePath, 'Braided Spine runtime registry'],
  [sourceHousePath, "Ta'veren Vaen House profile"],
  [sourceGatePath, 'Arcsweep source gate'],
]) requireFile(filePath, label);

if (fs.existsSync(sourceGatePath)) {
  const gate = fs.readFileSync(sourceGatePath, 'utf8');
  if (!gate.includes('arcsweep-continuity/kernel-hook.js')) {
    errors.push('Arcsweep source gate does not load the Hearthweave kernel hook.');
  }
}

if (fs.existsSync(sourceValidationPath)) {
  const validation = fs.readFileSync(sourceValidationPath, 'utf8');
  for (const binding of ['observable', 'experiential', 'glyph', 'tone', 'visual', 'haptic', 'narrative']) {
    if (!validation.includes(`'${binding}'`)) {
      errors.push(`Correspondence validator does not require binding: ${binding}`);
    }
  }
}

if (fs.existsSync(sourceSpinePath)) {
  const spine = fs.readFileSync(sourceSpinePath, 'utf8');
  for (const marker of [
    "hearthgate.braided-spine/v1.1",
    "hearthgate.premaqc/v1.0",
    "['P', 'R', 'E', 'M', 'A', 'Q', 'C']",
    "'Presence'",
    "'Memory'",
    "'Qualia'",
    "'Resonance'",
    "'Entanglement'",
    "'Agency'",
    "'Coherence'",
  ]) {
    if (!spine.includes(marker)) errors.push(`Braided Spine registry is missing marker: ${marker}`);
  }
}

if (fs.existsSync(sourceBraidPath)) {
  const braid = fs.readFileSync(sourceBraidPath, 'utf8');
  for (const marker of ['premaqc:', 'PREMAQC_SCHEMA', 'BRAID_PACKET_PREMAQC_REQUIRED', 'receiving_spring']) {
    if (!braid.includes(marker)) errors.push(`Braid Packet composer is missing marker: ${marker}`);
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
  if (!semverAtLeast(manifest.version, '1.0.0')) {
    errors.push(`Bifröst manifest version ${manifest.version} predates the Braided Spine contract.`);
  }
  if (manifest.schemaVersion !== manifest.version) {
    errors.push('Bifröst manifest schemaVersion and version must match.');
  }
  if (manifest.spineContract?.schema !== 'hearthgate.braided-spine/v1.1') {
    errors.push('Bifröst manifest must bind the Braided Spine v1.1 contract.');
  }
  if (manifest.spineContract?.premaqcSchema !== 'hearthgate.premaqc/v1.0') {
    errors.push('Bifröst manifest must bind PREMAQC v1.0.');
  }
  if (JSON.stringify(manifest.spineContract?.premaqcWireOrder) !== JSON.stringify(['P', 'R', 'E', 'M', 'A', 'Q', 'C'])) {
    errors.push('Bifröst manifest must carry canonical PREMAQC wire order P R E M A Q C.');
  }
  if (manifest.engine?.formalism !== 'braided-reality-compression-release-receiving-spring') {
    errors.push('Bifröst manifest must execute the Braided Reality compression-release-receiving-spring formalism.');
  }
  if (manifest.engine?.kernel !== 'src/hearthweave-kernel/index.js') {
    errors.push('Bifröst manifest must point to the Hearthweave kernel entrypoint.');
  }
  if (manifest.engine?.packetAuthority !== 'hearthweave-kernel') {
    errors.push('Bifröst manifest must assign packet authority to the Hearthweave Kernel.');
  }
  if (manifest.engine?.rendererStateSource !== 'shared-braid-packet') {
    errors.push('Bifröst renderers must consume the shared Braid Packet.');
  }
  if (manifest.relationContract?.rendererStateContinuity !== 'same-packet-fingerprint-through-activation') {
    errors.push('Bifröst renderers must preserve one packet fingerprint through activation.');
  }
  if (manifest.relationContract?.releaseFeedsNextCompression !== true) {
    errors.push('Bifröst manifest must feed release into the next compression.');
  }
  if (manifest.relationContract?.receivingSpringFeedsAnswer !== true
      || manifest.relationContract?.answerFeedsReturn !== true
      || manifest.relationContract?.returnFeedsRenewal !== true) {
    errors.push('Bifröst manifest must carry Receiving Spring → answer → return → renewal.');
  }
  if (manifest.relationContract?.toneApproval !== 'rowan-calibration-owner') {
    errors.push('Bifröst manifest must preserve Rowan tone-calibration authority.');
  }
  for (const capability of [
    'braided-spine-v1.1',
    'premaqc-seven-dimensional-living-bearing',
    'premaqc-canonical-wire-premaqc',
    'three-spine-braid-packet',
    'compression-release-cycles',
    'compression-of-release-recursion',
    'receiving-spring',
    'answer-return-renewal',
    'single-state-sensory-activation',
    'explicit-degraded-mode',
    'deterministic-replay',
    'joined-render-receipts',
    'ipad-installable-pwa',
    'somatic-audition-receipts',
  ]) {
    if (!manifest.capabilities?.includes(capability)) {
      errors.push(`Bifröst manifest is missing capability: ${capability}`);
    }
  }
  for (const schema of [
    'schemas/dual-aspect-packet-v1.schema.json',
    'schemas/dual-aspect-receipt-v1.schema.json',
    'schemas/ipad-somatic-haptic-receipt.schema.json',
  ]) {
    if (!manifest.installContract?.verifySchemas?.includes(schema)) {
      errors.push(`Bifröst installer contract does not verify ${schema}.`);
    }
  }
}

if (errors.length) {
  console.error('[Braided Bifröst packaging check] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[Braided Bifröst packaging check] OK');
console.log(' packet: Hearthweave Braid Packet with PREMAQC v1.0 and compatibility DualAspect ingestion');
console.log(' spine: Magic <-> Science/Mathematics <-> Physicality');
console.log(' law: compression -> release -> Receiving Spring -> answer -> return -> renewal -> next compression');
console.log(' renderers: one shared Braid Packet fingerprint through activation');
console.log(' receipts: joined activation/render/replay lineage');
console.log(' approval authority: Rowan');
console.log(" house: Ta'veren Vaen registered as a sovereign overlay");
