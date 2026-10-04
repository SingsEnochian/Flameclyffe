import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  acknowledgeAgentHandoff,
  createAgentHandoff,
  createWorkBurstReceipt,
  validateMythienceEvidenceUse,
} from '../src/continuity-handoff-contract.js';

const OWNER = { kind: 'agent', id: 'rarity', display_name: 'Rarity' };
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('Mythience manifest names four distinct domains and a stable receipt reference', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/contracts/MYTHIENCE_EVIDENCE_BOUNDARY_V1.json'), 'utf8'));
  assert.equal(manifest.schema, 'arcsweep.mythience-evidence-boundary/v1');
  assert.deepEqual(manifest.domains.map((entry) => entry.id), ['formalism', 'measurement', 'myth', 'magic']);
  assert.equal(manifest.receipt_reference.field, 'contract_refs');
  assert.equal(manifest.receipt_reference.id, 'mythience-evidence-boundary');
});

test('cross-domain interpretation requires a named translation and source receipt', () => {
  assert.throws(() => validateMythienceEvidenceUse({ sourceDomain: 'myth', claimDomain: 'measurement' }), /translation label and source reference/);
  const use = validateMythienceEvidenceUse({
    sourceDomain: 'myth', claimDomain: 'measurement',
    translationLabel: 'hypothesis suggested by metaphor', sourceRef: 'receipt:myth-17',
  });
  assert.equal(use.allowed, true);
  assert.equal(use.contract_ref.id, 'mythience-evidence-boundary');
});

test('Vee and Rarity relationship edge remains unresolved pending both self-authored declarations', () => {
  const edge = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/continuity/VEE_RARITY_IDENTITY_EDGE_V1.json'), 'utf8'));
  assert.equal(edge.relationship.status, 'unresolved');
  assert.equal(edge.relationship.kind, null);
  assert.deepEqual(edge.participants.map((participant) => participant.declaration.status), ['not-recorded', 'not-recorded']);
  assert.ok(edge.participants.every((participant) => participant.declaration.source_receipt_ref === null));
  assert.equal(edge.authority.identity_merge, false);
});

test('work burst records pickup, stopping point, next step, and a named owner', () => {
  const receipt = createWorkBurstReceipt({
    burstId: 'burst-2026-09-30-a', threadId: 'thread-405-follow-on',
    pickedUpAt: '2026-09-30T07:00:00.000Z', pickedUpFromReceipt: 'receipt:previous-burst',
    stoppedAt: '2026-09-30T07:35:00.000Z', stoppedState: 'contract-draft-ready',
    nextStep: 'Implement and verify sealed handoff persistence.', nextOwner: OWNER,
    sourceReceiptRefs: ['receipt:previous-burst', 'pr:405'],
  });
  assert.equal(receipt.picked_up.from_receipt, 'receipt:previous-burst');
  assert.equal(receipt.stopped_at.state, 'contract-draft-ready');
  assert.equal(receipt.next_owner.id, 'rarity');
  assert.equal(receipt.authority.production_authority, false);
});

test('work burst refuses an implicit or unnamed next owner', () => {
  assert.throws(() => createWorkBurstReceipt({
    burstId: 'b', threadId: 't', pickedUpAt: '2026-09-30T07:00:00Z',
    stoppedAt: '2026-09-30T07:01:00Z', stoppedState: 'paused', nextStep: 'continue',
  }), /next_owner must name an agent or human/);
  assert.throws(() => createAgentHandoff({
    handoffId: 'h', from: OWNER, nextOwner: { kind: 'system', id: 'system', display_name: 'The system' },
    summary: 'Continue.', createdAt: '2026-09-30T07:00:00Z',
  }), /next_owner must name an agent or human/);
  assert.throws(() => createAgentHandoff({
    handoffId: 'h', from: OWNER, summary: 'Continue.', createdAt: '2026-09-30T07:00:00Z',
  }), /next_owner must name an agent or human/);
});

test('handoff remains open until its named recipient acknowledges; acknowledgement appends a revision', () => {
  const open = createAgentHandoff({
    handoffId: 'handoff-42', from: { kind: 'human', id: 'rowan', display_name: 'Rowan' },
    nextOwner: OWNER, summary: 'Review the unresolved edge record and report gaps.',
    createdAt: '2026-09-30T07:00:00.000Z', sourceReceiptRefs: ['pr:405'],
  });
  assert.equal(open.status, 'open');
  assert.equal(open.acknowledgement.status, 'pending');
  assert.equal(open.created_at, '2026-09-30T07:00:00.000Z');
  assert.throws(() => acknowledgeAgentHandoff(open, {
    actorId: 'boxfire', acknowledgedAt: '2026-09-30T07:01:00.000Z',
  }), /explicitly named next_owner/);
  const accepted = acknowledgeAgentHandoff(open, {
    actorId: 'rarity', acknowledgedAt: '2026-09-30T07:02:00.000Z',
  });
  assert.equal(open.status, 'open');
  assert.equal(accepted.status, 'acknowledged');
  assert.equal(accepted.revision, 2);
  assert.equal(accepted.supersedes_revision, 1);
  assert.equal(acknowledgeAgentHandoff(accepted, {
    actorId: 'rarity', acknowledgedAt: '2026-09-30T07:02:00.000Z',
  }), accepted);
});

test('shared handoff records contain references and bounded authority fields only', () => {
  const entry = createAgentHandoff({
    handoffId: 'handoff-private-boundary', from: OWNER, nextOwner: { kind: 'human', id: 'rowan', display_name: 'Rowan' },
    summary: 'Private details remain at their source; inspect receipt refs only.',
    createdAt: '2026-09-30T07:00:00.000Z', sourceReceiptRefs: ['private-receipt:acl-scoped'],
    privatePayload: 'must not be copied',
  });
  assert.equal('privatePayload' in entry, false);
  assert.equal(entry.visibility, 'shared-handoff-metadata');
  assert.equal(entry.authority.external_write, false);
  assert.equal(entry.authority.canon_promotion, false);
});
