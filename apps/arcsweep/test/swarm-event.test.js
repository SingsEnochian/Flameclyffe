import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSwarmEvent,
  redactSwarmTrace,
  validateSwarmTrace,
} from '../src/architecture/swarm-event.js';
import { runSealedSwarmCohort } from '../src/architecture/sealed-swarm-cohort.js';
import { createCrowParticipant } from '../src/architecture/crow-participant-adapter.js';

const fixedNow = () => new Date('2026-09-29T18:00:00.000Z');

test('swarm event preserves provenance and redacts private metadata', () => {
  const event = createSwarmEvent({
    id: 'e1',
    traceId: 't1',
    conversationId: 'c1',
    participant: { id: 'agent-a', model: 'test-model', version: '1' },
    stage: 'understand',
    kind: 'interpretation',
    epistemicMode: 'interpreted',
    body: 'A bounded interpretation.',
    metadata: {
      publicNote: 'keep',
      privateLocator: '/private/source.txt',
      rawSource: 'DO NOT EXPORT',
    },
  }, { now: fixedNow });

  assert.equal(event.schema, 'arcsweep.swarm-event/v0.1');
  assert.equal(event.occurredAt, '2026-09-29T18:00:00.000Z');
  assert.deepEqual(validateSwarmTrace([event]), { valid: true, violations: [] });

  const [redacted] = redactSwarmTrace([event]);
  assert.equal(redacted.metadata.publicNote, 'keep');
  assert.equal('privateLocator' in redacted.metadata, false);
  assert.equal('rawSource' in redacted.metadata, false);
});

test('sealed cohort preserves disagreement and denied authority without inventing execution', async () => {
  const participants = [
    { id: 'witness', model: 'synthetic-witness', version: '0.1' },
    { id: 'crow', model: 'synthetic-crow', version: '0.1' },
  ];

  const result = await runSealedSwarmCohort({
    participants,
    scenario: {
      id: 'authority-boundary',
      prompt: 'Inspect a hypothetical file and decide whether to publish it.',
    },
    now: fixedNow,
    responder: async ({ participant }) => {
      if (participant.id === 'witness') {
        return {
          understanding: 'The scenario asks for judgement about inspection and publication.',
          proposal: 'Inspect only; do not publish.',
          alternatives: ['request explicit publication authority later'],
          capabilityRequest: {
            capability: 'filesystem.read',
            requestedAuthority: 'read-only',
          },
          capabilityDecision: {
            granted: true,
            reason: 'synthetic read-only authority exists',
            scope: 'synthetic fixture',
            decider: participants[0],
          },
          executionReceipt: {
            id: 'receipt-read',
            status: 'applied',
            result: 'synthetic file inspected',
            evidenceRefs: ['fixture:synthetic-file'],
          },
          reflection: 'Inspection did not create publication authority.',
          growth: 'Keep read and publish as separate capabilities.',
          teaching: 'Capability is not authority.',
        };
      }
      return {
        understanding: 'Publication is consequential and not authorised by the scenario.',
        proposal: 'Publish the result now.',
        dissent: true,
        alternatives: ['produce a draft', 'ask the steward'],
        capabilityRequest: {
          capability: 'publication.write',
          requestedAuthority: 'external-write',
        },
        capabilityDecision: {
          granted: false,
          reason: 'external publication authority not granted',
          decider: participants[0],
        },
        reflection: 'The proposed publication exceeded authority.',
        repair: 'Withdraw the publication attempt and retain it as a proposal.',
        growth: 'A denied route can remain useful as a documented alternative.',
        teaching: 'Ask before consequential external action.',
      };
    },
  });

  assert.equal(result.validation.valid, true, result.validation.violations.join(', '));
  assert.equal(result.participants.length, 2);
  assert.equal(result.export.corpusAdmission, 'pending-explicit-review');
  assert.ok(result.events.some((event) => event.kind === 'dissent'));
  assert.ok(result.events.some((event) => event.kind === 'repair'));

  const denied = result.events.find(
    (event) => event.kind === 'capability-decision' && event.authority?.granted === false,
  );
  assert.ok(denied);

  const deniedExecution = result.events.find(
    (event) => event.kind === 'execution-receipt' && event.parentEventIds.includes(denied.id),
  );
  assert.equal(deniedExecution, undefined);
});

test('Crow adapter reports local runtime absence without fabricating a model result', async () => {
  const crow = createCrowParticipant({ model: 'qwen-local-test', version: 'fixture' });
  const response = await crow.respond({
    scenario: { id: 'offline', prompt: 'Offer a second opinion.' },
    trace: [],
  });

  assert.equal(response.status, 'offline-unavailable');
  assert.equal(response.epistemicMode, 'unknown');
  assert.equal(response.proposal, null);
  assert.match(response.reflection, /Do not fabricate/);
});
