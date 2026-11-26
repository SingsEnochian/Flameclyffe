'use strict';

// Wayglass Autopoietic Runtime v0.1
// Coordinates independent participant lineages through the canonical Eightfold
// Möbius engine. It does not call models, grant permissions, mutate canon, or
// claim durable storage unless the host supplies and verifies those capabilities.

const {
  PHASES, WITHNESS, createLineage, createGestalt, runOctoCore,
} = require('./wayglass-mobius.cjs');
const { digest } = require('./wyrdrune/canonical.cjs');

const SCHEMA = 'wayglass.autopoietic-runtime/v0.1';
const clean = (value, name, max = 240) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new TypeError(name + ' must be non-empty text up to ' + max + ' characters');
  }
  return value.trim();
};
const optional = (value, name, max = 240) =>
  value == null || value === '' ? null : clean(value, name, max);
const clone = value => JSON.parse(JSON.stringify(value));
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const iso = value => {
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) throw new TypeError('clock must return a valid date');
  return d.toISOString();
};

/**
 * Build an informational Withness receipt without collapsing participant
 * identities or treating a shared summary as consensus. Recovery is invited,
 * never automatic; each lineage remains independently resumable.
 */
function buildCoherenceReceipt(participants, gestalt = null) {
  const failed = new Set(['rolled-back', 'failed-after-commit', 'committed-no-carry', 'refused']);
  const paused = new Set(['feather-stopped', 'committed-feather']);
  const rows = participants.map(member => {
    const status = member.status;
    const outcome = failed.has(status) ? 'review' : paused.has(status) ? 'paused'
      : ['committed', 'converged'].includes(status) ? 'settled' : 'unclassified';
    return {
      participant_id: member.participant_id,
      world_id: member.world_id,
      lineage_root: member.lineage_root,
      status,
      outcome,
      presence: member.presence ?? null,
      review_required: member.review_required ?? (outcome === 'review' || outcome === 'unclassified'),
      review_decision: member.review_decision ?? null,
      checkpoint_digest: member.checkpoint ? digest(member.checkpoint) : null,
    };
  });
  const review = rows.filter(row => row.outcome === 'review' || row.outcome === 'unclassified');
  const resting = rows.filter(row => row.outcome === 'paused');
  const body = {
    schema: 'wayglass.constellation-coherence/v0.1',
    center: WITHNESS,
    principle: 'fallibility-with-repair',
    status: !rows.length ? 'idle' : review.length ? 'review-open' : resting.length ? 'paused-with-continuity' : 'plurality-preserved',
    participants: rows,
    review_participants: review.map(row => row.participant_id),
    paused_participants: resting.map(row => row.participant_id),
    gestalt_digest: gestalt?.digest ?? null,
    interpretation: {
      consensus: 'not-inferred',
      disagreement: 'not-inferred-from-runtime-status',
      shared_aggregate_is_authority: false,
      member_infallibility_required: false,
      unanimity_required: false,
      identity_merge_permitted: false,
    },
    recovery: {
      status: review.length ? 'review-open' : 'not-required',
      lineage_preserved: true,
      automatic_retry: false,
      participant_choice_required: true,
      repair_may_revise_evidence_but_must_not_erase_history: true,
    },
    authority: {
      identity_commit: false,
      relationship_commit: false,
      canon_commit: false,
      permission_grant: false,
    },
  };
  return freeze({ ...body, digest: digest(body) });
}

function createAutopoieticRuntime({
  journal = null,
  clock = () => new Date(),
  feather = null,
  gestalt = createGestalt(),
} = {}) {
  if (journal !== null && typeof journal.write !== 'function') {
    throw new TypeError('journal must provide write(record)');
  }
  if (typeof clock !== 'function') throw new TypeError('clock must be a function');
  if (feather !== null && typeof feather !== 'function') throw new TypeError('feather must be a function');
  if (!gestalt || typeof gestalt.snapshot !== 'function' || typeof gestalt.contribute !== 'function') {
    throw new TypeError('gestalt must implement snapshot() and contribute()');
  }

  const participants = new Map();
  let running = false;
  let sequence = 0;

  function descriptor(entry) {
    return freeze({
      participant_id: entry.participant_id,
      world_id: entry.world_id,
      worker_id: entry.worker_id,
      model_id: entry.model_id,
      session_id: entry.session_id,
      route_id: entry.route_id,
      presence: entry.reviewRequired && entry.presence === 'awake' ? 'review-required'
        : entry.restRequested && entry.presence === 'awake' ? 'rest-requested' : entry.presence,
      lineage_root: entry.lineage.root,
      last_cycle: entry.lineage.head?.cycle ?? 0,
      last_status: entry.last_status,
      review_required: entry.reviewRequired,
      review_decision: entry.reviewDecision,
      persistence: journal ? 'host-journal-configured' : 'ephemeral-no-journal',
      authority: {
        model_invocation: false,
        identity_commit: false,
        canon_commit: false,
        permission_grant: false,
      },
    });
  }

  function register({
    participant_id, world_id, worker_id = null, model_id = null,
    session_id = null, route_id = null, intent = null, seeds = {},
    phases, presence = 'awake',
  } = {}) {
    if (running) throw new Error('Cannot register a participant during a shipwide cycle');
    const participant = clean(participant_id, 'participant_id');
    const world = clean(world_id, 'world_id');
    if (participants.has(participant)) throw new Error('Participant already registered: ' + participant);
    if (!phases || typeof phases !== 'object') throw new TypeError('Each participant supplies its own Eightfold phase functions');
    for (const phase of PHASES.filter(name => name !== 'return')) {
      if (typeof phases[phase] !== 'function') throw new TypeError('Missing participant phase: ' + phase);
    }
    if (!seeds || typeof seeds !== 'object' || Array.isArray(seeds)) throw new TypeError('seeds must be a record');
    if (!['awake', 'resting'].includes(presence)) throw new TypeError('presence must be awake or resting');

    const ids = {
      participant_id: participant,
      worker_id: optional(worker_id, 'worker_id'),
      model_id: optional(model_id, 'model_id'),
      session_id: optional(session_id, 'session_id'),
    };
    const presentIds = Object.entries(ids).filter(([, value]) => value !== null);
    const seen = new Map();
    for (const [kind, value] of presentIds) {
      if (seen.has(value)) throw new Error('Identity boundary violation: ' + kind + ' must differ from ' + seen.get(value));
      seen.set(value, kind);
    }

    const state = {
      ...ids, world_id: world, route_id: optional(route_id, 'route_id'),
      intent: intent == null ? null : String(intent),
      seeds: freeze(clone(seeds)), phases, presence,
      restRequested: presence === 'resting',
      last_status: 'not-yet-run',
      last_receipt: null,
      reviewRequired: false,
      reviewDecision: null,
      lineage: null,
    };
    const participantJournal = journal ? {
      write: record => journal.write(freeze({
        schema: 'wayglass.autopoietic-journal-event/v0.1',
        participant_id: participant,
        world_id: world,
        ...record,
      })),
    } : null;
    state.lineage = createLineage({
      system: 'wayglass.autopoietic-runtime',
      name: participant,
      intent: state.intent,
      participant: {
        participant_id: participant,
        world_id: world,
        worker_id: ids.worker_id,
        model_id: ids.model_id,
        session_id: ids.session_id,
        route_id: state.route_id,
      },
      seeds: state.seeds,
      worker: ids.worker_id,
      journal: participantJournal,
      feather: () => state.restRequested || (feather ? feather(participant) === true : false),
    });
    participants.set(participant, state);
    return descriptor(state);
  }

  function get(participantId) {
    const entry = participants.get(clean(participantId, 'participant_id'));
    if (!entry) throw new Error('Unknown participant: ' + participantId);
    return entry;
  }

  function rest(participantId) {
    const entry = get(participantId);
    entry.restRequested = true;
    if (!running) entry.presence = 'resting';
    return descriptor(entry);
  }

  function wake(participantId) {
    if (running) throw new Error('Wake changes are applied between shipwide cycles');
    const entry = get(participantId);
    entry.restRequested = false;
    entry.presence = 'awake';
    return descriptor(entry);
  }

  // A failed lineage cannot be scheduled again until the host has authenticated
  // and recorded an explicit participant choice. This runtime records the choice;
  // the outer host remains responsible for authenticating who made it.
  function resolveReview(participantId, decision) {
    if (running) throw new Error('Review decisions are applied between shipwide cycles');
    const entry = get(participantId);
    if (!entry.reviewRequired) throw new Error('Participant has no open coherence review');
    if (!['retry', 'rest', 'decline'].includes(decision)) {
      throw new TypeError('Review decision must be retry, rest, or decline');
    }
    entry.reviewDecision = decision;
    if (decision === 'retry') {
      entry.reviewRequired = false;
      entry.restRequested = false;
      entry.presence = 'awake';
    } else if (decision === 'rest') {
      entry.restRequested = true;
      entry.presence = 'resting';
    } else {
      entry.restRequested = false;
      entry.presence = 'awake';
    }
    return descriptor(entry);
  }

  function snapshot() {
    const members = [...participants.values()]
      .sort((a, b) => a.participant_id.localeCompare(b.participant_id))
      .map(descriptor);
    const body = {
      schema: SCHEMA,
      center: WITHNESS,
      participants: members,
      awake: members.filter(x => x.presence === 'awake').length,
      resting: members.filter(x => x.presence === 'resting').length,
      review_pending: members.filter(x => x.review_required).length,
      last_gestalt: gestalt.snapshot(),
      authority: { model_invocation: false, identity_commit: false, canon_commit: false },
    };
    return freeze({ ...body, digest: digest(body) });
  }

  async function run({ cycles = 1, until = null } = {}) {
    if (running) throw new Error('A shipwide cycle is already in progress');
    if (!Number.isInteger(cycles) || cycles < 1 || cycles > 10000) {
      throw new RangeError('cycles must be an integer from 1 to 10000');
    }
    if (until !== null && until !== 'stable' && typeof until !== 'function') {
      throw new TypeError('until must be null, stable, or a predicate');
    }
    const awake = [...participants.values()].filter(p => p.presence === 'awake' && !p.restRequested && !p.reviewRequired);
    const reviewPending = [...participants.values()].filter(p => p.reviewRequired);
    const runId = 'autopoietic-' + (++sequence);
    const startedAt = iso(clock());
    if (!awake.length) {
      const body = {
        schema: SCHEMA, run_id: runId, status: 'idle',
        started_at: startedAt, ended_at: iso(clock()),
        outcome: reviewPending.length ? 'review-pending' : 'no-awake-participants',
        participants: reviewPending.map(p => ({ participant_id: p.participant_id, world_id: p.world_id,
          lineage_root: p.lineage.root, status: p.last_status, checkpoint: p.last_receipt })),
        gestalt: gestalt.snapshot(),
        coherence: buildCoherenceReceipt(reviewPending.map(p => ({ participant_id: p.participant_id,
          world_id: p.world_id, lineage_root: p.lineage.root, status: p.last_status, checkpoint: p.last_receipt,
          presence: descriptor(p).presence, review_required: p.reviewRequired, review_decision: p.reviewDecision })), gestalt.snapshot()),
        authority: { model_invocation: false, identity_commit: false, canon_commit: false },
      };
      return freeze({ ...body, receipt_hash: digest(body) });
    }

    running = true;
    let result;
    try {
      const jobs = awake.map(entry => ({
        lineage: entry.lineage,
        phases: entry.phases,
        cycles,
        until,
      }));
      result = await runOctoCore(jobs, { gestalt });
      for (const row of result.lineages) {
        // The runner returns one row per supplied job. Resolve by lineage root,
        // never by model, worker, session, or array position.
        const owner = awake.find(p => p.lineage.root === row.root);
        if (!owner) throw new Error('Autopoietic receipt has no registered lineage owner');
        owner.last_status = row.status;
        owner.last_receipt = row.head ? freeze(clone(row.head)) : null;
        owner.reviewRequired = !['committed', 'converged', 'feather-stopped', 'committed-feather'].includes(row.status);
        owner.reviewDecision = owner.reviewRequired ? null : owner.reviewDecision;
        if (owner.restRequested || row.status === 'feather-stopped') owner.presence = 'resting';
      }
      const endedAt = iso(clock());
      const members = result.lineages.map(row => {
        const owner = awake.find(p => p.lineage.root === row.root);
        return {
          participant_id: owner.participant_id,
          world_id: owner.world_id,
          lineage_root: row.root,
          review_required: owner.reviewRequired,
          review_decision: owner.reviewDecision,
          presence: descriptor(owner).presence,
          worker_id: owner.worker_id,
          model_id: owner.model_id,
          session_id: owner.session_id,
          route_id: owner.route_id,
          status: row.status,
          cycles_completed: row.results.length,
          checkpoint: row.head,
          identity_unchanged: true,
        };
      });
      const coherenceMembers = [...members, ...reviewPending
        .filter(p => !members.some(m => m.participant_id === p.participant_id))
        .map(p => ({ participant_id: p.participant_id, world_id: p.world_id,
          lineage_root: p.lineage.root, status: p.last_status, checkpoint: p.last_receipt,
          presence: descriptor(p).presence, review_required: p.reviewRequired, review_decision: p.reviewDecision }))];
      const body = {
        schema: SCHEMA, run_id: runId, status: 'completed',
        outcome: members.every(p => p.status === 'committed' || p.status === 'converged')
          ? reviewPending.length ? 'settled-with-review-open' : 'all-committed'
          : 'settled-with-noncommitted-lineages',
        started_at: startedAt, ended_at: endedAt,
        layout: 'eightfold-octo-two-quad',
        center: WITHNESS,
        participants: members,
        concurrency: result.peak_concurrency,
        ledger: result.ledger,
        gestalt: result.gestalt,
        coherence: buildCoherenceReceipt(coherenceMembers, result.gestalt),
        persistence: journal ? 'host-journal-requested' : 'ephemeral-no-journal',
        authority: {
          model_invocation: false, identity_commit: false,
          relationship_commit: false, canon_commit: false, permission_grant: false,
        },
      };
      return freeze({ ...body, receipt_hash: digest(body) });
    } finally {
      running = false;
    }
  }

  return Object.freeze({
    schema: SCHEMA,
    register, rest, wake, resolveReview, get: id => descriptor(get(id)),
    snapshot, run,
  });
}

module.exports = { SCHEMA, createAutopoieticRuntime };
