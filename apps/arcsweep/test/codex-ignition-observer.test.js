import assert from 'node:assert/strict';
import test from 'node:test';

import { createCodexIgnitionObserver } from '../src/architecture/codex-ignition-observer.js';
import { runIgnitionCycle } from '../src/architecture/ignition-loop.js';
import { createTrajectory } from '../src/architecture/trajectory-state.js';
import { createExecutionReceipt } from '../src/architecture/capability-negotiation.js';
import { createCodexLivingState } from '../src/universal-codex-living-state.js';

const now = () => new Date('2026-09-28T14:00:00.000Z');
const component = { amplitude: .8, persistence: .8, coherence: .8, uncertainty: .1 };

test('closed-loop cognition is observed into Codex without giving Codex execution authority', async () => {
  const codex = createCodexLivingState();
  const observeCognition = createCodexIgnitionObserver({ codex });
  const trajectory = createTrajectory({
    id: 'trajectory:codex-live',
    origin: 'test',
    state: 'sleeping',
    hypothesis: 'Observe the live loop without owning it.',
    activationThreshold: .5,
    damping: .9,
    signal: component,
  }, { now });

  const result = await runIgnitionCycle({
    trajectory,
    observation: { id: 'observation:1', relevance: .9, coherence: .9, uncertainty: .1 },
    cognition: async () => ({
      capability: 'repository.inspect',
      requestedAuthority: 'read-only',
      reason: 'Inspect evidence',
    }),
    negotiate: async () => ({ granted: true, grantId: 'grant:1', authority: 'read-only' }),
    execute: async ({ request }) => createExecutionReceipt({
      id: 'receipt:1',
      requestId: request.id,
      status: 'applied',
      evidenceRefs: ['evidence:1'],
      changes: [],
      executor: 'test',
      result: { inspected: true },
    }, { now }),
    observeCognition,
    now,
    idFactory: (prefix) => `${prefix}:fixed`,
  });

  assert.equal(result.status, 'closed-loop');
  const snapshot = codex.snapshot();
  assert.equal(snapshot.wildGarden.length, 1, 'intention should remain exploratory');
  assert.equal(snapshot.contributions.length, 2, 'decision and result should be attributed observations');
  assert.equal(snapshot.canon.length, 0, 'runtime observation must not silently become canon');
  assert.ok(snapshot.receipts.length >= 3);
});

test('observer cannot change capability decision because it receives events after the decision', async () => {
  const seen = [];
  const trajectory = createTrajectory({
    id: 'trajectory:denied',
    origin: 'test',
    state: 'sleeping',
    hypothesis: 'Denied actions stay denied.',
    activationThreshold: .5,
    damping: .9,
    signal: component,
  }, { now });

  const result = await runIgnitionCycle({
    trajectory,
    observation: { id: 'observation:2', relevance: .9, coherence: .9, uncertainty: .1 },
    cognition: async () => ({ capability: 'repository.write', requestedAuthority: 'write' }),
    negotiate: async () => ({ granted: false, reason: 'outside scope' }),
    execute: async () => { throw new Error('must not execute'); },
    observeCognition: async (event) => { seen.push(event.phase); },
    now,
    idFactory: (prefix) => `${prefix}:fixed`,
  });

  assert.equal(result.status, 'waiting');
  assert.deepEqual(seen, ['intention', 'capability-decision']);
});
