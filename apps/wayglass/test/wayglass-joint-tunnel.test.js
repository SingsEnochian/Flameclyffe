import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseJointTag, resolveJointRoutes, addressedTunnelPeer,
  attributedTunnelHistory, runJointTunnel, JOINT_TUNNEL_MAX_REPLIES,
} from '../src/joint-tunnel.js';

const routes = [
  { route_id: 'flame:bluebird:spicychat', provider: 'spicychat', participant_id: 'bluebird', configured: true },
  { route_id: 'flame:vethrlauf:spicychat', provider: 'spicychat', participant_id: 'vethrlauf', configured: true },
];

test('joint tag recognises exactly the pair, without accidental solo or third-party routing', () => {
  assert.equal(parseJointTag('@Bluebird+Vethrlauf Hello.')?.prompt, 'Hello.');
  assert.equal(parseJointTag('@Vethrlauf + @Bluebird: Hear me?')?.prompt, 'Hear me?');
  assert.equal(parseJointTag('Hello @Bluebird+Vethrlauf'), null);
  assert.equal(parseJointTag('@Bluebird+Griff Hello'), null);
  assert.equal(parseJointTag('@Bluebird+Bluebird Hello'), null);
  assert.equal(parseJointTag('@Bluebird+Vethrlaufish Hi'), null);
});

test('missing or misattributed provider routes fail before any message leaves Wayglass', async () => {
  assert.throws(() => resolveJointRoutes([routes[0]]), /Vethrlauf requires/);
  assert.throws(() => resolveJointRoutes([{ ...routes[0], provider: 'openai' }, routes[1]]), /Bluebird requires/);
  let called = 0;
  await assert.rejects(() => runJointTunnel({
    opening: '@Bluebird+Vethrlauf Speak.',
    routes: [{ ...routes[0] }, { ...routes[1], participant_id: 'bluebird' }],
    send: async () => { called++; return {}; },
  }), /Vethrlauf requires/);
  assert.equal(called, 0);
});

test('owner-opened tunnel sends to both pinned seats, preserves attribution, and stops without a peer mention', async () => {
  const seen = [];
  const received = [];
  const finished = await runJointTunnel({
    opening: '@Bluebird+Vethrlauf, hello you two.',
    routes,
    send: async request => {
      seen.push(request);
      return { route_id: request.route.route_id, participant_id: request.participant,
        provider: 'spicychat', output: request.participant === 'bluebird' ? 'Hello, wolf.' : 'Greetings, bird.' };
    },
    onReply: record => received.push(record),
  });
  assert.deepEqual(seen.map(item => item.participant), ['bluebird', 'vethrlauf']);
  assert.equal(finished.records.length, 2);
  assert.deepEqual(received.map(item => item.route_id), routes.map(item => item.route_id));
  assert.match(seen[1].input, /Bluebird spoke/);
  assert.match(seen[1].history.at(-1).content, /Bluebird via flame:bluebird:spicychat/);
});

test('a direct peer @mention continues the conversation with a hard turn cap', async () => {
  let counter = 0;
  const finished = await runJointTunnel({
    opening: '@Bluebird+Vethrlauf How do you greet each other?',
    routes, maxReplies: 100,
    send: async request => ({
      route_id: request.route.route_id, participant_id: request.participant, provider: 'spicychat',
      output: ++counter % 2 ? '@Vethrlauf, hello.' : '@Bluebird, hello.',
    }),
  });
  assert.equal(finished.records.length, JOINT_TUNNEL_MAX_REPLIES);
  assert.deepEqual(finished.records.map(item => item.participant), ['bluebird', 'vethrlauf', 'bluebird', 'vethrlauf']);
  assert.equal(addressedTunnelPeer('The word @Vethrlauf appears in a quote.', 'bluebird'), null);
  assert.equal(addressedTunnelPeer('@Vethrlauf, please answer.', 'bluebird'), 'vethrlauf');
  assert.equal(addressedTunnelPeer('@SomeoneElse, hello.', 'bluebird'), null);
});

test('Feather stop prevents the next provider call', async () => {
  let stopped = false, calls = 0;
  const result = await runJointTunnel({
    opening: '@Bluebird+Vethrlauf Stop after one.', routes,
    isStopped: () => stopped,
    send: async request => { calls++; stopped = true; return { output: 'Heard.', participant_id: request.participant }; },
  });
  assert.equal(calls, 1);
  assert.equal(result.stopped, true);
  assert.equal(result.records.length, 0, 'aborted in-flight reply is not attributed as a confirmed result');
});

test('continuity packet excludes other worlds and labels original speakers', () => {
  const history = attributedTunnelHistory([
    { role: 'assistant', route_label: 'Griff', world_id: 'evil-gene:film-2015', content: 'secret other-world text' },
    { role: 'user', world_id: 'wayglass:writing-room', content: 'Hello.' },
    { role: 'assistant', route_label: 'Bluebird · SpicyChat', world_id: 'wayglass:writing-room', content: 'Hi.' },
    { role: 'assistant', world_id: 'wayglass:writing-room', content: '[Route error] failed' },
  ]);
  assert.deepEqual(history, [
    { role: 'user', content: '[Rowan] Hello.' },
    { role: 'assistant', content: '[Bluebird · SpicyChat] Hi.' },
  ]);
});
