'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createWorkspaceArtifacts } = require('../wayglass/workspace-artifacts');
const { createWayglassMcpBridge } = require('../wayglass/mcp-bridge');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-work-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, store: createWorkspaceArtifacts({ dataRoot: root }) };
}
const project = { workspace_id: 'builder', project_id: 'release' };
const artifact = { ...project, expected_head: null, artifact_id: 'plan', media_type: 'text/markdown', content: 'Source-preserving plan.' };

test('distinct crew revisions and handoff survive a new module instance with preserved originals', t => {
  const { root, store } = fixture(t);
  const first = store.writeArtifact({ ...artifact, author: 'wayglass', source_refs: ['source:original'], tool_refs: ['editor:text'] }, 'rarity');
  const second = store.writeArtifact({ ...artifact, expected_head: first.event_id, content: 'Codex reviewed the plan.' }, 'codex');
  const stop = store.handoff({ ...project, expected_head: second.event_id, stop_point: 'Review complete.', next_owner: 'rarity', open_questions: ['Which stable host?'] }, 'codex');
  const recovered = createWorkspaceArtifacts({ dataRoot: root }).inspect(project, 'rarity');
  assert.equal(first.event.author, 'rarity');
  assert.equal(second.event.author, 'codex');
  assert.equal(recovered.head_event_id, stop.event_id);
  assert.equal(recovered.artifacts[0].content, 'Codex reviewed the plan.');
  assert.equal(recovered.handoff.next_owner, 'rarity');
  assert.equal(recovered.receipts[0].source_refs[0], 'source:original');
  assert.equal(recovered.receipts[0].content, undefined);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'builder', 'release', first.event_id + '.json'))).content, artifact.content);
  for (const receipt of recovered.receipts) assert.equal(receipt.authority_grant, false);
});

test('stale edits and held locks reject without destroying the current project', t => {
  const { root, store } = fixture(t);
  const first = store.writeArtifact(artifact, 'rarity');
  assert.throws(() => store.writeArtifact(artifact, 'codex'), error => error.status === 409);
  const lock = path.join(root, 'builder', 'release', '.write-lock');
  fs.writeFileSync(lock, 'held');
  assert.throws(() => store.writeArtifact({ ...artifact, expected_head: first.event_id }, 'codex'), error => error.status === 409);
  assert.equal(store.inspect(project, 'codex').head_event_id, first.event_id);
});

test('corrupted custody and missing predecessors fail closed', t => {
  const { root, store } = fixture(t);
  const first = store.writeArtifact(artifact, 'rarity');
  const second = store.writeArtifact({ ...artifact, expected_head: first.event_id, content: 'Revision.' }, 'codex');
  const firstPath = path.join(root, 'builder', 'release', first.event_id + '.json');
  const bytes = fs.readFileSync(firstPath);
  fs.appendFileSync(firstPath, ' ');
  assert.throws(() => store.inspect(project, 'codex'), /custody hash mismatch/);
  fs.writeFileSync(firstPath, bytes);
  fs.unlinkSync(firstPath);
  assert.throws(() => store.inspect(project, 'rarity'), /Broken or forked/);
  assert.ok(fs.existsSync(path.join(root, 'builder', 'release', second.event_id + '.json')));
});

test('bounded identifiers, payloads, dormant authors and owners cannot expand authority', t => {
  const { root, store } = fixture(t);
  assert.throws(() => store.writeArtifact({ ...artifact, project_id: '../outside' }, 'codex'), /Invalid project_id/);
  assert.throws(() => store.writeArtifact(artifact, 'faer'), error => error.status === 403);
  assert.throws(() => store.writeArtifact(artifact, 'wayglass'), error => error.status === 403);
  assert.throws(() => store.writeArtifact({ ...artifact, content: 'x'.repeat(100001) }, 'codex'), /Invalid content/);
  assert.throws(() => store.writeArtifact({ ...artifact, media_type: 'application/json', content: '{bad' }, 'codex'), /valid JSON/);
  assert.throws(() => store.handoff({ ...project, expected_head: null, stop_point: 'Stop.', next_owner: 'faer' }, 'codex'), /available working/);
  assert.deepEqual(fs.readdirSync(root), []);
  fs.symlinkSync(os.tmpdir(), path.join(root, 'builder'));
  assert.throws(() => store.writeArtifact(artifact, 'codex'), /Unsafe workspace storage/);
});

test('MCP workspace write binds Rarity even when a caller declares a different author', async t => {
  const { store } = fixture(t);
  const bridge = createWayglassMcpBridge({ workspaceArtifacts: store, flameIds: [] });
  await assert.rejects(bridge.callTool('write_workspace_artifact', { ...artifact, author: 'codex', participant_id: 'codex' }), /Unexpected tool arguments/);
  const receipt = await bridge.callTool('write_workspace_artifact', artifact);
  assert.equal(receipt.event.author, 'rarity');
  const inspected = await bridge.callTool('inspect_workspace_project', project);
  assert.equal(inspected.head_event_id, receipt.event_id);
});
