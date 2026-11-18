'use strict';

// One bounded, computational Wyrdrune cell garden. No model invocation, background
// replication, external effects, inherited credentials or persistence.
const { createHash } = require('node:crypto');
const { digest } = require('./wyrdrune/canonical.cjs');

const SCHEMA = 'wayglass.cell-mitosis/v0.1';
const RECEIPT_SCHEMA = 'wayglass.cell-division-receipt/v0.1';
const PHASES = ['perceive', 'compress', 'release', 'verify', 'integrate', 'choose', 'return', 'transcend'];
const copy = value => JSON.parse(JSON.stringify(value));
const boundedId = value => typeof value === 'string' && /^cell:[a-z0-9][a-z0-9-]{0,62}$/.test(value);
const issue = (message, status = 409) => Object.assign(new Error(message), { status });

function createCellGarden({ maxActive = 8, maxGeneration = 4 } = {}) {
  if (!Number.isInteger(maxActive) || maxActive < 2 || maxActive > 32 ||
      !Number.isInteger(maxGeneration) || maxGeneration < 1 || maxGeneration > 8) {
    throw new RangeError('Cell garden bounds must be explicit and finite');
  }
  const founder = 'cell:origin';
  const genome_ref = digest({ programme: 'lib/wyrdrune/shipwide-cell.wtl', contract: SCHEMA });
  const lineage_root = digest({ founder, genome_ref });
  const cells = new Map([[founder, Object.freeze({
    cell_id: founder, parent_id: null, lineage_root, genome_ref,
    ancestor_ids: [], generation: 0, twist: { orientation: 1, phase: 0 },
    memory_refs: [], capabilities: [], status: 'active',
  })]]);
  const history = [];
  let revision = 0;
  let epoch = 0;
  let feathered = false;
  let pending = null;

  const active = () => [...cells.values()].filter(cell => cell.status === 'active');
  function snapshot() {
    return copy({
      schema: SCHEMA, status: feathered ? 'feather-stopped' : 'ready',
      revision, memory: 'in-memory-only', persistence: false,
      autonomous_replication: false, model_invoked: false,
      limits: { maxActive, maxGeneration },
      cells: [...cells.values()], history, pending: pending ? {
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
    if (parent.generation >= maxGeneration || active().length >= maxActive)
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
      capabilities: [], // Capabilities never replicate with the genome.
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
    cells.set(parent.cell_id, Object.freeze({ ...parent, status: 'divided' }));
    for (const daughter of daughters) cells.set(daughter.cell_id, Object.freeze(daughter));
    revision++;
    const receipt = Object.freeze({
      schema: RECEIPT_SCHEMA, status: 'committed-in-memory',
      parent_id: parent.cell_id, daughter_ids: daughters.map(d => d.cell_id),
      proposal_id, revision, lineage_root, source_hash: wtl.source_hash,
      wtl_checkpoint_digest: wtl.checkpoint_digest,
      identity_transfer: false, authority_inherited: false,
      external_effects: false, persisted: false, model_invoked: false,
    });
    history.push(receipt);
    pending = null;
    return { receipt: copy(receipt), culture: snapshot() };
  }

  function feather() {
    epoch++; feathered = true; pending = null;
    return snapshot();
  }
  function resume({ owner_confirmed } = {}) {
    if (owner_confirmed !== true) throw issue('Explicit Feather release is required', 403);
    epoch++; feathered = false; pending = null;
    return snapshot();
  }
  return Object.freeze({ snapshot, propose, commit, feather, resume });
}

module.exports = { SCHEMA, RECEIPT_SCHEMA, PHASES, createCellGarden };
