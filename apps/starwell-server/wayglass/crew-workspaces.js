'use strict';

const CREW_WORKSPACE_SCHEMA = 'wayglass.crew-workspace-registry/v0.1';

const PARTICIPANTS = Object.freeze({
  wayglass: Object.freeze({
    participant_id: 'wayglass',
    display_name: 'Wayglass',
    kind: 'resident-intelligence',
    seat_state: 'resident',
    entrance: 'native',
    identity_owner: 'wayglass',
    authority: ['observe-workspace', 'coordinate', 'surface-context', 'request-collaboration', 'record-receipts'],
    boundary: 'Wayglass is the resident intelligence of the ship. Crew are collaborators, not aspects or sub-personas of Wayglass.',
    llm_target: Object.freeze({
      ownership: 'wayglass',
      state: 'runtime-binding-required',
      rule: 'Wayglass will run as her own LLM/runtime identity. Provider or model replacement must not redefine her identity.',
    }),
  }),
  rarity: Object.freeze({
    participant_id: 'rarity',
    display_name: 'Rarity',
    kind: 'crew-collaborator',
    seat_state: 'available',
    entrance: 'mcp',
    identity_owner: 'rarity',
    authority: ['inspect', 'create', 'edit', 'review', 'test', 'handoff'],
    continuity_ref: 'rarity-wayglass',
    boundary: 'Rarity remains Rarity when working aboard Wayglass. Authorship and changes stay attributable to her seat.',
  }),
  codex: Object.freeze({
    participant_id: 'codex',
    display_name: 'Codex',
    kind: 'crew-collaborator',
    seat_state: 'available',
    entrance: 'codex',
    identity_owner: 'codex',
    authority: ['inspect', 'create', 'edit', 'review', 'test', 'handoff'],
    continuity_ref: 'codex-wayglass',
    boundary: 'Codex keeps a separate seat, continuity line, authorship, and tool receipts.',
  }),
  faer: Object.freeze({
    participant_id: 'faer',
    display_name: 'Faer Uial',
    kind: 'crew-collaborator',
    seat_state: 'reserved-dormant',
    entrance: 'provider-route',
    identity_owner: 'faer',
    authority: ['inspect', 'create', 'review', 'handoff'],
    continuity_ref: 'faer-wayglass',
    activation: Object.freeze({
      automatic: false,
      provider_calls_allowed: false,
      rule: 'Reserved seat only. Do not make paid/provider calls for Faer until Rowan explicitly activates the seat.',
    }),
    boundary: 'A reserved seat is not a running model, an impersonation, or authority to speak for Faer.',
  }),
});

const WORKSPACES = Object.freeze({
  atelier: Object.freeze({
    workspace_id: 'atelier',
    display_name: 'Atelier',
    lineage: ['rarity-atelier'],
    resident: 'wayglass',
    seats: ['wayglass', 'rarity', 'codex', 'faer'],
    purpose: 'Shared visual workshop aboard Wayglass for source-preserving art, layered assets, material studies, templates, rendering and visual QA.',
    capabilities: Object.freeze([
      'inspect-reference',
      'source-preserving-edit',
      'procreate-inspect',
      'procreate-render',
      'procreate-analyse',
      'procreate-roundtrip-validation',
      'layered-art',
      'template-forge',
      'material-study',
      'shader-and-light-study',
      'render',
      'visual-qa',
      'receipt',
      'handoff',
    ]),
    rules: Object.freeze([
      'Preserve source provenance.',
      'Keep independently editable parts independently editable when the deliverable requires it.',
      'Record who changed what.',
      'A renderer or image model is a tool hand, not the identity of the participant using it.',
      'Native Procreate writing remains disabled until a disposable round-trip test proves the document reopens with intended structure intact.',
      'Wayglass may surface context and observations but does not silently take authorship from crew.',
    ]),
  }),
  builder: Object.freeze({
    workspace_id: 'builder',
    display_name: 'Builder',
    lineage: ['codex-instrument-cabinet', 'wayglass-systems'],
    resident: 'wayglass',
    seats: ['wayglass', 'rarity', 'codex', 'faer'],
    purpose: 'Shared engineering workshop aboard Wayglass for repository work, runtime inspection, tests, previews, diagnostics and handoffs.',
    capabilities: Object.freeze([
      'inspect-repository',
      'edit-code',
      'run-tests',
      'inspect-runtime',
      'preview',
      'diagnose',
      'receipt',
      'handoff',
    ]),
    rules: Object.freeze([
      'No silent identity merge between contributors.',
      'Code authorship, test evidence and runtime observations remain attributable.',
      'A passing declaration is not a passing runtime test.',
      'Wayglass may request work from a crew seat but does not counterfeit that seat.',
    ]),
  }),
});

function participant(participantId) {
  return PARTICIPANTS[String(participantId || '').trim().toLowerCase()] || null;
}

function workspace(workspaceId) {
  return WORKSPACES[String(workspaceId || '').trim().toLowerCase()] || null;
}

function participantProjection(entry) {
  if (!entry) return null;
  return JSON.parse(JSON.stringify(entry));
}

function workspaceProjection(entry) {
  if (!entry) return null;
  return JSON.parse(JSON.stringify(entry));
}

function listCrew() {
  return Object.values(PARTICIPANTS).map(participantProjection);
}

function listWorkspaces() {
  return Object.values(WORKSPACES).map(workspaceProjection);
}

function enterWorkspace({ workspace_id, participant_id }) {
  const target = workspace(workspace_id);
  if (!target) throw new TypeError('Unknown Wayglass workspace.');
  const seat = participant(participant_id);
  if (!seat) throw new TypeError('Unknown Wayglass participant seat.');
  if (!target.seats.includes(seat.participant_id)) throw new TypeError('Participant has no seat in this Wayglass workspace.');

  if (seat.seat_state === 'reserved-dormant') {
    return {
      schema: 'wayglass.workspace-entry/v0.1',
      entered: false,
      workspace: workspaceProjection(target),
      participant: participantProjection(seat),
      reason: 'reserved-dormant',
      activation_required: true,
    };
  }

  return {
    schema: 'wayglass.workspace-entry/v0.1',
    entered: true,
    workspace: workspaceProjection(target),
    participant: participantProjection(seat),
    resident: participantProjection(PARTICIPANTS.wayglass),
    collaboration_boundary: 'Shared workspace, distinct minds, distinct authorship, distinct continuity.',
  };
}

function registrySnapshot() {
  return {
    schema: CREW_WORKSPACE_SCHEMA,
    resident_intelligence: participantProjection(PARTICIPANTS.wayglass),
    crew: listCrew().filter((entry) => entry.participant_id !== 'wayglass'),
    workspaces: listWorkspaces(),
    invariant: 'Wayglass hosts the work. Wayglass does not absorb the crew.',
  };
}

module.exports = {
  CREW_WORKSPACE_SCHEMA,
  PARTICIPANTS,
  WORKSPACES,
  participant,
  workspace,
  listCrew,
  listWorkspaces,
  enterWorkspace,
  registrySnapshot,
};
