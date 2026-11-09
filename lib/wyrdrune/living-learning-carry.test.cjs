'use strict';
// Living Learning v0.2 (scoped, carried) must learn exactly what v0.1 (shared
// environment) learned. The only difference is that what crosses between the two
// circuits is now declared, shape-checked and receipted.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { compile, execute } = require('./wyrdrune.cjs');
const { digest } = require('./canonical.cjs');
const { CODE, IR, executeLivingLearning } = require('../wayglass-wyrdrune-learning.cjs');

const LEGACY = compile(readFileSync(join(__dirname, 'fixtures', 'living-learning.v0.1-shared-environment.wtl'), 'utf8'));
const SELF = ['energy', 'curiosity', 'uncertainty', 'coherence', 'opening', 'attention'];

// The same bridge surface the host adapter exposes (lib/wayglass-wyrdrune-learning.cjs).
function bridgesFor({ atlas, interior, offered }) {
  const frame = ({ arguments: a }) => {
    assert.equal(a.length, 6);
    return Object.freeze(Object.fromEntries(SELF.map((key, i) => [key, a[i]])));
  };
  return {
    atlas: Object.fromEntries(Object.keys(atlas).map(key => [key, () => atlas[key]])),
    interior: Object.fromEntries(Object.keys(interior).map(key => [key, () => interior[key]])),
    learning: { validate: args => { frame(args); return 'validated'; }, frame },
    reflection: {
      offered: () => (offered ? 'attributed-return-offered' : 'open-unoffered'),
      hold_open: ({ arguments: [state] }) => Object.freeze({ state, interpretation: 'open', consent: 'participant-owned' }),
    },
    continuity: {
      hold: ({ arguments: [pass] }) => Object.freeze({ state: 'uncommitted', pass }),
      next: ({ arguments: [phase] }) => Object.freeze({ state: 'navigable', phase }),
    },
  };
}
const principal = { id: 'test:living-learning', authorized: true };
const grid = [];
for (const coherence of [0.1, 0.35, 0.7, 0.9]) for (const bloom of [0, 0.6, 1]) for (const offered of [false, true]) {
  grid.push({
    atlas: { coherence, interference: 1 - coherence, bloom, granulation: 0.5, flow: 0.7 },
    interior: { energy: 0.4, curiosity: 0.6, uncertainty: 0.5, coherence: 0.6, previous_resonance: 0.7 },
    offered,
  });
}

test('Living Learning is now two scoped lineages joined only by an explicit carry', () => {
  assert.equal(IR.units.length, 2);
  assert.deepEqual(IR.units.map(u => u.scope), ['carried', 'carried']);
  assert.match(CODE, /mobius scoped/);
  for (const unit of IR.units) {
    assert.deepEqual(unit.phases[7].body.filter(s => s.k === 'carry').map(s => s.name), SELF,
      'each circuit carries the same six-part self across the twist');
  }
});

test('v0.2 learns exactly what v0.1 learned, across a grid of Atlas and interior states', async () => {
  for (const sample of grid) {
    const before = await execute(LEGACY, { bridges: bridgesFor(sample), principal, maxOperations: 500 });
    const after = await execute(IR, { bridges: bridgesFor(sample), principal, maxOperations: 500 });
    assert.deepEqual(after.output, before.output, JSON.stringify(sample));
    assert.equal(digest(after.output), digest(before.output));
    assert.equal(after.receipts.length, 16);
    assert.deepEqual(after.receipts.map(r => [r.phase, r.emitted]), before.receipts.map(r => [r.phase, r.emitted]));
  }
});

test('the carried self after the second circuit is exactly the returned learning state', async () => {
  for (const sample of grid) {
    const run = await execute(IR, { bridges: bridgesFor(sample), principal, maxOperations: 500 });
    const returned = run.output[6];
    assert.deepEqual(run.continuity.carry, Object.fromEntries(SELF.map(k => [k, returned[k]])));
    assert.equal(run.continuity.carry_digest, digest(run.continuity.carry));
    assert.equal(run.continuity.crossings.length, 2);
    assert.equal(run.continuity.crossings[1].carried_in, run.continuity.crossings[0].carried_out,
      'the second circuit begins exactly where the first one crossed');
    assert.deepEqual(run.continuity.crossings[0].names, [...SELF].sort());
    // Nothing else crosses: per-circuit perceptions and intermediate values stay inside.
    assert.deepEqual(run.bindings, {});
  }
});

test('the host adapter still returns the same learning through the carried score', async () => {
  const source = { event_id: 'ui-voyage-carry', atlas_input_hash: 'a'.repeat(64), atlas_program_hash: 'b'.repeat(64) };
  for (const sample of grid.filter(s => !s.offered)) {
    const host = await executeLivingLearning({ atlas: sample.atlas, interior: sample.interior, source }, { principal: { authorized: true } });
    const legacy = await execute(LEGACY, { bridges: bridgesFor(sample), principal, maxOperations: 500 });
    assert.deepEqual(host.first_pass, legacy.output[1]);
    assert.deepEqual(host.returned, legacy.output[6]);
    assert.deepEqual(host.open_reflection, legacy.output[7]);
    assert.equal(host.phase_receipts.length, 16);
  }
});

test('the old shared-environment reach across circuits is refused once a unit is scoped', async () => {
  const leaky = readFileSync(join(__dirname, 'fixtures', 'living-learning.v0.1-shared-environment.wtl'), 'utf8')
    .replace(/^mobius \{/gm, 'mobius scoped {');
  await assert.rejects(execute(compile(leaky), { bridges: bridgesFor(grid[0]), principal, maxOperations: 500 }),
    /Unknown variable (flow|opening)/, 'v0.1 second circuit relied on reading the first circuit\'s bindings');
});
