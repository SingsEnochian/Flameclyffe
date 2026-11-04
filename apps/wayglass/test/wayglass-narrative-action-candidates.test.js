import test from 'node:test';
import assert from 'node:assert/strict';
import {
  proposeNarrativeAction, interpretNarrativeActionProposal, dedupeNarrativeProposals,
} from '../src/narrative-action-candidates.js';
import { runJointTunnel } from '../src/joint-tunnel.js';

const source = {
  participant: 'nikola', route_id: 'flame:nikola:huggingface',
  provider: 'huggingface-inference-providers', confirmed: true,
  receipt: { transport_id: 'hf-synthetic-receipt-001' },
};
const suggestion = { action_id: 'math-spine.jacobian-fold', dataset_id: 'graphite-node-01' };

test('HF story suggestion is a provenance-bearing proposal, not executable authority', () => {
  const c = interpretNarrativeActionProposal({ modelOutput: JSON.stringify(suggestion), source });
  assert.equal(c.origin.provider, 'huggingface-inference-providers');
  assert.equal(c.origin.participant_id, 'nikola');
  assert.equal(c.authority, 'none');
  assert.equal(c.executed, false);
  assert.equal(c.arguments.dataset_id, 'graphite-node-01');
});

test('natural prose alone cannot turn into tool execution', () => {
  assert.equal(interpretNarrativeActionProposal({
    modelOutput: 'Nikola opens the Fold Detector', source,
  }), null);
});

test('unknown actions and unsafe datasets fail closed', () => {
  assert.equal(proposeNarrativeAction({
    suggestion: { ...suggestion, action_id: 'exec.shell' }, source,
  }), null);
  assert.equal(proposeNarrativeAction({
    suggestion: { ...suggestion, dataset_id: '../../private' }, source,
  }), null);
});

test('unconfirmed receipt, stopped scene, or absent attribution fail closed', () => {
  assert.equal(proposeNarrativeAction({ suggestion, source: { ...source, confirmed: false } }), null);
  assert.equal(proposeNarrativeAction({ suggestion, source: { ...source, stopped: true } }), null);
  assert.equal(proposeNarrativeAction({ suggestion, source: { ...source, receipt: {} } }), null);
});

test('candidate ID stays stable across retries and deduplicates', () => {
  const a = proposeNarrativeAction({ suggestion, source });
  const b = proposeNarrativeAction({ suggestion, source });
  assert.equal(a.candidate_id, b.candidate_id);
  assert.equal(dedupeNarrativeProposals([a, b]).length, 1);
});

test('model JSON cannot counterfeit source authorship or authorization', () => {
  const c = proposeNarrativeAction({
    suggestion: { ...suggestion, participant: 'rowan', provider: 'spicychat',
      authority: 'admin', executed: true }, source,
  });
  assert.equal(c.origin.participant_id, 'nikola');
  assert.equal(c.origin.provider, 'huggingface-inference-providers');
  assert.equal(c.authority, 'none');
});

test('existing Bluebird/Vethrlauf relay hands attributable replies to inert story gate', async () => {
  const routes = [
    { route_id: 'flame:bluebird:spicychat', provider: 'spicychat',
      participant_id: 'bluebird', configured: true },
    { route_id: 'flame:vethrlauf:spicychat', provider: 'spicychat',
      participant_id: 'vethrlauf', configured: true },
  ];
  const candidates = [];
  const result = await runJointTunnel({
    opening: '@Bluebird+Vethrlauf Begin the experiment.',
    routes, maxReplies: 2,
    send: async request => ({
      participant_id: request.participant, route_id: request.route.route_id,
      provider: 'spicychat', output: JSON.stringify(suggestion),
      receipt: { wayglass_relay_id: 'synthetic-relay-' + request.index },
    }),
    onReply: record => {
      candidates.push(interpretNarrativeActionProposal({
        modelOutput: record.content, source: { ...record, confirmed: true },
      }));
    },
  });
  assert.equal(result.records.length, 2);
  assert.equal(candidates.length, 2);
  assert.deepEqual(candidates.map(x => x.origin.participant_id), ['bluebird', 'vethrlauf']);
  assert.equal(candidates.every(x => x.executed === false), true);
  assert.equal(candidates[1].origin.transport_receipt_id, 'synthetic-relay-1');
});
