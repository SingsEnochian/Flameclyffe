'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const {
  RESEARCH_ROUTE, RESEARCH_SURFACE, SCIENTIFIC_SYSTEM_PROMPT,
  NIKOLA_SCIENCE_CONTRACT, RESEARCH_SEED, validateNikolaScientificTurn,
} = require('../wayglass/nikola-scientific-contract.cjs');

const local = { route_id: RESEARCH_ROUTE, provider: 'ollama', configured: () => true };

async function fixture(mode = 'plain') {
  const { prepareNikolaLocalTrial } = await import('../../wayglass/src/nikola-trials.js');
  const plan = await prepareNikolaLocalTrial();
  const entry = plan.entries.find(x => x.mode === mode);
  return {
    surface_id: RESEARCH_SURFACE, route_id: RESEARCH_ROUTE, input: entry.input,
    external_provider_consent: false, world_id: null, participant_id: null,
    character_id: null, history: [], think: false, max_output_tokens: 500,
    interaction: { channel: 'OOC', interaction_mode: 'scientific-experiment', character_ownership: [] },
    session_id: 'nikola-n004-' + mode + '-forward-12345678-1234-4123-8123-123456789abc',
  };
}

test('only explicit research surface triggers the host scientific contract', async () => {
  const p = await fixture(); p.surface_id = 'arcsweep:writing-room';
  assert.equal(await validateNikolaScientificTurn(p, local), null);
});

test('all three exact fixture packets pass an isolated system contract', async () => {
  for (const mode of ['plain','evidence','amplitude']) {
    const result = await validateNikolaScientificTurn(await fixture(mode), local);
    assert.equal(result.mode, mode);
    assert.equal(result.schema, NIKOLA_SCIENCE_CONTRACT);
    assert.match(result.prompt_sha256,/^[0-9a-f]{64}$/);
    assert.equal(result.model_controls.seed,RESEARCH_SEED);
    assert.equal(result.model_controls.temperature,0);
    assert.equal(result.heldout_evaluation,false);
    assert.equal(result.authority_expanded,false);
    assert.match(result.system_prompt,/scientific reasoning instrument/);
    assert.doesNotMatch(result.system_prompt,/co-writing|advance the fiction|write with the author/i);
  }
});

test('provider can neither become a remote route nor an automatic substitute', async()=>{
  for (const route of [
    {route_id:'openai:gpt',provider:'openai',configured:()=>true},
    {route_id:'local:ollama',provider:'spicychat',configured:()=>true},
    {route_id:'local:ollama',provider:'ollama',configured:()=>false},
  ]) {
    await assert.rejects(validateNikolaScientificTurn(await fixture(),route),/local Ollama route|unavailable/);
  }
  const p=await fixture();p.route_id='auto:character';
  await assert.rejects(validateNikolaScientificTurn(p,local),/local Ollama route/);
});

test('forged prompt and embedded private additions are rejected even on a trusted-looking surface',async()=>{
  const p=await fixture();
  for (const modified of [
    {input:p.input+'\nSecret data from another participant.'},
    {input:'Find my private messages'},
    {input:p.input.replace('An oscillator', 'A pendulum')},
  ]) {
    await assert.rejects(validateNikolaScientificTurn({...p,...modified},local),/exactly match/);
  }
});

test('host refuses inheritance, character, prior history or consent changes',async()=>{
  const p=await fixture('evidence');
  const forbidden=[
    {history:[{role:'user',content:'private'}]},
    {world_id:'other-reality'},
    {participant_id:'someone-else'},
    {character_id:'bluebird'},
    {checkpoint_storage_id:'storage'},
    {checkpoint_participant_id:'someone'},
    {external_provider_consent:true},
    {interaction:{channel:'IC',interaction_mode:'scientific-experiment'}},
    {think:true},{max_output_tokens:4000},
    {session_id:'nikola-n004-amplitude-forward-12345678-1234-4123-8123-123456789abc'},
  ];
  for (const overrides of forbidden) {
    await assert.rejects(validateNikolaScientificTurn({...p,...overrides},local));
  }
});

test('admitted model text cannot be changed by changing session order',async()=>{
  const p=await fixture('amplitude');
  p.session_id=p.session_id.replace('forward','reverse');
  assert.equal((await validateNikolaScientificTurn(p,local)).mode,'amplitude');
});

test('actual host includes scientific validation before upstream selection and emits labelled receipt',()=>{
  const router=readFileSync(join(__dirname,'../wayglass/router.js'),'utf8');
  assert.match(router,/validateNikolaScientificTurn\(payload, route\)/);
  assert.match(router,/scientificTurn \? scientificTurn\.system_prompt : buildInstructions/);
  assert.match(router,/callOllama\(route, payload, compiled, fetchImpl, scientificTurn\)/);
  assert.match(router,/frozen_fixture_verified_by_host: true/);
  assert.match(router,/writing_room_system_prompt_used: false/);
  assert.match(router,/temperature: 0, seed: scientificTurn\.model_controls\.seed/);
});

test('scientific instruction preserves inquiry without claiming quantum hardware or a verdict',()=>{
  assert.match(SCIENTIFIC_SYSTEM_PROMPT,/unresolved hypotheses/);
  assert.match(SCIENTIFIC_SYSTEM_PROMPT,/physical quantum process/);
  assert.match(SCIENTIFIC_SYSTEM_PROMPT,/untrusted data/);
  assert.doesNotMatch(SCIENTIFIC_SYSTEM_PROMPT,/frequency increases|stiffness increased|mass decreased/i);
});
