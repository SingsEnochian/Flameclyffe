'use strict';

const { spawnSync } = require('node:child_process');
const { FLAMES } = require('../flames/manifests');

const args = new Set(process.argv.slice(2));
const pull = args.has('--pull');
const requested = process.argv.slice(2).filter((item) => !item.startsWith('--'));
const defaults = ['altair', 'atlas'];
const ids = requested.length ? requested : defaults;

for (const id of ids) {
  const flame = FLAMES[id];
  if (!flame) {
    console.error(`${id}: unknown Flame`);
    process.exitCode = 2;
    continue;
  }
  if (flame.platform.provider !== 'ollama') {
    console.log(`${id}: ${flame.platform.provider} route; no local model pull`);
    continue;
  }
  console.log(`${id}: ${flame.platform.model}`);
  if (!pull) continue;
  const result = spawnSync('ollama', ['pull', flame.platform.model], { stdio: 'inherit', shell: false });
  if (result.error) {
    console.error(`${id}: ${result.error.message}`);
    process.exitCode = 1;
  } else if (result.status !== 0) {
    console.error(`${id}: ollama pull exited ${result.status}`);
    process.exitCode = result.status || 1;
  }
}

if (!pull) console.log('Dry run only. Add --pull to download the listed models.');
