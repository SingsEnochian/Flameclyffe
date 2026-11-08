'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createWayglassMcpServer } = require('../lib/wayglass-mcp-server.cjs');
const { makeProtectedResourceMetadataHandler } = require('../lib/wayglass-mcp-resource-metadata.cjs');

async function host(options, run) {
  const server = createWayglassMcpServer({
    resourceUrl: 'https://wayglass.example/mcp',
    authorizationServerUrl: 'https://auth.wayglass.example',
    verifyBearer: async token => token === 'allowed' ? {active: true, ownerAuthorized: true,
      subject: 'synthetic-owner', scopes: ['wayglass:constellation'], consentRef: 'consent-test'} : null,
    ...options,
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const send = (method, params) => fetch(base + '/mcp', {method: 'POST', headers: {
    Authorization: 'Bearer allowed', 'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  }, body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params})});
  try { await run({base,send}); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('unbound host catalogue fails closed instead of falling back to global route registry', async () => {
  await host({}, async ({send}) => {
    const result = await (await send('tools/call', {name: 'wayglass_routes'})).json();
    assert.equal(result.error.code, -32603);
    assert.doesNotMatch(JSON.stringify(result), /bluebird|ollama|stepfun/);
  });
});

test('JSON Streamable HTTP supports authenticated ping, initialized acknowledgement and GET refusal', async () => {
  await host({}, async ({base,send}) => {
    assert.deepEqual(await (await send('ping')).json(), {jsonrpc: '2.0', id: 1, result: {}});
    const notification = await fetch(base + '/mcp', {method:'POST',headers:{
      Authorization:'Bearer allowed','Content-Type':'application/json',Accept:'application/json, text/event-stream',
    },body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})});
    assert.equal(notification.status,202);assert.equal(await notification.text(),'');
    const stream = await fetch(base + '/mcp', {headers:{Accept:'text/event-stream'}});
    assert.equal(stream.status,405);assert.equal(stream.headers.get('allow'),'POST');
  });
});

test('host advertises presentation only when bound and forwards trusted context', async () => {
  let observed;
  await host({present: async value => { observed=value;return {receipt_id:'synthetic',wayglass_reply:null};}}, async ({send}) => {
    const list=await (await send('tools/list')).json();
    assert.deepEqual(list.result.tools.map(t=>t.name),['wayglass_routes','wayglass_present']);
    const payload={presentation_id:'synthetic-presentation'};
    const result=await (await send('tools/call',{name:'wayglass_present',arguments:payload})).json();
    assert.equal(JSON.parse(result.result.content[0].text).wayglass_reply,null);
    assert.equal(observed.principal.subject,'synthetic-owner');
    assert.equal(observed.principal.consentRef,'consent-test');
    assert.equal(observed.resource,'https://wayglass.example/mcp');assert.deepEqual(observed.payload,payload);
  });
  await host({}, async ({send}) => {
    const list=await (await send('tools/list')).json();
    assert.deepEqual(list.result.tools.map(t=>t.name),['wayglass_routes']);
  });
});

test('discovery refuses credential-bearing configuration and query aliases', async () => {
  for(const options of [
    {resourceUrl:'https://owner:secret@wayglass.example/mcp',authorizationServerUrl:'https://auth.wayglass.example'},
    {resourceUrl:'https://wayglass.example/mcp',authorizationServerUrl:'https://owner:secret@auth.wayglass.example'},
  ]) assert.throws(()=>makeProtectedResourceMetadataHandler(options),/Invalid resource or issuer/);
  await host({},async({base})=>{
    const response=await fetch(base+'/.well-known/oauth-protected-resource/mcp?token=secret');
    assert.equal(response.status,404);assert.doesNotMatch(await response.text(),/secret/);
  });
});
