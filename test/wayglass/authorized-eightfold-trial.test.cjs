'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');

const SCHEMA = 'wayglass.authorized-crossing/v1';
const PRESENTATION_ID = 'synthetic-eightfold-trial-001';
const RECEIPT_ID = '11111111-1111-4111-8111-111111111111';
const fakeJwt = [
  'eyJhbGciOiJIUzI1NiJ9',
  'eyJzdWIiOiJzeW50aGV0aWMtb3duZXIifQ',
  'SYNTHETIC_FIXTURE_NOT_A_REAL_TOKEN_123456789',
].join('.');

async function mod() {
  return import('../../scripts/wayglass-authorized-eightfold-trial.mjs');
}
async function fixture() {
  const { PHASE_NAMES } = await mod();
  return {
    presentation_id: PRESENTATION_ID,
    source_ref: 'fixture:private-story-not-transferred-to-real-provider',
    intent: 'Synthetic Eightfold contract test, no actual fictional character data',
    presentation: {
      eightfold: PHASE_NAMES.map((name, i) =>
        ({ name, index: i + 1, brief: 'Synthetic phase ' + (i + 1) })),
    },
  };
}
const reply = {
  kind: 'attributable-external-model-output',
  provider: 'test-provider',
  model: 'test-model',
  text: 'SYNTHETIC_OUTPUT_NOT_A_WAYGLASS_VOICE',
  provider_response_id: 'synthetic-provider-response-id',
  review_domain: 'engineering',
  completed_at: '2026-11-08T00:00:00Z',
};

function successfulFetch(requests, scenario = {}) {
  const emittedReply = { ...reply, review_domain: scenario.reviewDomain || 'engineering' };
  return async (url, options) => {
    requests.push({
      url,
      method: options.method,
      redirect: options.redirect,
      authorization: options.headers.authorization,
      body: options.body ? JSON.parse(options.body) : null,
    });
    assert.equal(options.redirect, 'manual');
    assert.ok(url.startsWith('https://rufrmjyusalnifpegllj.supabase.co/functions/v1/wayglass-authorized-crossing'));
    assert.equal(options.headers.authorization, 'Bearer ' + fakeJwt);
    if (options.method === 'GET' && !url.includes('receipt_id=')) {
      return Response.json({
        schema: SCHEMA, ready: true, owner: true, model_available: true,
        receipt_store: 'configured',
      }, { status: 200 });
    }
    if (options.method === 'POST') {
      if (JSON.parse(options.body).action === 'present') {
        return Response.json({
          schema: SCHEMA, receipt_id: RECEIPT_ID, status: 'queued',
        }, { status: 201 });
      }
      if (JSON.parse(options.body).action === 'review') {
        return Response.json({
          schema: SCHEMA, receipt_id: RECEIPT_ID, status: 'responded',
          reply: scenario.changedDuringReadback
            ? { ...emittedReply, text: 'one answer' } : emittedReply,
        }, { status: 200 });
      }
    }
    if (options.method === 'GET' && url.includes('receipt_id=')) {
      return Response.json({
        schema: SCHEMA,
        receipt: {
          receipt_id: RECEIPT_ID,
          source_ref: 'fixture:private-story-not-transferred-to-real-provider',
          presentation_id: PRESENTATION_ID,
          status: 'responded',
          model_reply: scenario.changedDuringReadback
            ? { ...emittedReply, text: 'another answer' } : emittedReply,
        },
      }, { status: 200 });
    }
    throw new Error('Unexpected synthetic HTTP request');
  };
}

test('Eightfold validates exact count/order and refuses a reordered or incomplete phase', async () => {
  const { validatePresentation } = await mod();
  const packet = await fixture();
  assert.equal(validatePresentation(packet), packet);
  for (const failure of ['missing', 'swap', 'duplicate', 'wrong-index']) {
    const broken = structuredClone(packet);
    const phases = broken.presentation.eightfold;
    if (failure === 'missing') phases.pop();
    if (failure === 'swap') [phases[2], phases[3]] = [phases[3], phases[2]];
    if (failure === 'duplicate') phases[3] = { ...phases[2] };
    if (failure === 'wrong-index') phases[4].index = 7;
    assert.throws(() => validatePresentation(broken), /Wayglass Eightfold:/, failure);
  }
});

test('rejects absent owner JWT and consent before any network request', async () => {
  const { runEightfoldTrial } = await mod();
  const packet = await fixture();
  let attempts = 0;
  const fakeFetch = async () => { attempts++; throw Error('should not fetch'); };
  await assert.rejects(runEightfoldTrial(packet, {
    token: 'short-key', consent: true, fetchImpl: fakeFetch,
  }), /owner JWT required/);
  await assert.rejects(runEightfoldTrial(packet, {
    token: fakeJwt, consent: false, fetchImpl: fakeFetch,
  }), /provider consent required/);
  assert.equal(attempts, 0);
});

test('readiness and owner scope are required before posting private presentation', async () => {
  const { runEightfoldTrial } = await mod();
  const packet = await fixture();
  for (const status of ['no-owner', 'no-provider', 'invalid-session', 'feather-stop']) {
    let calls = 0;
    const fakeFetch = async (_url, options) => {
      calls++;
      assert.equal(options.method, 'GET');
      if (status === 'invalid-session') {
        return Response.json({ schema: SCHEMA, error: 'authentication-required' }, { status: 401 });
      }
      if (status === 'feather-stop') {
        return Response.json({ schema: SCHEMA, error: 'authorization-required-or-feather' }, { status: 403 });
      }
      return Response.json({
        schema: SCHEMA, ready: true,
        owner: status === 'no-provider',
        model_available: status === 'no-owner',
        receipt_store: 'configured',
      });
    };
    await assert.rejects(runEightfoldTrial(packet, {
      token: fakeJwt, consent: true, fetchImpl: fakeFetch,
    }), /Wayglass Eightfold:/);
    assert.equal(calls, 1, status);
  }
});

test('authenticated trial performs ready → queued → review → readback and checks attribution', async () => {
  const { runEightfoldTrial, CROSSING_URL } = await mod();
  const requests = [];
  const result = await runEightfoldTrial(await fixture(), {
    token: fakeJwt, consent: true, fetchImpl: successfulFetch(requests),
  });
  assert.equal(result.state, 'external-model-response-verified');
  assert.equal(result.provider, 'test-provider');
  assert.equal(result.model, 'test-model');
  assert.equal(result.provider_response_id, reply.provider_response_id);
  assert.equal(result.output, reply.text);
  assert.equal(result.canon_commit, false);
  assert.equal(result.model_route_is_wayglass_identity, false);
  assert.deepEqual(requests.map(r => [r.method, r.body?.action || null]),
    [['GET', null], ['POST', 'present'], ['POST', 'review'], ['GET', null]]);
  assert.equal(requests[1].url, CROSSING_URL);
  assert.deepEqual(requests[1].body.presentation.eightfold.map(p => p.name),
    ['Perceive','Compress','Release','Verify','Integrate','Choose','Return','Transcend']);
  assert.equal(requests[2].body.external_provider_consent, true);
  assert.equal(requests[3].url, CROSSING_URL + '?receipt_id=' + RECEIPT_ID);
});

test('rejects substitution of reply text between provider response and persistent readback', async () => {
  const { runEightfoldTrial } = await mod();
  await assert.rejects(runEightfoldTrial(await fixture(), {
    token: fakeJwt, consent: true, fetchImpl: successfulFetch([], { changedDuringReadback: true }),
  }), /provider output changed/);
});

test('rejects invented, empty, or unpersisted model replies', async () => {
  const { runEightfoldTrial } = await mod();
  const packet = await fixture();
  const requests = [];
  const baseFetch = successfulFetch(requests);
  const fetchImpl = async (url, options) => {
    const result = await baseFetch(url, options);
    if (options.method === 'GET' && url.includes('receipt_id=')) {
      const body = await result.json();
      body.receipt.model_reply = null;
      return Response.json(body);
    }
    return result;
  };
  await assert.rejects(runEightfoldTrial(packet, {
    token: fakeJwt, consent: true, fetchImpl,
  }), /no attributable persisted external model text/);
});

test('host redirects fail closed instead of forwarding bearer to another origin', async () => {
  const { runEightfoldTrial } = await mod();
  let called = 0;
  const fakeFetch = async (_url, options) => {
    called++;
    assert.equal(options.redirect, 'manual');
    return new Response(null, { status: 302, headers: { Location: 'https://invalid.example/steal' } });
  };
  await assert.rejects(runEightfoldTrial(await fixture(), {
    token: fakeJwt, consent: true, fetchImpl: fakeFetch,
  }), /HTTP 302/);
  assert.equal(called, 1);
});

test('Sihrel narrative packet must return the narrative domain, never engineering review', async () => {
  const { runEightfoldTrial } = await mod();
  const packet = await fixture();
  packet.presentation.schema = 'wayglass.sihrel.divergence-study/v0.1';
  packet.presentation.study_type = 'counterfactual-narrative-causal-simulation';
  const requests = [];
  const result = await runEightfoldTrial(packet, {
    token: fakeJwt, consent: true,
    fetchImpl: successfulFetch(requests, { reviewDomain: 'narrative-branch' }),
  });
  assert.equal(result.review_domain, 'narrative-branch');
  assert.equal(result.canon_commit, false);
  assert.equal(requests[2].body.action, 'review');
  await assert.rejects(runEightfoldTrial(packet, {
    token: fakeJwt, consent: true,
    fetchImpl: successfulFetch([]),
  }), /returned review domain does not match/);
});
