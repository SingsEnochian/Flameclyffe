import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const executionMarker = '<!-- wayglass-autonomous-execution:v1 -->';
export const DIAGNOSTICS = Object.freeze({
  'math-spine': Object.freeze({
    path: 'apps/starwell/test/mathSpinePacket.test.js',
    purpose: 'PREMAQC Math Spine v1.8 and deterministic replay'
  }),
  'return-engine': Object.freeze({
    path: 'apps/wayglass/test/wayglass-return-engine-trial.test.js',
    purpose: 'stop/return and continuation contract'
  }),
  'model-route': Object.freeze({
    path: 'apps/wayglass/test/wayglass-route-client.test.js',
    purpose: 'model and route-client transport contract'
  })
});

export function diagnosticForIssue(issue) {
  const subject = String(issue?.title || '') + ' ' + String(issue?.body || '');
  if (/premaqc|math.spine|jacobian|fold|observer/i.test(subject)) return 'math-spine';
  if (/return|continuity|restart|revok|receipt|waygate/i.test(subject)) return 'return-engine';
  if (/route|model|cognit|writing.room|mcp|oauth/i.test(subject)) return 'model-route';
  return 'return-engine';
}

// Models and issue bodies may propose priorities but never executable commands.
// The runner accepts only these immutable, reviewed, source-controlled paths.
export function executeDiagnostic(issue, {
  run = spawnSync,
  nodePath = process.execPath,
  cwd = process.cwd(),
} = {}) {
  const id = diagnosticForIssue(issue);
  const diagnostic = DIAGNOSTICS[id];
  const started = new Date().toISOString();
  const result = run(nodePath, ['--test', diagnostic.path], {
    cwd, encoding: 'utf8', timeout: 90_000,
    maxBuffer: 256 * 1024, env: { ...process.env, CI: 'true' },
  });
  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  const digest = createHash('sha256').update(stdout + '\n' + stderr).digest('hex');
  const passed = result.status === 0 && !result.error && !result.signal;
  return Object.freeze({
    schema: 'wayglass.autonomous-diagnostic/v1',
    task_id: Number(issue.number),
    diagnostic_id: id,
    path: diagnostic.path,
    purpose: diagnostic.purpose,
    started_at: started,
    finished_at: new Date().toISOString(),
    status: passed ? 'passed' : 'failed',
    exit_code: Number.isInteger(result.status) ? result.status : null,
    signal: result.signal || null,
    output_sha256: digest,
    error_class: result.error?.code || null,
    // Never write raw possibly-sensitive test output into issue comments.
  });
}

export function diagnosticReceipt({ issue, result, sha, runUrl, hadSelection = false }) {
  if (!issue || result?.schema !== 'wayglass.autonomous-diagnostic/v1') {
    throw new TypeError('A real diagnostic result is required.');
  }
  const lines = [
    executionMarker,
    hadSelection ? 'Wayglass scheduled circulation: existing selection executed.'
      : 'Wayglass scheduled circulation: selection and bounded diagnostic executed.',
    'Task: #' + issue.number + ' · ' + issue.title,
    'State: ' + result.status + ' (not a claim that the issue is resolved).',
    'Executed: node --test ' + result.path,
    'Source commit: ' + sha,
    'Exit code: ' + (result.exit_code ?? 'unavailable'),
    'Output SHA-256: ' + result.output_sha256,
    'Run: ' + runUrl,
    'Authority: read-only source and fixed allowlisted test; no deployment, code change, canon or participant identity mutation.',
  ];
  return lines.join('\n');
}
