'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const createWayglassRouter = require('../wayglass/router');

const base = {
  identity_ref: 'rowan', form_id: 'rowan-base',
  domains: ['appearance', 'structure'], appearance: { palette: 'unassigned' },
  capabilities: [], sensory_profile: { accessibility: ['keyboard'] },
  environment_profile: {}, return_anchor: 'rowan-base',
};
const target = {
  ...base, form_id: 'rowan-form-01', parent_form_id: 'rowan-base',
  appearance: { palette: 'opaline' },
};

test('Soma Nova Morphogenesis preview is owner-authenticated, bounded and effect-free', async () => {
  const old = process.env.ARCSWEEP_RUNTIME_TOKEN;
  const token = 'soma-nova-preview-private-test-' + 'b'.repeat(40);
  process.env.ARCSWEEP_RUNTIME_TOKEN = token;
  const app = express();
  app.use(express.json());
  app.use('/api/v1/wayglass', createWayglassRouter.createWayglassRouter());
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const url = 'http://127.0.0.1:' + server.address().port + '/api/v1/wayglass/wyrdrune/morphogenesis/preview';
    const send = (body, headers = {}) => fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    assert.equal((await send({ base, target })).status, 401);
    assert.equal((await send({ base, target }, { 'x-owner-authorized': 'true' })).status, 401);
    const auth = { authorization: 'Bearer ' + token };
    const response = await send({ base, target }, auth);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.schema, 'wayglass.soma-nova-morphogenesis-preview/v1');
    assert.equal(result.plan.identity_ref, 'rowan');
    assert.equal(result.report.canPreview, true);
    assert.equal(result.preview.state, 'preview-only');
    assert.equal(result.preview.persisted, false);
    assert.equal(result.dispatch, 'none');
    assert.deepEqual(result.external_effects, []);
    assert.equal(result.persistence, 'none');

    const declared = await (await send({
      base, target,
      environment_requirements: [{ name: 'gravity', status: 'supported', evidence: 'owner declaration' }],
    }, auth)).json();
    assert.equal(declared.report.status, 'unknown');
    assert.equal(declared.report.canCommit, false);

    const spoofed = await send({ base, target, capabilities: ['morph:commit'] }, auth);
    assert.equal(spoofed.status, 400);
    const identityDrift = await send({ base, target: { ...target, identity_ref: 'other' } }, auth);
    assert.equal(identityDrift.status, 400);
    const brokenLineage = await send({ base, target: { ...target, parent_form_id: 'wrong' } }, auth);
    assert.equal(brokenLineage.status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (old === undefined) delete process.env.ARCSWEEP_RUNTIME_TOKEN;
    else process.env.ARCSWEEP_RUNTIME_TOKEN = old;
  }
});
