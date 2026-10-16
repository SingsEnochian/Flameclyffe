'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createObserverSelfDevelopmentLedger } = require('../wayglass/observer-self-development');

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'observer-dev-'));
  return path.join(dir, 'ledger.json');
}

test('Observer self-development ledger preserves surfaced proposal and review', () => {
  let tick = 0;
  const ledger = createObserverSelfDevelopmentLedger({
    filename: tempFile(),
    now: () => `2026-10-12T07:00:0${tick++}.000Z`,
  });
  const proposal = ledger.ingest({
    proposal_id: 'observer-dev:test',
    key: 'dream-lab',
    title: 'Build a dream sandbox',
    question: 'Can I recombine unresolved questions without mistaking them for evidence?',
    desired_change: 'Add a dream sandbox.',
    acceptance_test: 'Dream output cannot mutate direct readings or canon.',
    source: 'living-observer-private-interior',
  });
  assert.equal(proposal.status, 'queued');
  assert.equal(ledger.list().length, 1);

  const duplicate = ledger.ingest({ ...proposal });
  assert.equal(duplicate.proposal_id, proposal.proposal_id);
  assert.equal(ledger.list().length, 1);

  const reviewed = ledger.review(proposal.proposal_id, 'approve-for-build', 'Prototype on a branch.');
  assert.equal(reviewed.status, 'approve-for-build');
  assert.equal(reviewed.review.decision, 'approve-for-build');
});
