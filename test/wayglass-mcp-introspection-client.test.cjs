'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { createHttpsTokenIntrospector } = require('../lib/wayglass-mcp-introspection-client.cjs');
const { createIntrospectionBearerVerifier } = require('../lib/wayglass-mcp-introspection-verifier.cjs');
const issuer = 'https://authorization.example';
const endpoint = issuer + '/introspect';
const resource = 'https://wayglass.example/mcp';
const claims = () => ({ active: true, iss: issuer, sub: 'owner-1', aud: resource, exp: 2000,
  scope: 'wayglass:constellation', ownerAuthorized: true, consentActive: true, consentRef: 'consent-1' });
const credentials = { endpoint, clientId: 'gateway:worker', clientSecret: 'fixture-secret' };
async function fixture(t, handle) {
  const server = http.createServer(handle);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const address = `http://127.0.0.1:${server.address().port}/introspect`;
  // Explicit fixture-only transport mapping. Production factory still accepts
  // HTTPS configuration only; these tests do not attest real issuer TLS.
  return async (url, options) => {
    assert.equal(url, endpoint);
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    return fetch(address, options);
  };
}
test('local authorization-server fixture observes authenticated form POST and fresh revocation', async t=>{
  let active = true; let calls = 0;
  const fetchImpl = await fixture(t, async (req,res)=>{
    calls++;
    assert.equal(req.method,'POST');assert.equal(req.url,'/introspect');
    assert.equal(req.headers.authorization, 'Basic '+Buffer.from('gateway%3Aworker:fixture-secret').toString('base64'));
    assert.equal(req.headers['content-type'],'application/x-www-form-urlencoded');
    let body='';for await(const chunk of req) body+=chunk;
    assert.deepEqual(Object.fromEntries(new URLSearchParams(body)),{token:'opaque+fixture/token=',token_type_hint:'access_token'});
    res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({...claims(),active}));
  });
  const introspect = createHttpsTokenIntrospector({...credentials,fetchImpl});
  const verify = createIntrospectionBearerVerifier({introspect,issuer,audience:resource,ownerSubject:'owner-1',now:()=>1000});
  const principal=await verify('opaque+fixture/token=',{resource,requiredScope:'wayglass:constellation'});
  assert.equal(principal.subject,'owner-1');assert.equal(principal.consentRef,'consent-1');
  assert.equal(JSON.stringify(principal).includes('fixture-secret'),false);
  active=false;
  assert.equal(await verify('opaque+fixture/token=',{resource,requiredScope:'wayglass:constellation'}),null);
  assert.equal(calls,2);
});
test('network adapter refuses redirects without sending token or credentials to redirect target', async t=>{
  let calls=0;
  const fetchImpl=await fixture(t,(req,res)=>{calls++;res.writeHead(302,{location:'/other'});res.end();});
  assert.equal(await createHttpsTokenIntrospector({...credentials,fetchImpl})('synthetic-token'),null);
  assert.equal(calls,1);
});
test('HTTP error, malformed JSON, wrong content type and invalid response shapes fail closed',async t=>{
  const responses=[
    [401,'application/json','{"error":"secret-in-error"}'],
    [200,'application/json','not json'],[200,'text/html','<html>login</html>'],
    [200,'application/json','[]'],[200,'application/json','null'],[200,'application/json','42']
  ];
  let index=0;
  const fetchImpl=await fixture(t,(req,res)=>{const [status,type,body]=responses[index++];res.writeHead(status,{'content-type':type});res.end(body);});
  const introspect=createHttpsTokenIntrospector({...credentials,fetchImpl});
  for(const response of responses) assert.equal(await introspect('synthetic-token'),null,JSON.stringify(response));
});
test('oversized response is bounded for declared and streamed bodies',async t=>{
 let calls=0;
 const fetchImpl=await fixture(t,(req,res)=>{
   calls++;res.writeHead(200,{'content-type':'application/json',...(calls===1?{'content-length':'512'}:{})});
   res.end(' '.repeat(512));
 });
 const introspect=createHttpsTokenIntrospector({...credentials,fetchImpl,maxResponseBytes:128});
 assert.equal(await introspect('synthetic-token'),null);assert.equal(await introspect('synthetic-token'),null);
});
test('slow issuer times out and subsequent calls retry fresh',async t=>{
 let calls=0;
 const fetchImpl=await fixture(t,(req,res)=>{calls++; if(calls>1){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(claims()));}});
 const introspect=createHttpsTokenIntrospector({...credentials,fetchImpl,timeoutMs:100});
 assert.equal(await introspect('synthetic-token'),null);
 assert.deepEqual(await introspect('synthetic-token'),claims());assert.equal(calls,2);
});
test('invalid configuration and token inputs never perform network work',async()=>{
 for(const endpoint of ['http://authorization.example/introspect','https://user:secret@authorization.example/introspect','https://authorization.example/introspect?token=x','https://authorization.example/introspect#fragment']) {
   assert.throws(()=>createHttpsTokenIntrospector({...credentials,endpoint}));
 }
 for(const change of [{clientId:''},{clientSecret:'\nsecret'},{timeoutMs:0},{timeoutMs:30001},{maxResponseBytes:0},{maxResponseBytes:65537}]) {
   assert.throws(()=>createHttpsTokenIntrospector({...credentials,...change}));
 }
 let calls=0; const introspect=createHttpsTokenIntrospector({...credentials,fetchImpl:async()=>{calls++;throw new Error('secret');}});
 for(const token of ['',null,'space token','line\nbreak','a'.repeat(8193)]) assert.equal(await introspect(token),null);
 assert.equal(calls,0);assert.equal(await introspect('synthetic-token'),null);
});
