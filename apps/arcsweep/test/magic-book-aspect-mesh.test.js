import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  classifyCodexAspectEntry,
  projectCodexAspectMessages,
} from '../src/magic-book-aspect-mesh-sidecar.js';

function envelope({
  id,
  traceId = 'trace-a',
  parentId = null,
  aspectId = 'mapper',
  kind = 'observation',
  body = 'A useful note.',
  createdAt = '2026-09-24T21:00:00.000-04:00',
} = {}) {
  return {
    id,
    traceId,
    ...(parentId ? { parentId } : {}),
    sender: { aspectId, invocationId: `test:${aspectId}` },
    recipients: [],
    kind,
    body,
    evidenceRefs: [],
    stateRefs: [],
    createdAt,
  };
}

test('Codex projection distinguishes marginalia, proposals, and exploratory branch leaves', () => {
  assert.equal(classifyCodexAspectEntry(envelope({ id: 'm1', kind: 'observation' })), 'marginalia');
  assert.equal(classifyCodexAspectEntry(envelope({ id: 'm2', aspectId: 'maker', kind: 'proposal', body: 'Try the direct seam.' })), 'proposal');
  assert.equal(classifyCodexAspectEntry(envelope({
    id: 'm3', aspectId: 'narrative', kind: 'proposal',
    body: { mode: 'exploration', domain: 'counterfactual', text: 'What if the leaf remembers the reader?' },
  })), 'branch');
});

test('non-aspect control packets stay out of living Codex marginalia', () => {
  assert.equal(classifyCodexAspectEntry({
    id: 'seed-1', traceId: 'trace-seed', sender: { aspectId: 'steward' },
    kind: 'proposal', body: 'Explore this.', createdAt: '2026-09-24T21:00:00.000-04:00',
  }), 'hidden');
});

test('sibling proposals become alternate leaves without collapsing either route', () => {
  const messages = [
    envelope({ id: 'parent', kind: 'question', body: 'Which route?' }),
    envelope({ id: 'route-a', parentId: 'parent', aspectId: 'mapper', kind: 'proposal', body: 'Reuse the existing renderer.', createdAt: '2026-09-24T21:01:00.000-04:00' }),
    envelope({ id: 'route-b', parentId: 'parent', aspectId: 'critic', kind: 'proposal', body: 'Keep the renderer and add a read-only sidecar.', createdAt: '2026-09-24T21:02:00.000-04:00' }),
  ];
  const projection = projectCodexAspectMessages(messages);
  assert.equal(projection.branches.length, 2);
  assert.deepEqual(new Set(projection.branches.map((item) => item.id)), new Set(['route-a', 'route-b']));
  assert.equal(projection.proposals.length, 0);
});

test('trace bookmarks preserve authorship and selected trace history', () => {
  const messages = [
    envelope({ id: 'a1', traceId: 'trace-a', aspectId: 'mapper', body: 'Map it.', createdAt: '2026-09-24T21:00:00.000-04:00' }),
    envelope({ id: 'a2', traceId: 'trace-a', aspectId: 'critic', kind: 'challenge', body: 'Keep identity separate.', createdAt: '2026-09-24T21:01:00.000-04:00' }),
    envelope({ id: 'b1', traceId: 'trace-b', aspectId: 'narrative', kind: 'question', body: 'What grows here?', createdAt: '2026-09-24T21:02:00.000-04:00' }),
  ];
  const projection = projectCodexAspectMessages(messages, { selectedTrace: 'trace-a' });
  assert.equal(projection.bookmarks.length, 2);
  assert.equal(projection.bookmarks[0].traceId, 'trace-b');
  assert.equal(projection.trace.length, 2);
  assert.deepEqual(projection.trace.map((item) => item.aspectName), ['Mapper', 'Critic']);
});

test('physical Codex entry mounts living projection after the book skin', async () => {
  const source = await readFile(new URL('../src/magic-book-physical-acceptance-entry.js', import.meta.url), 'utf8');
  const skin = source.indexOf("'./magic-book-physical-skin.css'");
  const projection = source.indexOf("'./magic-book-aspect-mesh-sidecar.js'");
  assert.ok(skin >= 0);
  assert.ok(projection > skin);
});

test('Codex mesh organ reads the existing mesh and lazily wakes runtime integration instead of writing a second store', async () => {
  const source = await readFile(new URL('../src/magic-book-aspect-mesh-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /readAspectMeshRuntime/);
  assert.match(source, /runtime-integration-bootstrap\.js/);
  assert.match(source, /runtime\?\.bus\?\.all/);
  assert.doesNotMatch(source, /appendHouseCommons/);
  assert.doesNotMatch(source, /localStorage/);
});
