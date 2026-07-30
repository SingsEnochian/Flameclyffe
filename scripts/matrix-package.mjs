import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const source = resolve(root, 'dist/starwell');
const releaseRoot = resolve(root, 'release/observatory-matrix');
await rm(releaseRoot, { recursive: true, force: true });
await mkdir(releaseRoot, { recursive: true });
await cp(source, resolve(releaseRoot, 'web'), { recursive: true, force: true });

const matrixHtml = await readFile(resolve(source, 'observatory-matrix.html'));
const receipt = {
  schema: 'observatory.matrix.package.v1',
  packaged_at: new Date().toISOString(),
  node: process.version,
  entrypoint: 'web/observatory-matrix.html',
  sha256: createHash('sha256').update(matrixHtml).digest('hex'),
  classification: 'build-receipt',
};
await writeFile(resolve(releaseRoot, 'package-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
