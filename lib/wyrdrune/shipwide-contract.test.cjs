'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { digest } = require('./canonical.cjs');
const mobius = require('../wayglass-mobius.cjs');

async function cell() {
  const { PHASES, createWyrdruneRuntime } = await import('./runtime.mjs');
  const source = fs.readFileSync(path.join(__dirname, 'shipwide-cell.wtl'), 'utf8');
  const runtime = createWyrdruneRuntime({hashSource: digest, continuityDigest: digest});
  return { PHASES, runtime, source, ir: runtime.compile(source) };
}

test('shipwide cell compiles against the canonical Eightfold phases and WCE-1', async () => {
  const { PHASES, ir } = await cell();
  assert.deepEqual(PHASES, ['perceive','compress','release','verify','integrate','choose','return','transcend']);
  assert.equal(typeof mobius.createLineage, 'function');
  assert.match(digest({ value: 3 }), /^wce1:[a-f0-9]{64}$/);
  assert.equal(ir.schema, 'wyrdrune.ir/v0.1');
  assert.equal(ir.units.length, 1);
  assert.deepEqual(ir.units[0].phases.map(p => p.phase), PHASES);
});

test('shipwide WTL cell executes a real carried crossing with Return receipt', async () => {
  const { runtime, ir } = await cell();
  const result = await runtime.execute(ir, { seeds: { value: 0 } });
  assert.equal(result.status, 'committed');
  assert.deepEqual(result.output, [3]);
  assert.equal(result.continuity.carry.value, 3);
  assert.equal(result.continuity.carry_digest, digest({ value: 3 }));
  assert.equal(result.checkpoints.length, 1);
  assert.equal(result.checkpoints[0].face, 'outer');
  assert.equal(result.withness.completedCycles, 1);
  assert.equal(result.receipts.some(r => r.phase === 'return'), true);
});

test('Feather stops a WTL cell before execution without producing a Return receipt', async () => {
  const { runtime, ir } = await cell();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(runtime.execute(ir, { seeds: { value: 0 }, signal: controller.signal }), /Feather/);
});

test('a failed Verify cannot publish staged WTL output', async () => {
  const { runtime, source } = await cell();
  const denied = source.replace('expanded == 3', 'expanded == 999');
  const result = await runtime.execute(runtime.compile(denied), { seeds: { value: 0 } });
  assert.equal(result.status, 'rolled-back');
  assert.deepEqual(result.output, []);
  assert.equal(result.receipts.some(r => r.phase === 'return'), false);
  assert.equal(result.continuity.carry.value, 0);
});

test('two Möbius cells preserve immutable identity spin while transforming carried value', async () => {
  const { runtime } = await cell();
  // Both cells have independent lexical scopes. Only explicit carry crosses.
  const source = `
    operator advance(x) = x + 1;
    mobius scoped {
      perceive { let observed = value; }
      compress { let compact = advance(observed); }
      release { let changed = compact; }
      verify { require spin == 7 else "identity spin changed"; }
      integrate { withness {participants: [{id: "cell-a", role: "participant", presence: true, agency: "free"}, {id: "cell-b", role: "participant", presence: true, agency: "free"}], field: changed, agreement: "proposal", commitment: "retain separate identity"}; }
      choose { let chosen = changed; }
      return { emit chosen; }
      transcend { carry value = chosen; carry spin = spin; }
    }
    mobius scoped {
      perceive { let observed = value; }
      compress { let compact = advance(observed); }
      release { let changed = compact; }
      verify { require spin == 7 else "identity spin changed"; }
      integrate { withness {participants: [{id: "cell-a", role: "participant", presence: true, agency: "free"}, {id: "cell-b", role: "participant", presence: true, agency: "free"}], field: changed, agreement: "proposal", commitment: "retain separate identity"}; }
      choose { let chosen = changed; }
      return { emit chosen; }
      transcend { carry value = chosen; carry spin = spin; }
    }`;
  const result = await runtime.execute(runtime.compile(source), { seeds: { value: 0, spin: 7 } });
  assert.equal(result.status, 'committed');
  assert.deepEqual(result.output, [1, 2]);
  assert.deepEqual(result.continuity.carry, { value: 2, spin: 7 });
  assert.equal(result.checkpoints.length, 2);
  assert.equal(result.withness.completedCycles, 2);
});

test('second cell Verify failure retains the first committed Return, not a fictional second crossing', async () => {
  const { runtime } = await cell();
  const unit = expected => `mobius scoped {
    perceive { let observed = value; }
    compress { let compact = observed + 1; }
    release { let changed = compact; }
    verify { require changed == ${expected} else "crossing rejected"; }
    integrate { withness {participants: [{id: "cell-a", role: "participant", presence: true, agency: "free"}, {id: "cell-b", role: "participant", presence: true, agency: "free"}], field: changed, agreement: "proposal", commitment: "no forced carry"}; }
    choose { let chosen = changed; }
    return { emit chosen; }
    transcend { carry value = chosen; }
  }`;
  const result = await runtime.execute(runtime.compile(unit(1) + unit(99)), { seeds: { value: 0 } });
  assert.equal(result.status, 'rolled-back');
  assert.deepEqual(result.output, [1]);
  assert.equal(result.continuity.carry.value, 1);
  assert.equal(result.checkpoints.length, 1);
});

test('cell cannot call a provider without owner authorisation or available capability', async () => {
  const { runtime } = await cell();
  const source = `mobius scoped {
    perceive { let signal = 1; }
    compress { let compact = signal; }
    release { let changed = compact; }
    verify { require changed == 1; }
    integrate {}
    choose { let proposed = bridge("model", "review", changed); }
    return { emit proposed; }
    transcend { carry value = changed; }
  }`;
  const ir = runtime.compile(source);
  let invoked = 0;
  const bridges = {model: {review: async () => { invoked++; return "untrusted"; }}};
  await assert.rejects(runtime.execute(ir, {seeds: {value: 0}, bridges}), /verified owner authorization/);
  assert.equal(invoked, 0, 'unauthorised provider must not be invoked');
  await assert.rejects(runtime.execute(ir, {seeds: {value: 0}, principal: {id: "owner", authorized: true}}), /capability unavailable/);
  assert.equal(invoked, 0, 'missing provider capability must fail closed');
});

test('provider crossing requires host-side per-request consent, even for authenticated owner', async () => {
  const { runtime } = await cell();
  const source = `mobius scoped {
    perceive { let signal = 1; }
    compress { let compact = signal; }
    release { let changed = compact; }
    verify { require changed == 1; }
    integrate {}
    choose { let proposed = bridge("model", "review", changed); }
    return { emit proposed; }
    transcend { carry value = changed; }
  }`;
  const ir = runtime.compile(source);
  let invoked = 0;
  const handler = async ({principal}) => {
    if (principal?.externalProviderConsent !== true) throw new Error('Explicit external provider consent required');
    invoked++;
    return 'proposal-only';
  };
  const denied = await runtime.execute(ir, {
    seeds: {value: 0}, principal: {id: 'owner', authorized: true},
    bridges: {model: {review: handler}},
  });
  assert.equal(denied.status, 'rolled-back');
  assert.equal(denied.verdict.phase, 'choose');
  assert.deepEqual(denied.output, []);
  assert.equal(invoked, 0);
  const allowed = await runtime.execute(ir, {
    seeds: {value: 0}, principal: {id: 'owner', authorized: true, externalProviderConsent: true},
    bridges: {model: {review: handler}},
  });
  assert.equal(allowed.status, 'committed');
  assert.deepEqual(allowed.output, ['proposal-only']);
  assert.equal(invoked, 1);
  // This is a mock bridge, not evidence of a real provider invocation.
});
