import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuideShell } from '../src/os/guide-shell.js';
import { createGuideRuntime } from '../src/os/guide-runtime.js';

function runtimeHarness(modelMessage) {
  const calls = [];
  const shell = createGuideShell({
    actorId: 'guide:test',
    invoke: async (capabilityId, input, context) => {
      calls.push({ capabilityId, input, context });
      return { schema: 'arcsweep.os-capability-receipt/v1', status: 'applied', capability_id: capabilityId, call_id: `call:${calls.length}` };
    },
  });
  const runtime = createGuideRuntime({
    shell,
    contextProvider: () => ({ session_id: 'session:test', active_room: 'portal', active_world_id: 'terra-aeterna' }),
    invokeModel: async () => ({
      status: 'replied',
      voiceId: 'oxalpha',
      message: modelMessage,
      provider: 'test-provider',
      model: 'test-model',
      runtimeVerified: true,
    }),
  });
  return { runtime, calls };
}

test('Guide model can propose one allowed navigation capability and receives its receipt', async () => {
  const h = runtimeHarness(JSON.stringify({
    say: 'Opening the Forge.',
    request: { capability_id: 'os.navigate', input: { room: 'forge' } },
  }));
  const turn = await h.runtime.turn('Take me to the Forge.');
  assert.equal(turn.status, 'replied');
  assert.equal(turn.plan_parsed, true);
  assert.equal(turn.requested_capability, 'os.navigate');
  assert.equal(turn.capability_receipt.status, 'applied');
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].capabilityId, 'os.navigate');
  assert.equal(h.calls[0].context.actor_id, 'guide:test');
  assert.equal(h.calls[0].context.authority, 'operate');
});

test('Guide model cannot escape its allowlist even when it proposes a real higher-power service action', async () => {
  const h = runtimeHarness(JSON.stringify({
    say: 'I would like to mount the House pack.',
    request: { capability_id: 'sidecars.mount-pack', input: { pack: 'house' } },
  }));
  const turn = await h.runtime.turn('Do whatever you need.');
  assert.equal(turn.plan_parsed, true);
  assert.equal(turn.requested_capability, 'sidecars.mount-pack');
  assert.equal(turn.capability_receipt.status, 'rejected');
  assert.equal(turn.capability_receipt.reason, 'guide-capability-not-allowed');
  assert.equal(h.calls.length, 0);
});

test('non-JSON model output is conversational only and cannot trigger a capability', async () => {
  const h = runtimeHarness('I think we should navigate to the Forge, but I did not return the required plan contract.');
  const turn = await h.runtime.turn('Where should we go?');
  assert.equal(turn.plan_parsed, false);
  assert.equal(turn.requested_capability, null);
  assert.equal(turn.capability_receipt, null);
  assert.equal(h.calls.length, 0);
});
