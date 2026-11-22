'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compile, execute } = require('./wyrdrune.cjs');
const { digest } = require('./canonical.cjs');
const { compileTyped } = require('./typed-ir.cjs');
const { compileTyped: kernelCompile, previewWyrdruneRitual } = require('../wayglass-kernel.cjs');

const circuit = (perceive = '', verify = '', transcend = '', scope = '') => `
mobius ${scope} {
  perceive { ${perceive} }
  compress {} release {} verify { ${verify} }
  integrate {} choose {} return {} transcend { ${transcend} }
}`;
const operators = 'operator sum(n: number): number = if n == 0 then 0 else n + sum(n - 1);\n';
const source = operators + circuit('emit sum(4);');
const errors = source => {
  try {
    compileTyped(source);
  } catch (error) {
    if (error.diagnostics) return error;
    throw error;
  }
  assert.fail('Typed compilation unexpectedly succeeded');
};

test('typed compilation emits a deterministic versioned IR and verifies through the kernel', async () => {
  const artifact = compileTyped(source);
  const { digest: actual, ...data } = artifact;
  assert.equal(artifact.schema, 'wyrdrune.typed-ir/v0.1');
  assert.equal(actual, digest(data));
  assert.deepEqual(kernelCompile(source), artifact);
  assert.deepEqual(artifact.signatures, [{ name: 'sum', parameterTypes: ['number'], resultType: 'number' }]);
  assert.ok(Object.isFrozen(artifact.executable.operators[0].body));
  assert.deepEqual((await execute(artifact.executable)).output, [10]);
  assert.deepEqual((await previewWyrdruneRitual(source, { typed: true })).values, [10]);
  assert.throws(() => compile(source), SyntaxError);
});

test('typed compilation checks both arms and reconciles declarations with exact bridge targets', async () => {
  const code = 'effect "model" "read";\n' +
    circuit('emit if true then 7 else bridge("model","read"); emit bridge("model","read");');
  const artifact = compileTyped(code);
  assert.deepEqual(artifact.effects.declared, [{ provider: 'model', operation: 'read' }]);
  assert.deepEqual(artifact.effects.required, [{
    provider: 'model', operation: 'read', sites: [
      'units.0.phases.0.body.0.e.no', 'units.0.phases.0.body.1.e',
    ],
  }]);
  await assert.rejects(previewWyrdruneRitual(code, { typed: true }), /no host effects/);
  const error = errors(circuit('let key = "model"; emit bridge(key,"read"); emit bridge("other","read");'));
  assert.deepEqual(error.diagnostics.map(d => d.code), ['unresolved-effect-target', 'undeclared-effect']);
  assert.deepEqual(error.effects.required.map(({ provider }) => provider), ['other']);
});

test('typed compilation detects invalid arguments, results, references, and ritual effects', () => {
  const code = 'operator bad(n: number): truth = if true then n else "text";\n' +
    'operator blocked(): record = enochian("Pa");\n' +
    circuit('emit bad("one"); emit blocked(); emit missing;', 'require 1;', '', 'scoped');
  assert.deepEqual(errors(code).diagnostics.map(d => d.code), [
    'type-mismatch', 'operator-effect', 'type-mismatch', 'unbound-name', 'type-mismatch',
  ]);
  assert.deepEqual(errors('effect "a" "b"; effect "a" "b";' + circuit()).diagnostics.map(d => d.code), ['duplicate-effect']);
  assert.deepEqual(errors('operator f(x: missing): truth = true;' + circuit()).diagnostics.map(d => d.code), ['unknown-type']);
});

test('type flow tracks carry and conservative data results', async () => {
  const first = circuit('let value = 2;', '', 'carry value = value;', 'scoped');
  const second = circuit('emit value * 3;', '', '', 'scoped');
  assert.deepEqual((await execute(compileTyped(first + second).executable)).output, [6]);
  assert.deepEqual(errors(circuit('emit [1][0] + 2;')).diagnostics.map(d => d.code), ['type-mismatch']);
  assert.deepEqual(errors(circuit('emit [1][0.5];')).diagnostics.map(d => d.code), ['invalid-list-index']);
  assert.deepEqual(errors(circuit('emit whisper(1, 0);')).diagnostics.map(d => d.code), ['spice-required']);
});

test('the legacy Unknown encoding receives Unknown type in a typed program', async () => {
  const source = circuit('emit if {wtl: "unknown"} then 1 else 2;');
  const artifact = compileTyped(source);
  assert.deepEqual(artifact.expressions.find(entry => entry.path.endsWith('.condition')).types, ['unknown']);
  assert.deepEqual((await execute(artifact.executable)).output, [{ wtl: 'unknown' }]);
  assert.deepEqual(errors(circuit('emit [1][-1];')).diagnostics.map(d => d.code), ['invalid-list-index']);
});
test('Wonder remains a pure call inside typed user-defined operators', () => {
  const code = 'operator question(q: text): record = wonder(q);\n' + circuit('', 'emit question("What remains possible?");');
  const result = compileTyped(code);
  assert.equal(result.diagnostics.some(d => d.code === 'operator-effect'), false);
});

test('record access distinguishes present, absent and open values in typed execution', async () => {
  const programme = circuit('emit {name: "Wayglass"}["name"]; emit {name: "Wayglass"}["missing"]; emit unknown["name"];');
  const result = await execute(compileTyped(programme).executable);
  assert.deepEqual(result.output, ['Wayglass', {wtl: 'unknown'}, {wtl: 'unknown'}]);
});

test('record access rejects null and scalar targets at typed preflight', () => {
  for (const expression of ['null["name"]', '42["name"]', 'true["name"]']) {
    const diagnostic = errors(circuit('emit ' + expression + ';'));
    assert.ok(diagnostic.diagnostics.some(item => item.code === 'type-mismatch'), expression);
  }
});

test('known distinguishes Unknown from concrete values in typed Wyrdrune', async () => {
  const programme = circuit('emit known(unknown); emit known(0); emit known(false); emit known(null); emit known({wtl: "unknown"});');
  const result = await execute(compileTyped(programme).executable);
  assert.deepEqual(result.output, [false, true, true, true, false]);
});

test('known supports explicit branching without erasing Unknown', async () => {
  const programme = circuit('emit if known({name: "Wayglass"}["missing"]) then "present" else "open";');
  const result = await execute(compileTyped(programme).executable);
  assert.deepEqual(result.output, ['open']);
});
