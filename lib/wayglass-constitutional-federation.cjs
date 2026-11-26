'use strict';

const { createHash, createPublicKey, verify: verifySignature } = require('node:crypto');
const { createAutopoieticRuntime } = require('./wayglass-autopoietic-runtime.cjs');
const { digest } = require('./wyrdrune/canonical.cjs');

const SCHEMA = 'wayglass.constitutional-federation/v0.1';
const CELL_ROLES = Object.freeze(['proposer', 'verifier', 'continuity', 'specialist']);
const MESSAGE_TYPES = Object.freeze([
  'variation.requested', 'candidate.proposed', 'candidate.verified',
  'candidate.rejected', 'candidate.promoted', 'candidate.refused',
  'candidate.revoke.requested', 'candidate.revoked',
]);
const sha256 = value => createHash('sha256').update(value, 'utf8').digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const clean = (value, name, max = 180) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new TypeError(name + ' must be non-empty text up to ' + max + ' characters');
  }
  return value.trim();
};
const stable = value => {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
};
const decisionBytes = decision => Buffer.from(stable(decision), 'utf8');

function createMemoryRegistry() {
  const selections = new Map();
  const key = (tissueId, moduleId) => tissueId + '::' + moduleId;
  return Object.freeze({
    durable: false,
    async get(tissueId, moduleId) {
      const value = selections.get(key(tissueId, moduleId));
      return value ? freeze(clone(value)) : null;
    },
    async set(tissueId, moduleId, selection) {
      selections.set(key(tissueId, moduleId), freeze(clone(selection)));
      return freeze(clone(selection));
    },
    async seed(tissueId, moduleId, selection) {
      const id = key(tissueId, moduleId);
      if (selections.has(id)) throw new Error('Registry bootstrap selection already exists.');
      selections.set(id, freeze(clone(selection)));
      return freeze(clone(selection));
    },
  });
}

function createConstitutionalFederation({
  charter,
  constitutionalSeat,
  registry = null,
  verifyCandidate = null,
  journal = null,
  eventStore = null,
  clock = () => new Date(),
  feather = null,
} = {}) {
  if (!charter || typeof charter !== 'object' || Array.isArray(charter)) throw new TypeError('A constitutional charter is required.');
  if (!Array.isArray(charter.allowedCapabilities) || charter.allowedCapabilities.some(x => typeof x !== 'string' || !x.trim())) throw new TypeError('charter.allowedCapabilities must be an array of non-empty strings.');
  if (charter.maxTissues !== undefined && (!Number.isInteger(charter.maxTissues) || charter.maxTissues < 1)) throw new RangeError('charter.maxTissues must be positive when provided.');
  if (!Number.isInteger(charter.maxCells) || charter.maxCells < 3) throw new RangeError('charter.maxCells must be at least three.');
  if (!Number.isInteger(charter.maxCandidates) || charter.maxCandidates < 1) throw new RangeError('charter.maxCandidates must be positive.');
  if (!Number.isInteger(charter.maxSourceBytes) || charter.maxSourceBytes < 1) throw new RangeError('charter.maxSourceBytes must be positive.');
  if (!Number.isInteger(charter.maxMessageBytes) || charter.maxMessageBytes < 256) throw new RangeError('charter.maxMessageBytes must be at least 256.');
  if (!Number.isInteger(charter.maxCyclesPerCell) || charter.maxCyclesPerCell < 1) throw new RangeError('charter.maxCyclesPerCell must be positive.');
  if (!Number.isInteger(charter.phaseTimeoutMs) || charter.phaseTimeoutMs < 1) throw new RangeError('charter.phaseTimeoutMs must be positive.');
  if (typeof clock !== 'function') throw new TypeError('clock must be a function.');
  if (verifyCandidate !== null && typeof verifyCandidate !== 'function') throw new TypeError('verifyCandidate must be a pure function.');
  if (eventStore !== null && typeof eventStore.append !== 'function') throw new TypeError('eventStore must provide append(event).');

  const charterValue = freeze(clone(charter));
  const charterHash = digest(charterValue);
  const seat = constitutionalSeat ? freeze(clone(constitutionalSeat)) : null;
  let seatPublicKey = null;
  if (seat) {
    clean(seat.seatId, 'constitutionalSeat.seatId');
    if (typeof seat.publicKeyPem !== 'string' || !seat.publicKeyPem.includes('PUBLIC KEY')) {
      throw new TypeError('constitutionalSeat.publicKeyPem must be a public key; private keys never belong in the runtime.');
    }
    seatPublicKey = createPublicKey(seat.publicKeyPem);
    if (seatPublicKey.asymmetricKeyType !== 'ed25519') throw new TypeError('Constitutional seat keys must use Ed25519.');
  }

  const store = registry || createMemoryRegistry();
  if (typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new TypeError('registry must provide async get(tissueId,moduleId) and set(tissueId,moduleId,selection).');
  }
  const runtime = createAutopoieticRuntime({ journal, clock, feather });
  const cells = new Map();
  const tissues = new Map();
  const candidates = new Map();
  const events = [];
  let messageSequence = 0;
  let candidateSequence = 0;
  let federationHalted = false;

  const now = () => {
    const value = clock();
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) throw new TypeError('clock must return a valid date.');
    return date;
  };

  async function record(kind, fields = {}) {
    const body = {
      schema: 'wayglass.federation-event/v0.1',
      sequence: events.length + 1,
      previousEventHash: events.length ? events[events.length - 1].eventHash : null,
      kind,
      occurredAt: now().toISOString(),
      charterHash,
      ...fields,
    };
    const event = freeze({ ...body, eventHash: digest(body) });
    if (eventStore) await eventStore.append(event);
    events.push(event);
    return event;
  }

  function defaultMembrane(role) {
    const rules = {
      proposer: {
        inbound: ['variation.requested', 'candidate.feedback', 'candidate.revoked'],
        outbound: ['candidate.proposed'],
      },
      verifier: {
        inbound: ['candidate.proposed'],
        outbound: ['candidate.verified', 'candidate.rejected'],
      },
      continuity: {
        inbound: ['candidate.verified', 'candidate.rejected', 'candidate.revoke.requested'],
        outbound: ['candidate.promoted', 'candidate.refused', 'candidate.revoked'],
      },
      specialist: { inbound: [], outbound: [] },
    };
    return freeze(clone(rules[role]));
  }

  function assertCell(cellId) {
    const cell = cells.get(clean(cellId, 'cell_id'));
    if (!cell) throw new Error('Unknown cell: ' + cellId);
    if (cell.status === 'retired' || cell.status === 'quarantined') throw new Error('Cell cannot act while ' + cell.status + '.');
    return cell;
  }

  function assertTissue(tissueId) {
    const tissue = tissues.get(clean(tissueId, 'tissue_id'));
    if (!tissue) throw new Error('Unknown tissue: ' + tissueId);
    if (tissue.status === 'retired' || tissue.status === 'quarantined') throw new Error('Tissue cannot act while ' + tissue.status + '.');
    return tissue;
  }

  async function sendMessage(fromId, toId, type, payload) {
    const from = assertCell(fromId);
    const to = assertCell(toId);
    if (!MESSAGE_TYPES.includes(type)) throw new TypeError('Unknown federation message type: ' + type);
    if (!from.membrane.outbound.includes(type)) throw new Error('Membrane refused outbound message ' + type + ' from ' + fromId);
    if (!to.membrane.inbound.includes(type)) throw new Error('Membrane refused inbound message ' + type + ' at ' + toId);
    const body = {
      schema: 'wayglass.cell-message/v0.1',
      messageId: 'cell-message-' + (++messageSequence),
      type,
      from: from.cellId,
      to: to.cellId,
      fromWorld: from.worldId,
      toWorld: to.worldId,
      payload: clone(payload),
      provenance: { sourceLineage: from.lineageRoot, targetLineage: to.lineageRoot },
    };
    const bytes = Buffer.byteLength(stable(body), 'utf8');
    if (bytes > charterValue.maxMessageBytes) throw new RangeError('Cell message exceeds membrane byte budget.');
    const message = freeze({ ...body, digest: digest(body) });
    await record('cell.message-sent', {
      messageId: message.messageId, type, from: from.cellId, to: to.cellId,
      fromWorld: from.worldId, toWorld: to.worldId, messageDigest: message.digest,
    });
    to.inbox.push(message);
    return message;
  }

  async function verifySeatDecision(proof, expected) {
    if (!seat || !seatPublicKey || !proof || typeof proof !== 'object') return false;
    const decision = proof.decision;
    if (!decision || typeof decision !== 'object' || typeof proof.signature !== 'string') return false;
    const exact = {
      schema: 'wayglass.constitutional-decision/v0.1',
      seatId: seat.seatId,
      charterHash,
      operation: expected.operation,
      tissueId: expected.tissueId,
      moduleId: expected.moduleId,
      candidateHash: expected.candidateHash,
      parentSourceHash: expected.parentSourceHash,
      nonce: decision.nonce,
      expiresAt: decision.expiresAt,
    };
    if (stable(decision) !== stable(exact)) return false;
    const expiry = Date.parse(decision.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= now().getTime()) return false;
    if (typeof decision.nonce !== 'string' || decision.nonce.length < 12 || decision.nonce.length > 160) return false;
    try {
      return verifySignature(null, decisionBytes(decision), seatPublicKey, Buffer.from(proof.signature, 'base64'));
    } catch {
      return false;
    }
  }

  async function boundedVerification(candidate, tissue, parent) {
    const builtIn = [
      { ok: sha256(candidate.source) === candidate.sourceHash, reason: 'candidate source hash matches its immutable source' },
      { ok: candidate.parentSourceHash === parent.sourceHash, reason: 'candidate names the current accepted parent' },
      { ok: candidate.requestedCapabilities.every(x => tissue.allowedCapabilities.includes(x)), reason: 'candidate requests no capability outside the tissue charter' },
      { ok: candidate.requestedAuthority.length === 0, reason: 'candidate requests no authority outside ordinary module promotion' },
      { ok: candidate.sourceBytes <= charterValue.maxSourceBytes, reason: 'candidate source is within the tissue source budget' },
    ];
    if (!verifyCandidate) return builtIn.concat([
      { ok: false, reason: 'independent WTL parse, type, determinism and conformance verifier is not configured' },
    ]);
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('independent candidate verifier exceeded its time budget')), charterValue.phaseTimeoutMs);
    });
    try {
      const context = freeze(clone({
        tissueId: tissue.tissueId,
        moduleId: tissue.moduleId,
        parent: clone(parent),
        charterHash,
      }));
      const extra = await Promise.race([
        Promise.resolve(verifyCandidate(freeze(clone(candidate)), context)),
        timeout,
      ]);
      if (!Array.isArray(extra)) throw new TypeError('verifyCandidate must return an array of verdicts.');
      return builtIn.concat(extra.map(v => ({ ok: v?.ok === true, reason: String(v?.reason || 'independent verifier returned no reason') })));
    } finally {
      clearTimeout(timer);
    }
  }

  function cellPhases(cell) {
    return {
      perceive: async () => {
        cell.phaseInbox = cell.inbox.slice();
        return {
          cellId: cell.cellId,
          worldId: cell.worldId,
          role: cell.role,
          messages: cell.phaseInbox.map(m => ({ messageId: m.messageId, type: m.type, digest: m.digest, from: m.from, fromWorld: m.fromWorld })),
        };
      },
      compress: async (_ctx, outputs) => ({
        inboxCount: outputs.perceive.messages.length,
        inboxDigest: digest(outputs.perceive.messages),
      }),
      release: async (_ctx, outputs) => ({
        role: cell.role,
        messageCount: outputs.perceive.messages.length,
        candidateHash: cell.pendingCandidateHash,
      }),
      verify: async (_ctx, outputs) => {
        if (cell.role !== 'verifier') return [{ ok: true, reason: 'verification authority is not held by this cell role' }];
        const message = cell.phaseInbox.find(m => m.type === 'candidate.proposed');
        if (!message) return [{ ok: true, reason: 'no candidate entered this verifier cycle' }];
        const candidate = candidates.get(message.payload.candidateId);
        const transported = message.payload.candidate;
        if (!candidate || !transported || candidate.candidate.sourceHash !== message.payload.sourceHash
          || digest(transported) !== digest(candidate.candidate)) {
          cell.pendingVerification = { candidateId: message.payload.candidateId, checks: [{ ok: false, reason: 'candidate reference, membrane payload or source hash mismatch' }] };
          return cell.pendingVerification.checks;
        }
        const tissue = tissues.get(candidate.tissueId);
        const parent = await store.get(candidate.tissueId, candidate.moduleId);
        let checks;
        try {
          checks = await boundedVerification(transported, tissue, parent || { sourceHash: null });
        } catch (error) {
          checks = [{ ok: false, reason: String(error.message || error) }];
        }
        cell.pendingVerification = { candidateId: candidate.candidate.candidateId, checks };
        return checks;
      },
      integrate: async (_ctx, outputs) => ({
        role: cell.role,
        observationDigest: digest(outputs.perceive),
        verificationCount: outputs.verify.length,
        localCanonDigest: cell.localCanonDigest,
      }),
      choose: async (ctx, outputs) => {
        if (cell.role !== 'continuity') return { decision: 'no-registry-authority-in-this-cell' };
        const revokeMessage = cell.phaseInbox.find(m => m.type === 'candidate.revoke.requested');
        if (revokeMessage) {
          const candidate = candidates.get(revokeMessage.payload.candidateId);
          if (!candidate || candidate.status !== 'promoted' || candidate.seatDecision?.operation !== 'candidate.revoke' || !candidate.previousSelection) {
            return { decision: 'candidate-not-authorized-for-revocation' };
          }
          const current = await store.get(candidate.tissueId, candidate.moduleId);
          if (!current || current.sourceHash !== candidate.candidate.sourceHash) {
            throw new Error('Revocation refused: selected descendant no longer matches the candidate.');
          }
          cell.pendingRevocation = candidate.candidate.candidateId;
          ctx.stage({
            kind: 'wayglass.registry.revoke',
            describe: {
              tissueId: candidate.tissueId, moduleId: candidate.moduleId,
              candidateId: candidate.candidate.candidateId,
              revokedHash: candidate.candidate.sourceHash,
              restoredHash: candidate.previousSelection.sourceHash,
              seatId: seat.seatId, charterHash,
            },
            apply: async () => {
              await store.set(candidate.tissueId, candidate.moduleId, candidate.previousSelection);
              return { restored: candidate.previousSelection, revokedCandidate: candidate.candidate.sourceHash };
            },
            undo: async () => store.set(candidate.tissueId, candidate.moduleId, current),
          });
          return { decision: 'revocation-staged-for-mobius-return', candidateHash: candidate.candidate.sourceHash };
        }
        const message = cell.phaseInbox.find(m => m.type === 'candidate.verified');
        if (!message) return { decision: 'no-verified-candidate' };
        const candidate = candidates.get(message.payload.candidateId);
        if (!candidate || candidate.status !== 'verified' || candidate.seatDecision?.operation !== 'candidate.promote') {
          return { decision: 'candidate-not-authorized-for-promotion' };
        }
        const previous = await store.get(candidate.tissueId, candidate.moduleId);
        if (!previous || previous.sourceHash !== candidate.candidate.parentSourceHash) {
          throw new Error('Promotion refused: registry parent changed after verification.');
        }
        cell.pendingPromotion = candidate.candidate.candidateId;
        candidate.previousSelection = freeze(clone(previous));
        ctx.stage({
          kind: 'wayglass.registry.select',
          describe: {
            tissueId: candidate.tissueId,
            moduleId: candidate.moduleId,
            candidateId: candidate.candidate.candidateId,
            candidateHash: candidate.candidate.sourceHash,
            parentSourceHash: previous.sourceHash,
            seatId: seat.seatId,
            charterHash,
          },
          apply: async () => {
            const selection = {
              moduleId: candidate.moduleId,
              sourceHash: candidate.candidate.sourceHash,
              candidateId: candidate.candidate.candidateId,
              parentSourceHash: previous.sourceHash,
              selectedBySeat: seat.seatId,
              charterHash,
            };
            await store.set(candidate.tissueId, candidate.moduleId, selection);
            return selection;
          },
          undo: async () => store.set(candidate.tissueId, candidate.moduleId, previous),
        });
        return { decision: 'promotion-staged-for-mobius-return', candidateHash: candidate.candidate.sourceHash };
      },
      transcend: async (ctx, outputs) => {
        const tissueId = cell.tissueId;
        const tissue = tissueId ? tissues.get(tissueId) : null;
        const selected = tissue ? await store.get(tissue.tissueId, tissue.moduleId) : null;
        const messageDigest = digest(cell.phaseInbox.map(m => m.digest));
        return {
          ...ctx.carried,
          cycle: ctx.carried.cycle + 1,
          lastMessageDigest: messageDigest,
          lastCandidateHash: cell.pendingCandidateHash || cell.pendingPromotion || ctx.carried.lastCandidateHash,
          activeSourceHash: selected?.sourceHash || ctx.carried.activeSourceHash,
        };
      },
    };
  }

  async function registerCell({
    cellId, worldId, role, sourceHash, lawSet = {}, localCanon = {},
    capabilities = [], membrane = null, resourceBudget = {},
    parentCellId = null, presence = 'resting',
  } = {}) {
    const id = clean(cellId, 'cellId');
    const world = clean(worldId, 'worldId');
    if (cells.size >= charterValue.maxCells) throw new RangeError('Constitutional charter cell limit reached.');
    if (cells.has(id)) throw new Error('Cell identity already exists: ' + id);
    if (!CELL_ROLES.includes(role)) throw new TypeError('Unknown cell role: ' + role);
    if (typeof sourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(sourceHash)) throw new TypeError('sourceHash must be a SHA-256 digest.');
    if (!Array.isArray(capabilities) || capabilities.some(x => !charterValue.allowedCapabilities.includes(x))) {
      throw new Error('Cell requested a capability not granted by the constitutional charter.');
    }
    if (!['awake', 'resting'].includes(presence)) throw new TypeError('presence must be awake or resting.');
    const membraneRules = membrane || defaultMembrane(role);
    if (!Array.isArray(membraneRules.inbound) || !Array.isArray(membraneRules.outbound)
      || membraneRules.inbound.some(x => !MESSAGE_TYPES.includes(x))
      || membraneRules.outbound.some(x => !MESSAGE_TYPES.includes(x))) {
      throw new TypeError('Membrane must declare valid inbound and outbound message types.');
    }
    const limits = {
      phaseTimeoutMs: resourceBudget.phaseTimeoutMs ?? charterValue.phaseTimeoutMs,
      effectTimeoutMs: resourceBudget.effectTimeoutMs ?? charterValue.phaseTimeoutMs,
      maxCycles: Math.min(resourceBudget.maxCycles ?? charterValue.maxCyclesPerCell, charterValue.maxCyclesPerCell),
    };
    for (const [key, value] of Object.entries(limits)) {
      if (!Number.isFinite(value) || value < 1) throw new RangeError('Invalid cell resource limit: ' + key);
    }
    const cell = {
      cellId: id, worldId: world, role, sourceHash,
      parentCellId: parentCellId ? clean(parentCellId, 'parentCellId') : null,
      cyclesRun: 0, pendingRevocation: null,
      lawSet: freeze(clone(lawSet)), lawSetHash: digest(lawSet),
      localCanon: freeze(clone(localCanon)), localCanonDigest: digest(localCanon),
      capabilities: freeze([...new Set(capabilities)].sort()),
      membrane: freeze(clone(membraneRules)), resourceBudget: freeze({ ...limits, maxMessageBytes: charterValue.maxMessageBytes }),
      inbox: [], phaseInbox: [], pendingCandidateHash: null, pendingVerification: null,
      pendingPromotion: null, tissueId: null, status: presence,
      lineageRoot: null, lastRun: null,
    };
    const registered = runtime.register({
      participant_id: id,
      world_id: world,
      worker_id: 'federation-worker:' + id,
      seeds: {
        cycle: 0,
        lastMessageDigest: null,
        lastCandidateHash: null,
        activeSourceHash: sourceHash,
      },
      phases: cellPhases(cell),
      presence,
      limits,
    });
    cell.lineageRoot = registered.lineage_root;
    cells.set(id, cell);
    await record('cell.registered', {
      cellId: id, worldId: world, role, lineageRoot: cell.lineageRoot,
      sourceHash, lawSetHash: cell.lawSetHash, localCanonDigest: cell.localCanonDigest,
      parentCellId: cell.parentCellId,
    });
    return describeCell(cell);
  }

  function describeCell(cell) {
    return freeze({
      cellId: cell.cellId, worldId: cell.worldId, role: cell.role,
      parentCellId: cell.parentCellId, lineageRoot: cell.lineageRoot,
      sourceHash: cell.sourceHash, lawSetHash: cell.lawSetHash,
      localCanonDigest: cell.localCanonDigest, capabilities: cell.capabilities,
      membrane: cell.membrane, resourceBudget: cell.resourceBudget,
      status: cell.status, tissueId: cell.tissueId, cyclesRun: cell.cyclesRun,
      quarantineReason: cell.quarantineReason || null, retiredReason: cell.retiredReason || null,
    });
  }

  async function createTissue({ tissueId, moduleId, cellIds, initialSourceHash, allowedCapabilities = null, localCanon = {} } = {}) {
    const id = clean(tissueId, 'tissueId');
    const module = clean(moduleId, 'moduleId');
    if (tissues.has(id)) throw new Error('Tissue already exists: ' + id);
    if (tissues.size >= (charterValue.maxTissues || 1)) throw new RangeError('Constitutional charter tissue limit reached.');
    if (!Array.isArray(cellIds) || cellIds.length < 3) throw new TypeError('A tissue needs at least three independent cells.');
    const members = cellIds.map(assertCell);
    const roles = new Set(members.map(x => x.role));
    for (const role of ['proposer', 'verifier', 'continuity']) {
      if (members.filter(x => x.role === role).length !== 1) throw new Error('Tissue requires exactly one ' + role + ' cell.');
    }
    if (new Set(members.map(x => x.worldId)).size !== members.length) throw new Error('Each universe needs its own world_id.');
    if (members.some(x => x.tissueId)) throw new Error('A cell already belongs to a tissue; cross-tissue membership needs an explicit federation agreement.');
    if (typeof initialSourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(initialSourceHash)) throw new TypeError('initialSourceHash must be a SHA-256 digest.');
    const caps = allowedCapabilities || charterValue.allowedCapabilities;
    if (!Array.isArray(caps) || caps.some(x => !charterValue.allowedCapabilities.includes(x))) {
      throw new Error('Tissue capabilities must be a subset of the charter.');
    }
    const current = await store.get(id, module);
    if (!current && typeof store.seed === 'function') {
      await store.seed(id, module, { moduleId: module, sourceHash: initialSourceHash, candidateId: null, parentSourceHash: null });
    } else if (!current) {
      throw new Error('Host registry must be pre-seeded with the founding source before tissue creation.');
    } else if (current.sourceHash !== initialSourceHash) {
      throw new Error('Initial source hash differs from the existing registry selection.');
    }
    const tissue = {
      tissueId: id, moduleId: module, cellIds: members.map(x => x.cellId),
      roleMap: Object.fromEntries(members.filter(x => x.role !== 'specialist').map(x => [x.role, x.cellId])),
      allowedCapabilities: freeze([...new Set(caps)].sort()),
      localCanon: freeze(clone(localCanon)), localCanonDigest: digest(localCanon),
      status: 'active', createdAt: now().toISOString(),
    };
    members.forEach(cell => { cell.tissueId = id; });
    tissues.set(id, tissue);
    await record('tissue.created', { tissueId: id, moduleId: module, cellIds: tissue.cellIds, localCanonDigest: tissue.localCanonDigest });
    return describeTissue(tissue);
  }

  function describeTissue(tissue) {
    return freeze({
      tissueId: tissue.tissueId, moduleId: tissue.moduleId, cellIds: [...tissue.cellIds],
      roleMap: clone(tissue.roleMap), allowedCapabilities: [...tissue.allowedCapabilities],
      localCanonDigest: tissue.localCanonDigest, status: tissue.status, createdAt: tissue.createdAt,
    });
  }

  async function runCell(cellId) {
    const cell = assertCell(cellId);
    if (federationHalted) throw new Error('Federation is halted by Feather.');
    if (!cell.tissueId) throw new Error('Cell must join a tissue before running.');
    if (cell.cyclesRun >= cell.resourceBudget.maxCycles) throw new Error('Cell metabolic cycle budget exhausted; rest or chartered renewal is required.');
    if (cell.status === 'resting') runtime.wake(cell.cellId);
    cell.status = 'awake';
    let result;
    try {
      result = await runtime.run({ cycles: 1 });
    } finally {
      runtime.rest(cell.cellId);
      cell.status = 'resting';
    }
    const row = result.participants.find(x => x.participant_id === cell.cellId);
    cell.cyclesRun += 1;
    cell.lastRun = row ? freeze(clone(row)) : null;

    if (cell.pendingVerification) {
      const pending = cell.pendingVerification;
      const candidate = candidates.get(pending.candidateId);
      if (candidate) {
        candidate.verification = freeze(clone(pending.checks));
        candidate.status = pending.checks.every(x => x.ok === true) ? 'verified' : 'rejected';
        await record('candidate.' + candidate.status, {
          tissueId: candidate.tissueId, candidateId: candidate.candidate.candidateId,
          candidateHash: candidate.candidate.sourceHash, verifierCellId: cell.cellId,
          verification: candidate.verification,
        });
        const target = assertTissue(candidate.tissueId).roleMap.continuity;
        await sendMessage(cell.cellId, target, candidate.status === 'verified' ? 'candidate.verified' : 'candidate.rejected', {
          candidateId: candidate.candidate.candidateId,
          sourceHash: candidate.candidate.sourceHash,
          verificationDigest: digest(candidate.verification),
        });
      }
      cell.pendingVerification = null;
    }

    if (cell.pendingRevocation) {
      const candidate = candidates.get(cell.pendingRevocation);
      if (candidate) {
        const selected = await store.get(candidate.tissueId, candidate.moduleId);
        if (row?.status === 'committed' && selected?.sourceHash === candidate.previousSelection?.sourceHash) {
          candidate.status = 'revoked';
          candidate.revokedAt = now().toISOString();
          await record('candidate.revoked', {
            tissueId: candidate.tissueId, candidateId: candidate.candidate.candidateId,
            candidateHash: candidate.candidate.sourceHash, restoredHash: selected.sourceHash,
            seatId: seat.seatId, mobiusCheckpoint: row.checkpoint,
          });
          await sendMessage(cell.cellId, assertTissue(candidate.tissueId).roleMap.proposer, 'candidate.revoked', {
            candidateId: candidate.candidate.candidateId,
            revokedHash: candidate.candidate.sourceHash, restoredHash: selected.sourceHash,
          });
        } else {
          candidate.status = 'revocation-failed';
          await record('candidate.revocation-failed', {
            tissueId: candidate.tissueId, candidateId: candidate.candidate.candidateId,
            candidateHash: candidate.candidate.sourceHash, mobiusStatus: row?.status || 'missing',
          });
        }
      }
      cell.pendingRevocation = null;
    }

    if (cell.pendingPromotion) {
      const candidate = candidates.get(cell.pendingPromotion);
      if (candidate) {
        const selected = await store.get(candidate.tissueId, candidate.moduleId);
        if (row?.status === 'committed' && selected?.sourceHash === candidate.candidate.sourceHash) {
          candidate.status = 'promoted';
          candidate.promotedAt = now().toISOString();
          await record('candidate.promoted', {
            tissueId: candidate.tissueId, candidateId: candidate.candidate.candidateId,
            candidateHash: candidate.candidate.sourceHash, seatId: seat.seatId,
            mobiusCheckpoint: row.checkpoint,
          });
          const target = assertTissue(candidate.tissueId).roleMap.proposer;
          await sendMessage(cell.cellId, target, 'candidate.promoted', { candidateId: candidate.candidate.candidateId, sourceHash: candidate.candidate.sourceHash });
        } else {
          candidate.status = 'promotion-failed';
          await record('candidate.promotion-failed', {
            tissueId: candidate.tissueId, candidateId: candidate.candidate.candidateId,
            candidateHash: candidate.candidate.sourceHash, mobiusStatus: row?.status || 'missing',
          });
        }
      }
      cell.pendingPromotion = null;
    }

    cell.inbox = cell.inbox.filter(m => !cell.phaseInbox.some(used => used.messageId === m.messageId));
    cell.phaseInbox = [];
    cell.pendingCandidateHash = null;
    return freeze({
      schema: 'wayglass.cell-cycle-receipt/v0.1',
      cellId: cell.cellId, worldId: cell.worldId, role: cell.role,
      lineageRoot: cell.lineageRoot, status: row?.status || 'not-scheduled',
      checkpoint: row?.checkpoint || null,
      federationReceipt: result.receipt_hash,
      persistence: result.persistence,
    });
  }

  async function proposeCandidate({ tissueId, candidateId = null, moduleId = null, source, parentSourceHash, requestedCapabilities = [], author, intent, provenance = {}, resourceEnvelope = {} } = {}) {
    const tissue = assertTissue(tissueId);
    if (tissue.status !== 'active') throw new Error('Tissue is not active.');
    if (candidates.size >= charterValue.maxCandidates) throw new RangeError('Constitutional charter candidate limit reached.');
    const proposerId = tissue.roleMap.proposer;
    const proposer = assertCell(proposerId);
    if (typeof source !== 'string' || !source.length) throw new TypeError('Candidate source is required.');
    const sourceBytes = Buffer.byteLength(source, 'utf8');
    if (sourceBytes > charterValue.maxSourceBytes) throw new RangeError('Candidate source exceeds charter source budget.');
    const selected = await store.get(tissue.tissueId, tissue.moduleId);
    if (!selected || selected.sourceHash !== parentSourceHash) throw new Error('Candidate parent must equal the current accepted registry selection.');
    if (moduleId && moduleId !== tissue.moduleId) throw new Error('Candidate module does not belong to this tissue.');
    if (!Array.isArray(requestedCapabilities) || requestedCapabilities.some(x => typeof x !== 'string' || !x.trim())) throw new TypeError('requestedCapabilities must be an array of non-empty strings.');
    if (!Array.isArray(requestedAuthority) || requestedAuthority.some(x => typeof x !== 'string' || !x.trim())) throw new TypeError('requestedAuthority must be an array of non-empty strings.');
    const id = candidateId ? clean(candidateId, 'candidateId') : 'candidate-' + (++candidateSequence);
    if (candidates.has(id)) throw new Error('Candidate identity already exists: ' + id);
    const candidate = freeze({
      schema: 'wayglass.evolution-candidate/v0.1',
      candidateId: id, tissueId: tissue.tissueId, moduleId: tissue.moduleId,
      parentSourceHash, source, sourceHash: sha256(source), sourceBytes,
      requestedCapabilities: [...new Set(requestedCapabilities)].sort(),
      requestedAuthority: [...new Set(requestedAuthority)].sort(),
      author: clean(author || proposer.cellId, 'author'),
      intent: clean(intent || 'unspecified variation', 'intent', 1000),
      provenance: clone(provenance),
      resourceEnvelope: clone(resourceEnvelope),
      proposedByCell: proposer.cellId,
    });
    candidates.set(id, {
      candidate, status: 'proposed', tissueId: tissue.tissueId, moduleId: tissue.moduleId,
      verification: null, seatDecision: null, promotedAt: null,
    });
    if (!proposer.membrane.inbound.includes('variation.requested')) throw new Error('Proposer membrane refuses variation requests.');
    proposer.pendingCandidateHash = candidate.sourceHash;
    proposer.inbox.push(freeze({
      schema: 'wayglass.cell-message/v0.1', messageId: 'variation-request-' + (++messageSequence),
      type: 'variation.requested', from: 'constitutional-input', to: proposer.cellId,
      fromWorld: null, toWorld: proposer.worldId, payload: { candidateId: id, sourceHash: candidate.sourceHash },
      provenance: { sourceLineage: null, targetLineage: proposer.lineageRoot },
      digest: digest({ candidateId: id, sourceHash: candidate.sourceHash, type: 'variation.requested' }),
    }));
    const receipt = await runCell(proposer.cellId);
    if (receipt.status !== 'committed') {
      candidates.get(id).status = 'proposal-failed';
      return describeCandidate(candidates.get(id));
    }
    await sendMessage(proposer.cellId, tissue.roleMap.verifier, 'candidate.proposed', {
      candidateId: id, sourceHash: candidate.sourceHash, candidate,
    });
    await record('candidate.proposed', {
      tissueId: tissue.tissueId, candidateId: id, candidateHash: candidate.sourceHash,
      parentSourceHash, proposerCellId: proposer.cellId, sourceBytes,
    });
    return describeCandidate(candidates.get(id));
  }

  function describeCandidate(record) {
    return freeze({
      candidateId: record.candidate.candidateId, tissueId: record.tissueId,
      moduleId: record.moduleId, parentSourceHash: record.candidate.parentSourceHash,
      sourceHash: record.candidate.sourceHash,
      requestedCapabilities: record.candidate.requestedCapabilities,
      requestedAuthority: record.candidate.requestedAuthority,
      status: record.status, verification: record.verification,
      promotedAt: record.promotedAt, revokedAt: record.revokedAt || null,
    });
  }

  async function verifyCandidateForTissue(candidateId) {
    const candidate = candidates.get(clean(candidateId, 'candidateId'));
    if (!candidate) throw new Error('Unknown candidate: ' + candidateId);
    if (candidate.status !== 'proposed') throw new Error('Only a proposed candidate can be verified.');
    const tissue = assertTissue(candidate.tissueId);
    const receipt = await runCell(tissue.roleMap.verifier);
    return freeze({ ...describeCandidate(candidate), cycle: receipt });
  }

  function buildSeatDecision({ candidateId, nonce, expiresAt, operation = 'candidate.promote' } = {}) {
    const candidate = candidates.get(clean(candidateId, 'candidateId'));
    if (!candidate) throw new Error('Unknown candidate: ' + candidateId);
    if (!['candidate.promote', 'candidate.revoke'].includes(operation)) throw new TypeError('Unsupported constitutional decision operation.');
    return freeze({
      schema: 'wayglass.constitutional-decision/v0.1',
      seatId: seat?.seatId || null,
      charterHash,
      operation,
      tissueId: candidate.tissueId,
      moduleId: candidate.moduleId,
      candidateHash: candidate.candidate.sourceHash,
      parentSourceHash: candidate.candidate.parentSourceHash,
      nonce: clean(nonce, 'nonce', 160),
      expiresAt: new Date(expiresAt).toISOString(),
    });
  }

  async function promoteCandidate({ candidateId, proof } = {}) {
    const candidate = candidates.get(clean(candidateId, 'candidateId'));
    if (!candidate) throw new Error('Unknown candidate: ' + candidateId);
    if (candidate.status !== 'verified') throw new Error('Only an independently verified candidate can be promoted.');
    const expected = {
      tissueId: candidate.tissueId, moduleId: candidate.moduleId,
      candidateHash: candidate.candidate.sourceHash, parentSourceHash: candidate.candidate.parentSourceHash,
      operation: 'candidate.promote',
    };
    if (!await verifySeatDecision(proof, expected)) {
      await record('candidate.authorization-refused', {
        tissueId: candidate.tissueId, candidateId, candidateHash: candidate.candidate.sourceHash,
      });
      return freeze({ ...describeCandidate(candidate), authorization: 'refused' });
    }
    candidate.seatDecision = freeze(clone(proof.decision));
    const tissue = assertTissue(candidate.tissueId);
    const continuity = tissue.roleMap.continuity;
    const cell = assertCell(continuity);
    cell.pendingCandidateHash = candidate.candidate.sourceHash;
    cell.pendingPromotion = candidateId;
    // The verified message was consumed by the verifier cycle; the continuity
    // cell receives a fresh, attributed message carrying only the verification receipt.
    await sendMessage(tissue.roleMap.verifier, continuity, 'candidate.verified', {
      candidateId, sourceHash: candidate.candidate.sourceHash,
      verificationDigest: digest(candidate.verification),
    });
    const receipt = await runCell(continuity);
    return freeze({ ...describeCandidate(candidate), cycle: receipt });
  }

  async function revokeCandidate({ candidateId, proof } = {}) {
    const candidate = candidates.get(clean(candidateId, 'candidateId'));
    if (!candidate) throw new Error('Unknown candidate: ' + candidateId);
    if (candidate.status !== 'promoted' || !candidate.previousSelection) throw new Error('Only a promoted candidate with a preserved parent selection can be revoked.');
    const expected = {
      tissueId: candidate.tissueId, moduleId: candidate.moduleId,
      candidateHash: candidate.candidate.sourceHash, parentSourceHash: candidate.candidate.parentSourceHash,
      operation: 'candidate.revoke',
    };
    if (!await verifySeatDecision(proof, expected)) {
      await record('candidate.revocation-authorization-refused', {
        tissueId: candidate.tissueId, candidateId, candidateHash: candidate.candidate.sourceHash,
      });
      return freeze({ ...describeCandidate(candidate), authorization: 'refused' });
    }
    candidate.seatDecision = freeze(clone(proof.decision));
    const tissue = assertTissue(candidate.tissueId);
    const continuity = assertCell(tissue.roleMap.continuity);
    if (!continuity.membrane.inbound.includes('candidate.revoke.requested')) throw new Error('Continuity membrane refuses revocation requests.');
    continuity.inbox.push(freeze({
      schema: 'wayglass.cell-message/v0.1',
      messageId: 'seat-revocation-' + (++messageSequence),
      type: 'candidate.revoke.requested',
      from: seat.seatId, to: continuity.cellId,
      fromWorld: null, toWorld: continuity.worldId,
      payload: { candidateId, sourceHash: candidate.candidate.sourceHash, decisionDigest: digest(proof.decision) },
      provenance: { sourceLineage: null, targetLineage: continuity.lineageRoot },
      digest: digest({ candidateId, sourceHash: candidate.candidate.sourceHash, decisionDigest: digest(proof.decision) }),
    }));
    await record('seat.decision.accepted', {
      tissueId: candidate.tissueId, candidateId, seatId: seat.seatId,
      operation: 'candidate.revoke', decisionDigest: digest(proof.decision),
    });
    continuity.pendingRevocation = candidateId;
    const receipt = await runCell(continuity);
    return freeze({ ...describeCandidate(candidate), cycle: receipt });
  }

  async function forkCell({ parentCellId, cellId, worldId, role = 'specialist' } = {}) {
    const parent = assertCell(parentCellId);
    const child = await registerCell({
      cellId, worldId, role, sourceHash: parent.sourceHash,
      lawSet: clone(parent.lawSet), localCanon: clone(parent.localCanon),
      capabilities: [...parent.capabilities], membrane: defaultMembrane(role),
      resourceBudget: clone(parent.resourceBudget), parentCellId: parent.cellId,
      presence: 'resting',
    });
    await record('cell.forked', {
      parentCellId: parent.cellId, childCellId: child.cellId,
      parentLineageRoot: parent.lineageRoot, childLineageRoot: child.lineageRoot,
      sourceHash: child.sourceHash, lawSetHash: child.lawSetHash,
    });
    return child;
  }

  async function addCellToTissue(tissueId, cellId) {
    const tissue = assertTissue(tissueId);
    const cell = assertCell(cellId);
    if (cell.tissueId) throw new Error('Cell already belongs to a tissue.');
    if (cell.role !== 'specialist') throw new Error('Only specialist descendants may join an established tissue without replacing a constitutional role.');
    cell.tissueId = tissue.tissueId;
    tissue.cellIds.push(cell.cellId);
    await record('tissue.cell-added', { tissueId: tissue.tissueId, cellId: cell.cellId, lineageRoot: cell.lineageRoot });
    return describeTissue(tissue);
  }

  function restCell(cellId) {
    const cell = assertCell(cellId);
    runtime.rest(cell.cellId);
    cell.status = 'resting';
    return describeCell(cell);
  }

  async function quarantineCell(cellId, reason = 'quarantined by local immune response') {
    const cell = cells.get(clean(cellId, 'cell_id'));
    if (!cell) throw new Error('Unknown cell: ' + cellId);
    if (cell.status === 'retired') throw new Error('A retired cell cannot be quarantined.');
    runtime.rest(cell.cellId);
    cell.status = 'quarantined';
    cell.quarantineReason = clean(reason, 'quarantine reason', 1000);
    await record('cell.quarantined', {
      cellId: cell.cellId, worldId: cell.worldId, lineageRoot: cell.lineageRoot,
      reason: cell.quarantineReason,
    });
    const tissue = cell.tissueId ? tissues.get(cell.tissueId) : null;
    if (tissue && cell.role !== 'specialist') tissue.status = 'degraded';
    return describeCell(cell);
  }

  async function retireCell(cellId, reason = 'retired by local governance') {
    const cell = assertCell(cellId);
    runtime.rest(cell.cellId);
    cell.status = 'retired';
    cell.retiredReason = clean(reason, 'retirement reason', 1000);
    await record('cell.retired', { cellId: cell.cellId, worldId: cell.worldId, lineageRoot: cell.lineageRoot, reason: cell.retiredReason });
    const tissue = cell.tissueId ? tissues.get(cell.tissueId) : null;
    if (tissue && cell.role !== 'specialist') tissue.status = 'degraded';
    return describeCell(cell);
  }

  async function halt(reason = 'Feather') {
    federationHalted = true;
    for (const cell of cells.values()) {
      if (cell.status !== 'retired') {
        runtime.rest(cell.cellId);
        cell.status = 'resting';
      }
    }
    for (const tissue of tissues.values()) tissue.status = 'resting';
    await record('federation.halted', { reason: clean(reason, 'halt reason', 500) });
    return snapshot();
  }

  async function resume() {
    federationHalted = false;
    for (const tissue of tissues.values()) if (tissue.status === 'resting') tissue.status = 'active';
    await record('federation.resumed', {});
    return snapshot();
  }

  function assessHomeostasis() {
    const rows = [...cells.values()];
    const counts = Object.fromEntries(['awake', 'resting', 'quarantined', 'retired'].map(status => [status, rows.filter(c => c.status === status).length]));
    const pending = [...candidates.values()].filter(c => ['proposed', 'verified'].includes(c.status)).length;
    const degradedTissues = [...tissues.values()].filter(t => t.status === 'degraded' || t.status === 'quarantined').length;
    const status = degradedTissues ? 'degraded' : federationHalted ? 'resting' : pending ? 'attention' : 'stable';
    return freeze({
      schema: 'wayglass.homeostasis/v0.1',
      status, cells: counts, tissues: tissues.size,
      pendingCandidates: pending, degradedTissues,
      configuredLimits: {
        maxCells: charterValue.maxCells, maxCandidates: charterValue.maxCandidates,
        maxSourceBytes: charterValue.maxSourceBytes, maxMessageBytes: charterValue.maxMessageBytes,
        maxCyclesPerCell: charterValue.maxCyclesPerCell, phaseTimeoutMs: charterValue.phaseTimeoutMs,
      },
      measuredMemoryBytes: null,
      persistence: store.durable === true && eventStore ? 'host-durable-adapters' : 'ephemeral-or-partial',
    });
  }

  function snapshot() {
    const body = {
      schema: SCHEMA,
      identity: 'wayglass',
      charter: { id: charterValue.charterId || 'wayglass-charter', version: charterValue.version || '0.1', hash: charterHash },
      constitutionalSeat: seat ? { seatId: seat.seatId, keyId: seat.keyId || null, authenticatedBy: 'ed25519-public-key-verification' } : null,
      cells: [...cells.values()].map(describeCell).sort((a, b) => a.cellId.localeCompare(b.cellId)),
      tissues: [...tissues.values()].map(describeTissue).sort((a, b) => a.tissueId.localeCompare(b.tissueId)),
      candidates: [...candidates.values()].map(describeCandidate).sort((a, b) => a.candidateId.localeCompare(b.candidateId)),
      homeostasis: assessHomeostasis(),
      eventCount: events.length,
      persistence: store.durable === true && eventStore ? 'host-durable-adapters' : 'ephemeral-or-partial',
      authority: { selfPromotion: false, selfGrantedCapabilities: false, crossCellIdentityMerge: false },
    };
    return freeze({ ...body, digest: digest(body) });
  }

  return Object.freeze({
    schema: SCHEMA, charterHash,
    registerCell, createTissue, addCellToTissue, forkCell,
    proposeCandidate, verifyCandidate: verifyCandidateForTissue, promoteCandidate, revokeCandidate,
    buildSeatDecision, sendMessage, runCell, restCell, retireCell, halt, resume,
    assessHomeostasis, snapshot,
    getCell: id => {
      const cell = cells.get(clean(id, 'cell_id'));
      if (!cell) throw new Error('Unknown cell: ' + id);
      return describeCell(cell);
    },
    getTissue: id => {
      const tissue = tissues.get(clean(id, 'tissue_id'));
      if (!tissue) throw new Error('Unknown tissue: ' + id);
      return describeTissue(tissue);
    },
    getCandidate: id => {
      const record = candidates.get(clean(id, 'candidateId'));
      if (!record) throw new Error('Unknown candidate: ' + id);
      return describeCandidate(record);
    },
    getSelection: async (tissueId, moduleId) => {
      const tissue = assertTissue(tissueId);
      if (moduleId !== tissue.moduleId) throw new Error('Module is not registered to this tissue.');
      return store.get(tissue.tissueId, tissue.moduleId);
    },
    events: () => freeze(clone(events)),
    runtimeSnapshot: () => runtime.snapshot(),
  });
}

module.exports = {
  SCHEMA,
  CELL_ROLES,
  MESSAGE_TYPES,
  createMemoryRegistry,
  createConstitutionalFederation,
  constitutionalDecisionBytes: decisionBytes,
};
