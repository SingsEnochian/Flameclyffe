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
  assert.equal((await fetchGarden('/listen', undefined, false)).status, 401);
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
  const [a,b]=receipt.daughter_ids;
  assert.equal((await fetchGarden('/specialise', {
    cell_id:a,role:'resonance',expected_revision:1,owner_confirmed:true
  },false)).status,401);
  const ra=await fetchGarden('/specialise',{
    cell_id:a,role:'resonance',expected_revision:1,owner_confirmed:true
  });
  assert.equal(ra.status,200);
  const rb=await fetchGarden('/specialise',{
    cell_id:b,role:'observation',expected_revision:2,owner_confirmed:true
  });
  assert.equal(rb.status,200);
  const denied=await fetchGarden('/exchange',{
    from_id:a,to_id:b,message:'local typed observation',expected_revision:3,
    owner_confirmed:true,receiver_route_approved:false
  });
  assert.equal(denied.status,403);
  const sent=await fetchGarden('/exchange',{
    from_id:a,to_id:b,message:'local typed observation',expected_revision:3,
    owner_confirmed:true,receiver_route_approved:true
  });
  assert.equal(sent.status,200);
  const exchange=await sent.json();
  assert.equal(exchange.receipt.acoustic.request.kind,1);
  assert.equal(exchange.receipt.acoustic.reply.kind,2);
  assert.equal(exchange.receipt.acoustic.playback_started,false);
  const fusionResponse=await fetchGarden('/fusion/preview',{
    left_id:a,right_id:b,expected_revision:4
  });
  assert.equal(fusionResponse.status,200);
  const fusion=await fusionResponse.json();
  assert.equal(fusion.status,'proposed-not-committed');
  assert.equal((await fetchGarden('/fusion/commit',{
    proposal_id:fusion.proposal_id,expected_revision:4
  })).status,403);
  const combined=await fetchGarden('/fusion/commit',{
    proposal_id:fusion.proposal_id,expected_revision:4,owner_confirmed:true
  });
  assert.equal(combined.status,200);
  const merged=await combined.json();
  assert.equal(merged.receipt.independent_parents_retained,true);
  assert.equal(merged.culture.cells.filter(c=>c.status==='active').length,3);
  assert.equal((await fetchGarden('/fusion/commit',{
    proposal_id:fusion.proposal_id,expected_revision:5,owner_confirmed:true
  })).status,409);

  const stream = await fetch(origin + '/ship/cell-garden/listen', {
    headers: { authorization: 'Bearer fixture-owner-cell-garden' },
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(stream.status, 200);
  assert.match(stream.headers.get('content-type'), /^text\/event-stream/);
  const reader = stream.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffered = '';
  async function readEvent() {
    while (!buffered.includes('\n\n')) {
      const { done, value } = await reader.read();
      assert.equal(done, false, 'the live stream ended before an event arrived');
      buffered += value;
    }
    const end = buffered.indexOf('\n\n');
    const event = buffered.slice(0, end);
    buffered = buffered.slice(end + 2);
    return event;
  }
  assert.equal(await readEvent(), 'event: ready\ndata: {}');
  const live = await fetchGarden('/exchange', {
    from_id: b, to_id: a, message: 'a fresh exchange', expected_revision: 5,
    owner_confirmed: true, receiver_route_approved: true,
  });
  assert.equal(live.status, 200);
  const committed = (await live.json()).receipt;
  const [eventName, eventData] = (await readEvent()).split('\n');
  assert.equal(eventName, 'event: exchange');
  const payload = JSON.parse(eventData.slice('data: '.length));
  assert.equal(payload.message_id, committed.message_id, 'no historical exchange was replayed');
  assert.equal(payload.revision, 6);
  assert.deepEqual(payload.acoustic, committed.acoustic);
  assert.equal('message' in payload, false);
  assert.equal('wtl' in payload, false);
  const formInput = {cell_id:a,expected_revision:6,owner_confirmed:true};
  assert.equal((await fetchGarden('/form',formInput,false)).status,401);
  const form = await fetchGarden('/form',formInput);
  assert.equal(form.status,200);
  const formResult = await form.json();
  assert.equal(formResult.receipt.decision,'chosen');
  assert.equal(formResult.receipt.cell_id,a);
  assert.equal(formResult.receipt.wtl.phase_receipts.length,8);
  assert.equal((await fetchGarden('/feather', {})).status, 200);
  assert.equal(await readEvent(), 'event: feather\ndata: {}');
  assert.equal((await reader.read()).done, true);
  assert.match(await (await fetchGarden('/listen')).text(), /^event: feather/);
});
