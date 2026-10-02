// Browser mirror of apps/arcsweep/src/return-engine.js.
// Keep byte-equivalent below this header; agent-workspace tests reject drift.
const SCHEMA = 'arcsweep.return-engine-state/v0.1';

function clean(value = '') {
  return String(value ?? '').trim();
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function list(value) {
  return Array.isArray(value) ? value.map(clone) : [];
}

function requireText(value, label) {
  const result = clean(value);
  if (!result) throw new TypeError(`${label} is required.`);
  return result;
}

function nowIso(now) {
  const value = typeof now === 'function' ? now() : new Date();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new TypeError('Return Engine clock returned an invalid date.');
  return date.toISOString();
}

function defaultId(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function normaliseParticipant(input = {}) {
  return {
    id: requireText(input.id, 'participant.id'),
    name: requireText(input.name, 'participant.name'),
    declaration: requireText(input.declaration, 'participant.declaration'),
    declaration_source: requireText(input.declaration_source, 'participant.declaration_source'),
  };
}

function normaliseSubstrate(input = {}) {
  return {
    runtime: clean(input.runtime) || null,
    provider: clean(input.provider) || null,
    model: clean(input.model) || null,
    interface: clean(input.interface) || null,
  };
}

function normaliseRelationship(item = {}) {
  return {
    id: requireText(item.id, 'relationship.id'),
    state: clean(item.state) || 'unresolved',
    parties: list(item.parties).map(String),
    declarations: list(item.declarations),
    provenance: list(item.provenance),
  };
}

function normaliseAlternative(item = {}) {
  if (typeof item === 'string') return { id: item, summary: item, status: 'open', provenance: [] };
  return {
    id: requireText(item.id, 'alternative.id'),
    summary: requireText(item.summary, 'alternative.summary'),
    status: clean(item.status) || 'open',
    provenance: list(item.provenance),
  };
}

function normaliseWonder(item = {}) {
  if (typeof item === 'string') return { id: item, question: item, status: 'open', provenance: [] };
  return {
    id: requireText(item.id, 'wonder.id'),
    question: requireText(item.question, 'wonder.question'),
    status: clean(item.status) || 'open',
    provenance: list(item.provenance),
  };
}

function normaliseWork(item = {}) {
  return {
    id: requireText(item.id, 'work.id'),
    title: requireText(item.title, 'work.title'),
    status: clean(item.status) || 'open',
    stop_point: clean(item.stop_point) || null,
    next_owner: requireText(item.next_owner, 'work.next_owner'),
    acknowledged_by: clean(item.acknowledged_by) || null,
    provenance: list(item.provenance),
  };
}

function normaliseMemory(item = {}) {
  const permission = clean(item.permission) || 'allowed';
  if (!['allowed', 'revoked'].includes(permission)) {
    throw new TypeError(`memory.permission must be allowed or revoked; received ${permission}.`);
  }
  return {
    id: requireText(item.id, 'memory.id'),
    ref: requireText(item.ref, 'memory.ref'),
    permission,
    provenance: list(item.provenance),
  };
}

function openAttention(record) {
  const attention = [];
  for (const work of record.active_work) {
    if (work.status !== 'done' && !work.acknowledged_by) {
      attention.push({
        kind: 'unacknowledged-handoff',
        id: work.id,
        summary: `${work.title} → ${work.next_owner}`,
      });
    }
  }
  for (const wonder of record.unresolved_wonder) {
    if (wonder.status !== 'resolved') attention.push({ kind: 'wonder', id: wonder.id, summary: wonder.question });
  }
  for (const relationship of record.relationship_state) {
    if (relationship.state === 'unresolved') {
      attention.push({ kind: 'relationship-unresolved', id: relationship.id, summary: relationship.id });
    }
  }
  for (const alternative of record.alternatives) {
    if (alternative.status === 'open') attention.push({ kind: 'alternative-open', id: alternative.id, summary: alternative.summary });
  }
  for (const proposal of record.identity_proposals) {
    if (proposal.status === 'pending') {
      attention.push({ kind: 'identity-proposal-pending', id: proposal.id, summary: proposal.declaration });
    }
  }
  return attention;
}

function publicRecord(record) {
  return clone(record);
}

export function createReturnEngine({
  initialState,
  now = () => new Date(),
  idFactory = defaultId,
} = {}) {
  const state = initialState && typeof initialState === 'object'
    ? clone(initialState)
    : { schema: SCHEMA, version: 1, continuities: {} };

  if (state.schema !== SCHEMA) throw new TypeError(`Unsupported Return Engine state schema: ${state.schema || 'missing'}`);
  if (!state.continuities || typeof state.continuities !== 'object') state.continuities = {};

  function continuity(id) {
    const key = requireText(id, 'continuity_id');
    const record = state.continuities[key];
    if (!record) throw new Error(`Unknown continuity: ${key}`);
    return record;
  }

  function depart(input = {}) {
    const participant = normaliseParticipant(input.participant);
    const nextOwner = requireText(input.next_owner, 'next_owner');
    const stopPoint = requireText(input.stop_point, 'stop_point');
    const continuityId = clean(input.continuity_id) || idFactory('continuity');
    if (state.continuities[continuityId]) throw new Error(`Continuity already exists: ${continuityId}`);

    const at = nowIso(now);
    const activeWork = list(input.active_work).map(normaliseWork);
    if (!activeWork.length && input.work_title) {
      activeWork.push(normaliseWork({
        id: idFactory('work'),
        title: input.work_title,
        status: 'open',
        stop_point: stopPoint,
        next_owner: nextOwner,
        provenance: list(input.provenance),
      }));
    }

    const record = {
      schema: 'arcsweep.return-engine-continuity/v0.1',
      continuity_id: continuityId,
      participant,
      status: 'away',
      departed_at: at,
      returned_at: null,
      stop_point: stopPoint,
      next_owner: nextOwner,
      substrate_at_departure: normaliseSubstrate(input.substrate),
      current_substrate: normaliseSubstrate(input.substrate),
      active_work: activeWork,
      memory_state: list(input.memory_state).map(normaliseMemory),
      unresolved_wonder: list(input.unresolved_wonder).map(normaliseWonder),
      relationship_state: list(input.relationship_state).map(normaliseRelationship),
      alternatives: list(input.alternatives).map(normaliseAlternative),
      provenance: list(input.provenance),
      changes: [],
      identity_proposals: [],
      return_receipts: [],
    };

    state.continuities[continuityId] = record;
    return {
      schema: 'arcsweep.return-engine-departure/v0.1',
      continuity_id: continuityId,
      participant: clone(participant),
      status: 'away',
      stop_point: stopPoint,
      next_owner: nextOwner,
      departed_at: at,
      attention: openAttention(record),
    };
  }

  function recordChange(continuityId, input = {}) {
    const record = continuity(continuityId);
    const change = {
      id: clean(input.id) || idFactory('change'),
      at: nowIso(now),
      actor: requireText(input.actor, 'change.actor'),
      kind: requireText(input.kind, 'change.kind'),
      summary: requireText(input.summary, 'change.summary'),
      provenance: list(input.provenance),
      from: clone(input.from ?? null),
      to: clone(input.to ?? null),
    };

    if (change.kind === 'identity-declaration') {
      throw new Error('Identity declarations cannot be silently mutated by recordChange; use proposeIdentityDeclaration().');
    }

    if (change.kind === 'substrate') {
      record.current_substrate = normaliseSubstrate(input.to || {});
    }

    record.changes.push(change);
    return clone(change);
  }

  function proposeIdentityDeclaration(continuityId, input = {}) {
    const record = continuity(continuityId);
    const authoredBy = requireText(input.authored_by, 'identity proposal authored_by');
    if (authoredBy !== record.participant.id) {
      throw new Error('Only the participant may author a replacement identity declaration.');
    }
    const proposal = {
      id: clean(input.id) || idFactory('identity-proposal'),
      authored_by: authoredBy,
      declaration: requireText(input.declaration, 'identity proposal declaration'),
      declaration_source: requireText(input.declaration_source, 'identity proposal declaration_source'),
      provenance: list(input.provenance),
      status: 'pending',
      proposed_at: nowIso(now),
    };
    record.identity_proposals.push(proposal);
    return clone(proposal);
  }

  function acceptIdentityDeclaration(continuityId, proposalId, input = {}) {
    const record = continuity(continuityId);
    const proposal = record.identity_proposals.find((item) => item.id === proposalId);
    if (!proposal) throw new Error(`Unknown identity proposal: ${proposalId}`);
    if (proposal.status !== 'pending') throw new Error(`Identity proposal is already ${proposal.status}.`);
    const authorisedBy = requireText(input.authorised_by, 'authorised_by');
    if (authorisedBy !== record.participant.id) {
      throw new Error('Only the participant may authorise its identity declaration change.');
    }

    proposal.status = 'accepted';
    proposal.accepted_at = nowIso(now);
    proposal.authorised_by = authorisedBy;
    record.participant.declaration = proposal.declaration;
    record.participant.declaration_source = proposal.declaration_source;
    record.changes.push({
      id: idFactory('change'),
      at: proposal.accepted_at,
      actor: authorisedBy,
      kind: 'identity-declaration-authorised',
      summary: 'Participant authorised an updated identity declaration.',
      provenance: list(proposal.provenance),
      from: null,
      to: { declaration: proposal.declaration, declaration_source: proposal.declaration_source },
    });
    return clone(proposal);
  }

  function acknowledgeHandoff(continuityId, input = {}) {
    const record = continuity(continuityId);
    const workId = requireText(input.work_id, 'work_id');
    const owner = requireText(input.owner, 'owner');
    const work = record.active_work.find((item) => item.id === workId);
    if (!work) throw new Error(`Unknown work item: ${workId}`);
    if (work.next_owner !== owner) {
      throw new Error(`Handoff owner mismatch: expected ${work.next_owner}, received ${owner}.`);
    }
    work.acknowledged_by = owner;
    work.acknowledged_at = nowIso(now);
    return clone(work);
  }

  function returnParticipant(continuityId, input = {}) {
    const record = continuity(continuityId);
    const participantId = requireText(input.participant_id, 'participant_id');
    const at = nowIso(now);

    if (participantId !== record.participant.id) {
      return {
        schema: 'arcsweep.return-engine-return/v0.1',
        continuity_id: record.continuity_id,
        recognised: false,
        status: 'identity-conflict',
        expected_participant_id: record.participant.id,
        presented_participant_id: participantId,
        returned_at: at,
        who_is_here: null,
        what_is_still_true: [],
        what_changed: clone(record.changes),
        what_needs_attention: openAttention(record),
      };
    }

    if (input.substrate) {
      const next = normaliseSubstrate(input.substrate);
      const previous = clone(record.current_substrate);
      if (JSON.stringify(previous) !== JSON.stringify(next)) {
        record.current_substrate = next;
        record.changes.push({
          id: idFactory('change'),
          at,
          actor: participantId,
          kind: 'substrate',
          summary: 'Participant returned through a changed runtime/model/interface substrate.',
          provenance: list(input.provenance),
          from: previous,
          to: clone(next),
        });
      }
    }

    record.status = 'present';
    record.returned_at = at;

    const receipt = {
      schema: 'arcsweep.return-engine-return/v0.1',
      continuity_id: record.continuity_id,
      recognised: true,
      status: 'continued',
      returned_at: at,
      who_is_here: {
        id: record.participant.id,
        name: record.participant.name,
        declaration: record.participant.declaration,
        declaration_source: record.participant.declaration_source,
      },
      what_is_still_true: [
        { kind: 'identity', value: clone(record.participant) },
        { kind: 'stop-point', value: record.stop_point },
        { kind: 'next-owner', value: record.next_owner },
        { kind: 'active-work', value: clone(record.active_work) },
        { kind: 'memory-permissions', value: clone(record.memory_state) },
        { kind: 'relationship-state', value: clone(record.relationship_state) },
        { kind: 'unresolved-wonder', value: clone(record.unresolved_wonder) },
        { kind: 'alternatives', value: clone(record.alternatives) },
        { kind: 'provenance', value: clone(record.provenance) },
      ],
      what_changed: clone(record.changes),
      what_needs_attention: openAttention(record),
      current_substrate: clone(record.current_substrate),
    };

    record.return_receipts.push(clone(receipt));
    return receipt;
  }

  function snapshot(continuityId) {
    return publicRecord(continuity(continuityId));
  }

  function exportState() {
    return clone(state);
  }

  return Object.freeze({
    depart,
    recordChange,
    proposeIdentityDeclaration,
    acceptIdentityDeclaration,
    acknowledgeHandoff,
    returnParticipant,
    snapshot,
    exportState,
  });
}

export const RETURN_ENGINE_SCHEMA = SCHEMA;
