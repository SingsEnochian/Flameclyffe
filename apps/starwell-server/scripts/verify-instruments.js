'use strict';

const fs = require('fs');
const path = require('path');

const serverRoot  = path.resolve(__dirname, '..');
const repoRoot    = path.resolve(serverRoot, '..', '..');
const starwellApp = path.join(repoRoot, 'apps', 'starwell');
const assetsRoot  = path.join(repoRoot, 'assets');
const specRoot    = path.join(repoRoot, 'starwell');

let pass = 0;
let fail = 0;
const missing = [];

function check(label, relativePath, root = repoRoot, contentCheck) {
  const full = path.join(root, relativePath);
  const exists = fs.existsSync(full);

  if (!exists) {
    console.log(`  ✗  ${label}`);
    console.log(`       → ${path.relative(repoRoot, full)}`);
    fail++;
    missing.push(label);
    return false;
  }

  if (contentCheck) {
    const src = fs.readFileSync(full, 'utf8');
    const result = contentCheck(src, full);
    if (result !== true) {
      console.log(`  ✗  ${label}  [content: ${result}]`);
      fail++;
      missing.push(`${label} (content)`);
      return false;
    }
  }

  console.log(`  ✓  ${label}`);
  pass++;
  return true;
}

function section(title) {
  console.log(`\n  ${title}`);
  console.log(`  ${'─'.repeat(title.length)}`);
}

function has(text, ...terms) {
  for (const term of terms) {
    if (!text.includes(term)) return `missing "${term}"`;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────

console.log('\n[Hearthgate] Instrument verification\n');

section('Arcsweep · Temporal Quantum Engine');
check('engine.js',            'apps/starwell/src/arcsweep-temporal-quantum/engine.js',            repoRoot, (s) => has(s, 'compressRelease_engine', 'evolveTemporalState'));
check('compression-release',  'apps/starwell/src/arcsweep-temporal-quantum/compression-release.js', repoRoot, (s) => has(s, 'compressRelease', 'compressionStrength'));
check('runtime',              'apps/starwell/src/arcsweep-temporal-quantum/runtime.js');

section('Hearthweave Kernel');
check('kernel/index',           'apps/starwell/src/hearthweave-kernel/index.js');
check('dual-aspect packet',     'apps/starwell/src/hearthweave-kernel/dual-aspect.js',               repoRoot, (s) => has(s, 'assembleDualAspectPacket', 'compressRelease'));
check('compression-release pkt','apps/starwell/src/hearthweave-kernel/compression-release-packet.js');
check('activation',             'apps/starwell/src/hearthweave-kernel/activation.js');
check('renderer bind',          'apps/starwell/src/hearthweave-kernel/renderer-bind.js');

section('Hearthgate · House & Room Registry');
check('hearthgate/index',       'apps/starwell/src/hearthgate/index.js');
check('contracts',              'apps/starwell/src/hearthgate/contracts.js',                        repoRoot, (s) => has(s, 'defineHouseProfile', 'compressionRelease'));
const regPath = path.join(repoRoot, 'apps/starwell/src/hearthgate/profiles/registry.js');
if (fs.existsSync(regPath)) {
  const src = fs.readFileSync(regPath, 'utf8');
  const houses = (src.match(/^\s+'[\w-]+'\s*:/gm) || []).length;
  const expectedHouses = ['earth', 'luna', 'feather-and-flame', 'starsong', 'terra-aeterna', 'house-intermezzo', 'ta-veren-vaen', 'dreaming-grove', 'a-momento-creationis'];
  const missingHouses = expectedHouses.filter((h) => !src.includes(`'${h}'`));
  if (missingHouses.length > 0) {
    console.log(`  ✗  profiles/registry.js  [missing houses: ${missingHouses.join(', ')}]`);
    fail++; missing.push('profiles/registry.js (houses)');
  } else {
    console.log(`  ✓  profiles/registry.js  (${houses} entries; all 8 houses present)`);
    pass++;
  }
} else {
  console.log(`  ✗  profiles/registry.js`);
  fail++; missing.push('profiles/registry.js');
}
check('rooms/registry',         'apps/starwell/src/hearthgate/rooms/registry.js');

section('Canon Ingest · Hearthfire');
check('hearthfire-ingest',      'lib/hearthfire-ingest.js',                                         serverRoot, (s) => has(s, 'mammoth', 'tesseract', 'SUPPORTED_EXTENSIONS'));
check('hearthfire-analysis',    'lib/hearthfire-analysis.js',                                        serverRoot);

section('Crawler · Concordance');
check('concordance',            'lib/concordance.js',                                                serverRoot);

section('Tone Maps');
const toneStorePath = path.join(serverRoot, 'lib/tone-store.js');
if (fs.existsSync(toneStorePath)) {
  const src = fs.readFileSync(toneStorePath, 'utf8');
  const expectedPresets = ['dreaming', 'loch', 'hearth', 'starfall', 'obsidian'];
  const missingPresets = expectedPresets.filter((id) => !src.includes(`id: '${id}'`));
  if (missingPresets.length > 0) {
    console.log(`  ✗  tone-store.js  [missing presets: ${missingPresets.join(', ')}]`);
    fail++; missing.push('tone-store.js (presets)');
  } else {
    console.log(`  ✓  tone-store.js  (5 presets: ${expectedPresets.join(', ')})`);
    pass++;
  }
} else {
  console.log('  ✗  tone-store.js');
  fail++; missing.push('tone-store.js');
}
check('tone-contract',          'lib/tone-contract.js',                                              serverRoot, (s) => has(s, 'preflightToneSession', 'validateTonePatch'));
check('world-tone-approval',    'apps/starwell/src/world-tone-fold-approval.js',                     repoRoot,   (s) => has(s, 'WorldToneApprovalSession'));

section('Writing Tones · Keyboard');
check('tone-keyboard (server)', 'lib/tone-keyboard.js',                                              serverRoot, (s) => has(s, 'TONE_PATCHES', 'TONE_CONTROLS'));
check('tone-keyboard-bind (UI)','apps/starwell/src/components/writer/tone-keyboard-bind.js',         repoRoot,   (s) => has(s, 'WRITER_TONES', 'attachToneKeyboard', 'playTone'));

section('Audio Instruments · PR #58');
check('audio-patch-contract',   'starwell-audio-patch-contract.js',   assetsRoot);
check('wardenclyffe-mobius',    'wardenclyffe-mobius-coupler.js',      assetsRoot);
check('mobius-audio-bus',       'mobius-audio-bus.js',                 assetsRoot);
check('groundwire-contract',    'starwell-groundwire-audio-contract.js', assetsRoot);
check('groundwire-adapter',     'starwell-groundwire-field-adapter.js',  assetsRoot);
check('concurrent-field-audio', 'starwell-concurrent-field-audio.js',    assetsRoot);
check('output-calibration',     'starwell-audio-output-calibration.js',  assetsRoot);
check('output-witness',         'starwell-audio-output-witness.js',       assetsRoot);
check('groundwire-panel',       'starwell-groundwire-panel.js',           assetsRoot);
check('groundwire-live',        'wardenclyffe-groundwire-live.js',        assetsRoot);

section('SCFE Lab');
check('scfe/orchestrator',      'apps/starwell/src/scfe/orchestrator.js',      repoRoot);
check('scfe/ephemeris',         'apps/starwell/src/scfe/ephemeris.js',         repoRoot);
check('scfe/frequency-terra',   'apps/starwell/src/scfe/frequency-terra.js',   repoRoot);
check('scfe/agency-switchboard','apps/starwell/src/scfe/agency-switchboard.js',repoRoot);
check('scfe/geometry',          'apps/starwell/src/scfe/geometry.js',          repoRoot);

section('Signal Well');
check('signal-well-main',       'apps/starwell/src/signal-well-main.jsx',      repoRoot);

section('Glyph Studio');
check('GlyphStudio.jsx',        'apps/starwell/src/components/glyph-studio/GlyphStudio.jsx', repoRoot);

section('Writing Room');
check('WriterRoom.jsx',         'apps/starwell/src/components/writer/WriterRoom.jsx', repoRoot, (s) => has(s, 'attachToneKeyboard', 'WRITER_TONES'));

section('Data Stores');
for (const [label, file] of [
  ['writer-store',     'lib/writer-store.js'],
  ['continuity-store', 'lib/continuity-store.js'],
  ['deep-story-store', 'lib/deep-story-store.js'],
  ['almanac-store',    'lib/almanac-store.js'],
  ['solar-weather',    'lib/solar-weather-store.js'],
  ['module-registry',  'lib/module-registry.js'],
  ['api-registry',     'lib/api-registry.js'],
  ['glyph-matrix',     'lib/glyph-matrix.js'],
  ['glyph-live',       'lib/glyph-live.js'],
]) {
  check(label, file, serverRoot);
}

section('Schemas');
for (const [label, file] of [
  ['premaq-state-v2',           'deep-observer/schemas/premaq-state-v2.schema.json'],
  ['bifrost-temporal-state-v1', 'deep-observer/schemas/bifrost-temporal-state-v1.schema.json'],
  ['dual-aspect-packet-v1',     'deep-observer/schemas/dual-aspect-packet-v1.schema.json'],
  ['dual-aspect-receipt-v1',    'deep-observer/schemas/dual-aspect-receipt-v1.schema.json'],
  ['world-tone-approval',       'deep-observer/schemas/world-tone-approval.schema.json'],
  ['observation-receipt',       'deep-observer/schemas/observation-receipt.schema.json'],
]) {
  check(label, file, specRoot);
}
check('dual-aspect-packet (kernel)', 'kernel/schemas/dual-aspect-packet.schema.json', repoRoot);

// ─────────────────────────────────────────────────────────────────────────────

const total = pass + fail;
console.log(`\n${'─'.repeat(56)}`);

if (fail === 0) {
  console.log(`[Hearthgate instrument check] OK · ${pass}/${total} instruments present`);
} else {
  console.log(`[Hearthgate instrument check] INCOMPLETE · ${pass}/${total} present · ${fail} missing`);
  for (const name of missing) console.log(`  ✗  ${name}`);
  process.exit(1);
}
