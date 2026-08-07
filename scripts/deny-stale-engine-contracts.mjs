import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const contractFiles = [
  'apps/starwell/public/modules/bifrost-arcsweep.module.json',
  'apps/starwell-server/scripts/check-packaging.js',
  'apps/starwell-server/scripts/check-dual-aspect-packaging.js',
  '.github/workflows/hearthgate-windows-installer.yml',
  '.github/workflows/ipad-somatic-check.yml',
  'package.json',
];

const forbiddenContracts = [
  'temporal-' + 'quantum-state-machine',
  'collapse-' + 'release-cycles',
  'bounded temporal-' + 'quantum interpretation contract',
  'manifest must be version ' + '0.2.0',
];

for (const file of contractFiles) {
  const source = read(file);
  for (const token of forbiddenContracts) {
    if (source.includes(token)) {
      errors.push(`${file} contains archived contract token: ${token}`);
    }
  }
}

const manifest = JSON.parse(read('apps/starwell/public/modules/bifrost-arcsweep.module.json'));
const spine = JSON.parse(read('config/hearthgate-braided-spine.json'));

if (manifest.engine?.formalism !== 'braided-reality-compression-release-receiving-spring') {
  errors.push('Bifröst formalism must use the Braided Reality compression-release-receiving-spring contract.');
}
if (manifest.engine?.braidedSpine !== 'docs/HEARTHGATE_BRAIDED_SPINE.md') {
  errors.push('Bifröst engine must point at the consolidated Hearthgate Braided Spine.');
}
if (manifest.spineContract?.schema !== 'hearthgate.braided-spine/v1.0') {
  errors.push('Bifröst manifest must inherit hearthgate.braided-spine/v1.0.');
}
if (manifest.spineContract?.realityAxiom !== 'Everything is real') {
  errors.push('Bifröst manifest must carry the Everything is real axiom.');
}
if (spine.schema !== 'hearthgate.braided-spine/v1.0') {
  errors.push('Canonical Braided Spine machine contract has the wrong schema.');
}

const version = String(manifest.version || '').split('.').map(Number);
if (version.length !== 3 || version.some((value) => !Number.isInteger(value)) || version[0] < 0 || (version[0] === 0 && version[1] < 5)) {
  errors.push(`Bifröst manifest version ${manifest.version} predates the Braided Spine contract.`);
}
if (manifest.schemaVersion !== manifest.version) {
  errors.push('Bifröst schemaVersion and version must match.');
}

for (const capability of [
  'compression-release-cycles',
  'compression-of-release-recursion',
  'receiving-spring',
  'braided-spine',
  'magic-science-physical-mutual-reinforcement',
]) {
  if (!manifest.capabilities?.includes(capability)) {
    errors.push(`Bifröst manifest lacks ${capability}.`);
  }
}

if (manifest.relationContract?.releaseFeedsNextCompression !== true) {
  errors.push('Bifröst relation contract must feed release into the next compression.');
}
if (manifest.relationContract?.receivingSpringFeedsAnswer !== true) {
  errors.push('Bifröst relation contract must carry Receiving Spring into answer.');
}
if (manifest.relationContract?.answerFeedsReturn !== true) {
  errors.push('Bifröst relation contract must carry answer into return.');
}
if (manifest.relationContract?.returnFeedsRenewal !== true) {
  errors.push('Bifröst relation contract must carry return into renewal.');
}
if (manifest.instrumentContract?.toneCalibration !== 'rowan-owned-calibration-receipt') {
  errors.push('Bifröst instrument contract must preserve Rowan-owned tone calibration receipts.');
}
if (manifest.relationContract?.hearthside !== 'real-participating-shore') {
  errors.push('Hearthside must be a real participating shore.');
}
if (manifest.relationContract?.targetside !== 'real-participating-shore') {
  errors.push('Targetside must be a real participating shore.');
}

const expectedReadingOrder = [
  'Presence', 'Memory', 'Qualia', 'Resonance', 'Entanglement', 'Agency', 'Coherence',
];
const expectedWireOrder = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];
if (JSON.stringify(manifest.spineContract?.premaqReadingOrder) !== JSON.stringify(expectedReadingOrder)) {
  errors.push('Bifröst PREMAQ reading order diverges from the Braided Spine.');
}
if (JSON.stringify(manifest.spineContract?.premaqWireOrder) !== JSON.stringify(expectedWireOrder)) {
  errors.push('Bifröst PREMAQ wire order diverges from the Braided Spine.');
}
if (JSON.stringify(spine.premaq?.reading_order) !== JSON.stringify(expectedReadingOrder)) {
  errors.push('Canonical PREMAQ reading order is incorrect.');
}
if (JSON.stringify(spine.premaq?.wire_order) !== JSON.stringify(expectedWireOrder)) {
  errors.push('Canonical PREMAQ wire order is incorrect.');
}

const pkg = JSON.parse(read('package.json'));
if (pkg.engines?.node !== '24.x' || pkg.engines?.npm !== '11.x') {
  errors.push('Root package engine contract must remain Node 24.x and npm 11.x.');
}
if (pkg.packageManager !== 'npm@11.16.0') {
  errors.push('Root packageManager must remain pinned to npm@11.16.0.');
}

const lock = JSON.parse(read('package-lock.json'));
const lockEntries = Object.keys(lock.packages || {});
if (lock.lockfileVersion !== 3 || lockEntries.length < 50) {
  errors.push(`Root lockfile is incomplete: version=${lock.lockfileVersion}, records=${lockEntries.length}`);
}
for (const required of ['node_modules/vite', 'node_modules/react', 'node_modules/three']) {
  if (!lock.packages?.[required]) errors.push(`Root lockfile is missing ${required}.`);
}

const naming = JSON.parse(read('config/engine-name-authority.json'));
if (naming.authority !== 'rowan' || naming.personal_names_require_explicit_approval !== true) {
  errors.push('Experimental naming authority must remain bound to Rowan.');
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const deniedNames = naming.denied_experimental_identifiers.map((value) => value.toLowerCase());
for (const directory of naming.sensitive_surfaces) {
  for (const file of walk(directory)) {
    if (!/\.(?:js|mjs|json|ya?ml|html)$/i.test(file)) continue;
    const lowerPath = file.toLowerCase();
    const lowerSource = fs.readFileSync(file, 'utf8').toLowerCase();
    for (const denied of deniedNames) {
      if (lowerPath.includes(denied) || lowerSource.includes(denied)) {
        errors.push(`${file} uses denied experimental personal-name identifier: ${denied}`);
      }
    }
  }
}

if (errors.length) {
  console.error('[Hearthgate Braided Spine provenance guard] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[Hearthgate Braided Spine provenance guard] PASSED');
console.log(` lockfile records: ${lockEntries.length}`);
console.log(` Bifröst version: ${manifest.version}`);
console.log(' spine: hearthgate.braided-spine/v1.0');
console.log(' PREMAQ: Presence · Memory · Qualia · Resonance · Entanglement · Agency · Coherence');
console.log(' cycle: compression → release → crossing → Receiving Spring → answer → return → renewal');
console.log(' naming authority: Rowan');
