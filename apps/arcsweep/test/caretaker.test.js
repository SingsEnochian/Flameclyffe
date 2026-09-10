import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARCSWEEP_CARETAKER_PLAN_SCHEMA,
  ARCSWEEP_CARETAKER_RECEIPT_SCHEMA,
  buildCaretakerContext,
  buildCaretakerPrompt,
  caretakerExecutionStatus,
  executeCaretakerPlan,
  invokeCaretaker,
  normaliseCaretakerHistory,
  normaliseCaretakerPlan,
  parseCaretakerPlan,
} from '../src/caretaker.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const rooms = [
  { id: 'portal', label: 'Portal' },
  { id: 'glyph-forge', label: 'Glyph Forge' },
  { id: 'records', label: 'Records Room' },
];

test('caretaker context binds current room, world, and a deduplicated room registry', () => {
  const context = buildCaretakerContext({
    roomId: 'portal',
    world: { id: 'terra-aeterna', name: 'Terra Aeterna' },
    availableRooms: [...rooms, { id: 'glyph-forge', label: 'Duplicate' }],
  });
  assert.equal(context.room_id, 'portal');
  assert.equal(context.world.id, 'terra-aeterna');
  assert.deepEqual(context.available_rooms.map((room) => room.id), ['portal', 'glyph-forge', 'records']);
  const prompt = buildCaretakerPrompt({ message: 'Take me to Glyph Forge.', context });
  assert.match(prompt, /house intelligence/i);
  assert.match(prompt, /only ArcSweep may execute/i);
  assert.match(prompt, /ongoing conversation/i);
  assert.match(prompt, /glyph-forge: Glyph Forge/);
  assert.match(prompt, new RegExp(ARCSWEEP_CARETAKER_PLAN_SCHEMA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('caretaker prompt carries only bounded recent conversational continuity', () => {
  const history = Array.from({ length: 14 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'user',
    content: `history-${index}`,
  }));
  const bounded = normaliseCaretakerHistory(history);
  assert.equal(bounded.length, 10);
  assert.equal(bounded[0].content, 'history-4');
  const context = buildCaretakerContext({ roomId: 'portal', availableRooms: rooms });
  const prompt = buildCaretakerPrompt({ message: 'What were we doing?', context, history });
  assert.doesNotMatch(prompt, /history-0/);
  assert.match(prompt, /history-4/);
  assert.match(prompt, /history-13/);
  assert.match(prompt, /ROWAN NOW:\nWhat were we doing\?/);
});

test('caretaker accepts only registered navigation actions', () => {
  const plan = normaliseCaretakerPlan({
    schema: ARCSWEEP_CARETAKER_PLAN_SCHEMA,
    reply: 'Opening the path.',
    actions: [{ type: 'navigate', target: 'glyph-forge' }],
  }, { availableRooms: rooms });
  assert.deepEqual(plan.actions, [{ type: 'navigate', target: 'glyph-forge' }]);

  assert.throws(() => normaliseCaretakerPlan({
    schema: ARCSWEEP_CARETAKER_PLAN_SCHEMA,
    actions: [{ type: 'world.activate', target: 'terra-aeterna' }],
  }, { availableRooms: rooms }), /not permitted/);

  assert.throws(() => normaliseCaretakerPlan({
    schema: ARCSWEEP_CARETAKER_PLAN_SCHEMA,
    actions: [{ type: 'navigate', target: 'invented-room' }],
  }, { availableRooms: rooms }), /not in the supplied room registry/);
});

test('caretaker parser tolerates fenced JSON but rejects malformed output', () => {
  const plan = parseCaretakerPlan(`\`\`\`json\n{"schema":"${ARCSWEEP_CARETAKER_PLAN_SCHEMA}","reply":"There.","actions":[]}\n\`\`\``, { availableRooms: rooms });
  assert.equal(plan.reply, 'There.');
  assert.deepEqual(plan.actions, []);
  assert.throws(() => parseCaretakerPlan('I have opened the room.', { availableRooms: rooms }), /valid JSON/);
});

test('execution reports what the navigation adapter actually did', async () => {
  const plan = normaliseCaretakerPlan({
    schema: ARCSWEEP_CARETAKER_PLAN_SCHEMA,
    reply: 'To Glyph Forge.',
    actions: [{ type: 'navigate', target: 'glyph-forge' }, { type: 'navigate', target: 'records' }],
  }, { availableRooms: rooms });
  const results = await executeCaretakerPlan(plan, {
    navigate: async (target) => target === 'glyph-forge' ? { ok: true, status: 'navigated', target } : { ok: false, status: 'missing', target },
  });
  assert.equal(results[0].status, 'applied');
  assert.equal(results[1].status, 'rejected');
  assert.equal(caretakerExecutionStatus(results), 'partial');
});

test('invokeCaretaker completes model to plan to runtime result without inventing durability', async () => {
  const navigated = [];
  const receipt = await invokeCaretaker({
    message: 'Take me to Glyph Forge.',
    history: [
      { role: 'user', content: 'Where is the language work?' },
      { role: 'assistant', content: 'Glyph Forge is where the language tools live.' },
    ],
    roomId: 'portal',
    world: { id: 'terra-aeterna', name: 'Terra Aeterna' },
    availableRooms: rooms,
    token: 'house-key',
    now: (() => {
      const values = ['2026-09-10T04:40:00.000Z', '2026-09-10T04:40:00.100Z'];
      return () => values.shift();
    })(),
    navigate: async (target) => {
      navigated.push(target);
      return { ok: true, status: 'navigated', target };
    },
    fetchImpl: async (url, options) => {
      assert.equal(url, '/api/v1/house/caretaker');
      assert.equal(options.headers.authorization, 'Bearer house-key');
      const request = JSON.parse(options.body);
      assert.equal(request.context.room_id, 'portal');
      assert.match(request.message, /Where is the language work\?/);
      assert.match(request.message, /Glyph Forge is where the language tools live\./);
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            provider: 'ollama',
            model: 'hf.co/DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q4_K_M',
            message: JSON.stringify({
              schema: ARCSWEEP_CARETAKER_PLAN_SCHEMA,
              reply: 'Glyph Forge is this way.',
              actions: [{ type: 'navigate', target: 'glyph-forge' }],
            }),
            runtime_braid: null,
          };
        },
      };
    },
  });
  assert.equal(receipt.schema, ARCSWEEP_CARETAKER_RECEIPT_SCHEMA);
  assert.equal(receipt.status, 'applied');
  assert.equal(receipt.persistence, 'not-yet-durable');
  assert.deepEqual(navigated, ['glyph-forge']);
  assert.equal(receipt.model, 'hf.co/DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q4_K_M');
});

test('hosted Caretaker does not rely on the broken Vercel rooms rewrite', () => {
  const runtime = fs.readFileSync(path.join(root, 'api/_shared/house-caretaker-runtime.mjs'), 'utf8');
  const contract = fs.readFileSync(path.join(root, 'apps/starwell-server/caretaker/contract.js'), 'utf8');
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const edge = fs.readFileSync(path.join(root, 'supabase/functions/arcsweep-caretaker/index.ts'), 'utf8');
  const rewrite = vercel.rewrites.find((item) => item.source === '/api/v1/house/caretaker');

  assert.equal(rewrite, undefined);
  assert.equal(fs.existsSync(path.join(root, 'api/v1/house/caretaker.js')), false);
  assert.match(edge, /supabase-edge-to-openrouter/);
  assert.match(edge, /OPENROUTER_API_KEY/);
  assert.match(edge, /allowed_actions|navigate/i);

  // Keep the existing local/shared House handler and Mighty Sword contract for
  // installed/local ArcSweep, where Hearthgate/Ollama remains the preferred lane.
  assert.match(runtime, /MODEL_ARCSWEEP_CARETAKER/);
  assert.match(runtime, /OLLAMA_URL_CARETAKER/);
  assert.match(runtime, /HEARTHGATE_GATEWAY_URL/);
  assert.doesNotMatch(runtime, /flame_id/);
  assert.match(contract, /Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q4_K_M/);
  assert.match(contract, /ALLOWED_ACTIONS = Object\.freeze\(\['navigate'\]\)/);
});
