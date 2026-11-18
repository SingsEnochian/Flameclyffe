'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { createWayglassRouter } = require('../wayglass/router');
const { createCellGarden } = require('../../../lib/wayglass-cell-mitosis.cjs');

test('House-authenticated cell garden only divides after a separate explicit approval', async t => {
  const before = process.env.ARCSWEEP_RUNTIME_TOKEN;
  process.env.ARCSWEEP_RUNTIME_TOKEN = 'fixture-owner-cell-garden';
  t.after(() => {
    if (before === undefined) delete process.env.ARCSWEEP_RUNTIME_TOKEN;
    else process.env.ARCSWEEP_RUNTIME_TOKEN = before;
  });
  const app = express();
  app.use(express.json());
  app.use('/ship', createWayglassRouter({ cellGarden: createCellGarden({ maxActive: 3 }) }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => {
    server.closeAllConnections();
    server.close(resolve);
  }));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const fetchGarden = (endpoint, body, authorised = true) => fetch(
    origin + '/ship/cell-garden' + endpoint,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(authorised ? { authorization: 'Bearer fixture-owner-cell-garden' } : {}),
        'content-type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }
  );
  assert.equal((await fetchGarden('', undefined, false)).status, 401);
  assert.equal((await fetchGarden('/preview', { cell_id: 'cell:origin', expected_revision: 0 }, false)).status, 401);
  const beforeCulture = await (await fetchGarden('')).json();
  assert.equal(beforeCulture.cells.length, 1);
  const proposalResponse = await fetchGarden('/preview', { cell_id: 'cell:origin', expected_revision: 0 });
  assert.equal(proposalResponse.status, 200);
  const proposal = await proposalResponse.json();
  assert.equal(proposal.status, 'proposed-not-committed');
  assert.equal((await fetchGarden('/commit', {
    proposal_id: proposal.proposal_id, expected_revision: 0,
  })).status, 403);
  const approved = await fetchGarden('/commit', {
    proposal_id: proposal.proposal_id, expected_revision: 0, owner_confirmed: true,
  });
  assert.equal(approved.status, 200);
  const { receipt, culture } = await approved.json();
  assert.equal(receipt.status, 'committed-in-memory');
  assert.equal(culture.cells.filter(cell => cell.status === 'active').length, 2);
  assert.equal((await fetchGarden('/commit', {
    proposal_id: proposal.proposal_id, expected_revision: 1, owner_confirmed: true,
  })).status, 409);
  assert.equal((await fetchGarden('/feather', {})).status, 200);
  assert.equal((await fetchGarden('/preview', {
    cell_id: receipt.daughter_ids[0], expected_revision: 1,
  })).status, 409);
  assert.equal((await fetchGarden('/resume', {})).status, 403);
  assert.equal((await fetchGarden('/resume', { owner_confirmed: true })).status, 200);
});
