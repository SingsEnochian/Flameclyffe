import { access, readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CREATIVE_ORGANS } from '../apps/arcsweep/src/creative-organ-registry.js';
import { SOUND_ORGANS } from '../apps/arcsweep/src/sound-organ-registry.js';

const siteArg = process.argv.indexOf('--site');
const siteRoot = siteArg >= 0 ? process.argv[siteArg + 1] : null;
const errors = [];
const ids = new Set();
const organs = [...CREATIVE_ORGANS, ...SOUND_ORGANS];

for (const organ of organs) {
  if (ids.has(organ.id)) errors.push(`duplicate organ id: ${organ.id}`);
  ids.add(organ.id);
  for (const key of ['id', 'label', 'pagesHref', 'deployedPath', 'sourcePath', 'implementation']) {
    if (!organ[key]) errors.push(`${organ.id || '<unknown>'}: missing ${key}`);
  }
  for (const path of [organ.sourcePath, organ.surfaceSourcePath].filter(Boolean)) {
    try { await access(resolve(path)); }
    catch { errors.push(`${organ.id}: source missing: ${path}`); }
  }
  if (siteRoot) {
    try { await access(resolve(siteRoot, organ.deployedPath)); }
    catch { errors.push(`${organ.id}: deployed route missing: ${organ.deployedPath}`); }
  }
}

if (siteRoot) {
  const assetsRoot = resolve(siteRoot, 'apps/arcsweep/assets');
  try {
    const names = await readdir(assetsRoot, { recursive: true });
    const jsFiles = names.filter((name) => /\.js$/u.test(name));
    const source = (await Promise.all(jsFiles.map((name) => readFile(resolve(assetsRoot, name), 'utf8').catch(() => '')))).join('\n');
    const markers = [
      ['arcsweep.sound-organs/v1', 'sound organ registry'],
      ['arcsweep.soundfont-worklet/v2', 'SoundFont runtime repair v2'],
      ['arcsweep.semantic-lab/v1', 'Semantic Lab'],
      ['arcsweep.sidecar-health/v1', 'production sidecar health panel'],
      ['arcsweep.house-browser-smoke/v1', 'House browser smoke instrument'],
    ];
    for (const [marker, label] of markers) if (!source.includes(marker)) errors.push(`ArcSweep deployed bundle is missing the ${label} marker.`);
    if (!names.some((name) => /spessasynth_processor/i.test(name))) errors.push('ArcSweep deployed assets are missing the bundled SpessaSynth AudioWorklet.');
  } catch (error) {
    errors.push(`ArcSweep deployed asset inspection failed: ${error.message}`);
  }
}

if (errors.length) {
  console.error('ArcSweep organ integrity FAILED:\n' + errors.map((item) => ` - ${item}`).join('\n'));
  process.exit(1);
}

console.log(`ArcSweep organ integrity OK: ${CREATIVE_ORGANS.length} creative + ${SOUND_ORGANS.length} sound organs${siteRoot ? ' present in deployed site with Semantic Lab, runtime health, House smoke, and bundled SoundFont worklet' : ' have source owners'}.`);
