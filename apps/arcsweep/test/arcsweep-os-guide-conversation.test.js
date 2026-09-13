import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCSWEEP_GUIDE_HISTORY_LIMIT,
  createGuideRuntime,
  normaliseGuideHistory,
} from '../src/os/guide-runtime.js';

function shellStub() {
  return {
    allowedCapabilities: () => [],
    request: async () => ({ status: 'applied' }),
  };
}

function contextStub() {
  return {
    session_id: 'conversation-test',
    active_room: 'portal',
    active_world_id: 'terra-aeterna',
    active_project_id: 'arcsweep',
  };
}

test('Guide carries the prior exchange into the next cognitive prompt', async () => {
  const calls = [];
  let replyNumber = 0;
  const runtime = createGuideRuntime({
    shell: shellStub(),
    contextProvider: async () => contextStub(),
    observeTurn: async () => null,
    invokeModel: async (args) => {
      calls.push(args);
      replyNumber += 1;
      return {
        status: 'replied',
        voiceId: 'oxalpha',
        message: JSON.stringify({
          say: replyNumber === 1 ? 'First answer.' : 'Second answer with continuity.',
          request: null,
        }),
        provider: 'openrouter',
        model: 'test-model',
        runtimeVerified: true,
        cognitiveRuntime: true,
        executionPath: 'supabase-edge-to-openrouter',
        memoryCount: 0,
      };
    },
  });

  const first = await runtime.turn('My first question.');
  const second = await runtime.turn('What did I just ask you?');

  assert.match(calls[0].message, /RECENT CONVERSATION:\n\(new conversation\)/);
  assert.equal(calls[0].metadata.recent_conversation_messages, 0);
  assert.match(calls[1].message, /Rowan: My first question\./);
  assert.match(calls[1].message, /Guide: First answer\./);
  assert.equal(calls[1].metadata.recent_conversation_messages, 2);
  assert.equal(first.conversation_messages, 2);
  assert.equal(second.conversation_messages, 4);
  assert.deepEqual(runtime.history(), [
    { role: 'user', content: 'My first question.' },
    { role: 'assistant', content: 'First answer.' },
    { role: 'user', content: 'What did I just ask you?' },
    { role: 'assistant', content: 'Second answer with continuity.' },
  ]);
});

test('Guide recent conversation is bounded and can be cleared without touching promoted learning', async () => {
  const seeded = Array.from({ length: ARCSWEEP_GUIDE_HISTORY_LIMIT + 4 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'user',
    content: `turn-${index}`,
  }));
  const bounded = normaliseGuideHistory(seeded);
  assert.equal(bounded.length, ARCSWEEP_GUIDE_HISTORY_LIMIT);
  assert.equal(bounded[0].content, 'turn-4');

  const runtime = createGuideRuntime({
    shell: shellStub(),
    contextProvider: async () => contextStub(),
    historySeed: bounded,
    observeTurn: async () => null,
    invokeModel: async () => ({
      status: 'replied',
      voiceId: 'oxalpha',
      message: '{"say":"Still here.","request":null}',
      provider: 'openrouter',
      model: 'test-model',
      runtimeVerified: true,
      cognitiveRuntime: true,
      executionPath: 'supabase-edge-to-openrouter',
      memoryCount: 7,
    }),
  });

  assert.equal(runtime.history().length, ARCSWEEP_GUIDE_HISTORY_LIMIT);
  runtime.clearHistory();
  assert.deepEqual(runtime.history(), []);
});
