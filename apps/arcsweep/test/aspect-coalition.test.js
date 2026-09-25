import assert from 'node:assert/strict';
import test from 'node:test';

import { createAspectEnvelope, createAspectMessageBus } from '../src/aspects/aspect-message-bus.js';
import {
  createAspectCoalition,
  runAspectCoalition,
} from '../src/aspects/aspect-coalition.js';

test('coalitions are temporary working groups, not global committees', () => {
  const coalition = createAspectCoalition({
    id: 'coalition-runtime-seam',
    purpose: 'Bind the mesh to the existing runtime without inventing a second identity stack.',
    members: ['mapper', 'maker', 'critic'],
    synthesisAspectId: 'mapper',
  });

  assert.deepEqual(coalition.members, ['mapper', 'maker', 'critic']);
  assert.equal(coalition.synthesisAspectId, 'mapper');
  assert.equal(coalition.members.includes('witness'), false);
});

test('coalition trace preserves each aspect contribution and retains dissent in synthesis request', async () => {
  const bus = createAspectMessageBus();
  const coalition = createAspectCoalition({
    id: 'coalition-trace',
    purpose: 'Choose a reversible adapter route.',
    members: ['mapper', 'maker', 'critic'],
    synthesisAspectId: 'mapper',
  });
  const seed = createAspectEnvelope({
    id: 'seed-1',
    traceId: 'trace-coalition-1',
    sender: { aspectId: 'steward', invocationId: 'approval' },
    recipients: coalition.members,
    kind: 'proposal',
    body: 'Use existing Constellation runtime and House persistence.',
  });

  const seen = [];
  const invokeTurn = async ({ bus: activeBus, aspectId, incoming, sharedContext }) => {
    seen.push({ aspectId, incomingKind: incoming.kind, sharedContext: [...sharedContext] });
    const isSynthesis = incoming.sender.aspectId === 'coalition';
    const body = isSynthesis
      ? 'Synthesis: use the existing adapter; retain Critic’s warning that runtime identity must remain visible.'
      : aspectId === 'mapper'
        ? 'Map: existing adapter is the shortest seam.'
        : aspectId === 'maker'
          ? 'Result: implementation can reuse the current runtime path.'
          : 'Challenge: do not conflate aspect identity with the carrying voice.';
    const kind = isSynthesis ? 'reply' : aspectId === 'critic' ? 'challenge' : aspectId === 'maker' ? 'result' : 'observation';
    const envelope = activeBus.publish({
      traceId: incoming.traceId,
      parentId: incoming.id,
      sender: { aspectId, invocationId: `mock:${aspectId}` },
      recipients: [incoming.sender.aspectId],
      kind,
      body,
    });
    return { status: 'replied', envelope };
  };

  const result = await runAspectCoalition({ coalition, seed, bus, invokeTurn });

  assert.equal(result.rounds.length, 1);
  assert.equal(result.synthesis.status, 'synthesized');
  assert.deepEqual(
    result.trace.map((entry) => entry.sender.aspectId),
    ['steward', 'mapper', 'maker', 'critic', 'coalition', 'mapper'],
  );
  assert.ok(seen.at(-1).sharedContext.some((line) => /critic \[challenge\]/i.test(line)));
  assert.match(String(result.synthesis.envelope.body), /retain Critic’s warning/i);
});

test('coalition synthesis is optional and does not create a sovereign arbiter by default', async () => {
  const coalition = createAspectCoalition({
    purpose: 'Explore two compatible routes.',
    members: ['narrative', 'continuity'],
  });
  const seed = createAspectEnvelope({
    id: 'seed-optional', traceId: 'trace-optional',
    sender: { aspectId: 'steward' }, recipients: coalition.members,
    kind: 'question', body: 'What else might work?',
  });
  const invokeTurn = async ({ bus, aspectId, incoming }) => ({
    status: 'replied',
    envelope: bus.publish({
      traceId: incoming.traceId,
      parentId: incoming.id,
      sender: { aspectId },
      recipients: [],
      kind: 'proposal',
      body: `${aspectId} proposes an alternative.`,
    }),
  });

  const result = await runAspectCoalition({ coalition, seed, invokeTurn });

  assert.equal(result.synthesis.status, 'not-requested');
  assert.equal(result.sharedState.contributions.length, 2);
});
