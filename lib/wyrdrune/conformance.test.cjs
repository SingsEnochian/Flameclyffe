'use strict';
// WTL conformance harness v0.2. Backend-agnostic: any module exporting
// compile(source) and async execute(ir) can be checked.
//   node --test lib/wyrdrune/conformance.test.cjs
//   WTL_BACKEND=./path/to/backend.cjs WTL_CLAIM=L0,L1 node --test lib/wyrdrune/conformance.test.cjs
// Levels listed in WTL_CLAIM (default L0) must pass. Every other level runs
// as `todo`: reported, never failing CI, so fixtures can lead implementations.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const canonical = require('./canonical.cjs');
const suite = require('./conformance/wtl-conformance.v0.2.json');
const vectors = require('./conformance/wce1-vectors.json');

const backendPath = process.env.WTL_BACKEND
  ? path.resolve(process.cwd(), process.env.WTL_BACKEND) : path.join(__dirname, 'wyrdrune.cjs');
const backend = require(backendPath);
const claimed = new Set(String(process.env.WTL_CLAIM || 'L0').split(',').map(s => s.trim()).filter(Boolean));

function checkChain(result) {
  const cps = result.checkpoints;
  assert.ok(Array.isArray(cps) && cps.length > 0, 'checkpoints required');
  assert.match(String(result.lineage?.root), /^wce1:[0-9a-f]{64}$/, 'lineage.root must be a WCE-1 digest');
  cps.forEach((cp, i) => {
    const expected = i === 0 ? result.lineage.root : canonical.digest(cps[i - 1]);
    assert.equal(cp.prev, expected, `checkpoint ${i + 1} prev must chain`);
    assert.equal(cp.cycle, i + 1);
  });
}

async function run(fixture) {
  const { expect } = fixture;
  let result;
  try {
    result = await backend.execute(backend.compile(fixture.source));
  } catch (error) {
    if (!expect.error) throw error;
    assert.ok(error.name === expect.error || String(error.message).includes(expect.error),
      `expected error ${expect.error}, got ${error.name}: ${error.message}`);
    return;
  }
  assert.ok(!expect.error, `expected error ${expect.error}, but execution succeeded`);
  if ('output' in expect) assert.deepEqual(result.output, expect.output);
  if ('status' in expect) assert.equal(result.status, expect.status);
  if ('phases' in expect) assert.deepEqual(result.receipts.map(r => r.phase), expect.phases);
  if ('cycles' in expect) assert.equal(result.checkpoints?.length, expect.cycles);
  if ('faces' in expect) assert.deepEqual(result.checkpoints?.map(c => c.face), expect.faces);
  if (expect.chain_valid) checkChain(result);
  if (expect.root_differs_from) {
    const other = await backend.execute(backend.compile(expect.root_differs_from));
    assert.deepEqual(other.output, result.output, 'intention must not change computed output');
    assert.match(String(result.lineage?.root), /^wce1:/);
    assert.notEqual(other.lineage.root, result.lineage.root, 'intention must change lineage identity');
  }
}

for (const fixture of suite.fixtures) {
  const todo = !claimed.has(fixture.level);
  test(`${fixture.id} [${fixture.level}${fixture.invariant ? ' ' + fixture.invariant : ''}] ${fixture.note}`,
    { todo: todo ? `${fixture.level} not claimed by this backend` : false },
    () => run(fixture));
}

test('W1 · WCE-1 JavaScript reference reproduces every shared vector', () => {
  for (const v of vectors.vectors) assert.equal(canonical.encode(v.value), v.expect, v.name);
});

test('W1 · WCE-1 Python reference is byte-identical to JavaScript', (t) => {
  const py = spawnSync('python3', ['-I', path.join(__dirname, 'canonical.py'),
    path.join(__dirname, 'conformance', 'wce1-vectors.json')], { encoding: 'utf8' });
  if (py.error?.code === 'ENOENT') { t.skip('python3 not installed'); return; }
  assert.equal(py.status, 0, py.stderr);
  const rows = JSON.parse(py.stdout);
  assert.equal(rows.length, vectors.vectors.length);
  rows.forEach((row, i) => {
    const v = vectors.vectors[i];
    assert.equal(row.encoding, v.expect, v.name);
    assert.equal(row.digest, canonical.digest(v.value), v.name);
  });
});

test('W1 · WCE-1 rejects values with no canonical form', () => {
  for (const bad of [NaN, Infinity, -Infinity, '\uD800', undefined, () => 1, new Date(0)]) {
    assert.throws(() => canonical.encode(bad));
  }
});
