import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveWayglassCirculationUrl, requestWayglassCloudCirculation
} from '../src/route-client.js';

const endpoint = 'https://example.supabase.co/functions/v1/wayglass-cloud-circulation';
test('cloud circulation URL derives only from an exact deployed function sibling', () => {
  assert.equal(resolveWayglassCirculationUrl({
    hostedFunctionUrl: 'https://example.supabase.co/functions/v1/wayglass-hosted-relay'
  }), endpoint);
  assert.equal(resolveWayglassCirculationUrl({
    supabaseUrl: 'https://example.supabase.co'
  }), endpoint);
  assert.throws(() => resolveWayglassCirculationUrl({
    hostedFunctionUrl: 'https://example.supabase.co/functions/v1/unrelated'
  }), /cannot identify/);
});
test('owner-authenticated cloud pulse preserves real model and cell receipts', async () => {
  let seen;
  const receipt = {
    schema: 'wayglass.cloud-circulation/v0.1',
    receipt_id: 'receipt:test', cells: [{cell:'sensory',status:'observed',count:3},
      {cell:'cognition',status:'model-responded'},{cell:'memory',status:'returned-unpersisted'}],
    reply: {text:'One next test',provider:'openrouter',model:'test-model'},
  };
  const result = await requestWayglassCloudCirculation({
    endpoint, getToken: async () => 'synthetic-test-token',
    action: 'pulse', message: 'Inspect evidence',
    fetchImpl: async (url, options) => {
      seen = {url,options};
      return {ok:true,status:200,json:async()=>receipt};
    },
  });
  assert.equal(result.reply.text,'One next test');
  assert.equal(seen.url, endpoint);
  assert.equal(seen.options.headers.Authorization,'Bearer synthetic-test-token');
  assert.deepEqual(JSON.parse(seen.options.body),
    {action:'pulse',message:'Inspect evidence'});
});
test('owner session is required and no unauthenticated request is sent', async () => {
  let sent = false;
  await assert.rejects(requestWayglassCloudCirculation({
    endpoint, getToken:async()=>null,
    fetchImpl:async()=>{sent=true;}
  }),/Sign in as the Wayglass owner/);
  assert.equal(sent,false);
});
test('server failure returns explicit receipt, never fabricated success', async () => {
  const failed = {
    schema:'wayglass.cloud-circulation/v0.1',receipt_id:'receipt:failed',
    cells:[{cell:'cognition',status:'failed',error:'model-provider-not-configured'}],
  };
  await assert.rejects(requestWayglassCloudCirculation({
    endpoint,getToken:async()=> 'test-token',
    fetchImpl:async()=>({ok:false,status:503,json:async()=>failed}),
  }),error=>error.status===503 && error.receipt?.receipt_id==='receipt:failed');
});
test('no model output means no verified cloud turn', async () => {
  await assert.rejects(requestWayglassCloudCirculation({
    endpoint,getToken:async()=> 'test-token',
    fetchImpl:async()=>({ok:true,status:200,json:async()=>({
      schema:'wayglass.cloud-circulation/v0.1',cells:[],reply:null
    })}),
  }),/did not return a verifiable model/);
});
