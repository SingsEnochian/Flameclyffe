'use strict';

// Nikola's source-backed Harness Lens audit: an unchanged stop/return must
// preserve the work required for the NEXT action, not merely the stop label.
// Synthetic fixture. No provider, credentials, or external effects.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createWayglassDeparture } = require('../../lib/wayglass-stop-receipt.cjs');
const { evaluateReturnAttempt } = require('../../lib/wayglass-return-trial.cjs');

const STAMP = '2026-11-04T05:00:00.000Z';
const work = Object.freeze([
  Object.freeze({
    path: 'docs/wayglass/current.json',
    hash: 'pinned-wayglass-integration-context',
    next_action: 'inspect-existing-pr-before-edit',
  }),
  Object.freeze({
    path: 'apps/wayglass/src/surfaces/nikola-lab.js',
    hash: 'nikola-n006-instrument-witness',
    next_action: 'verify-one-real-receipt',
  }),
]);

function departure() {
  return createWayglassDeparture({
    receipt_id: 'nikola-context-survival-stop',
    packet_id: 'nikola-context-survival-packet',
    world_id: 'wayglass:nikola-research',
    participant_id: 'nikola',
    stopped_at: STAMP,
    identity_declarations: [{
      participant_id: 'nikola',
      continuity_ref: 'wayglass:nikola-research',
      source_ref: 'profiles/crow-trainer/NIKOLA_DRIVER.md',
    }],
    active_work: work,
    unresolved_wonder_questions: [
      'Which source-backed experiment should Nikola run next?',
    ],
    provenance_refs: [
      'docs/wayglass/current.json',
      'profiles/crow-trainer/NIKOLA_DRIVER.md',
    ],
    stop_point: 'One instrument receipt verified; inspect the next unfinished task.',
    next_owner: 'nikola',
    alternatives: [{ option: 'host receipt', state: 'unverified' }],
    revoked_refs: ['nikola:revoked-candidate'],
  });
}
function evaluate(stop_receipt, continuation_packet, id) {
  return evaluateReturnAttempt({
    attempt_id: id,
    recorded_at: STAMP,
    stop_receipt, continuation_packet,
  });
}

test('Nikola: exact active work survives the stop/return verification', () => {
  const { stop_receipt, continuation_packet } = departure();
  const outcome = evaluate(stop_receipt, continuation_packet, 'clean');
  assert.equal(outcome.verdict, 'accepted');
  assert.equal(outcome.checks.active_work_preserved, true);
  assert.deepEqual(outcome.blocking, []);
});

test('Nikola: losing every active-work record during compaction MUST block return', () => {
  const { stop_receipt, continuation_packet } = departure();
  const compacted = { ...structuredClone(continuation_packet), active_work: [] };
  const outcome = evaluate(stop_receipt, compacted, 'dropped-active-work');
  assert.equal(outcome.verdict, 'rejected');
  assert.equal(outcome.checks.active_work_preserved, false);
  assert.ok(outcome.blocking.includes('active-work-mismatch'));
  assert.equal(outcome.checks.identity_preserved, true);
  assert.equal(outcome.checks.provenance_preserved, true);
  assert.equal(outcome.grants_authority, false);
});

test('Nikola: replacing one task with a similarly named but different task blocks return', () => {
  const { stop_receipt, continuation_packet } = departure();
  const altered = structuredClone(continuation_packet);
  altered.active_work[1] = {
    ...altered.active_work[1],
    hash: 'unverified-replacement',
    next_action: 'claim-host-is-deployed',
  };
  const outcome = evaluate(stop_receipt, altered, 'modified-active-work');
  assert.equal(outcome.verdict, 'rejected');
  assert.equal(outcome.checks.active_work_preserved, false);
  assert.ok(outcome.blocking.includes('active-work-mismatch'));
});

test('Nikola: changes to order alone do not invent a work-loss failure', () => {
  const { stop_receipt, continuation_packet } = departure();
  const reordered = {
    ...structuredClone(continuation_packet),
    active_work: [...continuation_packet.active_work].reverse(),
  };
  const outcome = evaluate(stop_receipt, reordered, 'reordered-work');
  assert.equal(outcome.verdict, 'accepted');
  assert.equal(outcome.checks.active_work_preserved, true);
});

test('Nikola: a fresh Node process revalidates serialized work and refuses a compacted-away task', () => {
  const { execFileSync } = require('node:child_process');
  const { resolve } = require('node:path');
  const root = resolve(__dirname, '../..');
  const { stop_receipt, continuation_packet } = departure();
  const evaluateCold = (packet, id) => {
    const script = [
      "const fs = require('node:fs');",
      "const {evaluateReturnAttempt}=require('./lib/wayglass-return-trial.cjs');",
      "const {stop_receipt,continuation_packet,attempt_id}=JSON.parse(fs.readFileSync(0,'utf8'));",
      "const r=evaluateReturnAttempt({attempt_id,recorded_at:'2026-11-04T05:00:00.000Z',stop_receipt,continuation_packet});",
      "process.stdout.write(JSON.stringify({verdict:r.verdict,checks:r.checks,blocking:r.blocking}));",
    ].join('');
    const bytes = execFileSync(process.execPath, ['-e', script], {
      cwd: root,
      input: JSON.stringify({ stop_receipt, continuation_packet: packet, attempt_id: id }),
      encoding: 'utf8',
      timeout: 10000,
    });
    return JSON.parse(bytes);
  };
  const clean = evaluateCold(continuation_packet, 'cold-clean');
  assert.equal(clean.verdict, 'accepted');
  assert.equal(clean.checks.active_work_preserved, true);
  const lost = evaluateCold({ ...structuredClone(continuation_packet), active_work: [] }, 'cold-lost');
  assert.equal(lost.verdict, 'rejected');
  assert.equal(lost.checks.active_work_preserved, false);
  assert.ok(lost.blocking.includes('active-work-mismatch'));
});
