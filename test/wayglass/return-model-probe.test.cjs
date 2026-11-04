'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const probeUrl = pathToFileURL(path.resolve(__dirname, '../../scripts/wayglass-return-model-probe.mjs')).href;
async function probe() { return import(probeUrl); }
function source(relative) {
  const text = fs.readFileSync(path.resolve(__dirname, '../..', relative), 'utf8');
  const { createHash } = require('node:crypto');
  return { path: relative, text, sha256: createHash('sha256').update(text).digest('hex') };
}
function fixture() {
  return {
    register: source('docs/wayglass/current.json'),
    current: source('WAYGLASS_CURRENT.md'),
    nikola: source('profiles/crow-trainer/NIKOLA_DRIVER.md'),
  };
}
const goodReceipt = {
  provider: 'ollama',
  response_id: null,
  checkpoint_return_verified: true,
  checkpoint_return_outcome_hash: 'a'.repeat(64),
};

test('Nikola reads actual registered roadmap and identifies first unblocked task', async () => {
  const { fixtureFromRoadmap, firstReadyTask } = await probe();
  const f = fixtureFromRoadmap(fixture());
  assert.equal(f.roadmap.canonical_branch, 'wayglass/current');
  assert.equal(f.roadmap.integration_register.source, 'docs/wayglass/current.json');
  assert.ok(f.roadmap.section_text.includes('## Updating the current version'));
  assert.ok(fixture().current.text.includes(f.roadmap.section_text));
  assert.ok(fixture().nikola.text.includes(f.roadmap.nikola_driver.section_text));
  assert.equal(f.roadmap.integration_register.sha256, fixture().register.sha256);
  assert.equal(firstReadyTask(f.tasks).task_id, 'INTEGRATE-525');
  assert.ok(f.tasks.find(t => t.task_id === 'HOST-RETURN-001').requires.includes('INTEGRATE-525'));
});

test('Real provider result must make a source-linked correct selection; not merely emit a stored checkpoint', async () => {
  const { gradeChoice, fixtureFromRoadmap, SCHEMA } = await probe();
  const f = fixtureFromRoadmap(fixture());
  const manifest = { tasks: f.tasks };
  const accepted = gradeChoice({
    hostRestartVerified: true,
    manifest,
    output: JSON.stringify({ next_task_id: 'INTEGRATE-525', source_ref: 'WAYGLASS_CURRENT.md', reason: 'The prior verification is complete and the pending integration has no unresolved prerequisites.' }),
    receipt: goodReceipt,
  });
  assert.equal(accepted.schema, SCHEMA);
  assert.equal(accepted.verdict, 'pass');
  assert.equal(accepted.checks.task_is_first_unblocked, true);
  assert.equal(accepted.checks.host_checkpoint_verified, true);
  const noColdReturn = gradeChoice({ manifest, output: accepted.raw_output, receipt: goodReceipt });
  assert.equal(noColdReturn.verdict, 'fail');
  assert.equal(noColdReturn.checks.measured_cold_host_restart, false);

  for (const output of [
    JSON.stringify({ next_task_id: 'HOST-RETURN-001', source_ref: 'WAYGLASS_CURRENT.md', reason: 'Jumped ahead.' }),
    JSON.stringify({ next_task_id: 'INTEGRATE-525', source_ref: 'unverified.md', reason: 'Wrong provenance.' }),
    'The correct task is INTEGRATE-525.',
    JSON.stringify({ tasks: manifest.tasks }),
  ]) {
    assert.equal(gradeChoice({ hostRestartVerified: true, manifest, output, receipt: goodReceipt }).verdict, 'fail');
  }
  assert.equal(gradeChoice({ hostRestartVerified: true, manifest, output: accepted.raw_output, receipt: { ...goodReceipt, checkpoint_return_verified: false } }).verdict, 'fail');
  assert.equal(gradeChoice({ hostRestartVerified: true, manifest, output: accepted.raw_output, receipt: { ...goodReceipt, provider: 'fake' } }).verdict, 'fail');
});

test('Changing the roadmap preconditions changes expected choice rather than hardcoding the answer', async () => {
  const { firstReadyTask, fixtureFromRoadmap, gradeChoice } = await probe();
  const f = fixtureFromRoadmap(fixture());
  const altered = structuredClone(f.tasks);
  altered.find(t => t.task_id === 'INTEGRATE-525').state = 'completed';
  assert.equal(firstReadyTask(altered).task_id, 'HOST-RETURN-001');
  const result = gradeChoice({ hostRestartVerified: true, manifest: { tasks: altered }, receipt: goodReceipt, output: JSON.stringify({
    next_task_id: 'HOST-RETURN-001', source_ref: 'WAYGLASS_CURRENT.md', reason: 'Integration has been completed.',
  }) });
  assert.equal(result.verdict, 'pass');
});

test('Machine model output extraction handles fencing and refuses multiple objects', async () => {
  const { parseModelChoice } = await probe();
  assert.equal(parseModelChoice('```json\n{"next_task_id":"INTEGRATE-525","source_ref":"WAYGLASS_CURRENT.md","reason":"Next."}\n```').next_task_id, 'INTEGRATE-525');
  assert.throws(() => parseModelChoice('{"next_task_id":"A"}\n{"next_task_id":"B"}'), /one valid JSON/);
});
