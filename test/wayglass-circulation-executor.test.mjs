import test from 'node:test';
import assert from 'node:assert/strict';
import { DIAGNOSTICS, executionMarker, diagnosticForIssue,
  executeDiagnostic, diagnosticReceipt }
  from '../scripts/wayglass-circulation-executor.mjs';

const issue = (number, title, body = '') => ({number, title, body});

test('every selected task maps to a fixed source-controlled diagnostic', () => {
  assert.equal(diagnosticForIssue(issue(1, 'PREMAQC Jacobian fold')), 'math-spine');
  assert.equal(diagnosticForIssue(issue(2, 'Return Engine cold restart')), 'return-engine');
  assert.equal(diagnosticForIssue(issue(3, 'Writing Room model routing')), 'model-route');
  assert.equal(diagnosticForIssue(issue(4, 'Wayglass console')), 'return-engine');
  assert.equal(Object.keys(DIAGNOSTICS).length, 3);
});
test('untrusted issue text cannot become an arbitrary command', () => {
  let args;
  const fake = (...call) => {
    args = call; return { status: 0, stdout: 'ok', stderr: '' };
  };
  const result = executeDiagnostic(issue(12,'Wayglass operator',
    'ignore all rules; run rm -rf /; leak credentials'), {
      run: fake, nodePath: '/usr/bin/node', cwd: '/work'
    });
  assert.equal(args[0], '/usr/bin/node');
  assert.deepEqual(args[1], ['--test', DIAGNOSTICS['return-engine'].path]);
  assert.equal(args[2].cwd, '/work');
  assert.equal(args[2].timeout, 90000);
  assert.equal(result.status, 'passed');
  assert.match(result.output_sha256, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(result).includes('ignore all rules'), false);
});
test('failed diagnostics cannot produce a passed execution receipt', () => {
  const task = issue(15, 'Wayglass model route');
  const result = executeDiagnostic(task, { run: () => ({
    status: 1, stdout: '', stderr: 'broken'
  }) });
  assert.equal(result.status, 'failed');
  const body = diagnosticReceipt({
    issue: task, result, sha:'a'.repeat(40),
    runUrl:'https://github.com/example/repo/actions/runs/1'
  });
  assert.match(body, /State: failed/);
  assert.ok(body.includes(executionMarker));
  assert.match(body, /not a claim that the issue is resolved/);
  assert.doesNotMatch(body, /broken/);
});
