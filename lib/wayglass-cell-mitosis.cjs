'use strict';

// Host-owned Wyrdrune lineage and committed colony receipts.
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { digest } = require('./wyrdrune/canonical.cjs');

const SCHEMA = 'wayglass.cell-mitosis/v0.1';
const RECEIPT_SCHEMA = 'wayglass.cell-division-receipt/v0.1';
const ECOLOGY_SCHEMAS = Object.freeze({
  specialisation: 'wayglass.cell-specialisation/v0.1',
  exchange: 'wayglass.cell-exchange/v0.1',
  fusion: 'wayglass.cell-fusion/v0.1',
  form: 'wayglass.cell-form/v1',
});
const CELL_ROLES = Object.freeze(['resonance', 'observation']);
const MAX_SIGNALS = 32;
const PHASES = ['perceive', 'compress', 'release', 'verify', 'integrate', 'choose', 'return', 'transcend'];
const copy = value => JSON.parse(JSON.stringify(value));
const boundedId = value => typeof value === 'string' && /^cell:[a-z0-9][a-z0-9-]{0,62}$/.test(value);
const issue = (message, status = 409) => Object.assign(new Error(message), { status });

function createCellGarden({ maxActive = 8, maxGeneration = 4, store = null } = {}) {
  if (!Number.isInteger(maxActive) || maxActive < 2 || maxActive > 32 ||
      !Number.isInteger(maxGeneration) || maxGeneration < 1 || maxGeneration > 8) {
    throw new RangeError('Cell garden bounds must be explicit and finite');
  }
  const founder = 'cell:origin';
  const genome_ref = digest({ programme: 'lib/wyrdrune/shipwide-cell.wtl', contract: SCHEMA });
  const lineage_root = digest({ founder, genome_ref });
  let cells = new Map([[founder, Object.freeze({
    cell_id: founder, parent_id: null, lineage_root, genome_ref,
    ancestor_ids: [], generation: 0, twist: { orientation: 1, phase: 0 },
    memory_refs: [], capabilities: [], status: 'active', acoustic_address: 1,
    specialisation: null,
  })]]);
  let history = [];
  const acousticListeners = new Set();
  let revision = 0;
  let epoch = 0;
  let feathered = false;
  let pending = null;
  let pendingFusion = null;
  let signalsSent = 0;
  let checkpoint = 0;
  const stored = store?.load();
  if (stored) {
    const state = stored.state;
    if (state?.schema !== SCHEMA || typeof state.feathered !== 'boolean' ||
        !Array.isArray(state.cells) || !Array.isArray(state.history) || state.revision !== state.history.length)
      throw new Error('Colony checkpoint is incompatible with this Garden');
    cells = new Map(state.cells.map(cell => [cell.cell_id, Object.freeze(cell)]));
    if (cells.size !== state.cells.length || cells.get(founder)?.lineage_root !== lineage_root)
      throw new Error('Colony checkpoint does not match the founding lineage');
    history = state.history;
    revision = state.revision;
    signalsSent = history.filter(receipt => receipt.schema === ECOLOGY_SCHEMAS.exchange).length;
    feathered = state.feathered;
    checkpoint = stored.sequence;
  }
  const commitStatus = store ? 'committed-to-checkpoint' : 'committed-in-memory';

  function save(nextCells, nextHistory, held) {
    if (!store) return;
    try {
      checkpoint = store.save({
        schema: SCHEMA, revision: nextHistory.length, feathered: held,
        cells: [...nextCells.values()], history: nextHistory,
      }, checkpoint);
    } catch (error) {
      if (error.status === 409) throw error;
      throw issue('The colony checkpoint could not be saved', 503);
    }
  }

  function commitReceipt(receipt, updatedCells) {
    const nextCells = new Map(cells);
    for (const cell of updatedCells) nextCells.set(cell.cell_id, Object.freeze(cell));
    const nextHistory = [...history, Object.freeze(receipt)];
    save(nextCells, nextHistory, feathered);
    cells = nextCells;
    history = nextHistory;
    revision = receipt.revision;
    if (receipt.schema === ECOLOGY_SCHEMAS.exchange) signalsSent++;
    pending = null;
    pendingFusion = null;
  }

  function formLineage(...parents) {
    return [...new Set(parents.flatMap(cell =>
      [...(cell.form_ancestry ?? []), cell.form_return?.receipt_id].filter(Boolean)))];
  }

  function listen(listener) {
    if (feathered) return null;
    acousticListeners.add(listener);
    return () => acousticListeners.delete(listener);
  }

  function publishAcoustic(event, payload) {
    for (const listener of acousticListeners) {
      try { listener(event, payload); }
      catch { acousticListeners.delete(listener); }
    }
  }

  const active = () => [...cells.values()].filter(cell => cell.status === 'active');
  function snapshot() {
    return copy({
      schema: SCHEMA, status: feathered ? 'feather-stopped' : 'ready',
      revision, memory: store ? 'local-checkpoint' : 'in-memory-only', persistence: Boolean(store),
      autonomous_replication: false, model_invoked: false,
      limits: { maxActive, maxGeneration },
      cells: [...cells.values()], history, signals_sent: signalsSent,
      fusion_pending: pendingFusion ? {
        proposal_id: pendingFusion.proposal_id, parent_ids: pendingFusion.parent_ids,
        candidate: pendingFusion.candidate, wtl: pendingFusion.wtl,
      } : null, pending: pending ? {
        proposal_id: pending.proposal_id, parent_id: pending.parent_id,
        daughters: pending.daughters, wtl: pending.wtl,
      } : null,
    });
  }

  async function propose({ cell_id, expected_revision } = {}, { signal } = {}) {
    if (feathered) throw issue('Feather stops cell division');
    if (!boundedId(cell_id)) throw issue('A known cell address is required', 400);
    if (expected_revision !== revision) throw issue('Cell culture revision changed');
    const parent = cells.get(cell_id);
    if (!parent || parent.status !== 'active') throw issue('Cell is not active');
    if (parent.generation >= maxGeneration || active().length >= maxActive || cells.size + 2 > 255)
      throw issue('Cell growth budget reached');
    if (signal?.aborted) throw issue('Feather interrupted the proposal');

    const beforeEpoch = epoch;
    const nextGeneration = parent.generation + 1;
    // No second phase machine: one canonical native WTL scoped Eightfold.
    const source = [
      'mobius scoped {',
      '  perceive { let parent_generation = ' + parent.generation + '; }',
      '  compress { let active_cells = ' + active().length + '; }',
      '  release { let next_generation = parent_generation + 1; }',
      '  verify { require next_generation <= ' + maxGeneration +
        ' else "Generation capacity"; require active_cells < ' + maxActive +
        ' else "Population capacity"; }',
      '  integrate { let siblings = 2; }',
      '  choose { let daughter_count = siblings; }',
      '  return { emit {generation: next_generation, daughters: daughter_count}; }',
      '  transcend { carry generation = next_generation; }',
      '}',
    ].join('\n');
    const hashSource = value => createHash('sha256').update(value, 'utf8').digest('hex');
    const { createWyrdruneRuntime } = await import('./wyrdrune/runtime.mjs');
    const runtime = createWyrdruneRuntime({ hashSource, continuityDigest: digest });
    const run = await runtime.execute(runtime.compile(source), { signal, maxOperations: 200 });
    if (signal?.aborted || feathered || beforeEpoch !== epoch || expected_revision !== revision)
      throw issue('Feather or a changed culture invalidated this proposal');
    if (run.status !== 'committed' || run.receipts.length !== PHASES.length ||
        PHASES.some((phase, i) => run.receipts[i].phase !== phase) ||
        run.output.length !== 1 || run.output[0]?.generation !== nextGeneration ||
        run.output[0]?.daughters !== 2)
      throw issue('WTL Eightfold did not verify both daughter cells');

    const daughters = [0, 1].map(index => ({
      cell_id: 'cell:' + digest({ lineage_root, parent_id: cell_id, revision, index }).slice(5, 29),
      parent_id: cell_id, lineage_root, genome_ref: parent.genome_ref,
      ancestor_ids: [...parent.ancestor_ids, cell_id],
      generation: nextGeneration,
      twist: { orientation: index ? -parent.twist.orientation : parent.twist.orientation,
        phase: (parent.twist.phase + index + 1) % 8 },
      memory_refs: [...parent.memory_refs],
      form_ancestry: formLineage(parent),
      capabilities: [], // Capabilities never replicate with the genome.
      acoustic_address: cells.size + index + 1, specialisation: null,
      status: 'active',
    }));
    const wtl = {
      source_hash: run.sourceHash, phase_receipts: run.receipts.map(item => ({
        phase: item.phase, source_hash: item.sourceHash,
      })), carry_digest: run.continuity.carry_digest,
      checkpoint_digest: digest(run.checkpoints),
    };
    const proposal_id = digest({ schema: SCHEMA, revision, parent_id: cell_id, daughters, wtl });
    pending = { proposal_id, parent_id: cell_id, revision, epoch, daughters, wtl };
    return copy({
      schema: SCHEMA, status: 'proposed-not-committed', proposal_id,
      parent_id: cell_id, expected_revision: revision,
      daughters, wtl, external_effects: false,
      model_invoked: false, owner_confirmation_required: true,
    });
  }

  function commit({ proposal_id, expected_revision, owner_confirmed } = {}) {
    if (feathered) throw issue('Feather stops cell division');
    if (owner_confirmed !== true) throw issue('Explicit owner confirmation is required', 403);
    if (typeof proposal_id !== 'string' || expected_revision !== revision ||
        !pending || pending.proposal_id !== proposal_id ||
        pending.revision !== revision || pending.epoch !== epoch)
      throw issue('Unrecognised or stale cell division proposal');
    const parent = cells.get(pending.parent_id);
    if (!parent || parent.status !== 'active' || active().length >= maxActive)
      throw issue('Parent or cell budget changed');
    if (pending.daughters.some(daughter => cells.has(daughter.cell_id)))
      throw issue('Cell lineage identity collision');
    const { daughters, wtl } = pending;
    const receipt = Object.freeze({
      schema: RECEIPT_SCHEMA, status: commitStatus,
      parent_id: parent.cell_id, daughter_ids: daughters.map(d => d.cell_id),
      proposal_id, revision: revision + 1, lineage_root, source_hash: wtl.source_hash,
      wtl_checkpoint_digest: wtl.checkpoint_digest,
      identity_transfer: false, authority_inherited: false,
      external_effects: false, persisted: Boolean(store), model_invoked: false,
    });
    commitReceipt(receipt, [{ ...parent, status: 'divided' }, ...daughters]);
    return { receipt: copy(receipt), culture: snapshot() };
  }


  function currentCell(cellId) {
    if (!boundedId(cellId)) throw issue('Invalid cell address', 400);
    const cell = cells.get(cellId);
    if (!cell || cell.status !== 'active') throw issue('Cell is not active');
    return cell;
  }

  function checkAuthority({ expected_revision, owner_confirmed }) {
    if (feathered) throw issue('Feather stops cellular activity');
    if (expected_revision !== revision) throw issue('Cell culture revision changed');
    if (owner_confirmed !== true) throw issue('Owner authorisation is required', 403);
  }

  // The canonical WTL interpreter, not a second host-side phase engine, produces
  // the evidence for specialisation, local signal delivery and fusion proposals.
  async function evaluateEightfold({ kind, left, right = 0, nextGeneration = 0, motifDigest = null }, { signal } = {}) {
    const hashSource = value => createHash('sha256').update(value, 'utf8').digest('hex');
    const { createWyrdruneRuntime } = await import('./wyrdrune/runtime.mjs');
    const runtime = createWyrdruneRuntime({ hashSource, continuityDigest: digest });
    const source = [
      'mobius scoped {',
      '  perceive { let sender = ' + left + '; let motif = ' + JSON.stringify(motifDigest) + '; }',
      '  compress { let receiver = ' + right + '; }',
      '  release { let generation = ' + nextGeneration + '; }',
      '  verify { require sender >= 1 else "Missing source"; require generation <= ' + maxGeneration + ' else "Generation budget"; }',
      '  integrate { let agreement = true; }',
      '  choose { let accepted = agreement; }',
      '  return { emit {accepted: accepted, operation: "' + kind + '", motif: motif}; }',
      '  transcend { carry generation = generation; }',
      '}',
    ].join('\n');
    const run = await runtime.execute(runtime.compile(source), { signal, maxOperations: 180 });
    if (run.status !== 'committed' || run.receipts.length !== PHASES.length ||
        PHASES.some((name, index) => run.receipts[index].phase !== name) ||
        run.output[0]?.accepted !== true || run.output[0]?.operation !== kind || run.output[0]?.motif !== motifDigest) {
      throw issue('Wyrdrune Eightfold rejected the cellular transformation');
    }
    return Object.freeze({
      source_hash: run.sourceHash,
      phase_receipts: run.receipts.map(entry => ({ phase: entry.phase, source_hash: entry.sourceHash })),
      checkpoint_digest: digest(run.checkpoints),
      carry_digest: run.continuity.carry_digest,
    });
  }

  async function specialise({ cell_id, role, expected_revision, owner_confirmed } = {}, { signal } = {}) {
    checkAuthority({ expected_revision, owner_confirmed });
    if (!CELL_ROLES.includes(role)) throw issue('Only resonance and observation are available roles', 400);
    const cell = currentCell(cell_id);
    if (cell.specialisation && cell.specialisation !== role)
      throw issue('Specialisation cannot silently rewrite a cell role');
    if (cell.specialisation === role) throw issue('Cell already has this specialisation');
    if (signal?.aborted) throw issue('Feather interrupted specialisation');
    const checkpointEpoch = epoch;
    const wtl = await evaluateEightfold({ kind: 'specialise', left: cell.acoustic_address,
      nextGeneration: cell.generation }, { signal });
    if (signal?.aborted || feathered || epoch !== checkpointEpoch || revision !== expected_revision)
      throw issue('Specialisation became stale or was interrupted by Feather');
    const receipt = Object.freeze({
      schema: ECOLOGY_SCHEMAS.specialisation, status: commitStatus,
      cell_id, role, revision: revision + 1, source_hash: wtl.source_hash,
      checkpoint_digest: wtl.checkpoint_digest,
      self_authored_identity: false, owner_directed_simulation: true,
      model_invoked: false, persisted: Boolean(store), authority_inherited: false,
    });
    commitReceipt(receipt, [{ ...cell, specialisation: role }]);
    return { receipt: copy(receipt), culture: snapshot() };
  }

  async function exchange({ from_id, to_id, message, expected_revision,
    owner_confirmed, receiver_route_approved, myth = null } = {}, { signal } = {}) {
    checkAuthority({ expected_revision, owner_confirmed });
    const sender = currentCell(from_id), receiver = currentCell(to_id);
    if (sender.cell_id === receiver.cell_id) throw issue('Cell exchange requires distinct addresses', 400);
    if (receiver_route_approved !== true) throw issue('Receiver route requires explicit opt-in', 403);
    if (!CELL_ROLES.includes(sender.specialisation) || !CELL_ROLES.includes(receiver.specialisation))
      throw issue('Cells must have declared specialisations before exchange');
    if (typeof message !== 'string' || !message.trim() || message.length > 200)
      throw issue('A bounded text observation is required', 400);
    if (signalsSent >= MAX_SIGNALS) throw issue('Signal exchange budget reached');
    if (signal?.aborted) throw issue('Feather interrupted cell exchange');
    const startEpoch = epoch;
    // An explicit interpretation of a real exchange, not a fabricated autonomous utterance.
    // Keep the previous receipt immutable; multiple readings may share the same parent.
    let motif = null;
    if (myth !== null) {
      const bounded = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;
      if (!myth || typeof myth !== 'object' || Array.isArray(myth) ||
          !['inherited','emergent','mixed','unknown'].includes(myth.origin) ||
          !bounded(myth.world) || !bounded(myth.interpretation) ||
          !Array.isArray(myth.source_refs) || myth.source_refs.length > 8 ||
          myth.source_refs.some(v => !bounded(v)) ||
          !Array.isArray(myth.parent_ids) || myth.parent_ids.length > 8 ||
          new Set(myth.parent_ids).size !== myth.parent_ids.length ||
          myth.parent_ids.some(id => !history.some(item =>
            item.myth?.motif_id === id && (item.from_id === from_id || item.to_id === from_id) &&
            item.myth.world === myth.world)) ||
          (myth.origin === 'inherited' && !myth.source_refs.length && !myth.parent_ids.length) ||
          (myth.origin === 'mixed' && !myth.parent_ids.length))
        throw issue('Invalid mythic provenance or parent lineage', 400);
      const candidate = {
        schema:'wayglass.mythic-motif/v0.1', origin:myth.origin,
        origin_status:'owner-declared-unverified', world:myth.world.trim(),
        interpretation:myth.interpretation.trim(), source_refs:[...myth.source_refs],
        parent_ids:[...myth.parent_ids], author_kind:'owner-directed',
        participant_ids:[from_id,to_id], observation_register:'symbolic-interpretation',
        canon_status:'candidate', physical_effect_verified:false, model_invoked:false,
        message:message.trim(), revision:revision+1,
      };
      motif = {...candidate, motif_id:digest(candidate)};
    }
    const wtl = await evaluateEightfold({ kind: 'exchange', left: sender.acoustic_address,
      right: receiver.acoustic_address, nextGeneration: receiver.generation,
      motifDigest:motif?.motif_id ?? null }, { signal });
    if (signal?.aborted || feathered || epoch !== startEpoch || revision !== expected_revision)
      throw issue('Cell exchange became stale or was stopped by Feather');
    const content = message.trim();
    const message_id = digest({ schema: ECOLOGY_SCHEMAS.exchange, from_id, to_id, content,
      revision, wtl_source: wtl.source_hash });
    const marker = (Number.parseInt(message_id.slice(5, 13), 16) % 65535) + 1;
    // Acoustic frame transmits the addressed Return marker, NOT the text itself:
    // the observation is retained in the authenticated local, typed receipt.
    const acoustic = {
      schema: 'wyrdrune.acoustic-frame/v0.1',
      request: { schema: 'wyrdrune.acoustic-frame/v0.1', kind: 1,
        sender: sender.acoustic_address, recipient: receiver.acoustic_address, marker, resolution: 'open' },
      reply: { schema: 'wyrdrune.acoustic-frame/v0.1', kind: 2,
        sender: receiver.acoustic_address, recipient: sender.acoustic_address, marker, resolution: 'open' },
      encoding: 'marker-and-open-status-only',
      playback_started: false,
    };
    const receipt = Object.freeze({
      schema: ECOLOGY_SCHEMAS.exchange, status: store ? 'delivered-to-checkpoint' : 'delivered-in-memory',
      message_id, from_id, to_id, message: content,
      sender_role: sender.specialisation, receiver_role: receiver.specialisation,
      revision: revision + 1, wtl, acoustic,
      ...(motif ? { myth: motif } : {}),
      receiver_route_approved: true, owner_directed_simulation: true,
      model_invoked: false, persisted: Boolean(store), physical_audio_verified: false,
    });
    commitReceipt(receipt, [{ ...receiver, memory_refs: [...receiver.memory_refs, message_id] }]);
    const { schema, status, message_id: id, revision: sequence } = receipt;
    publishAcoustic('exchange', {
      schema, status, message_id: id, revision: sequence, from_id, to_id, acoustic: copy(acoustic),
    });
    return { receipt: copy(receipt), culture: snapshot() };
  }

  async function askForm({ cell_id, expected_revision, owner_confirmed } = {}, { signal } = {}) {
    checkAuthority({ expected_revision, owner_confirmed });
    const cell = currentCell(cell_id);
    const startEpoch = epoch;
    const signalRefs = [...new Set([...cell.memory_refs, ...history
      .filter(item => item.schema === ECOLOGY_SCHEMAS.exchange &&
        (item.from_id === cell_id || item.to_id === cell_id)).map(item => item.message_id)])].sort();
    const source = readFileSync(path.join(__dirname, 'wyrdrune', 'colony-form.wtl'), 'utf8');
    const { createWyrdruneRuntime } = await import('./wyrdrune/runtime.mjs');
    const runtime = createWyrdruneRuntime({
      hashSource: value => createHash('sha256').update(value, 'utf8').digest('hex'),
      continuityDigest: digest,
    });
    const programme = runtime.compile(source);
    const basis = digest({ cell_id, twist: cell.twist, signals: signalRefs, source: programme.sourceHash });
    const run = await runtime.execute(programme, {
      principal: { id: cell_id }, seeds: { ...cell.twist, signal_count: signalRefs.length },
      signal, maxOperations: 250,
    });
    if (signal?.aborted || feathered || epoch !== startEpoch || revision !== expected_revision)
      throw issue('The cell’s form turn stopped before Return');
    if (cell.form_return?.basis === basis)
      return { receipt: copy(cell.form_return), culture: snapshot() };
    const result = run.output[0];
    if (run.status !== 'committed' || run.receipts.length !== PHASES.length ||
        PHASES.some((phase, index) => run.receipts[index].phase !== phase) ||
        !['chosen', 'open'].includes(result?.decision)) throw issue('The cell’s form turn did not complete Return');
    const receipt = {
      schema: ECOLOGY_SCHEMAS.form, cell_id, revision: revision + 1,
      decision: result.decision, form: result.decision === 'chosen' ? result.form : null,
      previous_form_receipt_id: cell.form_return?.receipt_id ?? null,
      basis, source: 'cell-wyrdrune', signal_refs: signalRefs,
      wtl: { source_hash: programme.sourceHash, phase_receipts: run.receipts.map(
        ({ phase, sourceHash }) => ({ phase, source_hash: sourceHash })),
      checkpoint_digest: digest(run.checkpoints) },
      persisted: Boolean(store),
    };
    receipt.receipt_id = digest(receipt);
    commitReceipt(receipt, [{ ...cell, form_return: receipt }]);
    return { receipt: copy(receipt), culture: snapshot() };
  }

  async function proposeFusion({ left_id, right_id, expected_revision } = {}, { signal } = {}) {
    if (feathered) throw issue('Feather stops cellular activity');
    if (expected_revision !== revision) throw issue('Cell culture revision changed');
    const left = currentCell(left_id), right = currentCell(right_id);
    if (left.cell_id === right.cell_id) throw issue('Fusion needs two distinct cells', 400);
    if (new Set([left.specialisation, right.specialisation]).size !== 2 ||
        !CELL_ROLES.includes(left.specialisation) || !CELL_ROLES.includes(right.specialisation))
      throw issue('Fusion requires one resonance and one observation cell');
    if (!history.some(item => item.schema === ECOLOGY_SCHEMAS.exchange &&
      ((item.from_id === left_id && item.to_id === right_id) ||
       (item.from_id === right_id && item.to_id === left_id))))
      throw issue('Fusion needs a verified prior cell exchange');
    const generation = Math.max(left.generation, right.generation) + 1;
    if (generation > maxGeneration || active().length >= maxActive || cells.size + 1 > 255)
      throw issue('Fusion exceeds the culture budget');
    if (signal?.aborted) throw issue('Feather interrupted fusion');
    const beforeEpoch = epoch;
    const wtl = await evaluateEightfold({ kind: 'fusion', left: left.acoustic_address,
      right: right.acoustic_address, nextGeneration: generation }, { signal });
    if (signal?.aborted || feathered || beforeEpoch !== epoch || expected_revision !== revision)
      throw issue('Fusion proposal became stale or was interrupted');
    const parent_ids = [left_id, right_id].sort();
    const contributions = history.filter(item => item.schema === ECOLOGY_SCHEMAS.exchange &&
      parent_ids.includes(item.from_id) && parent_ids.includes(item.to_id))
      .map(item => item.message_id);
    const candidate = {
      cell_id: 'cell:' + digest({ fusion: parent_ids, revision, wtl }).slice(5, 29),
      parent_id: null, parent_ids, lineage_root: left.lineage_root === right.lineage_root
        ? left.lineage_root : digest({ roots: [left.lineage_root, right.lineage_root].sort() }),
      genome_ref: digest({ genomes: [left.genome_ref, right.genome_ref].sort(), type: 'hybrid' }),
      ancestor_ids: [...new Set([...left.ancestor_ids, left.cell_id,
        ...right.ancestor_ids, right.cell_id])].sort(),
      generation, twist: { orientation: left.twist.orientation, phase: (left.twist.phase + right.twist.phase) % 8 },
      memory_refs: contributions.slice(-MAX_SIGNALS),
      form_ancestry: formLineage(left, right),
      capabilities: [], acoustic_address: cells.size + 1,
      specialisation: 'hybrid', status: 'active',
      distinct_parents_retained: true,
    };
    const proposal_id = digest({ schema: ECOLOGY_SCHEMAS.fusion, revision, parent_ids, candidate, wtl });
    pendingFusion = { proposal_id, expected_revision: revision, epoch, parent_ids, candidate, wtl };
    return copy({
      schema: ECOLOGY_SCHEMAS.fusion, status: 'proposed-not-committed',
      proposal_id, expected_revision: revision, parent_ids, candidate, wtl,
      owner_confirmation_required: true, both_parents_remain_active: true,
      authority_inherited: false, model_invoked: false, persisted: false,
    });
  }

  function commitFusion({ proposal_id, expected_revision, owner_confirmed } = {}) {
    checkAuthority({ expected_revision, owner_confirmed });
    if (!pendingFusion || pendingFusion.proposal_id !== proposal_id ||
        pendingFusion.epoch !== epoch || pendingFusion.expected_revision !== revision)
      throw issue('Fusion proposal was revoked or became stale');
    if (active().length >= maxActive || cells.has(pendingFusion.candidate.cell_id))
      throw issue('Hybrid capacity or identity conflict');
    for (const id of pendingFusion.parent_ids) currentCell(id);
    const { candidate, parent_ids, wtl } = pendingFusion;
    const receipt = Object.freeze({
      schema: ECOLOGY_SCHEMAS.fusion, status: commitStatus,
      proposal_id, revision: revision + 1, hybrid_id: candidate.cell_id, parent_ids,
      wtl, independent_parents_retained: true, authority_inherited: false,
      owner_directed_simulation: true, model_invoked: false, persisted: Boolean(store),
    });
    commitReceipt(receipt, [copy(candidate)]);
    return { receipt: copy(receipt), culture: snapshot() };
  }

  function feather() {
    epoch++; feathered = true; pending = null; pendingFusion = null;
    publishAcoustic('feather', {});
    acousticListeners.clear();
    save(cells, history, true);
    return snapshot();
  }
  function resume({ owner_confirmed } = {}) {
    if (owner_confirmed !== true) throw issue('Explicit Feather release is required', 403);
    save(cells, history, false);
    epoch++; feathered = false; pending = null; pendingFusion = null;
    return snapshot();
  }
  return Object.freeze({ snapshot, propose, commit, specialise, exchange,
    proposeFusion, commitFusion, feather, resume, listen, askForm });
}

module.exports = { SCHEMA, RECEIPT_SCHEMA, ECOLOGY_SCHEMAS,
  CELL_ROLES, PHASES, createCellGarden };
