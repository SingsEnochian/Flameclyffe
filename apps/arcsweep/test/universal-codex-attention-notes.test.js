import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { projectUniversalCodex } from '../src/codex/codex-semantic-projector.js';
import { selectCodexAttention } from '../src/codex/codex-attention-engine.js';
import { renderCodexNarrative } from '../src/codex/codex-narrative-renderer.js';

function message({ id = 'm1', traceId = 'trace-a', aspectId = 'mapper', kind = 'growth', body = { statement: 'A remembered bridge point.' } } = {}) {
  return {
    id,
    traceId,
    sender: { aspectId, invocationId: `test:${aspectId}` },
    recipients: [],
    kind,
    body,
    evidenceRefs: [],
    stateRefs: [],
    createdAt: '2026-09-25T00:45:00.000-04:00',
  };
}

test('remembered attention notes are selected from grounded projected history', () => {
  const projection = projectUniversalCodex({ messages: [message()] });
  const rows = selectCodexAttention(projection.manifestations, { traceId: 'trace-a', text: 'bridge point' }, { minimumScore: 4, includeLive: false, limit: 2 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].manifestation.provenance.includes('m1'), true);
  const prose = renderCodexNarrative(rows[0].manifestation, { aspectNames: { mapper: 'Mapper' } });
  assert.match(prose, /Mapper/);
  assert.match(prose, /bridge point/i);
});

test('unrelated page context produces no remembered note candidate', () => {
  const projection = projectUniversalCodex({ messages: [message()] });
  const rows = selectCodexAttention(projection.manifestations, { text: 'nothing to do with the stored trace' }, { minimumScore: 4, includeLive: false, limit: 2 });
  assert.equal(rows.length, 0);
});

test('attention-note sidecar is capped, storage-free, finite, and mounted once through runtime boot', async () => {
  const source = await readFile(new URL('../src/codex-attention-notes-sidecar.js', import.meta.url), 'utf8');
  const bootstrap = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  assert.match(source, /slice\(0, 2\)/);
  assert.match(source, /score >= 4/);
  assert.match(source, /renderCodexNarrative/);
  assert.match(source, /node\.hidden = true/);
  assert.match(source, /420ms/);
  assert.doesNotMatch(source, /infinite|animation-iteration-count\s*:\s*infinite/i);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|appendHouseCommons/i);
  assert.match(bootstrap, /codex-attention-notes-sidecar\.js/);
});
