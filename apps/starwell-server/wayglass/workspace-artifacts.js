'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash, randomUUID } = require('node:crypto');
const { enterWorkspace, participant } = require('./crew-workspaces');

const SCHEMA = 'wayglass.workspace-event/v0.1';
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function slug(value, name) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(value)) fail(`Invalid ${name}.`);
  return value;
}
function text(value, name, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`Invalid ${name}.`);
  return value;
}
function refs(value, name) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 32) fail(`Invalid ${name}.`);
  return value.map(item => text(item, name, 512));
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function createWorkspaceArtifacts({ dataRoot = process.env.WAYGLASS_WORKSPACE_DATA_DIR || path.join(os.homedir(), '.wayglass', 'workspaces') } = {}) {
  const root = path.resolve(dataRoot);
  function target(args, author, writable = false) {
    const workspaceId = slug(args.workspace_id, 'workspace_id');
    const projectId = slug(args.project_id, 'project_id');
    const entry = enterWorkspace({ workspace_id: workspaceId, participant_id: author });
    if (!entry.entered || (writable && !entry.participant.authority.includes('create'))) fail('Seat cannot perform this workspace action.', 403);
    const dirs = [root, path.join(root, workspaceId), path.join(root, workspaceId, projectId)];
    for (const dir of dirs) {
      if (fs.existsSync(dir) && (!fs.lstatSync(dir).isDirectory() || fs.lstatSync(dir).isSymbolicLink())) fail('Unsafe workspace storage directory.', 409);
    }
    return { workspaceId, projectId, dir: dirs[2] };
  }

  function recover(where) {
    if (!fs.existsSync(where.dir)) return { events: [], head: null, artifacts: {}, handoff: null };
    const files = fs.readdirSync(where.dir).filter(file => file.endsWith('.json'));
    if (files.length > 1000) fail('Project event capacity reached; archive with preserved provenance.', 409);
    const events = new Map();
    for (const file of files) {
      if (!/^[a-f0-9]{64}\.json$/.test(file)) fail('Invalid project event filename.', 409);
      const filename = path.join(where.dir, file);
      const info = fs.lstatSync(filename);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 1000000) fail('Invalid project event file.', 409);
      const bytes = fs.readFileSync(filename);
      if (`${hash(bytes)}.json` !== file) fail('Workspace event custody hash mismatch.', 409);
      let event;
      try { event = JSON.parse(bytes); } catch { fail('Unreadable workspace event.', 409); }
      if (event.schema !== SCHEMA || event.workspace_id !== where.workspaceId || event.project_id !== where.projectId ||
          !['artifact', 'handoff'].includes(event.kind) || !['rarity', 'codex'].includes(event.author) ||
          event.canon_commit !== false || event.identity_commit !== false || event.relationship_commit !== false || event.authority_grant !== false) fail('Invalid workspace event binding.', 409);
      events.set(file.slice(0, -5), event);
    }
    const ordered = [];
    let head = null;
    const artifacts = {};
    let handoff = null;
    while (ordered.length < events.size) {
      const successors = [...events.entries()].filter(([id, event]) => event.previous_event_id === head && !ordered.some(item => item.event_id === id));
      if (successors.length !== 1) fail('Broken or forked workspace event chain.', 409);
      const [id, event] = successors[0];
      ordered.push({ ...event, event_id: id });
      if (event.kind === 'artifact') artifacts[event.artifact_id] = { ...event, event_id: id };
      else handoff = { ...event, event_id: id };
      head = id;
    }
    return { events: ordered, head, artifacts, handoff };
  }

  function inspect(args, author) {
    const where = target(args, author);
    const state = recover(where);
    return {
      schema: 'wayglass.workspace-project/v0.1', workspace_id: where.workspaceId, project_id: where.projectId,
      head_event_id: state.head, artifacts: Object.values(state.artifacts), handoff: state.handoff,
      handoff_is_current: Boolean(state.handoff && state.handoff.event_id === state.head),
      receipts: state.events.map(({ content, ...receipt }) => receipt),
    };
  }

  function append(args, author, payload) {
    const where = target(args, author, true);
    if (args.expected_head !== null && (typeof args.expected_head !== 'string' || !/^[a-f0-9]{64}$/.test(args.expected_head))) fail('expected_head must be null or a retained event id.');
    fs.mkdirSync(where.dir, { recursive: true, mode: 0o700 });
    const lock = path.join(where.dir, '.write-lock');
    let lockFd;
    try { lockFd = fs.openSync(lock, 'wx', 0o600); } catch { fail('Workspace project is locked; retry or recover the stopped host.', 409); }
    let temp;
    try {
      const state = recover(where);
      if (state.head !== args.expected_head) fail('Workspace changed; inspect the current head before writing.', 409);
      if (state.events.length >= 1000) fail('Project event capacity reached.', 409);
      const event = {
        schema: SCHEMA, workspace_id: where.workspaceId, project_id: where.projectId,
        previous_event_id: state.head, author, continuity_ref: participant(author).continuity_ref,
        created_at: new Date().toISOString(), nonce: randomUUID(), ...payload,
        source_refs: refs(args.source_refs, 'source_refs'), tool_refs: refs(args.tool_refs, 'tool_refs'),
        provenance_class: 'authenticated-seat; caller-declared-source-and-tool-references',
        canon_commit: false, identity_commit: false, relationship_commit: false, authority_grant: false,
      };
      const bytes = JSON.stringify(event);
      if (Buffer.byteLength(bytes) > 1000000) fail('Workspace event exceeds storage capacity.');
      const eventId = hash(bytes);
      temp = path.join(where.dir, `.${event.nonce}.tmp`);
      const fd = fs.openSync(temp, 'wx', 0o600);
      try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      fs.linkSync(temp, path.join(where.dir, `${eventId}.json`));
      return { schema: 'wayglass.workspace-write-receipt/v0.1', event_id: eventId, event };
    } finally {
      if (temp && fs.existsSync(temp)) fs.unlinkSync(temp);
      fs.closeSync(lockFd);
      fs.unlinkSync(lock);
    }
  }

  function writeArtifact(args, author) {
    const artifactId = slug(args.artifact_id, 'artifact_id');
    if (!['text/plain', 'text/markdown', 'application/json', 'image/svg+xml'].includes(args.media_type)) fail('Unsupported artifact media_type.');
    const content = text(args.content, 'content', 100000);
    if (args.media_type === 'application/json') {
      try { JSON.parse(content); } catch { fail('Artifact is not valid JSON.'); }
    }
    return append(args, author, { kind: 'artifact', artifact_id: artifactId, media_type: args.media_type, content });
  }

  function handoff(args, author) {
    const next = participant(args.next_owner);
    if (!next || !['rarity', 'codex'].includes(next.participant_id) || next.seat_state !== 'available') fail('next_owner must be an available working crew seat.');
    return append(args, author, {
      kind: 'handoff', stop_point: text(args.stop_point, 'stop_point', 8000),
      next_owner: next.participant_id, open_questions: refs(args.open_questions, 'open_questions'),
    });
  }

  return { inspect, writeArtifact, handoff, dataRoot: root };
}

module.exports = { createWorkspaceArtifacts };
