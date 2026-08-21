import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repoRoot = new URL('../../../', import.meta.url);

test('Netlify publishes Arcsweep at /arcsweep/ and canonicalises the source-style path', async () => {
  const [config, stage] = await Promise.all([
    readFile(new URL('netlify.toml', repoRoot), 'utf8'),
    readFile(new URL('apps/arcsweep/vercel-stage.cjs', repoRoot), 'utf8'),
  ]);

  assert.match(stage, /dist['"], ['"]starwell['"], ['"]arcsweep['"]/,
    'Arcsweep must stage beneath the published STARWELL root as /arcsweep/');
  assert.match(config, /from = "\/apps\/arcsweep"[\s\S]*?to = "\/arcsweep\/"[\s\S]*?status = 301/,
    'Legacy /apps/arcsweep must redirect to the canonical public route');
  assert.match(config, /from = "\/apps\/arcsweep\/\*"[\s\S]*?to = "\/arcsweep\/:splat"[\s\S]*?status = 301/,
    'Nested legacy Arcsweep paths must preserve their suffix under /arcsweep/');
});
