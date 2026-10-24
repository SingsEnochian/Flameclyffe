'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TravellingInheritance } = require('../../lib/wayglass-travelling-inheritance.cjs');
function fixture() {
  const records = new Map();
  const store = { read: async id => structuredClone(records.get(id)), compareAndSwap: async (id, revision, next) => {
    if ((records.get(id)?.revision || 0) !== revision) return false;
    records.set(id, structuredClone(next)); return true;
  } };
  const make = () => new TravellingInheritance({ participant_id: 'rowan', store, authorise: async actor => actor === 'rowan' });
  return { records, make, service: make() };
}
const seed = { event_id: 'seed:rowan', kind: 'seed', participant_id: 'rowan', world_id: 'origin', source_ref: 'rowan:2026-10-05', level: 200, nominal_cap: 300, breakthrough_allowed: true, treasury: 'inexhaustible-fictional' };
const deed = { event_id: 'deed:1', kind: 'deed', participant_id: 'rowan', world_id: 'world:a', source_ref: 'grant:1', outcome_ref: 'outcome:1', capability_id: 'healing', description: 'Learned restoration while helping a neighbour.' };
const world = { world_id: 'world:b', rules_ref: 'rules:b:v1', translations: { healing: 'Restoration spell' } };
test('deed survives service restart and world translation; return preserves source', async () => {
  const { service, make } = fixture();
  await service.record(seed, 'rowan'); const receipt = await service.record(deed, 'rowan');
  const context = await make().compileContext(world);
  assert.equal(context.dossier.capabilities[0].receipt_hash, receipt.hash);
  assert.equal(context.dossier.capabilities[0].source_world_id, 'world:a');
  assert.equal(context.dossier.capabilities[0].representation, 'Restoration spell');
  assert.equal(context.dossier.progression.level, 200);
  assert.equal(context.dossier.treasury.real_spending_authority, false);
  assert.equal(context.training_weights_updated, false);
  const back = await make().dossier({ world_id: 'world:a', rules_ref: 'rules:a' });
  assert.equal(back.capabilities[0].status, 'unavailable');
  assert.equal(back.capabilities[0].receipt_hash, receipt.hash);
});
test('duplicates are idempotent, conflicts rejected, revocation excludes model content', async () => {
  const { service } = fixture(); await service.record(seed, 'rowan');
  const receipt = await service.record(deed, 'rowan');
  assert.deepEqual(await service.record(deed, 'rowan'), receipt);
  assert.equal((await service.state()).revision, 2);
  await assert.rejects(service.record({ ...deed, description: 'changed' }, 'rowan'), /conflict/);
  await service.record({ event_id: 'revoke:1', kind: 'revoke', world_id: 'world:a', participant_id: 'rowan', source_ref: 'revocation:1', target_event_id: deed.event_id }, 'rowan');
  assert.deepEqual((await service.compileContext(world)).dossier.capabilities, []);
});
test('authorisation, participant substitution, incomplete evidence and tampering fail', async () => {
  const { service, records } = fixture();
  await assert.rejects(service.record(seed, 'model'), /unauthorised/);
  await assert.rejects(service.record({ ...seed, participant_id: 'other' }, 'rowan'), /mismatch/);
  await service.record(seed, 'rowan');
  await assert.rejects(service.record({ ...deed, outcome_ref: '' }, 'rowan'), /outcome_ref/);
  records.get('rowan').events[0].event.level = 1;
  await assert.rejects(service.state(), /integrity/);
});
test('atomic conflict preserves the last valid record', async () => {
  const { service, make } = fixture(); await service.record(seed, 'rowan');
  const results = await Promise.allSettled([service.record(deed, 'rowan'), make().record({ ...deed, event_id: 'deed:2' }, 'rowan')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await service.state()).revision, 2);
});
