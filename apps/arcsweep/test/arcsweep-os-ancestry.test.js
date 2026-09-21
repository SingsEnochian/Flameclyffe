import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { registerAncestryService } from '../src/os/ancestry-service.js';
import { createGuideShell } from '../src/os/guide-shell.js';

test('Ancestry service exposes public-safe read capabilities only', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  const service = registerAncestryService(registry, { bus });

  assert.deepEqual(service.capabilities, [
    'ancestry.status',
    'ancestry.index',
    'ancestry.query',
    'ancestry.read',
    'ancestry.traverse',
    'ancestry.system-lineage',
    'ancestry.narrativenode-plan',
  ]);

  const status = await registry.invoke('ancestry.status', {}, { authority: 'read', source: 'test' });
  assert.equal(status.status, 'applied');
  assert.equal(status.output.public_source_text_present, false);
  assert.equal(status.output.private_source_ref_exposed, false);
  assert.equal(status.output.canon_merge_authority, false);
  assert.equal(status.output.relation_identity_law, 'A != B != R');
  assert.equal(status.output.narrativenode_projection, 'plan-only-explicit-session-grant');

  const query = await registry.invoke('ancestry.query', {
    present_system_refs: ['runa'],
  }, { authority: 'read', source: 'test' });
  assert.equal(query.status, 'applied');
  assert.equal(query.output.correspondences.length, 1);
  assert.equal(query.output.correspondences[0].correspondence_id, 'correspondence:resonance-state');
  assert.equal(JSON.stringify(query.output).includes('docs.google.com'), false);
  assert.equal(JSON.stringify(query.output).includes('drive.google.com'), false);
});

test('Ancestry read emits a compact public receipt and traversal preserves node kinds', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerAncestryService(registry, { bus });

  const read = await registry.invoke('ancestry.read', {
    ref: 'ancestral:kalladia-cycle',
  }, { authority: 'read', source: 'test' });
  assert.equal(read.status, 'applied');
  assert.equal(read.output.selected.kind, 'ancestral-root');
  assert.equal(read.output.public_source_text_present, false);

  const event = bus.history().find((item) => item.name === 'arcsweep:ancestry-read');
  assert.ok(event);
  assert.equal(event.payload.ref, 'ancestral:kalladia-cycle');
  assert.equal(event.payload.manuscript_text_present, false);
  assert.equal(JSON.stringify(event).includes('source_ref'), false);

  const traversal = await registry.invoke('ancestry.traverse', {
    ref: 'ancestral:kalladia-cycle',
  }, { authority: 'read', source: 'test' });
  assert.equal(traversal.status, 'applied');
  assert.ok(traversal.output.nodes.some((node) => node.kind === 'ancestral-root'));
  assert.ok(traversal.output.nodes.some((node) => node.kind === 'correspondence'));
  assert.ok(traversal.output.nodes.some((node) => node.kind === 'present-system'));
});

test('NarrativeNode ancestry planning is inspectable, grant-gated, non-executing, and public-safe', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerAncestryService(registry, { bus });

  const result = await registry.invoke('ancestry.narrativenode-plan', {
    root_ids: ['ancestral:amalthi-transition'],
  }, { authority: 'read', source: 'test' });

  assert.equal(result.status, 'applied');
  assert.equal(result.output.user_grant_required, true);
  assert.equal(result.output.private_source_ref_transmitted, false);
  assert.equal(result.output.manuscript_text_transmitted, false);
  assert.equal(result.output.canon_promoted, false);
  assert.equal(result.output.steps[0].tool, 'request_mcp_session');
  assert.equal(result.output.steps[0].requires_active_session, false);
  assert.equal(result.output.steps.at(-1).tool, 'end_mcp_session');
  assert.ok(result.output.steps.slice(1, -1).every((step) => step.requires_active_session === true));
  assert.equal(JSON.stringify(result.output).includes('docs.google.com'), false);
  assert.equal(JSON.stringify(result.output).includes('drive.google.com'), false);

  const event = bus.history().find((item) => item.name === 'arcsweep:ancestry-plan');
  assert.ok(event);
  assert.equal(event.payload.plan_id, result.output.plan_id);
  assert.equal(event.payload.user_grant_required, true);
  assert.equal(event.payload.manuscript_text_transmitted, false);
  assert.equal(event.payload.private_source_ref_transmitted, false);
  assert.equal(event.payload.executed, false);
  assert.equal(JSON.stringify(event).includes('create_knowledge'), false);
});

test('Guide may inspect public ancestry but receives no mutation capability', async () => {
  const requested = [];
  const guide = createGuideShell({
    invoke: async (capabilityId, input, context) => {
      requested.push({ capabilityId, input, context });
      return { status: 'applied', capability_id: capabilityId };
    },
  });

  const allowed = guide.allowedCapabilities().map((item) => item.capability_id);
  assert.ok(allowed.includes('ancestry.status'));
  assert.ok(allowed.includes('ancestry.read'));
  assert.ok(allowed.includes('ancestry.traverse'));
  assert.ok(allowed.includes('ancestry.narrativenode-plan'));

  const read = await guide.request('ancestry.read', { ref: 'ancestral:amalthi-transition' }, {
    authority: 'admin',
    steward_approved: true,
  });
  assert.equal(read.status, 'applied');
  assert.equal(requested[0].context.authority, 'read');
  assert.equal(requested[0].context.steward_approved, undefined);

  const plan = await guide.request('ancestry.narrativenode-plan', {
    root_ids: ['ancestral:amalthi-transition'],
  }, {
    authority: 'admin',
    confirmed: true,
    steward_approved: true,
  });
  assert.equal(plan.status, 'applied');
  assert.equal(requested[1].context.authority, 'read');
  assert.equal(requested[1].context.confirmed, undefined);
  assert.equal(requested[1].context.steward_approved, undefined);

  const forbidden = await guide.request('ancestry.bind-private-source', { source_ref: 'private://forbidden' });
  assert.equal(forbidden.status, 'rejected');
  assert.equal(forbidden.reason, 'guide-capability-not-allowed');
});

test('Ancestry sidecar is present in the normal build graph after Time Room', () => {
  const source = readFileSync(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const timeRoomIndex = source.indexOf("'./time-room-sidecar.js'");
  const ancestryIndex = source.indexOf("'./ancestry-sidecar.js'");
  assert.ok(timeRoomIndex >= 0);
  assert.ok(ancestryIndex > timeRoomIndex);
  assert.match(source, /import\.meta\.glob\([\s\S]*\.\/ancestry-sidecar\.js/);

  const sidecar = readFileSync(new URL('../src/ancestry-sidecar.js', import.meta.url), 'utf8');
  assert.match(sidecar, /registerAncestryService/);
  assert.match(sidecar, /service_id: 'ancestry'/);
  assert.match(sidecar, /arcsweep:ancestry-ready/);
});
