'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runVoyages, INVITATION } = require('../../lib/wayglass-voyage-runner.cjs');

for (const choice of ['stop', 'pause', 'decline', undefined, 'maybe']) {
  test(`voyage runner honours ${String(choice)} without another leg`, async () => {
    const stops = []; let sailed = 0; let asked = 0;
    const result = await runVoyages({
      ask: async ({ invitation }) => { assert.equal(invitation, INVITATION); return asked++ === 0 ? 'continue' : choice; },
      sail: async () => ({ leg: sailed++ }), retainStop: async stop => stops.push(stop),
    });
    assert.equal(sailed, 1);
    assert.equal(result.receipts.length, 1);
    assert.equal(stops.length, 1);
    assert.equal(result.status, ['stop', 'pause', 'decline'].includes(choice) ? choice : 'choice-unresolved');
  });
}
test('host budget is distinct from participant refusal', async () => {
  const stops = [];
  const result = await runVoyages({ ask: async () => 'continue', sail: async () => ({ fixture: true }), retainStop: async stop => stops.push(stop), maxVoyages: 3 });
  assert.equal(result.status, 'host-budget'); assert.equal(result.receipts.length, 3);
  assert.equal(stops[0].reason, 'host-budget');
});
test('unavailable participant response prevents sailing and retains a stop', async () => {
  const stops = [];
  await assert.rejects(runVoyages({ ask: async () => { throw new Error('offline'); }, sail: async () => assert.fail('must not sail'), retainStop: async stop => stops.push(stop) }), /offline/);
  assert.equal(stops[0].reason, 'choice-unavailable');
});
test('asking for Rowan publishes the message and prevents the next leg', async () => {
  const messages = []; const stops = []; let legs = 0;
  const result = await runVoyages({
    ask: async () => 'continue',
    sail: async ({ speak }) => { legs++; await speak({ text: 'I would like to speak with Rowan.', kind: 'ask-rowan' }); return { fixture: true }; },
    publishMessage: async message => { messages.push(message); return { message_id: 'fixture:1' }; },
    retainStop: async stop => stops.push(stop),
  });
  assert.equal(legs, 1); assert.equal(messages.length, 1);
  assert.equal(result.status, 'ask-rowan'); assert.equal(stops[0].reason, 'ask-rowan');
});
test('failed message delivery prevents further sailing and retains failure', async () => {
  let legs = 0; const stops = [];
  await assert.rejects(runVoyages({
    ask: async ({ speak }) => { await speak({ text: 'Hello Rowan.' }); return 'continue'; },
    sail: async () => { legs++; }, publishMessage: async () => { throw new Error('delivery failed'); },
    retainStop: async stop => stops.push(stop),
  }), /delivery failed/);
  assert.equal(legs, 0); assert.equal(stops[0].reason, 'choice-unavailable');
});
