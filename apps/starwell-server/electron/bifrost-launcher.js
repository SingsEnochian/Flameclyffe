'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');

function probe(command, prefixArgs = [], testArgs = ['--version']) {
  return new Promise((resolve) => {
    execFile(command, [...prefixArgs, ...testArgs], { windowsHide: true, timeout: 8000 }, (error, stdout) => {
      resolve(error ? null : { command, prefixArgs, stdout: String(stdout || '').trim() });
    });
  });
}

async function findPython(preferredRoot = null) {
  const localPython = preferredRoot && process.platform === 'win32'
    ? path.join(preferredRoot, 'math-runtime', 'Scripts', 'python.exe')
    : preferredRoot
      ? path.join(preferredRoot, 'math-runtime', 'bin', 'python')
      : null;
  const candidates = [
    localPython && fs.existsSync(localPython) ? { command: localPython, prefixArgs: [] } : null,
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

async function probePythonModule(python, moduleName) {
  return probe(
    python.command,
    python.prefixArgs,
    ['-c', `import ${moduleName}; print(${moduleName}.__version__)`],
  );
}

function quoteWindows(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function launchVisibleTerminal({ title, command, args, cwd, env }) {
  if (process.platform === 'win32') {
    const invocation = [command, ...args].map(quoteWindows).join(' ');
    const child = spawn('cmd.exe', ['/d', '/s', '/c', `start ${quoteWindows(title)} ${invocation}`], {
      cwd,
      env,
      detached: true,
      windowsHide: false,
      stdio: 'ignore',
    });
    child.unref();
    return;
  }
  const child = spawn(command, args, {
    cwd,
    env,
    detached: true,
    stdio: 'inherit',
  });
  child.unref();
}

async function launchBifrostTerminal(runtimeRoot, dataRoot = null) {
  const instrumentRoot = path.join(runtimeRoot, 'instruments', 'bifrost-python');
  const entry = path.join(instrumentRoot, 'bifrost', '__main__.py');
  if (!fs.existsSync(entry)) {
    return { ok: false, error: 'The packaged Bifröst Python instrument is missing.' };
  }

  const python = await findPython(dataRoot);
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
  const args = [...python.prefixArgs, '-m', 'bifrost'];
  launchVisibleTerminal({ title: 'Bifröst', command: python.command, args, cwd: instrumentRoot, env });

  return {
    ok: true,
    command: `${python.command} ${args.join(' ')}`,
    instrument_root: instrumentRoot,
  };
}

const PREMAQ_AXES = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];

function validateMathPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('HEARTHGATE_MATH_PACKET_REQUIRED');
  }
  const state = payload.state;
  const profile = payload.profile;
  if (!state || typeof state !== 'object' || !profile || typeof profile !== 'object') {
    throw new Error('HEARTHGATE_MATH_STATE_AND_PROFILE_REQUIRED');
  }
  if (!state.basis_id || !state.house_id || !state.observation?.axes) {
    throw new Error('HEARTHGATE_SOURCED_MATH_STATE_REQUIRED');
  }
  for (const axis of PREMAQ_AXES) {
    const value = Number(state.premaq?.[axis]);
    const provenance = state.observation.axes?.[axis]?.provenance;
    if (!Number.isFinite(value) || value < 0 || value > 1 || !provenance?.source_id || !provenance?.observed_at) {
      throw new Error(`HEARTHGATE_SOURCED_PREMAQ_AXIS_REQUIRED:${axis}`);
    }
    if (!['OBSERVED', 'DERIVED', 'CALIBRATED'].includes(String(provenance.mode || '').toUpperCase())) {
      throw new Error(`HEARTHGATE_LIVE_OBSERVATION_REQUIRED:${axis}`);
    }
  }
  return JSON.parse(JSON.stringify({ state, profile }));
}

async function launchMathSpine(runtimeRoot, dataRoot, payload) {
  const instrumentRoot = path.join(runtimeRoot, 'instruments', 'math-spine');
  const entry = path.join(instrumentRoot, 'hearthgate_live_field.py');
  const manifest = path.join(instrumentRoot, 'MANIFEST.json');
  if (!fs.existsSync(entry) || !fs.existsSync(manifest)) {
    return { ok: false, error: 'The packaged Python/PyTorch mathematics spine is missing.' };
  }

  let safePayload;
  try {
    safePayload = validateMathPayload(payload);
  } catch (error) {
    return { ok: false, error: error.message };
  }

  const python = await findPython(dataRoot);
  if (!python) {
    return {
      ok: false,
      error: 'Python 3.11 or 3.12 was not found. The live browser spine remains available; the PyTorch door is resting.',
      needs_runtime: true,
    };
  }
  const torch = await probePythonModule(python, 'torch');
  if (!torch) {
    return {
      ok: false,
      error: 'Python is present but PyTorch is not installed in that environment. The live browser spine remains available; the PyTorch door is resting.',
      needs_runtime: true,
    };
  }

  const sessionRoot = path.join(dataRoot, 'math-sessions');
  fs.mkdirSync(sessionRoot, { recursive: true });
  const safeBasis = String(safePayload.state.basis_id).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 96);
  const packetPath = path.join(sessionRoot, `${safeBasis}.json`);
  const temporaryPath = `${packetPath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(safePayload, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporaryPath, packetPath);

  const args = [...python.prefixArgs, entry, packetPath];
  launchVisibleTerminal({
    title: 'Hearthgate PyTorch Mathematics',
    command: python.command,
    args,
    cwd: instrumentRoot,
    env: { ...process.env },
  });

  return {
    ok: true,
    command: `${python.command} ${args.join(' ')}`,
    packet_path: packetPath,
    torch_version: torch.stdout,
    basis_id: safePayload.state.basis_id,
  };
}

module.exports = {
  findPython,
  launchBifrostTerminal,
  launchMathSpine,
  probePythonModule,
  validateMathPayload,
};
