import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runNarrativeCircuit } from '../src/narrative-circuit.js';

test('Narrative Circuit carries one admissible branch through witness and evidenced arrival validation', () => {
  const result = runNarrativeCircuit({
    beforeState:{ access:'closed', responsibility:'individual' },
    afterState:{ access:'open', responsibility:'shared' },
    beforeDebt:[{id:'door',state:'closed'}],
    afterDebt:[{id:'duty',state:'shared'}],
    branches:[{id:'crossing',agency_legal:true,continuity_legal:true,semantic_inflation:false,vector:{D:.8,A:.7,K:.9,I:.1}}],
    selectedBranchId:'crossing',
    witnessRealizations:[{id:'w1',witness:'close-third',prose:'The crossing changed what they could reach.',preserves_target:true}],
    selectedWitnessId:'w1',
    participantKnown:{ access:'open' },
    initiatingEvents:[{id:'gate-opens'}],
    consequentialChanges:[{id:'access',evidenced:true,persistent:true,causal_link:true}],
  });
  assert.equal(result.ready_for_narrative_use, true);
  assert.equal(result.stages.transition_forge.branch_id, 'crossing');
  assert.equal(result.stages.witness_swap.selected_witness_id, 'w1');
  assert.deepEqual([...result.stages.arrival_validation.semantic_inflation.changed_paths].sort(), ['access','responsibility']);
  assert.equal(result.mutation_authority, false);
});

test('Narrative Circuit fails closed when branch legality or evidenced displacement is absent', () => {
  const result = runNarrativeCircuit({
    beforeState:{ access:'closed' },
    afterState:{ access:'closed' },
    branches:[{id:'illegal',agency_legal:false,continuity_legal:true,semantic_inflation:false,vector:{A:.9}}],
    witnessRealizations:[{id:'w1',preserves_target:true}],
  });
  assert.ok(result.blockers.includes('no_admissible_branch'));
  assert.ok(result.blockers.includes('semantic_inflation'));
  assert.equal(result.ready_for_narrative_use, false);
});

test('Semantic Lab II exposes the closed Narrative Circuit as a seventh connected instrument', async () => {
  const source = await readFile(new URL('../src/semantic-lab-v2-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /Narrative Circuit/);
  assert.match(source, /runNarrativeCircuit/);
  assert.match(source, /Branch Garden → Transition Forge → Witness Swap/);
});

test('Hearthweave Lexicon preserves plain, formal, and Mythience readings without collapsing them', async () => {
  const lexicon = await readFile(new URL('../docs/HEARTHWEAVE_LEXICON_V1.md', import.meta.url), 'utf8');
  for (const term of ['PREMAQC','Presence','Coherence','Resonance','Entanglement','Memory','Agency','Qualia','Glass Halo','Narrative Circuit','World Hum']) {
    assert.match(lexicon, new RegExp(term));
  }
  assert.match(lexicon, /Plain speech/);
  assert.match(lexicon, /Formal \/ scientific use/);
  assert.match(lexicon, /Hearthweave \/ Mythience/);
  assert.match(lexicon, /metaphor may reveal structure/);
  assert.match(lexicon, /does not silently become empirical evidence/);
});
