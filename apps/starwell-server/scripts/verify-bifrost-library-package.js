'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packedRoot = path.join(root, 'dist-electron', 'win-unpacked', 'resources', 'app.asar.unpacked', 'public', 'starwell');
const stagedRoot = path.join(root, 'public', 'starwell');
const starwellRoot = fs.existsSync(packedRoot) ? packedRoot : stagedRoot;
const mode = fs.existsSync(packedRoot) ? 'packed' : 'staged';
const errors = [];

const manifestPath = path.join(starwellRoot, 'modules', 'bifrost-arcsweep.module.json');
const schemaPath = path.join(starwellRoot, 'schemas', 'canon-library-manifest-v1.schema.json');
const assetsPath = path.join(starwellRoot, 'assets');

for (const required of [manifestPath, schemaPath, assetsPath]) {
  if (!fs.existsSync(required)) errors.push(`Missing ${mode} Bifröst Library component: ${required}`);
}

let manifest = null;
if (fs.existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    errors.push(`Bifröst module manifest is invalid JSON: ${error.message}`);
  }
}

if (manifest) {
  if (manifest.version !== '0.2.0') errors.push('Bifröst module version must be 0.2.0.');
  if (manifest.schemas?.canonLibraryManifest !== 'schemas/canon-library-manifest-v1.schema.json') {
    errors.push('Bifröst manifest does not advertise the canon library manifest schema.');
  }
  for (const capability of [
    'canon-library-manifest-v1',
    'desktop-authoritative-library',
    'loopback-library-bridge',
    'paired-web-desktop-access',
    'approval-gated-library-writes',
    'canon-library-import-receipts',
    'canon-library-rollback',
  ]) {
    if (!manifest.capabilities?.includes(capability)) {
      errors.push(`Bifröst manifest is missing capability: ${capability}`);
    }
  }
  if (manifest.libraryContract?.authority !== 'desktop-authoritative') {
    errors.push('Bifröst Library authority must be desktop-authoritative.');
  }
  if (manifest.libraryContract?.transport !== 'loopback-only') {
    errors.push('Bifröst Library transport must be loopback-only.');
  }
  if (manifest.libraryContract?.durableWritesRequireApproval !== true) {
    errors.push('Bifröst Library durable writes must require approval.');
  }
  if (!manifest.installContract?.verifySchemas?.includes('schemas/canon-library-manifest-v1.schema.json')) {
    errors.push('Bifröst installer contract does not verify the canon library schema.');
  }
}

if (fs.existsSync(schemaPath)) {
  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    if (schema.$id !== 'https://flameclyffe.local/schemas/canon-library-manifest-v1.schema.json') {
      errors.push('Packaged canon library schema has the wrong identifier.');
    }
    if (schema.properties?.canon_law?.properties?.overwrite_source_canon?.const !== false) {
      errors.push('Packaged canon library schema does not forbid source-canon overwrite.');
    }
    if (schema.properties?.canon_law?.properties?.foundation_overlay_separate?.const !== true) {
      errors.push('Packaged canon library schema does not require foundation/overlay separation.');
    }
  } catch (error) {
    errors.push(`Canon library manifest schema is invalid JSON: ${error.message}`);
  }
}

if (fs.existsSync(assetsPath)) {
  const javascript = fs.readdirSync(assetsPath)
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(assetsPath, name), 'utf8'))
    .join('\n');
  for (const fragment of [
    'ARCSWEEP_BIFROST',
    'hearthgate.canon-library-manifest/v1',
    'HEARTHGATE_LIBRARY_APPROVAL_REQUIRED',
    '/api/v1/bifrost/library',
  ]) {
    if (!javascript.includes(fragment)) {
      errors.push(`Compiled STARWELL assets are missing Bifröst Library contract fragment: ${fragment}`);
    }
  }
}

if (errors.length) {
  console.error(`[Bifröst Library package verification] FAILED (${mode})`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`[Bifröst Library package verification] VERIFIED (${mode})`);
console.log(' schema: hearthgate.canon-library-manifest/v1');
console.log(' authority: desktop-authoritative');
console.log(' transport: loopback-only');
console.log(' durable writes: approval-gated');
console.log(' canon law: foundation and overlay separate; source overwrite forbidden');
