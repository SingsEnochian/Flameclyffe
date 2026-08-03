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
      errors.push(`${file} contains denied stale contract token: ${token}`);
    }
  }
}

const manifest = JSON.parse(read('apps/starwell/public/modules/bifrost-arcsweep.module.json'));
if (manifest.engine?.formalism !== 'temporal-compression-release-state-machine') {
  errors.push('Bifröst formalism is not temporal-compression-release-state-machine.');
}
const version = String(manifest.version || '').split('.').map(Number);
if (version.length !== 3 || version.some((value) => !Number.isInteger(value)) || version[0] < 0 || (version[0] === 0 && version[1] < 4)) {
  errors.push(`Bifröst manifest version ${manifest.version} predates the compression-release and somatic contracts.`);
}
if (manifest.schemaVersion !== manifest.version) {
  errors.push('Bifröst schemaVersion and version do not match.');
}
for (const capability of ['compression-release-cycles', 'compression-of-release-recursion']) {
  if (!manifest.capabilities?.includes(capability)) {
    errors.push(`Bifröst manifest lacks ${capability}.`);
  }
}
if (manifest.authorityContract?.collapseExists !== false) {
  errors.push('Bifröst authority contract does not deny collapse.');
}
if (manifest.authorityContract?.releaseFeedsNextCompression !== true) {
  errors.push('Bifröst authority contract does not feed release into the next compression.');
}
if (manifest.authorityContract?.toneApproval !== 'rowan-human-calibration-owner') {
  errors.push('Bifröst authority contract does not preserve Rowan tone approval.');
}

const pkg = JSON.parse(read('package.json'));
if (pkg.engines?.node !== '24.x' || pkg.engines?.npm !== '11.x') {
  errors.push('Root package engine contract is not Node 24.x and npm 11.x.');
}
if (pkg.packageManager !== 'npm@11.16.0') {
  errors.push('Root packageManager is not pinned to npm@11.16.0.');
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
  errors.push('Experimental naming authority is not bound to Rowan.');
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
  console.error('[Hearthgate contract provenance guard] FAILED');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[Hearthgate contract provenance guard] PASSED');
console.log(` lockfile records: ${lockEntries.length}`);
console.log(` Bifröst version: ${manifest.version}`);
console.log(' formalism: temporal-compression-release-state-machine');
console.log(' naming authority: Rowan');
console.log(' approved experimental identifier: Intermezzo');
