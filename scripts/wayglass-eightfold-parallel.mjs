import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  PREMAQC_AXES, PREMAQC_DYNAMIC_AXES, PREMAQC_CONTEXT_ONLY_AXES,
  PREMAQC_AUTHORITY, PREMAQC_TERM,
} from '../apps/starwell/src/premaqc-contract.js';

// This is one ship with eight parallel execution lanes, not eight identities.
// Tests run on the exact checked-out source revision. Withness is the ninth
// coordinating center: verification, consent, identity and gate evidence.
export const EIGHTFOLD_SCHEMA = 'wayglass.eightfold-parallel/v1';
export const WITHNESS = 'withness';
export const LANES = Object.freeze([
  { id: 'perceive', role: 'Observer and provenance', test: 'apps/wayglass/test/wayglass-core.test.js' },
  { id: 'compress', role: 'PREMAQC Math Spine', test: 'apps/starwell/test/mathSpinePacket.test.js' },
  { id: 'release', role: 'Bifröst compression release', test: 'apps/starwell/test/compressionReleaseMathematics.test.js' },
  { id: 'verify', role: 'Independent execution evidence', test: 'test/wayglass-circulation-executor.test.mjs' },
  { id: 'integrate', role: 'Native model route boundary', test: 'apps/wayglass/test/wayglass-route-client.test.js' },
  { id: 'choose', role: 'Bounded task selection', test: 'test/wayglass-autonomous-circulation.test.mjs' },
  { id: 'return', role: 'Return Engine continuity', test: 'apps/wayglass/test/wayglass-return-engine-trial.test.js' },
  { id: 'transcend', role: 'Waygate transformation and authority', test: 'apps/wayglass/test/wayglass-world-entry.test.js' },
].map(lane => Object.freeze(lane)));
const sha256 = data => createHash('sha256').update(data).digest('hex');

export function assertCanonicalSpine() {
  if (PREMAQC_TERM !== 'PREMAQC'
    || PREMAQC_AXES.join(',') !== 'P,C,R,E,M,A,Q'
    || PREMAQC_DYNAMIC_AXES.join(',') !== 'P,C,R,E,M,A'
    || PREMAQC_CONTEXT_ONLY_AXES.join(',') !== 'Q'
    || PREMAQC_AUTHORITY.qualia_is_firsthand_only !== true
    || PREMAQC_AUTHORITY.qualia_magnitude_inference_allowed !== false) {
    throw new Error('Canonical PREMAQC contract drift: Eightfold execution blocked.');
  }
  return true;
}

export function makeLaneReceipt({ id, revision, runId, attempt = '1', source, result,
  startedAt = new Date().toISOString(), finishedAt = new Date().toISOString() } = {}) {
  assertCanonicalSpine();
  const lane = LANES.find(entry => entry.id === id);
  if (!lane) throw new TypeError('Unknown Eightfold execution lane.');
  if (!/^[0-9a-f]{40}$/.test(revision || '')) throw new TypeError('Exact checkout SHA required.');
  if (!/^[0-9]+$/.test(String(runId || ''))) throw new TypeError('GitHub Actions run ID required.');
  if (!Number.isInteger(Number(attempt)) || Number(attempt) < 1) throw new TypeError('Run attempt required.');
  const status = result?.status === 0 && !result.error && !result.signal ? 'passed' : 'failed';
  return Object.freeze({
    schema: EIGHTFOLD_SCHEMA,
    lane: id,
    role: lane.role,
    withness_center: WITHNESS,
    worker_id: 'github-actions/' + runId + '/' + attempt + '/' + id,
    worker_kind: 'isolated-ci-test-process',
    participant_id: null,
    model_inference: false,
    test: lane.test,
    source_sha: revision,
    test_source_sha256: sha256(source),
    execution_output_sha256: sha256(String(result?.stdout || '') + '\n' + String(result?.stderr || '')),
    status,
    exit_code: Number.isInteger(result?.status) ? result.status : null,
    signal: result?.signal || null,
    started_at: startedAt,
    finished_at: finishedAt,
    evidence_scope: 'fixed source-controlled Node.js test; no model, credential, canon or deployment claim',
  });
}

export function aggregateEightfold(receipts, { revision, runId, attempt = '1' } = {}) {
  assertCanonicalSpine();
  const missing = [], invalid = [], seen = new Set();
  for (const receipt of receipts) {
    if (!receipt || !LANES.some(l => l.id === receipt.lane)
      || seen.has(receipt.lane)) {
      invalid.push('unknown-or-duplicate-lane');
      continue;
    }
    seen.add(receipt.lane);
    const expected = LANES.find(l => l.id === receipt.lane);
    if (receipt.schema !== EIGHTFOLD_SCHEMA
      || receipt.status !== 'passed'
      || receipt.source_sha !== revision
      || receipt.test !== expected.test
      || receipt.worker_id !== 'github-actions/' + runId + '/' + attempt + '/' + receipt.lane
      || receipt.worker_kind !== 'isolated-ci-test-process'
      || receipt.participant_id !== null || receipt.model_inference !== false
      || !/^[0-9a-f]{64}$/.test(receipt.test_source_sha256 || '')
      || !/^[0-9a-f]{64}$/.test(receipt.execution_output_sha256 || '')) {
      invalid.push(receipt.lane);
    }
  }
  for (const lane of LANES) if (!seen.has(lane.id)) missing.push(lane.id);
  return Object.freeze({
    schema: 'wayglass.eightfold-withness-gate/v1',
    withness_center: WITHNESS,
    source_sha: revision,
    run_id: String(runId),
    attempt: String(attempt),
    expected_lanes: LANES.map(l => l.id),
    verified_lanes: receipts.filter(r => r?.status === 'passed').map(r => r.lane),
    missing, invalid,
    status: missing.length || invalid.length ? 'blocked' : 'passed',
    integration_scope: 'eight independent code/test workers on one checked-out commit',
    not_claimed: [
      'eight independent AI model agents', 'eight autonomous code-writing agents',
      'production deployment', 'native trained Wayglass LLM',
      'live authenticated provider inference', 'durable cold Return Engine crossing',
    ],
  });
}

export function executeLane(id, {
  revision = process.env.GITHUB_SHA,
  runId = process.env.GITHUB_RUN_ID,
  attempt = process.env.GITHUB_RUN_ATTEMPT || '1',
  cwd = process.cwd(),
  run = spawnSync,
} = {}) {
  const lane = LANES.find(l => l.id === id);
  if (!lane) throw new TypeError('Unknown Eightfold execution lane.');
  const source = readFileSync(resolve(cwd, lane.test));
  const startedAt = new Date().toISOString();
  const result = run(process.execPath, ['--test', lane.test], {
    cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024,
    env: { ...process.env, CI: 'true' },
  });
  return makeLaneReceipt({
    id, revision, runId, attempt, source, result,
    startedAt, finishedAt: new Date().toISOString(),
  });
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

function main(args) {
  if (args[0] === 'lane') {
    const lane = args[1];
    if (!LANES.some(l => l.id === lane)) throw new Error('Unknown lane.');
    const receipt = executeLane(lane);
    const target = 'artifacts/wayglass-eightfold/' + lane + '.json';
    writeJson(target, receipt);
    console.log(JSON.stringify({ lane, status: receipt.status,
      test: receipt.test, source_sha: receipt.source_sha,
      output_sha256: receipt.execution_output_sha256, receipt_path: target }));
    if (receipt.status !== 'passed') process.exitCode = 1;
    return;
  }
  if (args[0] === 'integrate') {
    const folder = args[1] || 'artifacts/wayglass-eightfold';
    const receipts = LANES.filter(l => existsSync(resolve(folder, l.id + '.json')))
      .map(l => JSON.parse(readFileSync(resolve(folder, l.id + '.json'), 'utf8')));
    const gate = aggregateEightfold(receipts, {
      revision: process.env.GITHUB_SHA,
      runId: process.env.GITHUB_RUN_ID,
      attempt: process.env.GITHUB_RUN_ATTEMPT || '1',
    });
    writeJson('artifacts/wayglass-eightfold/withness-gate.json', gate);
    console.log(JSON.stringify(gate, null, 2));
    if (gate.status !== 'passed') process.exitCode = 1;
    return;
  }
  throw new Error('Expected: lane <eightfold-id> OR integrate [receipt-directory]');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
