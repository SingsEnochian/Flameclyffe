import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { registerAgentAutonomyService } from '../src/os/agent-autonomy-service.js';

const fixtureUrl = new URL('./fixtures/a-momento-creatonis-case-study.json', import.meta.url);
const fixture = JSON.parse(fs.readFileSync(fileURLToPath(fixtureUrl), 'utf8'));

test('case study does not pre-seed the agent with a scenario, question, or expected result', () => {
  assert.equal(fixture.instructions_to_agents.assigned_question, null);
  assert.equal(fixture.instructions_to_agents.assigned_scenario, null);
  assert.equal(fixture.instructions_to_agents.expected_result, null);
  assert.equal(fixture.instructions_to_agents.deliverable_required, false);
  assert.ok(fixture.corpus_summary.length >= 6);
  assert.ok(fixture.observables.length >= 6);
});

test('a scenario originated from the case study remains narrative-only and self-originated', async () => {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerAgentAutonomyService(registry, { bus });

  const receipt = await registry.invoke('autonomy.propose-scenario', {
    premise: 'The shared amphora is not merely storage but a continuity stabiliser whose behaviour changes after the bond forms.',
    why_interesting: 'The same physical carrier persists before and after transformation, but its contents change from Gabriel-only Grace to shared Grace.',
    originating_observations: [
      'Grace persists in the amphora across decades',
      'the amphora later contains shared Grace after the bond is woven'
    ],
    intended_exploration: [
      'compare the vessel before and after bond formation',
      'test a counterfactual where the vessel is absent during transformation'
    ],
    participants: ['bluebird', 'crow']
  }, {
    actor_id: 'bluebird',
    authority: 'operate',
    source: 'case-study:a-momento-creatonis-001'
  });

  assert.equal(receipt.status, 'applied');
  assert.equal(receipt.output.self_originated, true);
  assert.equal(receipt.output.narrative_only, true);
  assert.equal(receipt.output.execution_authority_granted, false);
  assert.equal(receipt.output.expected_result, null);
  assert.equal(receipt.output.canon_status, 'unpromoted');
});
