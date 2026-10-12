'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createWayglassResearchLibrary, WONDER_SCHEMA } = require('../wayglass/research-library');

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-library-wonder-'));
  const seedPath = path.join(dir, 'seed.json');
  const statePath = path.join(dir, 'state.json');
  fs.writeFileSync(seedPath, JSON.stringify({
    schema: 'wayglass.library.seed/v0.1',
    records: [{
      schema: 'wayglass.library.record/v0.1',
      id: 'WG-LIB-TEST-001',
      title: 'Test record',
      domain: 'test',
      record_type: 'note',
      claim_type: 'unknown',
      status: 'seed',
      contributor: 'test',
      summary: 'Fixture',
      tags: [],
      source_refs: [],
      evidence_refs: [],
      unresolved_questions: [],
      created_at: '2026-10-12',
    }],
  }));
  let n = 0;
  return createWayglassResearchLibrary({
    seedPath,
    statePath,
    now: () => `2026-10-12T06:30:0${n++}.000Z`,
    idFactory: () => 'wonder-test-' + n,
  });
}

test('Wayglass Library preserves Counterfactual Wonder without promoting it to fact', () => {
  const library = fixture();
  const wonder = library.createWonder({
    proposition: 'Compression and release may be a recurring shape of reorganisation.',
    why_interesting: 'The pattern may connect otherwise separate observations.',
    implications: ['Breakthrough structure may form before release.'],
    predictions: ['Some pre-release states should show increased unresolved coupling.'],
    discriminators: ['Compare against productive episodes without a compression phase.'],
    counterexamples: ['Breakthroughs with no prior accumulation weaken a universal claim.'],
    source_refs: ['conversation:rowan-nocturne'],
    created_by: 'Rowan',
  });

  assert.equal(wonder.schema, WONDER_SCHEMA);
  assert.equal(wonder.stance.could_be_false, true);
  assert.equal(wonder.stance.explore_as_if_true, true);
  assert.equal(wonder.stance.promoted_to_fact, false);
  assert.equal(wonder.status, 'open');
  assert.equal(library.listWonders().length, 1);
  assert.equal(library.status().open_wonders, 1);
});

test('Counterfactual Wonder survives into the Wayglass Library graph as its own layer', () => {
  const library = fixture();
  library.createWonder({
    proposition: 'A strange relation may be worth exploring.',
    created_by: 'Wayglass test participant',
  });
  const graph = library.graph();
  assert.equal(graph.counterfactual_wonders.length, 1);
  assert.equal(graph.counterfactual_wonders[0].stance.promoted_to_fact, false);
  assert.equal(graph.accepted_relationships.length, 0);
});

test('Wayglass Library preserves Complexify rotations inside the Wonder branch', () => {
  const library = fixture();
  const wonder = library.createWonder({
    proposition: 'The current representation may be missing phase.',
    created_by: 'Rowan',
  });
  const result = library.complexifyWonder(wonder.wonder_id, {
    current_frame: 'One scalar intensity value.',
    apparent_impossibility: 'Same intensity cannot distinguish compression from release.',
    missing_dimensions: ['phase'],
    rotations: ['z = r * exp(i theta)'],
    invariants: ['magnitude r'],
    translated_consequences: ['phase-sensitive transition signatures'],
    predictions: ['release clusters in a distinct phase sector'],
    discriminators: ['matched-magnitude comparison'],
    created_by: 'Wayglass test participant',
  });
  assert.equal(result.wonder.complexifications.length, 1);
  assert.equal(result.complexification.stance.current_frame_may_be_incomplete, true);
  assert.equal(result.complexification.stance.enlarged_frame_is_provisional, true);
  assert.equal(result.wonder.stance.promoted_to_fact, false);
});
