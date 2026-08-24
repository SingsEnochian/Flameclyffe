import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  renderRuntimeEnvelopeLiveSummary,
  renderRuntimeFeedbackLiveRead,
} from '../src/runtime-envelope-live-ui.js';
import { buildRuntimeIntegrationEnvelope } from '../src/runtime-integration-envelope.js';
import { runArcsweepRuntimeProductionSmoke } from '../../../scripts/arcsweep-runtime-production-smoke.mjs';

function envelope() {
  return buildRuntimeIntegrationEnvelope({
    sessionId: 'runtime-session:test',
    world: { identity_anchor: { world_id: 'terra-prime' } },
    activeFlame: 'atlas',
    presence: { atlas: 'ready', altair: 'degraded' },
    feedback: [{
      id: 'feedback-1',
      voice_id: 'atlas',
      kind: 'observation',
      text: '<runtime braid intact>',
      supporting_receipts: ['commons-entry-1', 'runtime-world:terra-prime:test'],
      do_not_change: true,
      created_at: '2026-08-21T18:50:01.000Z',
    }],
  });
}

test('runtime live read exposes envelope summary without flattening attribution', () => {
  const html = renderRuntimeEnvelopeLiveSummary(envelope());
  assert.match(html, /runtime-session:test/);
  assert.match(html, /terra-prime/);
  assert.match(html, /atlas/);
  assert.match(html, />1</);
});

test('Commons runtime feedback view keeps receipts visible and escapes visible prose', () => {
  const html = renderRuntimeFeedbackLiveRead(envelope());
  assert.match(html, /feedback-1/);
  assert.match(html, /commons-entry-1/);
  assert.match(html, /runtime-world:terra-prime:test/);
  assert.match(html, /do not change/);
  assert.doesNotMatch(html, /<runtime braid intact>/);
  assert.match(html, /&lt;runtime braid intact&gt;/);
});

test('Arcsweep mounts runtime envelope live read after House Commons', async () => {
  const manifest = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const commons = manifest.indexOf('./house-commons-chat-v3.js');
  const liveRead = manifest.indexOf('./runtime-envelope-live-ui.js');
  assert.ok(commons >= 0, 'House Commons v3 must be mounted');
  assert.ok(liveRead > commons, 'Runtime envelope live read must mount after House Commons v3');
});

test('production-style runtime smoke crosses Terra Prime, presence, Commons, persistence, and replay', async () => {
  const report = await runArcsweepRuntimeProductionSmoke();
  assert.equal(report.ok, true);
  assert.equal(report.world_id, 'terra-prime');
  assert.equal(report.commons_entries, 2);
  assert.equal(report.feedback_count, 1);
  assert.equal(report.presence.atlas, 'speaking');
  assert.equal(report.replay_id, 'production-smoke-replay-1');
});
