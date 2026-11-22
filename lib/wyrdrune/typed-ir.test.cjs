'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compile, execute, inspectOperators } = require('./wyrdrune.cjs');
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

test('match selects Unknown and concrete arms in typed execution', async () => {
  const programme=circuit('emit match unknown { unknown: "open", else: "known" }; emit match 42 { unknown: "open", else: "known" };');
  const result=await execute(compileTyped(programme).executable);
  assert.deepEqual(result.output,['open','known']);
});

test('match evaluates only its selected branch and keeps typed branch checks', async () => {
  const programme=circuit('emit match unknown { unknown: "held", else: 1 / 0 };');
  assert.deepEqual((await execute(compileTyped(programme).executable)).output,['held']);
  assert.deepEqual(errors(circuit('emit match unknown { unknown: 1, else: missing; };')).diagnostics.some(d=>d.code==='unbound-name'),true);
});

test('null is a first-class literal, distinct from Unknown in typed WTL', async () => {
  const programme=circuit('emit null; emit known(null); emit known(unknown);');
  const artifact=compileTyped(programme);
  assert.deepEqual((await execute(artifact.executable)).output,[null,true,false]);
  assert.ok(artifact.expressions.some(e=>e.types.includes('null')));
});

test('known remains pure inside a typed user-defined operator', async () => {
  const programme='operator resolved(value: data): truth = known(value);\n' +
    circuit('emit resolved(unknown); emit resolved(null);');
  const artifact=compileTyped(programme);
  assert.equal(artifact.diagnostics.some(d=>d.code==='operator-effect'),false);
  assert.deepEqual((await execute(artifact.executable)).output,[false,true]);
});

test('operator inspection accepts known as a portable pure builtin', () => {
  const programme='operator resolved(value: data): truth = known(value);\n' + circuit();
  const artifact=compileTyped(programme);
  const inspected=inspectOperators(artifact.executable);
  assert.equal(inspected.status,'checked');
  assert.deepEqual(inspected.diagnostics,[]);
});

test('match composes inside arithmetic, calls and nested match expressions', async () => {
  const programme=circuit(
    'emit 2 + (match unknown { unknown: 3, else: 9 }); ' +
    'emit known(match 7 { unknown: unknown, else: 7 }); ' +
    'emit match unknown { unknown: match null { unknown: "wrong", else: "held" }, else: "wrong" };'
  );
  assert.deepEqual((await execute(compileTyped(programme).executable)).output,[5,true,'held']);
});

test('operator inspection traverses calls inside match arms', () => {
  const programme='operator resolved(value: data): truth = match value { unknown: false, else: known(value) };\n' + circuit();
  const inspected=inspectOperators(compileTyped(programme).executable);
  assert.deepEqual(inspected.diagnostics,[]);
});

test('withField builds a new world record without mutating the original', async () => {
  const programme=circuit(
    'let world = {name: "Atlas", status: "seed"}; ' +
    'let grown = withField(world, "status", "growing"); ' +
    'emit world["status"]; emit grown["status"]; emit fields(grown);'
  );
  const result=await execute(compileTyped(programme).executable);
  assert.deepEqual(result.output,['seed','growing',['name','status']]);
});

test('record builders support nested worlds and pure operators', async () => {
  const programme='operator grow(world: record): record = withField(world, "phase", "becoming");\n' +
    circuit('emit grow({name: "Atlas"})["phase"]; emit fields({z: 1, a: 2});');
  const artifact=compileTyped(programme);
  assert.deepEqual(inspectOperators(artifact.executable).diagnostics,[]);
  assert.deepEqual((await execute(artifact.executable)).output,['becoming',['a','z']]);
});

test('record builders reject invalid types at typed preflight', () => {
  assert.ok(errors(circuit('emit fields(42);')).diagnostics.some(d=>d.code==='type-mismatch'));
  assert.ok(errors(circuit('emit withField({}, 42, "x");')).diagnostics.some(d=>d.code==='type-mismatch'));
});

test('withoutField removes a field without mutating the original world', async () => {
  const programme=circuit('let world = {name: "Atlas", temporary: true}; ' +
    'let cleaned = withoutField(world, "temporary"); ' +
    'emit fields(world); emit fields(cleaned); emit cleaned["temporary"];');
  const result=await execute(compileTyped(programme).executable);
  assert.deepEqual(result.output,[['name','temporary'],['name'],{wtl:'unknown'}]);
});

test('withoutField is portable in typed operators and rejects wrong key types', async () => {
  const programme='operator clean(world: record): record = withoutField(world, "temporary");\n' +
    circuit('emit fields(clean({temporary: true, name: "Atlas"}));');
  const artifact=compileTyped(programme);
  assert.deepEqual(inspectOperators(artifact.executable).diagnostics,[]);
  assert.deepEqual((await execute(artifact.executable)).output,[['name']]);
  assert.ok(errors(circuit('emit withoutField({}, 7);')).diagnostics.some(d=>d.code==='type-mismatch'));
});

test('legacy named match operator coexists with match Unknown expression', async () => {
  const programme='operator match(value: text, status: text): number = if value == status then 1 else 0;\n' +
    circuit('emit match("observed", "observed"); emit match unknown { unknown: "open", else: "known" };');
  const artifact=compileTyped(programme);
  assert.deepEqual((await execute(artifact.executable)).output,[1,'open']);
});

test('legacy three-argument Wonder preserves evidence alongside unary Wonder', async () => {
  const programme=circuit('emit wonder("What is known?", ["Evidence can change"], [{source: "Atlas"}]); emit wonder("What remains open?");');
  const artifact=compileTyped(programme);
  const result=await execute(artifact.executable);
  assert.deepEqual(result.output[0],{schema:'wyrdrune.wonder/v0.1',status:'open',question:'What is known?',perspectives:['Evidence can change'],evidence:[{source:'Atlas'}]});
  assert.equal(result.output[1].status,'open');
  assert.ok(errors(circuit('emit wonder("Question", ["perspective"]);')).diagnostics.some(d=>d.code==='call-arity'));
});
