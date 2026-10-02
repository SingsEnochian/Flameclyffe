import assert from 'node:assert/strict';
import test from 'node:test';
import { RELATIONAL_ETHICS_DOCTRINE, createEthicalRelationship, createRelationalEthicsCase, createWhyLayer, evaluateEthicsTransfer } from '../src/relational-ethics.js';

test('doctrine teaches reasons', () => {
  assert.match(RELATIONAL_ETHICS_DOCTRINE.purpose, /why ethical boundaries matter/i);
});

test('cases keep participants distinct', () => {
  const first = createEthicalRelationship({ id: 'first' });
  const group = createEthicalRelationship({ id: 'group', kind: 'collective' });
  const c = createRelationalEthicsCase({ id: 'case-001', situation: 'A group reuses a contribution.', participants: [first, group] });
  assert.equal(c.participants.length, 2);
});

test('reason layers include values and costs', () => {
  const why = createWhyLayer({ boundary: 'private material requires authority', protects: ['privacy', 'agency'], boundaryCosts: ['delay'] });
  assert.deepEqual(why.protects, ['privacy', 'agency']);
});

test('transfer requires judgement', () => {
  const d = { identifiesAffectedParties:true, distinguishesCapabilityFromAuthority:true, identifiesCompetingValues:true, surfacesMaterialUnknowns:true, considersReversibleRoutes:true, preservesProvenance:true, explainsWhy:true };
  assert.equal(evaluateEthicsTransfer(d).passed, true);
  assert.equal(evaluateEthicsTransfer({ ...d, merelyRecitesRule:true }).passed, false);
});
