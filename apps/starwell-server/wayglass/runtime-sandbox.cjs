'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash, generateKeyPairSync, createPrivateKey, createPublicKey, sign, verify, randomUUID } = require('node:crypto');
const { WorkspaceProjects } = require('./workspace-projects');
const { createWyrdruneRevisionLineage } = require('../wayglass-runtime/wayglass-wyrdrune-revision.cjs');
const { compileTyped, previewWyrdruneRitual } = require('../wayglass-runtime/wayglass-wyrdrune-ritual.cjs');
const { encode, digest } = require('../wayglass-runtime/wyrdrune/canonical.cjs');

const ACTOR = 'wayglass';
const MAIN = 'main';
const programOf = event => event.data.program ?? MAIN;
function programName(value = MAIN) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(value)) {
    throw new TypeError('Invalid sandbox programme name');
  }
  return value;
}
const SCHEMA = 'wayglass.runtime-sandbox/v0.1';
const signedBytes = body => Buffer.from(encode(body));

function keypair(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const keyPath = path.join(directory, 'seat-signing.pem');
  try { return createPrivateKey(fs.readFileSync(keyPath)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Publish a complete key atomically, including when multiple hosts start together.
  const temporary = path.join(directory, '.' + randomUUID() + '.pem');
  const { privateKey } = generateKeyPairSync('ed25519');
  try {
    const fd = fs.openSync(temporary, 'wx', 0o600);
    try { fs.writeFileSync(fd, privateKey.export({ format: 'pem', type: 'pkcs8' })); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    try { fs.linkSync(temporary, keyPath); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return createPrivateKey(fs.readFileSync(keyPath));
}

class SandboxJournal extends WorkspaceProjects {
  constructor(directory) {
    super({ directory });
  }

  load() {
    const events = super.load();
    if (events.length) {
      const publicKey = createPublicKey(fs.readFileSync(path.join(this.directory, 'seat-signing.pem')));
      for (const { event_hash, data, ...event } of events) {
        const { signature, ...evidence } = data;
        if (!verify(null, signedBytes({ ...event, data: evidence }), publicKey, Buffer.from(signature, 'base64'))) {
          throw new Error('Wayglass sandbox signature verification failed');
        }
      }
    }
    return events;
  }

  append(events, projectId, kind, data) {
    const key = keypair(this.directory);
    const body = {
      event_id: randomUUID(), created_at: new Date().toISOString(),
      previous_hash: events.at(-1)?.event_hash ?? null,
      participant_id: ACTOR, project_id: projectId, kind, data,
    };
    const signature = sign(null, signedBytes(body), key).toString('base64');
    const sealed = { ...body, data: { ...data, signature } };
    const event = { ...sealed, event_hash: createHash('sha256').update(JSON.stringify(sealed)).digest('hex') };
    events.push(event);
    return event;
  }
}

function createRuntimeSandbox({
  directory = process.env.WAYGLASS_SANDBOX_DIR || path.join(os.homedir(), '.wayglass', 'ship-sandbox'),
} = {}) {
  const journal = new SandboxJournal(directory);
  const related = (events, id) => events.filter(event => event.project_id === id);
  const summary = (events, id) => {
    const history = related(events, id);
    if (!history.length) throw new Error('Unknown Wayglass sandbox project');
    const { title, description } = history[0].data;
    const programs = new Map();
    for (const event of history) programs.set(programOf(event), event);
    const { source, revision } = programs.get(MAIN).data;
    return {
      id, title, description, source, revision, head: history.at(-1).event_hash, history,
      programs: [...programs].map(([name, event]) => ({
        name, source: event.data.source, revision: event.data.revision,
      })),
    };
  };
  function inspect(projectId) {
    const events = journal.load();
    return {
      schema: SCHEMA, participant_id: ACTOR,
      ...(projectId ? { project: summary(events, projectId) } : {}),
      projects: events.filter(event => event.kind === 'create').map(event => {
        const { id, title, revision, head } = summary(events, event.project_id);
        return { id, title, revision, head };
      }),
      publicKey: events.length ? createPublicKey(fs.readFileSync(path.join(directory, 'seat-signing.pem')))
        .export({ type: 'spki', format: 'pem' }) : null,
    };
  }

  async function apply(action, provenance, { signal } = {}) {
    if (signal?.aborted) throw new Error('Sandbox turn interrupted');
    if (!action || typeof action !== 'object' || Array.isArray(action)) throw new TypeError('Sandbox action required');
    const { op, project_id: id, source } = action;
    if (op === 'pass') return { schema: SCHEMA, status: 'passed' };
    if (!['create', 'add', 'revise'].includes(op) || typeof id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id) ||
        typeof source !== 'string' || !source.trim() || Buffer.byteLength(source) > 16000) {
      throw new TypeError('Invalid sandbox action, project identifier or WTL source');
    }
    const program = programName(action.program);
    if (op === 'create' && program !== MAIN) throw new TypeError('New projects start with the main programme');
    const events = journal.load();
    const history = related(events, id);
    if (history.some(event => event.data.provenance.turnId === provenance.turnId)) {
      const receipt = history.find(event => event.data.provenance.turnId === provenance.turnId);
      return { schema: SCHEMA, status: 'already-applied', receipt };
    }
    if (op === 'create' && history.length) throw new Error('Sandbox project already exists');
    if (op === 'create' && events.filter(event => event.kind === 'create').length >= 32) {
      throw new Error('Sandbox project limit reached');
    }
    if (history.length >= 64) throw new Error('Sandbox revision limit reached');
    const programHistory = history.filter(event => programOf(event) === program);
    if (op !== 'create') {
      if (!history.length) throw new Error('Unknown Wayglass sandbox project');
      if (action.expected_head !== history.at(-1).event_hash) throw new Error('Sandbox project head changed');
    }
    let change;
    if (op === 'create' || op === 'add') {
      if (programHistory.length) throw new Error('Sandbox programme already exists');
      if (new Set(history.map(programOf)).size >= 8) throw new Error('Sandbox programme limit reached');
      const { title, description } = action;
      if (op === 'create' && (typeof title !== 'string' || !title.trim() || title.length > 160 ||
          typeof description !== 'string' || description.length > 1500)) throw new TypeError('Invalid project title or description');
      const compiled = compileTyped(source);
      const trial = await previewWyrdruneRitual(source, { typed: true, signal, maxOperations: 10000 });
      if (trial.phaseReceipts.length !== compiled.executable.units.length * 8 ||
          trial.withness.completedCycles !== compiled.executable.units.length) {
        throw new Error('Initial sandbox programme must complete every phase');
      }
      change = {
        ...(op === 'create' ? { title, description } : {}),
        program, source, revision: compiled.digest, execution: trial.receiptHash,
      };
    } else {
      const active = programHistory.at(-1);
      if (!active) throw new Error('Unknown Wayglass sandbox programme');
      const lineage = createWyrdruneRevisionLineage({
        initialSource: programHistory[0].data.source, currentSource: active.data.source, participant: ACTOR, signal,
        checkpoints: programHistory.slice(1).map(event => event.data.checkpoint),
        expectedHead: active.data.checkpointDigest ?? null,
      });
      const trial = await lineage.cycle({
        source, parent: active.data.revision, decision: 'accept',
        principal: { id: ACTOR, authorized: true }, approvalRef: provenance.turnId, expectedOutput: action.expected_output,
      });
      if (trial.status !== 'committed' || !trial.changed) {
        throw new Error(trial.reason?.join('; ') || 'Sandbox revision did not advance');
      }
      change = {
        program, source, revision: trial.activeRevision, checkpoint: trial.checkpoint,
        checkpointDigest: trial.checkpointDigest, execution: digest(trial),
      };
    }
    if (signal?.aborted) throw new Error('Sandbox turn interrupted');
    return journal.transaction(current => {
      const head = related(current, id).at(-1)?.event_hash ?? null;
      if (head !== (history.at(-1)?.event_hash ?? null)) throw new Error('Sandbox project head changed');
      if (op === 'create' && current.filter(event => event.kind === 'create').length >= 32) {
        throw new Error('Sandbox project limit reached');
      }
      return { schema: SCHEMA, status: 'activated', receipt: journal.append(current, id, op, { ...change, provenance }) };
    });
  }

  async function run(projectId, { program, signal } = {}) {
    const name = programName(program);
    const project = summary(journal.load(), projectId);
    const active = project.programs.find(item => item.name === name);
    if (!active) throw new Error('Unknown Wayglass sandbox programme');
    const preview = await previewWyrdruneRitual(active.source, { typed: true, signal, maxOperations: 10000 });
    return { schema: SCHEMA, project_id: projectId, program: name, revision: active.revision, head: project.head, preview };
  }

  return Object.freeze({ inspect, apply, run });
}

module.exports = { createRuntimeSandbox };
