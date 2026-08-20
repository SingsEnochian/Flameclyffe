import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultKelyranSchool } from '../src/kelyran-school.js';
import {
  appendKelyranModelReport,
  buildKelyranReportPrompt,
  buildKelyranModelReportingLayer,
  createKelyranModelReport,
  parseKelyranModelReport,
  setKelyranDiscussionInvitation,
  stewardVisibleKelyranReports,
} from '../src/kelyran-reporting.js';

const NOW = '2026-08-18T04:00:00.000Z';

test('models may report, say nothing, or decline without penalty', () => {
  for (const state of ['report', 'nothing-to-report', 'declined']) {
    assert.equal(createKelyranModelReport({ modelId: 'altair', state }, NOW).state, state);
  }
});

test('report prompt binds identity, canon, optionality, and exact JSON output', () => {
  const layer = buildKelyranModelReportingLayer(createDefaultKelyranSchool(NOW), 'altair');
  const prompt = buildKelyranReportPrompt(layer);
  assert.match(prompt, /only as altair/i);
  assert.match(prompt, /declining needs no explanation/i);
  assert.match(prompt, /waiting/);
  assert.match(prompt, /exactly one JSON object/i);
});

test('strict parser binds route identity and rejects extra instructions', () => {
  const report = parseKelyranModelReport('{"state":"report","topics":["phonology"],"unknown_forms":[],"curiosities":[],"difficulties":[],"wants_discussion":true,"share_with_steward":false}', 'altair', NOW);
  assert.equal(report.modelId, 'altair');
  assert.equal(report.wantsDiscussion, true);
  assert.throws(() => parseKelyranModelReport('{"state":"report","model_id":"atlas"}', 'altair', NOW), /identity/i);
  assert.throws(() => parseKelyranModelReport('{"state":"report","execute":"anything"}', 'altair', NOW), /unknown model-report fields/i);
});

test('plain refusal becomes a valid declined report', () => {
  assert.equal(parseKelyranModelReport('[REFUSAL] No.', 'altair', NOW).state, 'declined');
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
