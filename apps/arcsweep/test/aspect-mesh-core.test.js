import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INITIAL_ASPECTS,
  aspectHasStandingScope,
  aspectMayContribute,
} from '../src/aspects/aspect-contract.js';
import { createAspectMessageBus } from '../src/aspects/aspect-message-bus.js';
import { branchRoute, createRouteProposal, preserveAlternatives } from '../src/aspects/route-proposal.js';
import { classifyConsequence, mayProceedInOrdinaryScope } from '../src/aspects/consequence-boundary.js';
import { disagreementDisposition, shouldArbitrate } from '../src/aspects/arbitration.js';

test('aspect strengths are not cages', () => {
  const narrative = INITIAL_ASPECTS.find((aspect) => aspect.id === 'narrative');
  assert.equal(aspectMayContribute(narrative, 'technical-observation'), true);
  assert.equal(aspectHasStandingScope(narrative, 'proposal'), true);
});

test('Maker carries broad reversible standing scope', () => {
  const maker = INITIAL_ASPECTS.find((aspect) => aspect.id === 'maker');
  assert.equal(aspectHasStandingScope(maker, 'routine-reversible-action'), true);
});

test('aspects can speak directly without a central rewrite step', () => {
  const bus = createAspectMessageBus();
  const originalBody = { text: 'Try the relational-memory route.', weirdness: 0.87 };
  const message = bus.publish({
    id: 'm1',
    traceId: 't1',
    sender: { aspectId: 'narrative', invocationId: 'i1' },
    recipients: ['continuity'],
    kind: 'proposal',
    body: originalBody,
    createdAt: '2026-09-24T21:00:00-04:00',
  });

  assert.deepEqual(message.body, originalBody);
  assert.equal(bus.forRecipient('continuity')[0], message);
});

test('routine reversible work is ordinary by default', () => {
  const operation = { kind: 'routine-reversible-action', reversible: true, production: false };
  assert.equal(mayProceedInOrdinaryScope(operation), true);
  assert.equal(classifyConsequence(operation).edges.length, 0);
});

test('actual cliff edges wake explicit edge handling', () => {
  const canon = classifyConsequence({ canonPromotion: 'authoritative' });
  const external = classifyConsequence({ external: true });
  assert.equal(canon.requiresExplicitEdgeHandling, true);
  assert.ok(canon.edges.includes('authoritative-canon-promotion'));
  assert.ok(external.edges.includes('external-commitment'));
});

test('arbitration sleeps through ordinary difference', () => {
  assert.equal(shouldArbitrate({}), false);
  assert.equal(disagreementDisposition({ type: 'taste' }).action, 'coexist-or-follow-declared-preference');
});

test('narrative alternatives coexist instead of being voted away', () => {
  const root = createRouteProposal({
    id: 'route-root',
    proposer: 'narrative',
    intent: 'Explore relational memory',
    summary: 'Organise memory by relationship rather than chronology.',
    mode: 'exploration',
  });
  const moon = branchRoute(root, { id: 'route-moon', summary: 'Use relational constellations.' });
  const river = branchRoute(root, { id: 'route-river', summary: 'Use changing relational currents.' });
  const alternatives = preserveAlternatives(moon, river);
  const disposition = disagreementDisposition({ type: 'narrative', alternatives });

  assert.equal(alternatives.length, 2);
  assert.equal(disposition.action, 'branch');
  assert.equal(disposition.alternatives.length, 2);
});
