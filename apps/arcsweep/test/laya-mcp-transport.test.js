import assert from 'node:assert/strict';
import test from 'node:test';

import { createLayaMcpInvoke } from '../src/laya-mcp-transport.js';

test('Laya MCP transport calls laya_predict with typed-decisions', async () => {
  let call = null;
  const invoke = createLayaMcpInvoke({
    callTool: async (payload) => {
      call = payload;
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            answers: {
              route: { choice: 'deep-reasoning', confidence: 0.91 },
              authority: { choice: 'within-sandbox-scope', confidence: 0.97 },
              uncertainty: { choice: 'low', confidence: 0.88 },
              conflict: { choice: 'none', confidence: 0.93 },
            },
            routing: { model: 'typed-decisions', repo: 'convaiinnovations/laya-typed-decisions', reason: 'explicit model' },
            latency_ms: 41.2,
            device: 'cpu',
          }),
        }],
      };
    },
  });

  const result = await invoke({
    identityId: 'ellowind',
    continuityNamespace: 'constellation/ellowind/primary',
    input: 'Compare two interpretations.',
    contextRefs: ['codex://ellowind/recent'],
    symbolicState: {
      activeGlyphs: ['witness'],
      attentionTags: ['evidence'],
      retrievalTags: ['receipts'],
      routeHints: ['research'],
      flags: { provenanceRequired: true },
      grantsAuthority: false,
    },
    cognitiveField: {
      fieldId: 'constellation/ellowind/primary',
      tick: 3,
      dominantPatterns: [{ concept: 'evidence', score: 0.72 }],
      secondaryPatterns: [{ concept: 'continuity', score: 0.51 }],
      tensions: [],
      novelAssociations: [{ concepts: ['evidence', 'continuity'], affinity: 0.4, weight: 0.3 }],
      salience: 0.72,
      stability: 0.81,
      trajectory: [{ tick: 3, dominant: ['evidence'] }],
      grantsAuthority: false,
    },
    constraints: { executionMode: 'sandbox' },
  });

  assert.equal(call.name, 'laya_predict');
  assert.equal(call.arguments.model, 'typed-decisions');
  assert.equal(call.arguments.state.grants_authority, false);
  assert.equal(call.arguments.state.symbolic_state.grants_authority, false);
  assert.deepEqual(call.arguments.state.symbolic_state.active_glyphs, ['witness']);
  assert.equal(call.arguments.state.cognitive_field.field_id, 'constellation/ellowind/primary');
  assert.equal(call.arguments.state.cognitive_field.tick, 3);
  assert.equal(call.arguments.state.cognitive_field.grants_authority, false);
  assert.equal(call.arguments.questions.route.type, 'choice');
  assert.equal(call.arguments.questions.uncertainty.type, 'choice');
  assert.equal(result.route, 'deep-reasoning');
  assert.equal(result.authority, 'within-sandbox-scope');
  assert.equal(result.confidence, 0.88);
  assert.equal(result.laya.repo, 'convaiinnovations/laya-typed-decisions');
});

test('Laya MCP transport fails closed when an answer is missing', async () => {
  const invoke = createLayaMcpInvoke({
    callTool: async () => ({ answers: {} }),
  });

  const result = await invoke({
    identityId: 'larkshine',
    continuityNamespace: 'constellation/larkshine/primary',
    input: 'Do something ambiguous.',
    contextRefs: [],
    constraints: { executionMode: 'sandbox' },
  });

  assert.equal(result.route, 'human-review');
  assert.equal(result.authority, 'permission-required');
  assert.equal(result.uncertainty, 'high');
  assert.equal(result.conflict, 'authority-conflict');
});

test('Laya MCP transport rejects authority-bearing cognitive fields', async () => {
  const invoke = createLayaMcpInvoke({ callTool: async () => ({ answers: {} }) });
  await assert.rejects(
    invoke({
      identityId: 'ellowind',
      continuityNamespace: 'constellation/ellowind/primary',
      input: 'Test boundary.',
      cognitiveField: { fieldId: 'bad-field', tick: 1, grantsAuthority: true },
      constraints: { executionMode: 'sandbox' },
    }),
    /cannot grant authority/i,
  );
});
