'use strict';

const fs = require('node:fs');
const path = require('node:path');

const serverRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(serverRoot, '..', '..');
const sourceDir = path.join(repositoryRoot, 'dist', 'starwell');
const destinationDir = path.join(serverRoot, 'public', 'starwell');

function requireFile(relativePath) {
  const filePath = path.join(sourceDir, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`STARWELL build is missing ${relativePath}. Run the root starwell:build script first.`);
  }
  return filePath;
}

function countFiles(directory) {
  let count = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) count += countFiles(entryPath);
    else if (entry.isFile()) count += 1;
  }
  return count;
}

function assertPackagedBase(relativePath) {
  const html = fs.readFileSync(requireFile(relativePath), 'utf8');
  if (!html.includes('/starwell/')) {
    throw new Error(`${relativePath} was not built with STARWELL_BASE=/starwell/. Refusing to package broken asset routes.`);
  }
}

if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
  throw new Error(`STARWELL build directory does not exist: ${sourceDir}`);
}

requireFile('index.html');
requireFile(path.join('glyph-studio', 'index.html'));
requireFile(path.join('signal-well', 'index.html'));
assertPackagedBase('index.html');
assertPackagedBase(path.join('glyph-studio', 'index.html'));
assertPackagedBase(path.join('signal-well', 'index.html'));

fs.rmSync(destinationDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destinationDir), { recursive: true });
fs.cpSync(sourceDir, destinationDir, { recursive: true, force: true });

const stagedIndex = path.join(destinationDir, 'index.html');
const stagedGlyphStudio = path.join(destinationDir, 'glyph-studio', 'index.html');
const stagedSignalWell = path.join(destinationDir, 'signal-well', 'index.html');
if (!fs.existsSync(stagedIndex) || !fs.existsSync(stagedGlyphStudio) || !fs.existsSync(stagedSignalWell)) {
  throw new Error('STARWELL staging finished without the required framework, Glyph Studio, and Signal Well entry points.');
}

const fileCount = countFiles(destinationDir);
if (fileCount < 4) throw new Error(`Staged STARWELL bundle is unexpectedly small (${fileCount} files).`);

console.log('[Hearthgate STARWELL stage] OK');
console.log(` source: ${sourceDir}`);
console.log(` destination: ${destinationDir}`);
console.log(` files: ${fileCount}`);
console.log(' routes: /starwell/, /starwell/glyph-studio/, and /starwell/signal-well/');
