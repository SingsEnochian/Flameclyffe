import test from 'node:test';
import assert from 'node:assert/strict';
import {
  laneForPath, normalizePulls, makeGenerationPacket, integrateGenerations,
  collectOpenPulls, GENERATION_SCHEMA,
} from '../scripts/wayglass-eightfold-generations.mjs';
import { LANES } from '../scripts/wayglass-eightfold-parallel.mjs';

const sha = character => character.repeat(40);
const source = sha('a'), main = sha('b');
const fixtures = [
  { number: 537, title: 'Wayglass Writing Room', head_sha: sha('c'), base_sha: main,
    files: ['apps/wayglass/src/main.js', 'apps/wayglass/src/surfaces/arcsweep-writing.js'],
    files_complete: true },
  { number: 533, title: 'Wayglass shipwide presence', head_sha: sha('d'), base_sha: main,
    files: ['apps/wayglass/src/main.js', 'apps/wayglass/src/shipwide-presence.js'],
    files_complete: true },
  { number: 535, title: 'Wayglass MCP gateway', head_sha: sha('e'), base_sha: main,
    files: ['apps/starwell-server/wayglass/mcp.js'],
    files_complete: true },
];
const makeInventory = () => normalizePulls(fixtures, {
  sourceSha: source, mainSha: main, observedAt: '2026-11-05T20:00:00.000Z',
  totalDiscovered: 3,
});

test('source comparison produces exact-head shared-file conflicts', () => {
  const snapshot = makeInventory();
  assert.equal(snapshot.selected_prs, 3);
  assert.equal(snapshot.coverage, 'complete-for-filtered-open-prs');
  assert.equal(snapshot.conflicts.length, 1);
  assert.deepEqual(snapshot.conflicts[0].prs, [533, 537]);
  assert.deepEqual(snapshot.conflicts[0].files, ['apps/wayglass/src/main.js']);
  assert.equal(snapshot.can_merge_without_review, false);
  assert.equal(snapshot.named_agents_spawned, false);
  assert.match(snapshot.source_digest, /^[a-f0-9]{64}$/);
});
test('generation packets inherit verification and authority without pretending to spawn models', () => {
  const inv = makeInventory();
  const packet = makeGenerationPacket(inv, 'transcend', { runId: '120', generation: 2 });
  assert.equal(packet.schema, GENERATION_SCHEMA);
  assert.equal(packet.model_inference_performed, false);
  assert.equal(packet.agent_instance_id, null);
  assert.equal(packet.authority.modify_source, false);
  assert.equal(packet.authority.feather_stop, true);
  assert.match(packet.inherited_instructions, /every descendant/i);
  assert.equal(packet.shared_file_conflicts.length, 1);
  assert.equal(packet.state, 'needs-integration-review');
  assert.ok(packet.observed_prs.some(pr => pr.pr_number === 537));
});
test('eight descendants reconcile with exact source and stable independent worker binding', () => {
  const inv = makeInventory();
  const packets = LANES.map(lane => makeGenerationPacket(inv, lane.id, { runId: '101' }));
  const gate = integrateGenerations(inv, packets, { runId: '101' });
  assert.equal(gate.status, 'evidence-reconciled');
  assert.equal(gate.source_integration, 'blocked-pending-review');
  assert.equal(gate.agent_execution, 'not-started');
  assert.equal(gate.represented_lanes.length, 8);
  assert.equal(gate.conflicting_pr_pairs, 1);
});
test('missing, forged, duplicated or stale lane packets fail closed', () => {
  const inv = makeInventory();
  const packets = LANES.map(lane => makeGenerationPacket(inv, lane.id, { runId: '101' }));
  assert.equal(integrateGenerations(inv, packets.slice(1), { runId: '101' }).status, 'blocked');
  assert.equal(integrateGenerations(inv, [...packets, packets[0]], { runId: '101' }).status, 'blocked');
  assert.equal(integrateGenerations(inv, packets.map((p, i) => i === 0
    ? {...p, model_inference_performed: true} : p), { runId: '101' }).status, 'blocked');
  assert.equal(integrateGenerations(inv, packets, { runId: '102' }).status, 'blocked');
});
test('untrusted source paths are rejected before classification', () => {
  for (const path of ['../secrets.txt', '/tmp/x', 'C:\\windows\\system32', 'docs/../../file']) {
    assert.throws(() => laneForPath(path), /Repository-relative/);
  }
  assert.throws(() => normalizePulls([{ ...fixtures[0], head_sha: '' }],
    { sourceSha: source, mainSha: main }), /heads/);
});
test('coverage clearly marks uninspected PRs and never certifies the full repo', () => {
  const inv = normalizePulls(fixtures, { sourceSha: source, mainSha: main,
    totalDiscovered: 99, selectionLimit: 3 });
  assert.equal(inv.coverage, 'partial');
  const packet = makeGenerationPacket(inv, 'perceive', { runId: '55' });
  assert.equal(packet.state, 'needs-integration-review');
});
test('source discovery uses live GitHub API shape with bounded read-only requests', async () => {
  const calls = [];
  const list = fixtures.map(pr => ({
    number: pr.number, title: pr.title,
    head: { sha: pr.head_sha }, base: { sha: pr.base_sha },
    updated_at: '2026-11-05T19:00:00Z'
  }));
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    let result;
    if (url.endsWith('/commits/main')) result = {sha: main};
    else if (url.includes('/pulls?state=open')) result = list;
    else if (url.includes('/pulls/')) {
      const id = Number(url.match(/pulls\/(\d+)/)[1]);
      result = fixtures.find(p => p.number === id).files.map(filename => ({filename}));
    } else throw Error('Unknown fixture URL: ' + url);
    return {ok:true, json: async()=>result};
  };
  const inv = await collectOpenPulls({ sourceSha: source,
    token: 'placeholder-not-logged', fetchImpl });
  assert.equal(inv.prs.length, 3);
  assert.equal(inv.conflicts.length, 1);
  assert.ok(calls.every(item => item.options.headers.authorization === 'Bearer placeholder-not-logged'));
  assert.ok(calls.every(item => item.options.method == null));
});
