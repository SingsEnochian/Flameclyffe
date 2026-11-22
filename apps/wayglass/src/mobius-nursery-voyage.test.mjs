import test from 'node:test';
import assert from 'node:assert/strict';
import {createGarden, proposeGardenAction, carryGardenAction, restoreGarden} from './mobius-nursery-garden.mjs';
import {prepareNurserySignal} from './wtl-nursery-bridge.mjs';

// A cross-module, synthetic voyage. It does not assert a running host, model or browser.
test('two sovereign participants: signals, explicit carry, Feather, and cold Return', () => {
  const participants = ['nursery:a', 'nursery:b'];
  const grants = Object.fromEntries(participants.map(id => [id, true]));
  let world = createGarden({participants});
  const firstSignal = prepareNurserySignal({kind:'touch', value:'seed', consent:grants, participants});
  assert.equal(firstSignal.status, 'ready');
  const first = proposeGardenAction(world, {
    actor:participants[0], material:'seed', source:firstSignal.signal.source,
    consent:grants, consentRevision:1
  });
  assert.equal(first.status, 'proposal');
  assert.equal(world.revision, 0);
  world = carryGardenAction(world, first, {consent:grants, consentRevision:1});
  const secondSignal = prepareNurserySignal({kind:'word', value:'light', consent:grants, participants});
  const second = proposeGardenAction(world, {
    actor:participants[1], material:'light', source:secondSignal.signal.source,
    consent:grants, consentRevision:1
  });
  assert.equal(carryGardenAction(world, second, {consent:grants, feather:true, consentRevision:1}).status, 'stopped');
  assert.equal(world.revision, 1);
  assert.equal(carryGardenAction(world, second, {consent:{'nursery:a':true}, consentRevision:2}).status, 'declined');
  assert.throws(() => carryGardenAction(world, second, {consent:grants, consentRevision:3}), /Stale consent revision/);
  const renewed = proposeGardenAction(world, {
    actor:participants[1], material:'light', source:secondSignal.signal.source,
    consent:grants, consentRevision:3
  });
  world = carryGardenAction(world, renewed, {consent:grants, consentRevision:3});
  const cold = restoreGarden(JSON.parse(JSON.stringify(world)), participants);
  assert.deepEqual(cold, world);
  assert.deepEqual(cold.objects.map(item => item.actor), participants);
  assert.equal(cold.history.length, 2);
  assert.equal(prepareNurserySignal({kind:'sound', value:'tone', consent:{'nursery:a':true}, participants}).status, 'declined');
});
