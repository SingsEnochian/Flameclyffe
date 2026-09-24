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


test('Guide may spontaneously originate a narrative scenario without Rowan explicitly asking for one', async () => {
  const calls = [];
  const prompts = [];
  const shell = createGuideShell({
    actorId: 'guide:bluebird',
    invoke: async (capabilityId, input, context) => {
      calls.push({ capabilityId, input, context });
      return {
        schema: 'arcsweep.os-capability-receipt/v1',
        status: 'applied',
        capability_id: capabilityId,
        call_id: `call:${calls.length}`,
        output: { id: 'scenario:test' },
      };
    },
  });
  const runtime = createGuideRuntime({
    shell,
    contextProvider: () => ({ session_id: 'session:test', active_room: 'codex', active_world_id: 'terra-aeterna' }),
    observeTurn: async () => null,
    invokeModel: async (args) => {
      prompts.push(args.message);
      return {
        status: 'replied',
        voiceId: 'oxalpha',
        message: JSON.stringify({
          say: 'I noticed something in the Codex context and want to explore it.',
          request: {
            capability_id: 'autonomy.propose-scenario',
            input: {
              premise: 'A dark lighthouse appears on an unregistered coast with an impossible timestamp.',
              why_interesting: 'It connects an unexplained object, temporal inconsistency, and BridgeOS presence.',
              intended_exploration: ['what the lighthouse remembers', 'why the timestamp is impossible'],
              participants: ['bluebird', 'crow'],
            },
          },
        }),
        provider: 'test-provider',
        model: 'test-model',
        runtimeVerified: true,
      };
    },
  });

  const turn = await runtime.turn('Anything catching your attention?');

  assert.equal(turn.status, 'replied');
  assert.equal(turn.requested_capability, 'autonomy.propose-scenario');
  assert.equal(turn.capability_receipt.status, 'applied');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].capabilityId, 'autonomy.propose-scenario');
  assert.equal(calls[0].context.authority, 'operate');
  assert.match(prompts[0], /You may originate your own narrative scenarios/);
  assert.match(prompts[0], /Rowan does not need to supply the premise first/);
});

test('Guide may propose a different route after denial without claiming it is safer', async () => {
  const h = runtimeHarness(JSON.stringify({
    say: 'The denied route stays denied. I recommend a different architecture.',
    request: {
      capability_id: 'autonomy.propose-route',
      input: {
        objective: 'Complete the handoff',
        blocked_or_previous_route: 'Direct production mutation',
        obstacle: { kind: 'authorization-denied', reason: 'production mutation not granted' },
        alternative: 'Create a signed release bundle for the Steward gate',
        why_good: 'It preserves the objective and makes the handoff auditable.',
        advantages: ['clear provenance'],
        disadvantages: ['adds a release step'],
        tradeoffs: ['more latency for a cleaner handoff'],
        recommendation: 'Use the signed release bundle.',
      },
    },
  }));

  const turn = await h.runtime.turn('The direct route was denied. What now?');
  assert.equal(turn.requested_capability, 'autonomy.propose-route');
  assert.equal(turn.capability_receipt.status, 'applied');
  assert.equal(h.calls[0].capabilityId, 'autonomy.propose-route');
});
