import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuideShell } from '../src/os/guide-shell.js';

test('Guide shell can request only its explicit OS capability allowlist', async () => {
  const seen = [];
  const guide = createGuideShell({
    actorId: 'guide:test',
    invoke: async (capabilityId, input, context) => {
      seen.push({ capabilityId, input, context });
      return { status: 'applied', capability_id: capabilityId };
    },
  });

  const boot = await guide.request('os.boot');
  const context = await guide.request('os.context');
  const navigate = await guide.request('os.navigate', { room: 'forge' });
  const witnessSummary = await guide.request('witness.summary');
  const ancestry = await guide.request('ancestry.read', { ref: 'ancestral:amalthi-transition' });
  const ancestryPlan = await guide.request('ancestry.narrativenode-plan', { root_ids: ['ancestral:amalthi-transition'] });
  const relation = await guide.request('relation.get', { relation_id: 'relation:test' });
  const autonomySnapshot = await guide.request('autonomy.snapshot');
  const scenario = await guide.request('autonomy.propose-scenario', { premise: 'A door appears where no door was registered.', why_interesting: 'It tests whether the Guide may originate a narrative branch.' });
  const route = await guide.request('autonomy.propose-route', { objective: 'Reach a blocked goal', alternative: 'Use a different architecture', why_good: 'It preserves the objective without pretending the denied route is allowed.', recommendation: 'Try the alternate architecture.' });
  const forbidden = await guide.request('runa.launch-preview', { plan: {} });
  const forbiddenWitnessProse = await guide.request('witness.list-local', { limit: 1 });
  const forbiddenWitnessWrite = await guide.request('witness.record', { record_type: 'system-note', title: 'nope' });
  const forbiddenRelationWrite = await guide.request('relation.create', { relation_id: 'relation:nope', participant_ids: ['a', 'b'] });

  assert.equal(boot.status, 'applied');
  assert.equal(context.status, 'applied');
  assert.equal(navigate.status, 'applied');
  assert.equal(witnessSummary.status, 'applied');
  assert.equal(ancestry.status, 'applied');
  assert.equal(ancestryPlan.status, 'applied');
  assert.equal(relation.status, 'applied');
  assert.equal(autonomySnapshot.status, 'applied');
  assert.equal(scenario.status, 'applied');
  assert.equal(route.status, 'applied');
  assert.equal(forbidden.status, 'rejected');
  assert.equal(forbidden.reason, 'guide-capability-not-allowed');
  assert.equal(forbiddenWitnessProse.status, 'rejected');
  assert.equal(forbiddenWitnessProse.reason, 'guide-capability-not-allowed');
  assert.equal(forbiddenWitnessWrite.status, 'rejected');
  assert.equal(forbiddenWitnessWrite.reason, 'guide-capability-not-allowed');
  assert.equal(forbiddenRelationWrite.status, 'rejected');
  assert.equal(forbiddenRelationWrite.reason, 'guide-capability-not-allowed');
  assert.equal(seen.length, 10);
  assert.deepEqual(guide.allowedCapabilities().map((item) => item.capability_id).sort(), [
    'ancestry.index',
    'ancestry.narrativenode-plan',
    'ancestry.query',
    'ancestry.read',
    'ancestry.status',
    'ancestry.system-lineage',
    'ancestry.traverse',
    'autonomy.bump-proposal',
    'autonomy.propose-hypothesis',
    'autonomy.propose-route',
    'autonomy.propose-scenario',
    'autonomy.record-narrative-finding',
    'autonomy.snapshot',
    'device.input-proof',
    'device.status',
    'glyphforge.active-brush',
    'glyphforge.project-summary',
    'glyphforge.select-brush',
    'glyphforge.status',
    'observer.deep-current',
    'observer.status',
    'observer.timeline',
    'os.boot',
    'os.context',
    'os.navigate',
    'relation.get',
    'relation.list',
    'relation.project-observer',
    'relation.project-premaqc',
    'relation.project-runa',
    'relation.status',
    'runa.inspect-preview-plan',
    'runa.status',
    'security.classify-known-risk-tags',
    'security.risk-families',
    'security.sources',
    'sidecars.status',
    'time-room.doorways',
    'time-room.snapshot',
    'time-room.status',
    'time-room.universes',
    'witness.recent',
    'witness.status',
    'witness.summary',
  ]);
});

test('Guide shell fixes actor identity and strips model-supplied approval authority', async () => {
  let seen = null;
  const guide = createGuideShell({
    actorId: 'guide:test',
    invoke: async (capabilityId, input, context) => {
      seen = { capabilityId, input, context };
      return { status: 'applied' };
    },
  });

  await guide.request('os.navigate', { room: 'forge' }, {
    actor_id: 'pretend-admin',
    source: 'model-runtime',
    authority: 'admin',
    expected_authority: 'admin',
    authority_lease: 'invented-token',
    confirmed: true,
    steward_reviewed: true,
    steward_approved: true,
    steward_approval_id: 'invented-approval',
    approval_receipt: 'invented-approval',
  });

  assert.equal(seen.capabilityId, 'os.navigate');
  assert.equal(seen.context.actor_id, 'guide:test');
  assert.equal(seen.context.source, 'guide-shell');
  assert.equal(seen.context.authority, 'operate');
  assert.equal(seen.context.expected_authority, 'operate');
  assert.equal(seen.context.authority_lease, undefined);
  assert.equal(seen.context.confirmed, undefined);
  assert.equal(seen.context.steward_reviewed, undefined);
  assert.equal(seen.context.steward_approved, undefined);
  assert.equal(seen.context.steward_approval_id, undefined);
  assert.equal(seen.context.approval_receipt, undefined);
});
