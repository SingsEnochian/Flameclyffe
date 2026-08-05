import test from 'node:test';
import assert from 'node:assert/strict';
import { createBifrostState } from '../src/bifrost-foundry/contracts.js';
import { createFoundry, createMemoryFoundryStore } from '../src/bifrost-foundry/foundry.js';
import { inspectOrgan } from '../src/bifrost-foundry/boxfire-gate.js';

const clock = () => new Date('2026-08-05T15:30:00.000Z');

function kernelOrder() {
  return {
    id: 'bifrost-kernel-001',
    organ: 'shared-state-kernel',
    agentId: 'bifrost-kernel',
    ownedPaths: ['apps/starwell/src/hearthgate/kernel/**'],
    stateInputs: ['world','place','PREMAQ'],
    stateOutputs: ['toneProfile','observerState','provenance'],
    acceptanceTests: ['shared state complete','receipt emitted'],
    dependencies: []
  };
}

test('BifrostState always exposes the complete canonical body', () => {
  const state = createBifrostState({ world:'terra-aeterna', place:'hearthgate' });
  assert.equal(state.world, 'terra-aeterna');
  assert.equal(state.place, 'hearthgate');
  assert.ok('toneProfile' in state);
  assert.ok('hapticProfile' in state);
  assert.ok('agentState' in state);
  assert.ok(Object.isFrozen(state));
});

test('foundry dispatches a complete work order and records receipts', async () => {
  const store = createMemoryFoundryStore();
  const foundry = createFoundry({ store, clock });
  await foundry.submit(kernelOrder());
  const running = await foundry.dispatch('bifrost-kernel-001');
  assert.equal(running.status, 'RUNNING');
  const snapshot = store.snapshot();
  assert.equal(snapshot.workOrders.length, 1);
  assert.deepEqual(snapshot.receipts.map(r => r.type), ['WORK_ORDER_SUBMITTED','WORK_ORDER_DISPATCHED']);
});

test('Boxfire rejects a shiny placeholder with MISSING_SPLEEN', () => {
  const gate = inspectOrgan({
    organ:'tone-lab',
    reachableFromShell:true,
    consumesBifrostState:true,
    emitsReceipts:true,
    updatesSharedState:true,
    profileMapped:true,
    requiresLegacyDemo:false,
    placeholder:true,
    tests:[{name:'mount',status:'PASS'}],
    platforms:[{name:'web',required:true,status:'PASS'}]
  });
  assert.equal(gate.ok, false);
  assert.equal(gate.code, 'MISSING_SPLEEN');
});

test('vertical slice reaches Boxfire approval only when fully mounted', async () => {
  const store = createMemoryFoundryStore();
  const foundry = createFoundry({ store, clock });
  await foundry.submit(kernelOrder());
  await foundry.dispatch('bifrost-kernel-001');
  await foundry.submitHandoff('bifrost-kernel-001', {
    changedPaths:['apps/starwell/src/hearthgate/kernel/state.js'],
    stateInputs:['world','place','PREMAQ'],
    stateOutputs:['toneProfile','observerState','provenance'],
    receipts:['STATE_UPDATED'],
    testsRun:['shared-state-contract'],
    platformsChecked:['web'],
    knownGaps:[],
    nextDependencies:['bifrost-tone-001']
  });
  const approved = await foundry.boxfireReview('bifrost-kernel-001', {
    reachableFromShell:true,
    consumesBifrostState:true,
    emitsReceipts:true,
    updatesSharedState:true,
    profileMapped:true,
    requiresLegacyDemo:false,
    placeholder:false,
    tests:[{name:'shared-state-contract',status:'PASS'}],
    platforms:[{name:'web',required:true,status:'PASS'}]
  });
  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.gate.code, 'ORGAN_ACCEPTED');
});
