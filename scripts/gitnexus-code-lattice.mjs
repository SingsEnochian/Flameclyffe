import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const COMMANDS = Object.freeze({
  analyze: ['analyze', '--embeddings', '--skills', '--skip-agents-md'],
  'analyze-pdg': ['analyze', '--pdg', '--embeddings', '--skills', '--skip-agents-md'],
  status: ['status'],
  'setup-codex': ['setup', '-c', 'codex'],
});

function fail(message, code = 1) {
  console.error(`[Code Lattice] ${message}`);
  process.exit(code);
}

const action = process.argv[2] || 'status';
const args = COMMANDS[action];
if (!args) {
  fail(`Unknown action "${action}". Expected one of: ${Object.keys(COMMANDS).join(', ')}`);
}

const root = process.cwd();
if (!fs.existsSync(path.join(root, 'package.json')) || !fs.existsSync(path.join(root, '.git'))) {
  fail('Run this command from the Flameclyffe repository root.');
}

const executable = process.platform === 'win32' ? 'gitnexus.cmd' : 'gitnexus';

console.log(`[Code Lattice] gitnexus ${args.join(' ')}`);
const result = spawnSync(executable, args, {
  cwd: root,
  stdio: 'inherit',
  shell: false,
});

if (result.error?.code === 'ENOENT') {
  fail('GitNexus is not installed on this machine. Install it once with: npm install -g gitnexus@latest');
}
if (result.error) fail(`GitNexus failed to start: ${result.error.message}`);
if (result.status !== 0) process.exit(result.status ?? 1);
