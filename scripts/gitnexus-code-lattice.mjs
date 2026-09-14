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

console.log(`[Code Lattice] gitnexus ${args.join(' ')}`);

// Windows global npm binaries are .cmd shims. Node cannot reliably execute those
// as native binaries with shell:false, so route the fixed command through ComSpec.
// The action and all arguments come exclusively from COMMANDS above.
const isWindows = process.platform === 'win32';
const executable = isWindows ? (process.env.ComSpec || 'cmd.exe') : 'gitnexus';
const spawnArgs = isWindows
  ? ['/d', '/s', '/c', `gitnexus ${args.join(' ')}`]
  : args;

const result = spawnSync(executable, spawnArgs, {
  cwd: root,
  stdio: 'inherit',
  shell: false,
  windowsHide: true,
});

if (result.error?.code === 'ENOENT') {
  fail(isWindows
    ? 'Windows command processor is unavailable, so GitNexus could not be launched.'
    : 'GitNexus is not installed on this machine. Install it once with: npm install -g gitnexus@latest');
}
if (result.error) fail(`GitNexus failed to start: ${result.error.message}`);
if (result.status !== 0) {
  if (isWindows && (result.status === 1 || result.status === 9009)) {
    fail('GitNexus did not run successfully. Confirm it is installed and visible with: where.exe gitnexus', result.status);
  }
  process.exit(result.status ?? 1);
}
