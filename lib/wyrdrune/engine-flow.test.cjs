'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createWyrdruneEnginePhases, openMobiusLineage, runQuadCore } = require('../wayglass-kernel.cjs');

test('Quad execution takes carry from executable WTL, and rolls back its Verify refusal', async () => {
  const source = `mobius scoped {
    perceive {} compress {} release { set n = n + 2; }
    verify { require n < 5 else "ceiling"; }
    integrate {} choose {} return { emit n; } transcend { carry n = n; }
  }`;
  const phases = createWyrdruneEnginePhases(source, { seedTypes: { n: 'number' } });
  const lineage = openMobiusLineage({ system: 'quad-test', seeds: { n: 0 } });
  const { lineages: [first] } = await runQuadCore([{ lineage, phases, cycles: 3 }]);
  assert.deepEqual(first.results.map(run => run.status), ['committed', 'committed', 'rolled-back']);
  assert.equal(first.head.carry.n, 4);
  assert.deepEqual(first.results.at(-1).reason, ['ceiling']);
  assert.equal(first.results.at(-1).receipts.find(receipt => receipt.phase === 'verify').wtl.accepted, false);
});

test('Möbius Return requires WTL verification and refuses empty evidence', async () => {
  let writes = 0;
  const lineage = openMobiusLineage({ system: 'return-test', seeds: {} });
  const phases = {
    perceive: ctx => {
      ctx.stage({ kind: 'fixture', apply: () => writes++, undo: () => writes-- });
      return {};
    },
    compress: () => ({}), release: () => ({}), verify: () => [],
    integrate: () => ({}), choose: () => ({}), transcend: () => ({}),
  };
  const skipped = lineage.begin(phases);
  await skipped.stage.perceive();
  assert.deepEqual((await skipped.stage.return()).reason, ['Wyrdrune Verify receipt required']);
  const empty = await lineage.cycle(phases);
  assert.equal(empty.status, 'rolled-back');
  assert.deepEqual(empty.reason, ['Engine supplied no verification evidence']);
  assert.equal(writes, 0);
  assert.equal(lineage.head, null);
});

test('typed engine phase adapter rejects host effects and incompatible carry types', async () => {
  const body = expression => `mobius scoped {
    perceive {} compress {} release {} verify {} integrate {} choose {}
    return { emit ${expression}; } transcend { carry n = "text"; }
  }`;
  assert.throws(() => createWyrdruneEnginePhases('effect "host" "read";' + body('bridge("host","read")')),
    /must have no host effects/);
  const lineage = openMobiusLineage({ system: 'typed-carry-test', seeds: { n: 0 } });
  const phases = createWyrdruneEnginePhases(body('n'), { seedTypes: { n: 'number' } });
  const run = await lineage.cycle(phases);
  assert.equal(run.status, 'rolled-back');
  assert.match(run.reason[0], /carry type mismatch/);
});
