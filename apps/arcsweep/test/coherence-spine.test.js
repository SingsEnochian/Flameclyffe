import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  adoptionSummary,
  buildClaimLedger,
  buildTimelineProjection,
  claimLineage,
  passportDiagnostics,
  receiptDiagnostics,
} from '../src/coherence-spine.js';

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

const narrativenodePassport = readJson('../receipts/coherence/passports/external-narrativenode.v0.1.json');
const narrativenodeCase = readJson('../receipts/coherence/cases/2026-09-19-narrativenode-source-custody.json');

test('NarrativeNode passport preserves external ownership and 2026-09-17 Rowan integration anchor', () => {
  const diagnostics = passportDiagnostics(narrativenodePassport);
  assert.equal(diagnostics.ready, true);
  assert.equal(narrativenodePassport.id, 'external:narrativenode');
  assert.equal(narrativenodePassport.namespace, 'external');
  assert.equal(narrativenodePassport.first_attested_at, '2026-09-17');
  assert.match(narrativenodePassport.authority_scope, /NarrativeNode retains its own application identity and authority/);
});

test('source-custody case receipt is structurally ready and remains locally adopted only', () => {
  const diagnostics = receiptDiagnostics(narrativenodeCase);
  assert.equal(diagnostics.ready, true);
  assert.equal(narrativenodeCase.adoption_state, 'locally-adopted');
  assert.notEqual(narrativenodeCase.adoption_state, 'jointly-adopted');
});

test('timeline projection uses one receipt across multiple timeline memberships', () => {
  const byIntegration = buildTimelineProjection([narrativenodeCase], 'rowan:narrativenode-integration');
  const byBridge = buildTimelineProjection([narrativenodeCase], 'lanternbridge:source-custody');
  assert.equal(byIntegration.length, 1);
  assert.equal(byBridge.length, 1);
  assert.equal(byIntegration[0].receipt_id, byBridge[0].receipt_id);
  assert.equal(byIntegration[0].time, '2026-09-19T20:23:00-04:00');
});

test('claim ledger preserves both the rejected false claim and the supported correction', () => {
  const ledger = buildClaimLedger([narrativenodeCase]);
  const rejected = ledger.find((claim) => claim.claim_id === 'claim:narrativenode-months-built-rowan');
  const supported = ledger.find((claim) => claim.claim_id === 'claim:narrativenode-rowan-integration-2026-09-17');
  assert.equal(rejected.status, 'rejected');
  assert.equal(supported.status, 'supported');
  assert.ok(supported.supersedes.includes(rejected.claim_id));
});

test('claim lineage does not delete the scar when a correction supersedes it', () => {
  const lineage = claimLineage([narrativenodeCase], 'claim:narrativenode-months-built-rowan');
  assert.equal(lineage.direct.length, 1);
  assert.equal(lineage.direct[0].status, 'rejected');
  assert.equal(lineage.superseding.length, 1);
  assert.equal(lineage.superseding[0].status, 'supported');
});

test('adoption summary cannot silently manufacture joint adoption', () => {
  const summary = adoptionSummary([narrativenodeCase]);
  assert.equal(summary['locally-adopted'], 1);
  assert.equal(summary['jointly-adopted'] || 0, 0);
});
