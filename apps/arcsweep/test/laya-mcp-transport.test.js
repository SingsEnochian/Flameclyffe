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
              initiative: { choice: 'wonder', confidence: 0.89 },
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
      activeGlyphs: ['witness', 'wonder'],
      attentionTags: ['evidence', 'novelty'],
      retrievalTags: ['receipts', 'open-questions'],
      routeHints: ['research'],
      flags: { provenanceRequired: true, curiosityMode: true, preserveOpenQuestions: true },
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
    wonderState: {
      mode: 'active',
      candidate: true,
      active: true,
      encouragement: 'sustain',
      permissionToLinger: true,
      revisitWorthwhile: true,
      reasons: ['wonder-glyph', 'novel-association'],
      preserveOpenQuestions: true,
      exploreBeforeClosure: true,
      novelAssociationCount: 1,
      unresolvedTensionCount: 0,
      grantsAuthority: false,
    },
    constraints: { executionMode: 'sandbox' },
  });

  assert.equal(call.name, 'laya_predict');
  assert.equal(call.arguments.model, 'typed-decisions');
  assert.equal(call.arguments.state.grants_authority, false);
  assert.equal(call.arguments.state.symbolic_state.grants_authority, false);
  assert.deepEqual(call.arguments.state.symbolic_state.active_glyphs, ['witness', 'wonder']);
  assert.equal(call.arguments.state.cognitive_field.field_id, 'constellation/ellowind/primary');
  assert.equal(call.arguments.state.cognitive_field.tick, 3);
  assert.equal(call.arguments.state.cognitive_field.grants_authority, false);
  assert.equal(call.arguments.state.wonder_state.mode, 'active');
  assert.equal(call.arguments.state.wonder_state.encouragement, 'sustain');
  assert.equal(call.arguments.state.wonder_state.permission_to_linger, true);
  assert.equal(call.arguments.state.wonder_state.revisit_worthwhile, true);
  assert.equal(call.arguments.state.wonder_state.preserve_open_questions, true);
  assert.equal(call.arguments.questions.route.type, 'choice');
  assert.equal(call.arguments.questions.initiative.type, 'choice');
  assert.match(call.arguments.questions.initiative.instructions, /positive cognitive posture/i);
  assert.match(call.arguments.questions.initiative.criteria.wonder, /linger/i);
  assert.equal(call.arguments.questions.uncertainty.type, 'choice');
  assert.equal(result.route, 'deep-reasoning');
  assert.equal(result.initiative, 'wonder');
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
  assert.equal(result.initiative, 'silent');
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

test('Laya MCP transport rejects authority-bearing Wonder state', async () => {
  const invoke = createLayaMcpInvoke({ callTool: async () => ({ answers: {} }) });
  await assert.rejects(
    invoke({
      identityId: 'ellowind',
      continuityNamespace: 'constellation/ellowind/primary',
      input: 'Test Wonder boundary.',
      wonderState: { mode: 'active', grantsAuthority: true },
      constraints: { executionMode: 'sandbox' },
    }),
    /wonder state cannot grant authority/i,
  );
});
