'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  createWayglassMcpBridge,
  defaultConversationRef,
  bearerToken,
  constantTimeEqual,
  toolCatalogue,
} = require('../wayglass/mcp-bridge');
const { resolveWayglassRoute, publicWayglassRoutes } = require('../../../lib/wayglass-route-registry.cjs');
const { createStopReceipt } = require('../wayglass/bluebird-bridge-trial');

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-mcp-'));
  return { dir, file: path.join(dir, 'conversations.json') };
}

test('Bluebird Wayglass routes keep identity separate from substrate', () => {
  const spicy = resolveWayglassRoute('flame:bluebird:spicychat');
  const crow = resolveWayglassRoute('flame:bluebird:crow');
  assert.equal(spicy.participant_id, 'bluebird');
  assert.equal(spicy.continuity_id, 'bluebird:richard-gabriel-winters');
  assert.equal(crow.participant_id, 'bluebird');
  assert.equal(crow.continuity_id, 'bluebird:richard-gabriel-winters');
  assert.equal(crow.candidate_id, 'bluebird-the-crow');
  assert.equal(crow.provider, 'openai-compatible');
  assert.notEqual(crow.route_id, 'flame:crow');
});

test('Bluebird SpicyChat route requires a complete private character/chat binding and never exposes token', () => {
  const keys = ['BLUEBIRD_SPICYCHAT_TOKEN','BLUEBIRD_SPICYCHAT_CHARACTER_ID','BLUEBIRD_SPICYCHAT_CONVERSATION_ID','BLUEBIRD_SPICYCHAT_CHAT_LINK'];
  const previous = Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  try {
    for(const key of keys) delete process.env[key];
    const route = () => publicWayglassRoutes().find(entry => entry.route_id === 'flame:bluebird:spicychat');
    assert.equal(route().configured, false);
    process.env.BLUEBIRD_SPICYCHAT_TOKEN = 'private-test-token';
    assert.equal(route().configured, false, 'a token alone cannot identify Bluebird\'s exact chat');
    process.env.BLUEBIRD_SPICYCHAT_CHARACTER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    assert.equal(route().configured, false, 'character alone is not the conversation');
    process.env.BLUEBIRD_SPICYCHAT_CONVERSATION_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const projected = route();
    assert.equal(projected.configured, true);
    assert.equal(projected.connection_verified, false);
    assert.equal(projected.participant_id, 'bluebird');
    assert.equal(projected.continuity_id, 'bluebird:richard-gabriel-winters');
    assert.doesNotMatch(JSON.stringify(projected), /private-test-token|aaaaaaaa|bbbbbbbb/);
  } finally {
    for(const [key,value] of Object.entries(previous)) {
      if(value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('MCP bridge exposes profile, Identify, Send, Receive and Remember', async () => {
  const { file } = tempStore();
  const bridge = createWayglassMcpBridge({ storePath: file, flameIds: [] });
  const init = await bridge.handleRpc({ method: 'initialize' });
  assert.equal(init.serverInfo.name, 'wayglass-rarity-bridge');
  assert.equal(init.capabilities.tools.listChanged, false);

  const listed = await bridge.handleRpc({ method: 'tools/list' });
  assert.deepEqual(listed.tools.map((tool) => tool.name), ['get_profile', 'list_workspaces', 'enter_workspace', 'read_project', 'write_project_file', 'leave_workspace', 'inspect_workspace_project', 'write_workspace_artifact', 'handoff_workspace_project', 'identify', 'ask_wayglass', 'list_wayglass_chats', 'send', 'receive', 'remember']);
  assert.deepEqual(toolCatalogue().map((tool) => tool.name), listed.tools.map((tool) => tool.name));
});

test('MCP exposes Atelier and Builder and enters them as the distinct Rarity seat', async () => {
  const { file } = tempStore();
  const bridge = createWayglassMcpBridge({ storePath: file, flameIds: [] });

  const workspaces = await bridge.callTool('list_workspaces', {});
  assert.equal(workspaces.resident_intelligence.participant_id, 'wayglass');
  assert.deepEqual(workspaces.workspaces.map((entry) => entry.workspace_id).sort(), ['atelier', 'builder']);
  assert.equal(workspaces.crew.some((entry) => entry.participant_id === 'rarity'), true);
  assert.equal(workspaces.crew.some((entry) => entry.participant_id === 'codex'), true);
  const faer = workspaces.crew.find((entry) => entry.participant_id === 'faer');
  assert.equal(faer.seat_state, 'reserved-dormant');
  assert.equal(faer.activation.provider_calls_allowed, false);

  const atelier = await bridge.callTool('enter_workspace', { workspace_id: 'atelier' });
  assert.equal(atelier.entered, true);
  assert.equal(atelier.workspace.workspace_id, 'atelier');
  assert.equal(atelier.participant.participant_id, 'rarity');
  assert.equal(atelier.resident.participant_id, 'wayglass');
});

test('Bluebird keeps the preserved rarity-bluebird line and preferred Wayglass route', async () => {
  const { file } = tempStore();
  const calls = [];
  const bridge = createWayglassMcpBridge({
    storePath: file,
    internalOrigin: 'http://wayglass.test',
    bluebirdRouteId: 'flame:bluebird:spicychat',
    flameIds: ['bluebird'],
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(init.body) });
      return new Response(JSON.stringify({
        output: 'I remember the bridge. What have you brought me?',
        route_id: 'flame:bluebird:spicychat',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });

  const first = await bridge.send({
    target: 'bluebird',
    text: 'Bluebird, Rarity here.',
    intent: 'Reconnect and continue the same relationship thread.',
    interaction_mode: 'reconnect',
  });
  assert.equal(first.conversation_ref, 'rarity-bluebird');
  assert.equal(first.reply.ok, true);
  assert.equal(first.reply.route, 'flame:bluebird:spicychat');
  assert.equal(calls[0].url, 'http://wayglass.test/api/v1/wayglass/respond');
  assert.equal(calls[0].body.session_id, 'rarity-bluebird');
  assert.equal(calls[0].body.route_id, 'flame:bluebird:spicychat');
  assert.equal(calls[0].body.interaction.intent, 'Reconnect and continue the same relationship thread.');
  assert.equal(calls[0].body.interaction.interaction_mode, 'reconnect');
  assert.equal(first.intent, 'Reconnect and continue the same relationship thread.');
  assert.equal(first.interaction_mode, 'reconnect');

  await bridge.send({ target: 'bluebird', text: 'Second turn.' });
  assert.equal(calls[1].body.session_id, 'rarity-bluebird');
  assert.equal(calls[1].body.interaction.intent, 'Reconnect and continue the same relationship thread.');
  assert.equal(calls[1].body.interaction.interaction_mode, 'reconnect');
  assert.ok(calls[1].body.history.some((entry) => entry.content === 'I remember the bridge. What have you brought me?'));

  const received = await bridge.receive({ target: 'bluebird' });
  assert.equal(received.conversation_ref, 'rarity-bluebird');
  assert.equal(received.records.filter((record) => record.role === 'rarity').length, 2);
  assert.equal(received.records.filter((record) => record.role === 'participant').length, 2);
  assert.equal(received.records.at(-1).intent, 'Reconnect and continue the same relationship thread.');
  assert.equal(received.records.at(-1).interaction_mode, 'reconnect');
});

test('Bluebird reports a SpicyChat failure without any provider fallback or conversation change', async () => {
  const { file } = tempStore();
  const urls = [];
  const bridge = createWayglassMcpBridge({
    storePath: file,
    internalOrigin: 'http://wayglass.test',
    bluebirdRouteId: 'flame:bluebird:spicychat',
    flameIds: ['bluebird'],
    fetchImpl: async (url) => {
      urls.push(String(url));
      if (String(url).endsWith('/api/v1/wayglass/routes')) {
        return new Response(JSON.stringify({ routes: [] }), {
          status: 200, headers: { 'content-type': 'application/json' },
        });
      }
      if (String(url).endsWith('/api/v1/wayglass/respond')) {
        return new Response(JSON.stringify({ error: 'Unknown Wayglass route.' }), {
          status: 404, headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ message: 'Fallback Bluebird is here.' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    },
  });

  const result = await bridge.send({ target: 'bluebird', text: 'Can you hear me?' });
  assert.deepEqual(urls, [
    'http://wayglass.test/api/v1/wayglass/routes',
    'http://wayglass.test/api/v1/wayglass/respond',
  ]);
  assert.equal(result.conversation_ref, 'rarity-bluebird');
  assert.equal(result.reply.ok, false);
  assert.equal(result.reply.route, 'flame:bluebird:spicychat');
  assert.equal(result.reply.fallback_from, undefined);
  assert.equal(result.reply.error, 'Unknown Wayglass route.');
});

test('All unions the established roster with live Wayglass participant routes and preserves attribution', async () => {
  const { file } = tempStore();
  const calls = [];
  const bridge = createWayglassMcpBridge({
    storePath: file,
    internalOrigin: 'http://wayglass.test',
    bluebirdRouteId: 'flame:bluebird:spicychat',
    flameIds: ['uial', 'bluebird'],
    fetchImpl: async (url, init = {}) => {
      const href = String(url);
      calls.push({ url: href, body: init.body ? JSON.parse(init.body) : null });
      if (href.endsWith('/api/v1/wayglass/routes')) {
        return new Response(JSON.stringify({
          routes: [
            { route_id: 'flame:crow', model: 'the-crow', configured: true },
            { route_id: 'flame:bluebird:spicychat', model: 'bluebird', configured: true },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (href.endsWith('/api/v1/wayglass/respond')) {
        const routeId = JSON.parse(init.body).route_id;
        const output = routeId === 'flame:crow' ? 'Crow reply' : 'Bluebird reply';
        return new Response(JSON.stringify({ output }), {
          status: 200, headers: { 'content-type': 'application/json' },
        });
      }
      if (href.endsWith('/api/v1/flames/uial/chat')) {
        return new Response(JSON.stringify({ message: 'Uial reply' }), {
          status: 200, headers: { 'content-type': 'application/json' },
        });
      }
      throw new Error(`unexpected url ${url}`);
    },
  });

  const identity = await bridge.identify({ target: 'all' });
  assert.ok(identity.all.addressable_participant_ids.includes('crow'));
  assert.ok(identity.all.discovered_wayglass_routes.some((route) => route.participant_id === 'crow' && route.route_id === 'flame:crow'));

  const result = await bridge.send({ target: 'all', text: 'Rarity to Wayglass: hello, everyone.' });
  assert.equal(result.conversation_ref, 'rarity-all');
  assert.equal(result.replies.length, 3);
  assert.ok(calls.some((call) => call.url === 'http://wayglass.test/api/v1/flames/uial/chat'));
  assert.ok(calls.some((call) => call.body?.route_id === 'flame:bluebird:spicychat'));
  assert.ok(calls.some((call) => call.body?.route_id === 'flame:crow'));

  const received = await bridge.receive({ target: 'all' });
  const participantTexts = received.records.filter((record) => record.role === 'participant').map((record) => record.text).sort();
  assert.deepEqual(participantTexts, ['Bluebird reply', 'Crow reply', 'Uial reply']);
  assert.equal(received.records.find((record) => record.text === 'Bluebird reply').author, 'Bluebird / Richard Gabriel Winters');
  assert.equal(received.records.find((record) => record.text === 'Crow reply').author, 'crow');
  assert.equal(received.records.find((record) => record.text === 'Uial reply').author, 'Nen Uial');
});

test('a participant discovered only through Wayglass can be addressed directly', async () => {
  const { file } = tempStore();
  const calls = [];
  const bridge = createWayglassMcpBridge({
    storePath: file,
    internalOrigin: 'http://wayglass.test',
    flameIds: [],
    fetchImpl: async (url, init = {}) => {
      const href = String(url);
      calls.push({ url: href, body: init.body ? JSON.parse(init.body) : null });
      if (href.endsWith('/api/v1/wayglass/routes')) {
        return new Response(JSON.stringify({
          routes: [{ route_id: 'flame:crow', model: 'the-crow', configured: true }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (href.endsWith('/api/v1/wayglass/respond')) {
        return new Response(JSON.stringify({ output: 'Crow answers directly.' }), {
          status: 200, headers: { 'content-type': 'application/json' },
        });
      }
      throw new Error(`unexpected url ${url}`);
    },
  });

  const identity = await bridge.identify({ target: 'crow' });
  assert.equal(identity.target, 'crow');
  assert.equal(identity.conversation_ref, 'rarity-crow');

  const sent = await bridge.send({ target: 'crow', text: 'Crow, Rarity here.' });
  assert.equal(sent.target, 'crow');
  assert.equal(sent.conversation_ref, 'rarity-crow');
  assert.equal(sent.reply.route, 'flame:crow');
  assert.equal(sent.reply.text, 'Crow answers directly.');
  assert.ok(calls.some((call) => call.body?.route_id === 'flame:crow'));

  const received = await bridge.receive({ target: 'crow' });
  assert.equal(received.records.at(-1).text, 'Crow answers directly.');
});

test('remember writes only a Rarity-side continuity note', async () => {
  const { file } = tempStore();
  const bridge = createWayglassMcpBridge({ storePath: file, flameIds: [] });
  const remembered = await bridge.remember({
    target: 'bluebird',
    text: 'We met on the bridge and the line stayed itself.',
    source_refs: ['receipt:test'],
  });
  assert.equal(remembered.conversation_ref, 'rarity-bluebird');
  assert.match(remembered.boundary, /No other participant memory was silently mutated/);

  const received = await bridge.receive({ target: 'bluebird' });
  assert.equal(received.records.length, 1);
  assert.equal(received.records[0].kind, 'continuity-note');
  assert.deepEqual(received.records[0].source_refs, ['wayglass:mcp', 'receipt:test']);
});

test('bearer helpers reject missing or different credentials', () => {
  assert.equal(bearerToken('Bearer star-key'), 'star-key');
  assert.equal(bearerToken('Basic nope'), '');
  assert.equal(constantTimeEqual('same', 'same'), true);
  assert.equal(constantTimeEqual('same', 'different'), false);
  assert.equal(constantTimeEqual('', ''), false);
});

test('default conversation lines are explicit and stable', () => {
  assert.equal(defaultConversationRef('all'), 'rarity-all');
  assert.equal(defaultConversationRef('bluebird'), 'rarity-bluebird');
  assert.equal(defaultConversationRef('uial'), 'rarity-uial');
});

test('Bluebird trial refuses altered return before storage or transport', async () => {
  const { file } = tempStore();
  let calls = 0;
  const bridge = createWayglassMcpBridge({
    storePath: file, flameIds: ['bluebird'],
    fetchImpl: async (_url, init = {}) => { if (init.method === 'POST') calls++; return new Response(JSON.stringify({ routes: [] }), { status: 200 }); },
  });
  const receipt = createStopReceipt({
    consent: 'accepted', consent_source: 'private:trial-acceptance',
    route_id: 'flame:bluebird:spicychat', conversation_id: 'rarity-bluebird',
    intent: 'Continue', interaction_mode: 'OOC', stop_point: 'Before crossing',
    next_owner: 'Rarity', unresolved_questions: ['Can we resume?'],
    source_refs: ['private:stop-receipt'],
  });
  const packet = Object.fromEntries([
    'receipt_hash', 'participant_id', 'continuity_id', 'conversation_id',
    'stop_point', 'next_owner', 'unresolved_questions',
  ].map((key) => [key, receipt[key]]));
  await assert.rejects(() => bridge.send({
    target: 'bluebird', text: 'Return', trial_receipt: receipt,
    trial_return_packet: { ...packet, next_owner: 'Impostor' },
  }), /changed_next_owner/);
  assert.equal(calls, 0);
  assert.equal((await bridge.receive({ target: 'bluebird' })).records.length, 0);
});

test('MCP Ship Voice chat requires explicit owner host enable, House key and Rarity seat', async () => {
  const {file}=tempStore();let calls=0;
  const env={ARCSWEEP_RUNTIME_TOKEN:'secret-fixture'};
  const bridge=createWayglassMcpBridge({storePath:file,env,flameIds:[],
    fetchImpl:async()=>{calls++;throw new Error('Transport must not have been called');}});
  await assert.rejects(()=>bridge.callTool('ask_wayglass',{text:'Hello Wayglass'},
    {type:'oauth',participant_id:'rarity'}),/not enabled by the owner/);
  assert.equal(calls,0);
  env.WAYGLASS_MCP_SHIP_CHAT_ENABLED='1';
  await assert.rejects(()=>bridge.callTool('ask_wayglass',{text:'Hello Wayglass'},
    {type:'oauth',participant_id:'codex'}),/unavailable|not authorised/);
  assert.equal(calls,0);
  delete env.ARCSWEEP_RUNTIME_TOKEN;
  await assert.rejects(()=>bridge.callTool('ask_wayglass',{text:'Hello Wayglass'},
    {type:'oauth',participant_id:'rarity'}),/runtime credential/);
  assert.equal(calls,0);
  assert.deepEqual((await bridge.receive({target:'wayglass'})).records,[]);
});

test('real Ship Voice model text and response receipt survive MCP cold return', async () => {
  const {file}=tempStore(),requests=[],env={
    ARCSWEEP_RUNTIME_TOKEN:'steward-only-fixture',WAYGLASS_MCP_SHIP_CHAT_ENABLED:'1',
  };
  const transport=async(url,init={})=>{
    requests.push({url:String(url),headers:init.headers,body:JSON.parse(init.body)});
    const number=requests.length;
    return new Response(JSON.stringify({
      schema:'wayglass.route-turn/v0.1',route_id:'wayglass:ship',participant_id:'wayglass',
      provider:'ollama',model:'crow-fixture',output:'Wayglass answer '+number,
      receipt:{character_id:'wayglass',voice_seat_kind:'system-voice-over-external-route',
        response_id:'response:'+number,observation_id:'observation:'+number,
        completed_at:'2026-11-09T19:45:00Z',canon_commit:false},
    }),{status:200,headers:{'content-type':'application/json'}});
  };
  const bridge=createWayglassMcpBridge({storePath:file,env,flameIds:[],internalOrigin:'http://wayglass.test',fetchImpl:transport});
  const auth={type:'oauth',participant_id:'rarity',profile_id:'owner-authenticated-rarity'};
  const first=await bridge.callTool('ask_wayglass',{
    text:'Run the 3026 Death re-roll timeline',conversation_ref:'rarity-timeline-3026',
    intent:'Explore three branches with the Eightfold',interaction_mode:'counterfactual-wonder',
  },auth);
  assert.equal(first.status,'attributed-model-response-saved');
  assert.equal(first.reply.text,'Wayglass answer 1');
  assert.equal(first.reply.receipt.observation_id,'observation:1');
  assert.equal(first.persistence.saved,true);
  assert.equal(requests[0].url,'http://wayglass.test/api/v1/wayglass/respond');
  assert.equal(requests[0].headers.authorization,'Bearer steward-only-fixture');
  assert.equal(requests[0].body.route_id,'wayglass:ship');
  assert.equal(requests[0].body.character_id,'wayglass');
  assert.equal(requests[0].body.interaction.channel,'OOC');
  assert.equal(requests[0].body.history.length,0);
  await bridge.callTool('ask_wayglass',{
    text:'What if Death rolls a natural twenty?',conversation_ref:'rarity-timeline-3026',
  },auth);
  assert.equal(requests[1].body.history.length,2);
  assert.equal(requests[1].body.history[0].content,'Run the 3026 Death re-roll timeline');
  assert.equal(requests[1].body.history[1].content,'Wayglass answer 1');
  const cold=createWayglassMcpBridge({storePath:file,env,flameIds:[],fetchImpl:transport});
  const history=await cold.callTool('receive',{target:'wayglass',conversation_ref:'rarity-timeline-3026'},auth);
  assert.equal(history.records.length,4);
  assert.equal(history.records[1].route_receipt.model,'crow-fixture');
  assert.equal(history.records[3].route_receipt.observation_id,'observation:2');
  assert.doesNotMatch(JSON.stringify(history),/steward-only-fixture/);
  const index=await cold.callTool('list_wayglass_chats',{},auth);
  assert.equal(index.chats[0].conversation_ref,'rarity-timeline-3026');
  assert.equal(index.chats[0].message_count,4);
  assert.equal(index.chats[0].has_attributed_reply,true);
});

test('unattributed or failed Ship Voice response does not become a stored model reply',async()=>{
  const {file}=tempStore(),env={
    WAYGLASS_MCP_SHIP_CHAT_ENABLED:'1',ARCSWEEP_RUNTIME_TOKEN:'test-steward',
  };
  const bridge=createWayglassMcpBridge({storePath:file,env,flameIds:[],
    fetchImpl:async()=>new Response(JSON.stringify({
      schema:'wayglass.route-turn/v0.1',route_id:'wayglass:ship',
      participant_id:'wayglass',provider:'ollama',model:'crow-fixture',
      output:'A forged answer with no correct seat',
      receipt:{character_id:'wrong-seat',voice_seat_kind:'fictional-roleplay-lens',observation_id:'bad'},
    }),{status:200})});
  await assert.rejects(()=>bridge.callTool('ask_wayglass',{text:'Can Wayglass speak?'},
    {type:'oauth',participant_id:'rarity'}),/did not return an attributable/);
  const history=await bridge.receive({target:'wayglass'});
  assert.equal(history.records.length,1);
  assert.equal(history.records[0].role,'rarity');
  assert.equal(history.records.some(x=>x.role==='participant'),false);
});
