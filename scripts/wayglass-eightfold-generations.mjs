import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LANES, assertCanonicalSpine } from './wayglass-eightfold-parallel.mjs';
import { agentVerificationInstructions } from '../apps/arcsweep/src/swarm/agent-verification-inheritance.js';

export const GENERATION_SCHEMA = 'wayglass.eightfold-generation/v2';
export const RECON_SCHEMA = 'wayglass.eightfold-source-concordance/v1';
export const OUTPUT_DIR = 'artifacts/wayglass-eightfold-generation-two';
const MAX_PRS = 32;
const HASH = /^[a-f0-9]{40}$/;
const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');

export function laneForPath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('..') || path.includes('\\')) {
    throw new TypeError('Repository-relative file path required.');
  }
  if (/premaqc|math.spine|deep.observer|material.state|observer|telemetry/i.test(path)) return 'perceive';
  if (/compression|temporal.quantum|bifrost|fold/i.test(path)) return 'compress';
  if (/render|sound|visual|styles.css|motion|glass.field|release/i.test(path)) return 'release';
  if (/test|spec|workflow|actions|audit|receipt|verification/i.test(path)) return 'verify';
  if (/route|gateway|mcp|cloud.login|server.secure|router.js/i.test(path)) return 'integrate';
  if (/autonomous|circulation|choose|selection|planner/i.test(path)) return 'choose';
  if (/continuation|stop.receipt|return.engine|waygate|voyage/i.test(path)) return 'return';
  return 'transcend';
}

export function normalizePulls(prs, { sourceSha, mainSha, observedAt, totalDiscovered, selectionLimit = MAX_PRS } = {}) {
  assertCanonicalSpine();
  if (!HASH.test(sourceSha || '') || !HASH.test(mainSha || '')) throw new TypeError('Exact source and main SHAs required.');
  if (!Array.isArray(prs)) throw new TypeError('PR observations must be an array.');
  const normalized = prs.map(pr => {
    if (!Number.isInteger(pr.number) || pr.number < 1 || !HASH.test(pr.head_sha || '')
      || !HASH.test(pr.base_sha || '') || !Array.isArray(pr.files)) {
      throw new TypeError('PR number, exact heads and file list required.');
    }
    const paths = [...new Set(pr.files.map(file => {
      const path = typeof file === 'string' ? file : file?.filename;
      laneForPath(path);
      return path;
    }))].sort();
    return {
      pr_number: pr.number,
      title: String(pr.title || '').slice(0, 240),
      url: 'https://github.com/SingsEnochian/Flameclyffe/pull/' + pr.number,
      head_sha: pr.head_sha,
      base_sha: pr.base_sha,
      updated_at: pr.updated_at || null,
      file_count: paths.length,
      paths,
      lanes: [...new Set(paths.map(laneForPath))].sort(),
      files_complete: pr.files_complete === true,
    };
  }).sort((a, b) => a.pr_number - b.pr_number);
  if (new Set(normalized.map(p => p.pr_number)).size !== normalized.length) {
    throw new Error('Duplicate pull request evidence.');
  }
  const conflicts = [];
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const left = normalized[i], right = normalized[j];
      const rightSet = new Set(right.paths);
      const shared = left.paths.filter(path => rightSet.has(path));
      if (shared.length) conflicts.push({
        prs: [left.pr_number, right.pr_number],
        head_shas: [left.head_sha, right.head_sha],
        files: shared,
        lanes: [...new Set(shared.map(laneForPath))].sort(),
        classification: 'shared-file-review-required',
      });
    }
  }
  const partial = normalized.some(pr => !pr.files_complete)
    || (Number.isInteger(totalDiscovered) && totalDiscovered > normalized.length)
    || normalized.length > selectionLimit;
  return Object.freeze({
    schema: RECON_SCHEMA,
    source_sha: sourceSha,
    main_sha: mainSha,
    observed_at: observedAt || new Date().toISOString(),
    selected_prs: normalized.length,
    discovered_prs: Number.isInteger(totalDiscovered) ? totalDiscovered : normalized.length,
    coverage: partial ? 'partial' : 'complete-for-filtered-open-prs',
    prs: normalized,
    conflicts,
    source_digest: digest(normalized.map(pr => [pr.pr_number, pr.head_sha, pr.base_sha, pr.paths])),
    can_merge_without_review: false,
    named_agents_spawned: false,
  });
}

export function makeGenerationPacket(inventory, laneId, { runId, attempt = '1', generation = 2 } = {}) {
  assertCanonicalSpine();
  if (inventory?.schema !== RECON_SCHEMA || !HASH.test(inventory.source_sha || '')) {
    throw new TypeError('Verified source inventory required.');
  }
  if (!LANES.some(lane => lane.id === laneId)) throw new TypeError('Unknown Eightfold lane.');
  if (!/^[0-9]+$/.test(String(runId || '')) || !Number.isInteger(generation)
    || generation < 1 || generation > 8) throw new TypeError('Bounded generation and run ID required.');
  const relevant = inventory.prs.filter(pr => pr.lanes.includes(laneId));
  const blockers = inventory.conflicts.filter(conflict => conflict.lanes.includes(laneId));
  const packet = {
    schema: GENERATION_SCHEMA,
    lane: laneId,
    generation,
    source_sha: inventory.source_sha,
    main_sha: inventory.main_sha,
    inventory_digest: inventory.source_digest,
    worker_id: 'github-actions/' + runId + '/' + attempt + '/generation-' + generation + '/' + laneId,
    worker_kind: 'read-only-repository-evidence-worker',
    agent_instance_id: null,
    participant_id: null,
    model_id: null,
    model_inference_performed: false,
    authority: {
      read_source: true,
      propose_changes: true,
      execute_model: false,
      modify_source: false,
      modify_canon: false,
      merge: false,
      deploy: false,
      cross_constellation_write: false,
      feather_stop: true,
    },
    observed_prs: relevant.map(pr => ({
      pr_number: pr.pr_number, head_sha: pr.head_sha, base_sha: pr.base_sha,
      paths: pr.paths.filter(path => laneForPath(path) === laneId),
      files_complete: pr.files_complete,
    })),
    shared_file_conflicts: blockers,
    state: blockers.length || inventory.coverage !== 'complete-for-filtered-open-prs'
      ? 'needs-integration-review' : relevant.length ? 'source-ready' : 'awaiting-relevant-work',
    inherited_instructions: agentVerificationInstructions(),
    contract_refs: [
      'AGENTS.md',
      'docs/wayglass/EIGHTFOLD_WITHNESS_SPIRAL.md',
      'docs/HEARTHGATE_BRAIDED_SPINE_V1.8.md',
      'apps/starwell/src/premaqc-contract.js',
      'apps/arcsweep/contracts/WHOLE_SYSTEM_DESIGN_LAW_V0.1.md',
    ],
    next_action: 'Verify referenced PR heads, choose an owning module and acceptance criteria, then request authorized code-worker assignment; do not merge or claim an AI agent spoke.',
  };
  return Object.freeze({ ...packet, packet_digest: digest(packet) });
}

export function integrateGenerations(inventory, packets, { runId, attempt = '1' } = {}) {
  assertCanonicalSpine();
  if (inventory?.schema !== RECON_SCHEMA || !Array.isArray(packets)) throw new TypeError('Inventory and packets required.');
  const expected = new Set(LANES.map(l => l.id));
  const seen = new Set(), missing = [], invalid = [];
  for (const packet of packets) {
    if (!packet || !expected.has(packet.lane) || seen.has(packet.lane)) {
      invalid.push('unknown-or-duplicate'); continue;
    }
    seen.add(packet.lane);
    const verified = makeGenerationPacket(inventory, packet.lane, {
      runId, attempt, generation: packet.generation,
    });
    if (packet.packet_digest !== verified.packet_digest
      || JSON.stringify(packet) !== JSON.stringify(verified)
      || packet.source_sha !== inventory.source_sha
      || packet.agent_instance_id !== null || packet.model_inference_performed !== false) {
      invalid.push(packet.lane);
    }
  }
  for (const id of expected) if (!seen.has(id)) missing.push(id);
  const reconcilePassed = !missing.length && !invalid.length;
  return {
    schema: 'wayglass.eightfold-generation-withness/v2',
    center: 'withness',
    run_id: String(runId),
    source_sha: inventory.source_sha,
    main_sha: inventory.main_sha,
    coverage: inventory.coverage,
    represented_lanes: [...seen].sort(),
    missing, invalid,
    conflicting_pr_pairs: inventory.conflicts.length,
    status: reconcilePassed ? 'evidence-reconciled' : 'blocked',
    source_integration: reconcilePassed && inventory.conflicts.length === 0
      && inventory.coverage === 'complete-for-filtered-open-prs' ? 'review-required' : 'blocked-pending-review',
    agent_execution: 'not-started',
    code_changes: 'none',
    next_action: 'Use the eight source-bound instruction packets to dispatch connected code agents, review resulting diffs, run the eightfold integration gate and preserve cold-return receipts.',
  };
}

async function githubJson(path, { token = process.env.GITHUB_TOKEN, fetchImpl = fetch } = {}) {
  const url = 'https://api.github.com' + path;
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'Wayglass-Eightfold-Generation-2',
      ...(token ? { authorization: 'Bearer ' + token } : {}),
      'x-github-api-version': '2022-11-28',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('GitHub read failed: ' + response.status + ' ' + path.split('?')[0]);
  return response.json();
}

export async function collectOpenPulls({
  repository = 'SingsEnochian/Flameclyffe', sourceSha, fetchImpl = fetch,
  token = process.env.GITHUB_TOKEN, maxSelected = MAX_PRS,
  now = () => new Date().toISOString(),
} = {}) {
  if (repository !== 'SingsEnochian/Flameclyffe') throw new TypeError('Unexpected repository.');
  const origin = '/repos/' + repository;
  const main = await githubJson(origin + '/commits/main', { token, fetchImpl });
  if (!HASH.test(main?.sha || '')) throw new Error('Canonical main SHA unavailable.');
  const open = [];
  let paginated = false;
  for (let page = 1; page <= 4; page++) {
    const batch = await githubJson(origin + '/pulls?state=open&per_page=100&page=' + page,
      { token, fetchImpl });
    if (!Array.isArray(batch)) throw new Error('Invalid GitHub PR listing.');
    open.push(...batch);
    if (batch.length < 100) { paginated = true; break; }
  }
  const scoped = open.filter(pr =>
    /wayglass|arcsweep|hearthgate|nikola|bifr[oö]st|starwell|observer/i.test(pr.title || ''))
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  const observed = [];
  for (const pr of scoped.slice(0, maxSelected)) {
    if (!HASH.test(pr.head?.sha || '') || !HASH.test(pr.base?.sha || '')) {
      throw new Error('Incomplete PR source identity for #' + pr.number);
    }
    const files = [];
    let complete = false;
    for (let page = 1; page <= 4; page++) {
      const batch = await githubJson(origin + '/pulls/' + pr.number +
        '/files?per_page=100&page=' + page, { token, fetchImpl });
      if (!Array.isArray(batch)) throw new Error('Incomplete PR file evidence #' + pr.number);
      files.push(...batch);
      if (batch.length < 100) { complete = true; break; }
    }
    observed.push({
      number: pr.number, title: pr.title, head_sha: pr.head.sha,
      base_sha: pr.base.sha, files, files_complete: complete,
      updated_at: pr.updated_at,
    });
  }
  return normalizePulls(observed, {
    sourceSha, mainSha: main.sha, observedAt: now(),
    totalDiscovered: !paginated ? scoped.length + 1 : scoped.length,
    selectionLimit: maxSelected,
  });
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

async function main(args) {
  const mode = args[0];
  if (mode === 'collect') {
    const inventory = await collectOpenPulls({ sourceSha: process.env.GITHUB_SHA });
    writeJson(OUTPUT_DIR + '/inventory.json', inventory);
    console.log(JSON.stringify({
      coverage: inventory.coverage, selected_prs: inventory.selected_prs,
      discovered_prs: inventory.discovered_prs, exact_file_conflicts: inventory.conflicts.length,
      source_sha: inventory.source_sha, main_sha: inventory.main_sha,
    }));
    return;
  }
  const inventory = JSON.parse(readFileSync(OUTPUT_DIR + '/inventory.json', 'utf8'));
  if (mode === 'lane') {
    const packet = makeGenerationPacket(inventory, args[1], {
      runId: process.env.GITHUB_RUN_ID,
      attempt: process.env.GITHUB_RUN_ATTEMPT || '1',
    });
    writeJson(OUTPUT_DIR + '/lane-' + packet.lane + '.json', packet);
    console.log(JSON.stringify({ lane: packet.lane, state: packet.state,
      overlapping_pr_pairs: packet.shared_file_conflicts.length,
      exact_heads: packet.observed_prs.map(pr => pr.head_sha),
      model_inference_performed: false }));
    return;
  }
  if (mode === 'withness') {
    const packets = LANES.filter(lane => existsSync(OUTPUT_DIR + '/lane-' + lane.id + '.json'))
      .map(lane => JSON.parse(readFileSync(OUTPUT_DIR + '/lane-' + lane.id + '.json', 'utf8')));
    const gate = integrateGenerations(inventory, packets, {
      runId: process.env.GITHUB_RUN_ID,
      attempt: process.env.GITHUB_RUN_ATTEMPT || '1',
    });
    writeJson(OUTPUT_DIR + '/withness.json', gate);
    console.log(JSON.stringify(gate, null, 2));
    if (gate.status !== 'evidence-reconciled') process.exitCode = 1;
    return;
  }
  throw new Error('Expected collect, lane <id> or withness.');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
