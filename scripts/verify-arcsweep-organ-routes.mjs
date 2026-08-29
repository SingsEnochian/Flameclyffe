import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CREATIVE_ORGANS } from '../apps/arcsweep/src/creative-organ-registry.js';

const siteArg = process.argv.indexOf('--site');
const siteRoot = siteArg >= 0 ? process.argv[siteArg + 1] : null;
const errors = [];
const ids = new Set();

for (const organ of CREATIVE_ORGANS) {
  if (ids.has(organ.id)) errors.push(`duplicate organ id: ${organ.id}`);
  ids.add(organ.id);
  for (const key of ['id', 'label', 'pagesHref', 'deployedPath', 'sourcePath', 'implementation']) {
    if (!organ[key]) errors.push(`${organ.id || '<unknown>'}: missing ${key}`);
  }
  try { await access(resolve(organ.sourcePath)); }
  catch { errors.push(`${organ.id}: source missing: ${organ.sourcePath}`); }
  if (siteRoot) {
    try { await access(resolve(siteRoot, organ.deployedPath)); }
    catch { errors.push(`${organ.id}: deployed route missing: ${organ.deployedPath}`); }
  }
}

if (errors.length) {
  console.error('ArcSweep organ integrity FAILED:\n' + errors.map((item) => ` - ${item}`).join('\n'));
  process.exit(1);
}

console.log(`ArcSweep organ integrity OK: ${CREATIVE_ORGANS.length} creative organs${siteRoot ? ' present in deployed site' : ' have source owners'}.`);
