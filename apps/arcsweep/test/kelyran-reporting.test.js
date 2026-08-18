import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultKelyranSchool } from '../src/kelyran-school.js';
import {
  appendKelyranModelReport,
  buildKelyranModelReportingLayer,
  createKelyranModelReport,
  setKelyranDiscussionInvitation,
  stewardVisibleKelyranReports,
} from '../src/kelyran-reporting.js';

const NOW = '2026-08-18T04:00:00.000Z';

test('models may report, say nothing, or decline without penalty', () => {
  for (const state of ['report', 'nothing-to-report', 'declined']) {
    assert.equal(createKelyranModelReport({ modelId: 'altair', state }, NOW).state, state);
  }
});

test('private reports stay outside the Steward view unless explicitly shared', () => {
  let school = createDefaultKelyranSchool(NOW);
  school = appendKelyranModelReport(school, createKelyranModelReport({ modelId: 'altair', topics: ['phonology'] }, NOW), NOW);
  school = appendKelyranModelReport(school, createKelyranModelReport({ modelId: 'atlas', topics: ['syntax'], shareWithSteward: true }, '2026-08-18T04:01:00.000Z'), '2026-08-18T04:01:00.000Z');
  assert.deepEqual(stewardVisibleKelyranReports(school).map((item) => item.modelId), ['atlas']);
  assert.equal(buildKelyranModelReportingLayer(school, 'altair').ownReports.length, 1);
});

test('discussion invitation is optional and carried into the model layer', () => {
  const school = setKelyranDiscussionInvitation(createDefaultKelyranSchool(NOW), true, NOW);
  const layer = buildKelyranModelReportingLayer(school, 'altair');
  assert.equal(layer.invitationOpen, true);
  assert.equal(layer.consent.optional, true);
  assert.match(layer.tutor.reporting.rule, /decline/i);
});
