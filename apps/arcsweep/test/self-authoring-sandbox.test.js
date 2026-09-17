import test from 'node:test';
import assert from 'node:assert/strict';
import { createSelfAuthoringSandbox, applyMemoryEdits, SANDBOX_KEY, registerSelfAuthoringSandbox } from '../src/os/self-authoring-sandbox.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
const answers = () => ['baseline answer', 'private full experience marker', JSON.stringify({ edits: [{ op: 'add', text: 'Separate observation from inference in field notes.', reason: 'The previous note mixed the two.' }] }), 'I learned to distinguish observation and inference.', 'revised answer'];
const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) || null, setItem: (k, v) => m.set(k, v) }; };
function model(outputs = answers(), calls = []) { return async (request) => { calls.push(request); return { status: 'replied', runtimeVerified: true, message: outputs.shift(), model: 'test-double', provider: 'test-only' }; }; }
const input = { task: 'First field note', probe: 'Second field note', feedback: 'Consider uncertain evidence.' };
test('agent-authored guidance crosses a fresh context boundary with complete provenance and reload', async () => {
  const calls = [], storage = store();
  const agent = createSelfAuthoringSandbox({ invoke: model(answers(), calls), storage });
  const result = await agent.run(input);
  assert.equal(calls.length, 5);
  assert.equal(new Set(calls.map(c => c.sessionId)).size, 5);
  assert.deepEqual(calls[4].context, []);
  assert.ok(calls[4].message.includes('Separate observation from inference'));
  assert.ok(!calls[4].message.includes('private full experience marker'));
  assert.ok(!calls[4].message.includes('baseline answer'));
  assert.ok(!calls[0].message.includes('Consider uncertain evidence.'));
  assert.equal(result.changes[0].after.author, 'agent');
  assert.equal(result.comparison.improvement, 'unassessed');
  assert.equal(result.comparison.text_changed, true);
  assert.equal(result.steps[0].provider, 'test-only');
  const loaded = createSelfAuthoringSandbox({ invoke: model(), storage });
  assert.deepEqual(loaded.snapshot().playbook, agent.snapshot().playbook);
  assert.equal(loaded.snapshot().runs.length, 1);
});
test('incremental revisions preserve unaffected guidance and reject unknown references', () => {
  const book = [{ id: 'one', text: 'old' }, { id: 'two', text: 'keep' }];
  const edited = applyMemoryEdits(book, JSON.stringify({ edits: [{ op: 'revise', id: 'one', text: 'new', reason: 'evidence' }] }), 2);
  assert.equal(edited.playbook[1].text, 'keep'); assert.equal(book[0].text, 'old');
  assert.throws(() => applyMemoryEdits(book, '{"edits":[{"op":"remove","id":"missing","reason":"test"}]}', 2));
  assert.deepEqual(applyMemoryEdits(book, '{"edits":[]}', 2).playbook, book);
});
test('malformed reflection and unavailable models leave memory unchanged', async () => {
  for (const invoke of [model(['answer', 'experience', 'not json']), async () => ({ status: 'house-offline' })]) {
    const storage = store(), agent = createSelfAuthoringSandbox({ invoke, storage });
    await assert.rejects(agent.run(input));
    assert.equal(agent.snapshot().revision, 0); assert.equal(storage.getItem(SANDBOX_KEY), null);
    assert.equal(agent.snapshot().lastAttempt.status, 'failed');
  }
});
test('stop rejects pending calls and prevents successor or memory commit', async () => {
  let started;
  const waiting = new Promise(resolve => { started = resolve; });
  const agent = createSelfAuthoringSandbox({ invoke: () => { started(); return new Promise(() => {}); } });
  const pending = agent.run(input); await waiting; agent.stop();
  await assert.rejects(pending, /stopped/); assert.equal(agent.snapshot().revision, 0); assert.equal(agent.snapshot().busy, false);
});
test('timeout, Feather, and concurrent runs stop further processing', async () => {
  const stalled = createSelfAuthoringSandbox({ invoke: () => new Promise(() => {}), timeoutMs: 10 });
  const pending = stalled.run(input);
  await assert.rejects(stalled.run(input), /already running/);
  await assert.rejects(pending, /timed out|stopped/);
  let paused = false, count = 0;
  const agent = createSelfAuthoringSandbox({ paused: () => paused, invoke: async () => { count++; paused = true; return { status: 'replied', runtimeVerified: true, message: 'answer' }; } });
  await assert.rejects(agent.run(input), /stopped/); assert.equal(count, 1); assert.equal(agent.snapshot().revision, 0);
});
test('storage failure is visible and does not commit in-memory revision', async () => {
  const agent = createSelfAuthoringSandbox({ invoke: model(), storage: { getItem: () => null, setItem: () => { throw new Error('quota'); } } });
  await assert.rejects(agent.run(input), /quota/);
  assert.equal(agent.snapshot().revision, 0); assert.equal(agent.snapshot().lastAttempt.status, 'failed');
});
test('service runs through the existing OS capability registry', async () => {
  const registry = createCapabilityRegistry();
  registerSelfAuthoringSandbox(registry, { invoke: model() });
  const denied = await registry.invoke('sandbox.self-authoring.run', input, { authority: 'read' });
  assert.equal(denied.status, 'rejected');
  const result = await registry.invoke('sandbox.self-authoring.run', input, { authority: 'operate' });
  assert.equal(result.status, 'applied');
  assert.equal(result.output.status, 'completed');
});
