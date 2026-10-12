'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { participant, enterWorkspace } = require('./crew-workspaces');
const { createWayglassDeparture } = require('../wayglass-runtime/wayglass-stop-receipt.cjs');

const SCHEMA = 'wayglass.workspace-journal/v0.1';
const hash = value => createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
function requiredText(value, label, max = 1000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${label}.`);
  return value.trim();
}
function principal(auth) {
  const seat = participant(auth?.participant_id);
  if (!seat || !['rarity', 'codex'].includes(seat.participant_id) || !auth?.profile_id) {
    throw new Error('An authenticated active crew seat is required.');
  }
  return { participant_id: seat.participant_id, principal_ref: hash(`${auth.type}:${auth.profile_id}`) };
}
function projectId(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(value)) throw new Error('Invalid project_id.');
  return value;
}
function filePath(value) {
  if (typeof value !== 'string' || value.length > 240 || !/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(value)
    || value.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Invalid project file path.');
  return value;
}

// The journal owns accepted project state. Objects are immutable text files;
// callers never supply a host filesystem path or participant identity.
class WorkspaceProjects {
  constructor({ directory, clock = () => new Date() }) {
    this.directory = directory;
    this.clock = clock;
    this.journal = path.join(directory, 'journal.json');
  }

  load() {
    let raw;
    try { raw = fs.readFileSync(this.journal, 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    const state = JSON.parse(raw);
    if (state.schema !== SCHEMA || !Array.isArray(state.events)) throw new Error('Invalid workspace journal.');
    let previous = null;
    for (const event of state.events) {
      const { event_hash, ...body } = event;
      if (body.previous_hash !== previous || hash(JSON.stringify(body)) !== event_hash) throw new Error('Workspace journal integrity failure.');
      previous = event_hash;
    }
    return state.events;
  }

  transaction(run) {
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const lockPath = path.join(this.directory, 'write.lock');
    const lock = fs.openSync(lockPath, 'wx', 0o600);
    try {
      const events = this.load();
      const result = run(events);
      const temporary = path.join(this.directory, `${randomUUID()}.tmp`);
      try {
        const fd = fs.openSync(temporary, 'wx', 0o600);
        try { fs.writeFileSync(fd, JSON.stringify({ schema: SCHEMA, events })); fs.fsyncSync(fd); }
        finally { fs.closeSync(fd); }
        fs.renameSync(temporary, this.journal);
      } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
      return clone(result);
    } finally { fs.closeSync(lock); fs.unlinkSync(lockPath); }
  }

  event(events, actor, binding, kind, data = {}) {
    const body = {
      event_id: randomUUID(), created_at: this.clock().toISOString(),
      previous_hash: events.at(-1)?.event_hash || null,
      ...actor, ...binding, kind, data,
      source_refs: ['wayglass:mcp', 'wayglass:workspace-projects/v0.1'],
    };
    const event = { ...body, event_hash: hash(JSON.stringify(body)) };
    events.push(event);
    return event;
  }

  files(events, binding) {
    const files = new Map();
    for (const event of events) {
      if (event.workspace_id === binding.workspace_id && event.project_id === binding.project_id && event.kind === 'change') {
        files.set(event.data.path, event.data.after_hash);
      }
    }
    return files;
  }

  object(content) {
    const digest = hash(content);
    const directory = path.join(this.directory, 'objects');
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const filename = path.join(directory, digest + '.txt');
    try {
      const fd = fs.openSync(filename, 'wx', 0o600);
      try { fs.writeFileSync(fd, content); fs.fsyncSync(fd); }
      finally { fs.closeSync(fd); }
    } catch (error) { if (error.code !== 'EEXIST') throw error; }
    this.readObject(digest);
    return digest;
  }

  readObject(digest) {
    if (!/^[a-f0-9]{64}$/.test(digest || '')) throw new Error('Invalid project object hash.');
    const content = fs.readFileSync(path.join(this.directory, 'objects', digest + '.txt'), 'utf8');
    if (hash(content) !== digest) throw new Error('Project object integrity failure.');
    return content;
  }

  snapshot(events, binding) {
    const relevant = events.filter(event => event.workspace_id === binding.workspace_id && event.project_id === binding.project_id);
    return {
      workspace_id: binding.workspace_id, project_id: binding.project_id,
      revision: relevant.at(-1)?.event_hash || null,
      files: [...this.files(events, binding)].map(([name, digest]) => ({ path: name, hash: digest, content: this.readObject(digest) })),
      receipts: relevant.filter(event => ['change', 'leave'].includes(event.kind)).map(clone),
      resident_runtime_state: 'runtime-binding-required',
    };
  }

  session(events, sessionId, actor) {
    const entry = events.find(event => event.kind === 'enter' && event.session_id === sessionId);
    if (!entry || entry.participant_id !== actor.participant_id || entry.principal_ref !== actor.principal_ref) throw new Error('Workspace session principal mismatch.');
    if (events.some(event => event.kind === 'leave' && event.session_id === sessionId)) throw new Error('Workspace session has exited.');
    return { workspace_id: entry.workspace_id, project_id: entry.project_id, session_id: entry.session_id };
  }

  enter(args, auth) {
    const actor = principal(auth);
    const entry = enterWorkspace({ workspace_id: args.workspace_id, participant_id: actor.participant_id });
    if (!args.project_id) {
      if (args.stop_receipt_id) throw new Error('project_id required for return.');
      return entry;
    }
    const binding = { workspace_id: entry.workspace.workspace_id, project_id: projectId(args.project_id), session_id: randomUUID() };
    return this.transaction(events => {
      let departure = null;
      let stop = null;
      if (args.stop_receipt_id) {
        stop = events.find(event => event.kind === 'leave' && event.data.departure.stop_receipt.receipt_id === args.stop_receipt_id);
        if (!stop || stop.participant_id !== actor.participant_id || stop.principal_ref !== actor.principal_ref
          || stop.workspace_id !== binding.workspace_id || stop.project_id !== binding.project_id) throw new Error('Stored stop receipt binding mismatch.');
        departure = stop.data.departure;
      }
      // Validate existing objects before accepting entry, including return.
      this.snapshot(events, binding);
      const receipt = this.event(events, actor, binding, 'enter', { return_from: stop?.event_hash || null });
      return { ...entry, session_id: binding.session_id, entry_receipt: receipt,
        project: this.snapshot(events, binding), recovered_departure: departure,
        stopped_revision: stop?.data.project_revision || null };
    });
  }

  read(args, auth) {
    const events = this.load();
    const binding = this.session(events, args.session_id, principal(auth));
    return this.snapshot(events, binding);
  }

  write(args, auth) {
    const actor = principal(auth);
    const name = filePath(args.path);
    if (typeof args.content !== 'string' || Buffer.byteLength(args.content, 'utf8') > 64000) throw new Error('Project text must be at most 64000 UTF-8 bytes.');
    if (args.expected_hash !== null && !/^[a-f0-9]{64}$/.test(args.expected_hash || '')) throw new Error('expected_hash required: current hash or null for creation.');
    return this.transaction(events => {
      const binding = this.session(events, args.session_id, actor);
      const files = this.files(events, binding);
      const before = files.get(name) || null;
      if (before !== args.expected_hash) throw new Error('Project file changed; inspect before retrying.');
      this.snapshot(events, binding);
      if (!before && files.size >= 64) throw new Error('Project file limit reached.');
      const after = this.object(args.content);
      const receipt = this.event(events, actor, binding, 'change', { path: name, before_hash: before, after_hash: after, tool: 'write_project_file' });
      return { changed: true, receipt, project: this.snapshot(events, binding) };
    });
  }

  leave(args, auth) {
    const actor = principal(auth);
    const stopPoint = requiredText(args.stop_point, 'stop_point');
    const nextOwner = requiredText(args.next_owner, 'next_owner', 80);
    if (!['rowan', 'rarity', 'codex'].includes(nextOwner)) throw new Error('next_owner must name rowan, rarity or codex.');
    const questions = args.unresolved_wonder_questions || [];
    const alternatives = args.alternatives || [];
    if (!Array.isArray(questions) || questions.length > 32 || questions.some(value => typeof value !== 'string' || !value.trim() || value.length > 1000)
      || !Array.isArray(alternatives) || alternatives.length > 32 || alternatives.some(value => !value || typeof value !== 'object' || Array.isArray(value))
      || Buffer.byteLength(JSON.stringify(alternatives)) > 32000) throw new Error('Invalid unresolved context.');
    return this.transaction(events => {
      const binding = this.session(events, args.session_id, actor);
      const snapshot = this.snapshot(events, binding);
      const departure = createWayglassDeparture({
        receipt_id: randomUUID(), packet_id: randomUUID(), world_id: `wayglass:${binding.workspace_id}:${binding.project_id}`,
        participant_id: actor.participant_id, stopped_at: this.clock().toISOString(),
        identity_declarations: [{ participant_id: actor.participant_id, continuity_ref: participant(actor.participant_id).continuity_ref, source_ref: 'wayglass:crew-workspace-registry/v0.1' }],
        active_work: snapshot.files.map(file => ({ path: file.path, hash: file.hash })),
        provenance_refs: [snapshot.revision || 'wayglass:empty-project', `wayglass-session:${binding.session_id}`],
        stop_point: stopPoint, next_owner: nextOwner,
        unresolved_wonder_questions: questions, alternatives,
      });
      const receipt = this.event(events, actor, binding, 'leave', { departure, project_revision: snapshot.revision });
      return { exited: true, receipt, departure };
    });
  }
}

module.exports = { WorkspaceProjects };
