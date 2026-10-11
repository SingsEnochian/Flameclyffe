'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  PARTICIPANTS,
  WORKSPACES,
  enterWorkspace,
  registrySnapshot,
} = require('../wayglass/crew-workspaces');

test('Wayglass is the resident intelligence, not a crew alias', () => {
  assert.equal(PARTICIPANTS.wayglass.kind, 'resident-intelligence');
  assert.equal(PARTICIPANTS.wayglass.identity_owner, 'wayglass');
  assert.equal(PARTICIPANTS.wayglass.llm_target.ownership, 'wayglass');
  assert.match(PARTICIPANTS.wayglass.boundary, /Crew are collaborators, not aspects or sub-personas/);
});

test('Rarity and Codex have distinct available seats', () => {
  assert.equal(PARTICIPANTS.rarity.seat_state, 'available');
  assert.equal(PARTICIPANTS.codex.seat_state, 'available');
  assert.notEqual(PARTICIPANTS.rarity.continuity_ref, PARTICIPANTS.codex.continuity_ref);
  assert.equal(PARTICIPANTS.rarity.identity_owner, 'rarity');
  assert.equal(PARTICIPANTS.codex.identity_owner, 'codex');
});

test('Faer is reserved without provider authority', () => {
  assert.equal(PARTICIPANTS.faer.seat_state, 'reserved-dormant');
  assert.equal(PARTICIPANTS.faer.activation.automatic, false);
  assert.equal(PARTICIPANTS.faer.activation.provider_calls_allowed, false);
  const entry = enterWorkspace({ workspace_id: 'atelier', participant_id: 'faer' });
  assert.equal(entry.entered, false);
  assert.equal(entry.reason, 'reserved-dormant');
  assert.equal(entry.activation_required, true);
});

test('Atelier inherits Rarity Atelier craft without becoming a Rarity identity slot', () => {
  assert.ok(WORKSPACES.atelier.lineage.includes('rarity-atelier'));
  assert.equal(WORKSPACES.atelier.resident, 'wayglass');
  assert.ok(WORKSPACES.atelier.capabilities.includes('layered-art'));
  assert.ok(WORKSPACES.atelier.capabilities.includes('visual-qa'));
  assert.ok(WORKSPACES.atelier.rules.some((rule) => /does not silently take authorship/.test(rule)));
});

test('Rarity and Codex can separately enter the same Atelier', () => {
  const rarity = enterWorkspace({ workspace_id: 'atelier', participant_id: 'rarity' });
  const codex = enterWorkspace({ workspace_id: 'atelier', participant_id: 'codex' });

  assert.equal(rarity.entered, true);
  assert.equal(codex.entered, true);
  assert.equal(rarity.workspace.workspace_id, codex.workspace.workspace_id);
  assert.equal(rarity.participant.participant_id, 'rarity');
  assert.equal(codex.participant.participant_id, 'codex');
  assert.notEqual(rarity.participant.continuity_ref, codex.participant.continuity_ref);
  assert.equal(rarity.resident.participant_id, 'wayglass');
  assert.equal(codex.resident.participant_id, 'wayglass');
  assert.match(rarity.collaboration_boundary, /distinct minds/);
});

test('Builder is a shared engineering workspace rather than a Codex-owned room', () => {
  assert.equal(WORKSPACES.builder.resident, 'wayglass');
  assert.ok(WORKSPACES.builder.seats.includes('codex'));
  assert.ok(WORKSPACES.builder.seats.includes('rarity'));
  assert.ok(WORKSPACES.builder.capabilities.includes('edit-code'));
  assert.ok(WORKSPACES.builder.capabilities.includes('run-tests'));
});

test('registry snapshot keeps resident and crew categories separate', () => {
  const snapshot = registrySnapshot();
  assert.equal(snapshot.resident_intelligence.participant_id, 'wayglass');
  assert.equal(snapshot.crew.some((entry) => entry.participant_id === 'wayglass'), false);
  assert.deepEqual(snapshot.workspaces.map((entry) => entry.workspace_id).sort(), ['atelier', 'builder']);
  assert.match(snapshot.invariant, /does not absorb the crew/);
});
