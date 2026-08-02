'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');

function probe(command, prefixArgs = []) {
  return new Promise((resolve) => {
    execFile(command, [...prefixArgs, '--version'], { windowsHide: true, timeout: 4000 }, (error) => {
      resolve(error ? null : { command, prefixArgs });
    });
  });
}

async function findPython() {
  const candidates = [
    process.env.HEARTHGATE_PYTHON ? { command: process.env.HEARTHGATE_PYTHON, prefixArgs: [] } : null,
    process.platform === 'win32' ? { command: 'py', prefixArgs: ['-3'] } : null,
    { command: 'python', prefixArgs: [] },
    { command: 'python3', prefixArgs: [] },
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = await probe(candidate.command, candidate.prefixArgs);
    if (result) return result;
  }
  return null;
}

function quoteWindows(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

async function launchBifrostTerminal(runtimeRoot) {
  const instrumentRoot = path.join(runtimeRoot, 'instruments', 'bifrost-python');
  const entry = path.join(instrumentRoot, 'bifrost', '__main__.py');
  if (!fs.existsSync(entry)) {
    return { ok: false, error: 'The packaged Bifröst Python instrument is missing.' };
  }

  const python = await findPython();
  if (!python) {
    return {
      ok: false,
      error: 'Python 3.9 or newer was not found. Install Python or set HEARTHGATE_PYTHON to its executable path.',
    };
  }

  const env = {
    ...process.env,
    PYTHONPATH: [instrumentRoot, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
  };

  if (process.platform === 'win32') {
    const invocation = [python.command, ...python.prefixArgs, '-m', 'bifrost']
      .map(quoteWindows)
      .join(' ');
    const child = spawn('cmd.exe', ['/d', '/s', '/c', `start "Bifröst" ${invocation}`], {
      cwd: instrumentRoot,
      env,
      detached: true,
      windowsHide: false,
      stdio: 'ignore',
    });
    child.unref();
  } else {
    const child = spawn(python.command, [...python.prefixArgs, '-m', 'bifrost'], {
      cwd: instrumentRoot,
      env,
      detached: true,
      stdio: 'inherit',
    });
    child.unref();
  }

  return {
    ok: true,
    command: `${python.command} ${[...python.prefixArgs, '-m', 'bifrost'].join(' ')}`,
    instrument_root: instrumentRoot,
  };
}

module.exports = {
  findPython,
  launchBifrostTerminal,
};
