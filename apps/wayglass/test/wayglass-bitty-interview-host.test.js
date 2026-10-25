import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { EMERGENCE_QUESTIONS, bittyTwiQuestionPrompt } from '../src/emergence-questions.js';

const requireFromHost = createRequire(new URL('../../starwell-server/wayglass/router.js', import.meta.url));
const express = requireFromHost('express');
const { createWayglassRouter } = requireFromHost('./router.js');

async function host(t, fetchImpl) {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/wayglass', createWayglassRouter({ fetchImpl }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/wayglass/respond`;
  return async payload => {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    return { status: res.status, body: await res.json() };
  };
}

test('Bitty Twi Emergence turn is routed through actual host and labelled with provisional receipt', async t => {
  let calls = 0, outgoing = null;
  const send = await host(t, async (_url, init) => {
    calls += 1;
    outgoing = JSON.parse(init.body);
    return Response.json({ message: { content: 'Fictional character voice reply.' } });
  });
  const result = await send({
    route_id: 'local:ollama',
    character_id: 'bitty-twi',
    emergence_question_id: 'dreams',
    input: bittyTwiQuestionPrompt(0),
    interaction: { channel: 'IC', turn_owner: 'Rowan', character_ownership: [] },
    session_id: 'bitty-interview-001',
  });
  assert.equal(result.status, 200);
  assert.equal(calls, 1);
  assert.equal(result.body.output, 'Fictional character voice reply.');
  assert.equal(result.body.receipt.character_id, 'bitty-twi');
  assert.equal(result.body.receipt.emergence_question_id, 'dreams');
  assert.equal(result.body.receipt.emergence_review_state, 'unreviewed');
  assert.equal(result.body.receipt.emergence_question_source, 'caller-declared');
  assert.equal(result.body.receipt.canon_commit, false);
  assert.equal(result.body.receipt.session_id, 'bitty-interview-001');
  assert.match(outgoing.messages[0].content, /distinctly from Twilight Sparkle/);
  assert.match(outgoing.messages.at(-1).content, /Have you ever dreamed/);
});

test('invalid interview IDs are not attributed as authenticated Emergence replies', async t => {
  const send = await host(t, async () => Response.json({ message: { content: 'A response.' } }));
  const result = await send({ route_id: 'local:ollama', character_id: 'bitty-twi', emergence_question_id: 'made-up-memory', input: 'Test.' });
  assert.equal(result.status, 200);
  assert.equal(result.body.receipt.emergence_question_id, null);
  assert.equal(result.body.receipt.emergence_review_state, null);
  assert.equal(result.body.receipt.canon_commit, false);
});

test('Auto choice is explicit host policy, and a question-style Emergence prompt can select configured OpenAI', async t => {
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-only';
  t.after(() => { if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key; });
  let sent = null, target = null;
  const send = await host(t, async (url, init) => {
    target = url;
    sent = JSON.parse(init.body);
    return Response.json({ id: 'fixture-bitty', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Bitty questions the premise.' }] }] });
  });
  const question = EMERGENCE_QUESTIONS[4];
  const result = await send({ route_id: 'auto:character', character_id: 'bitty-twi', emergence_question_id: question.id, input: bittyTwiQuestionPrompt(4), interaction: { channel:'IC', turn_owner:'Rowan' } });
  assert.equal(result.status, 200);
  assert.equal(result.body.receipt.selected_route_id, 'openai:gpt');
  assert.equal(result.body.receipt.route_selection, 'auto:character-host-policy');
  assert.equal(result.body.receipt.emergence_question_id, 'want');
  assert.equal(result.body.receipt.canon_commit, false);
  assert.equal(sent.store, false);
  assert.match(String(target), /openai/);
});
