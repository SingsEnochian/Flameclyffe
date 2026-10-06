'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
async function stage() {
  const source = path.join(root, 'dist/wayglass');
  const destination = path.join(root, 'dist/starwell/wayglass');
  await fs.access(path.join(source, 'index.html'));
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.rm(destination, { recursive: true, force: true });
  await fs.cp(source, destination, { recursive: true });
  await fs.access(path.join(destination, 'index.html'));
  console.log('[Wayglass] browser bundle staged under /wayglass/');
}
stage().catch(error => { console.error(error.message); process.exitCode = 1; });
