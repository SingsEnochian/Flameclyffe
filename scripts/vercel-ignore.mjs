#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const currentSha = process.env.VERCEL_GIT_COMMIT_SHA || 'HEAD';
const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA;

const SKIPPABLE_PREFIXES = [
  'ml-lab/',
  'docs/research/',
];

const SKIPPABLE_FILES = new Set([
  '.github/workflows/ml-lab.yml',
]);

function log(message) {
  console.log(`[vercel-ignore] ${message}`);
}

function changedFiles() {
  if (!previousSha) {
    log('No VERCEL_GIT_PREVIOUS_SHA was provided; allowing build.');
    return null;
  }

  try {
    const output = execFileSync(
      'git',
      ['diff', '--name-only', previousSha, currentSha],
      { encoding: 'utf8' },
    );

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    log(`Could not compute git diff; allowing build. ${error.message}`);
    return null;
  }
}

function isSkippable(path) {
  if (SKIPPABLE_FILES.has(path)) {
    return true;
  }

  return SKIPPABLE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

const files = changedFiles();

if (!files || files.length === 0) {
  log('No reliable changed-file list; allowing build.');
  process.exit(1);
}

const shouldSkip = files.every(isSkippable);

if (shouldSkip) {
  log(`Skipping Vercel deployment for non-web changes: ${files.join(', ')}`);
  process.exit(0);
}

log(`Web-relevant changes detected; allowing build: ${files.join(', ')}`);
process.exit(1);
