'use strict';

const fs = require('node:fs');
const path = require('node:path');

const serverRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(serverRoot, '..', '..');
const sourceDir = path.join(repositoryRoot, 'dist', 'project-zero-companion');
const destinationDir = path.join(serverRoot, 'public', 'project-zero-companion');

function requireFile(relativePath) {
  const filePath = path.join(sourceDir, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Project Zero Companion build is missing ${relativePath}. Run project-zero:build first.`);
  }
  return filePath;
}

if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
  throw new Error(`Project Zero Companion build directory does not exist: ${sourceDir}`);
}

const indexPath = requireFile('index.html');
const html = fs.readFileSync(indexPath, 'utf8');
if (!html.includes('/project-zero-companion/')) {
  throw new Error('Project Zero Companion was not built with PROJECT_ZERO_BASE=/project-zero-companion/.');
}

fs.rmSync(destinationDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destinationDir), { recursive: true });
fs.cpSync(sourceDir, destinationDir, { recursive: true, force: true });

const stagedIndex = path.join(destinationDir, 'index.html');
if (!fs.existsSync(stagedIndex)) throw new Error('Project Zero Companion staging finished without index.html.');

console.log('[Hearthgate Project Zero Companion stage] OK');
console.log(` source: ${sourceDir}`);
console.log(` destination: ${destinationDir}`);
console.log(' route: /project-zero-companion/');
console.log(' authority: Flameclyffe Companion only; Nocturne retains Project Zero core authority.');
