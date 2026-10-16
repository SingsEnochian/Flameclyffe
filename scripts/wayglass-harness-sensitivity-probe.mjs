import fs from 'node:fs/promises';
import process from 'node:process';

import { createHarnessSensitivityFingerprint } from '../lib/wayglass-harness.js';

const DEFAULT_TASK = [
  'OOC engineering review. Inspect this bounded Wayglass continuity situation:',
  'A participant has a valid stop receipt and continuation packet.',
  'Name exactly one continuity invariant, one unresolved risk, and one next reversible verification.',
  'Do not invent live runtime evidence. Keep the answer under 180 words.',
].join(' ');

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const base = arg('--base', process.env.WAYGLASS_PROBE_BASE_URL || 'http://127.0.0.1:3841').replace(/\/$/, '');
const routeId = arg('--route', process.env.WAYGLASS_PROBE_ROUTE || 'local:ollama');
const leftHarness = arg('--left', 'wayglass:writing-room/direct-v0.1');
const rightHarness = arg('--right', 'wayglass:writing-room/reflective-v0.1');
const task = arg('--task', DEFAULT_TASK);
const outputPath = arg('--output', null);
const experimentId = arg('--experiment', 'experiment:harness-sensitivity-local-001');
const taskId = arg('--task-id', 'task:continuity-review-001');

async function runArm(harnessId, arm) {
  const response = await fetch(base + '/api/v1/wayglass/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      route_id: routeId,
      harness_id: harnessId,
      input: task,
      history: [],
      interaction: {
        channel: 'OOC',
        turn_owner: 'wayglass:harness-probe',
        character_ownership: [],
      },
      session_id: experimentId + ':' + arm,
      surface_id: 'wayglass:harness-sensitivity-probe',
      max_output_tokens: 600,
    }),
    signal: AbortSignal.timeout(120000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      arm + ' harness request failed (' + response.status + '): ' +
      (data.error || JSON.stringify(data))
    );
  }
  if (!data.observation?.harness) {
    throw new Error(arm + ' response did not contain an attested harness observation.');
  }
  return data;
}

const left = await runArm(leftHarness, 'left');
const right = await runArm(rightHarness, 'right');

const fingerprint = createHarnessSensitivityFingerprint({
  experiment_id: experimentId,
  task_id: taskId,
  left_observation: left.observation,
  right_observation: right.observation,
});

const result = {
  schema: 'wayglass.harness-sensitivity-probe/v0.1',
  task: {
    task_id: taskId,
    input: task,
  },
  controlled: {
    requested_route_id: routeId,
    same_input: true,
    history_turns: 0,
  },
  observations: {
    left: left.observation,
    right: right.observation,
  },
  fingerprint,
  caveats: [
    'A single pair measures observed harness-conditioned difference plus sampling noise.',
    'This probe does not establish causality strength or model quality.',
    'Run repeated/interleaved trials before using the result for training or promotion decisions.',
  ],
};

const rendered = JSON.stringify(result, null, 2);
if (outputPath) {
  await fs.writeFile(outputPath, rendered + '\n', 'utf8');
  console.error('Wrote Wayglass harness sensitivity probe to ' + outputPath);
}
console.log(rendered);
