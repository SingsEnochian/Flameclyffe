// GESTALT-01 crossing: kernel sovereignty, crash consistency, revocation fencing,
// and the adversarial transformations Rarity specified.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const M = require('../lib/wayglass-mobius.cjs');
const X = require('../lib/wayglass-crossing.cjs');
const { digest } = require('../lib/wyrdrune/canonical.cjs');

// Two quads, each with private knowledge; each round each sends its running value to the other.
function world({ delayB = null, nondeterministicB = false } = {}) {
  const authority = X.createAuthority(); const channel = X.createChannel(); const log = X.createCoordinatorLog();
  const journals = { A: [], B: [] }; let crossing = null; let flip = 0;
  const make = (name, priv, previous = null, journalTail = null) => M.createLineage({ system: `crossing-test/${name}`, participant: name,
    seeds: { v: 0, round: 0 }, previous, journalTail, limits: { phaseTimeoutMs: 50 },
    journal: { write: async e => journals[name].push(JSON.parse(JSON.stringify(e))) } });
  const lineages = { A: make('A', 3), B: make('B', 5) };
  const quads = [];
  const phasesFor = (name, priv, peer, cap, outbox) => ({
    perceive: async ctx => {
      if (name === 'B' && delayB) await delayB();
      const prev = ctx.carried.round > 0 ? `x${ctx.carried.round - 1}` : null;
      const inbox = prev ? channel.inbox(prev, ctx.root) : [];
      return { got: inbox.map(p => p.body.v) };
    },
    compress: async () => ({}), release: async () => [],
    verify: async () => [{ ok: true }], integrate: async () => ({}),
    choose: async (ctx, o) => {
      const v = ctx.carried.v + priv + o.perceive.got.reduce((s, x) => s + x, 0) + (nondeterministicB && name === 'B' ? ++flip : 0);
      const packet = X.makePacket({ crossing, round: ctx.carried.round, from: ctx.root, participant: name, to: peer(), body: { v } });
      outbox.packets.push(packet);
      ctx.stage(X.fenced({ kind: 'publish', idempotent: true, apply: async () => channel.publish(packet), undo: async () => channel.retract(packet) }, cap, authority));
      return { v };
    },
    transcend: async (ctx, o) => ({ v: o.choose.v, round: ctx.carried.round + 1 }),
  });
  const caps = { A: authority.grant('A'), B: authority.grant('B') };
  for (const [name, priv] of [['A', 3], ['B', 5]]) {
    const outbox = { packets: [] };
    const peer = () => lineages[name === 'A' ? 'B' : 'A'].root;
    quads.push({ name, priv, lineage: lineages[name], participant: name, cap: caps[name], outbox, phases: phasesFor(name, priv, peer, caps[name], outbox) });
  }
  const restore = name => {
    const q = quads.find(x => x.name === name);
    const commits = journals[name].filter(e => e.kind === 'commit').map(e => e.checkpoint);
    const lineage = make(name, q.priv, commits.at(-1) || null, journals[name].at(-1) || null);
    lineages[name] = lineage;
    const outbox = { packets: [] };
    return { ...q, lineage, outbox, phases: phasesFor(name, q.priv, () => lineages[name === 'A' ? 'B' : 'A'].root, q.cap, outbox) };
  };
  const cross = async (id, opts = {}) => { crossing = id; return X.runCrossing({ id, quads, log, authority, ...opts }); };
  return { authority, channel, log, journals, quads, lineages, cross, restore, setCrossing: id => { crossing = id; } };
}
const crashAt = (point, quad) => (p, i) => { if (p === point && i === quad) throw new X.CrashSignal(`${p}#${quad}`); };

test('clean crossing: kernel decides durably before any effect; both quads commit; packets cross', async () => {
  const w = world();
  const r = await w.cross('x0');
  assert.equal(r.outcome, 'done');
  assert.deepEqual(w.log.entries('x0').map(e => e.state), ['begun', 'prepared', 'decided', 'applied', 'applied', 'done']);
  assert.equal(w.channel.all().length, 2);
  await w.cross('x1');
  assert.deepEqual(w.quads.map(q => q.lineage.head.carry.v), [3 + 5 + 3, 5 + 3 + 5], 'each quad used what crossed, a cycle later');
});

test('kernel veto (identity substitution) aborts; both quads keep their last valid state; nothing crosses', async () => {
  const w = world(); await w.cross('x0');
  const heads = w.quads.map(q => q.lineage.head);
  const forged = q => q.name === 'B' ? { ...q, participant: 'A' } : q;
  const r = await X.runCrossing({ id: 'x1', quads: w.quads.map(forged), log: w.log, authority: w.authority });
  assert.equal(r.decision, 'abort');
  assert.match(r.reasons[0], /participant-substitution/);
  assert.deepEqual(w.quads.map(q => q.lineage.head), heads, 'no quad state destroyed');
  assert.equal(w.channel.inbox('x1', w.quads[0].lineage.root).length, 0);
});

test('crash after the decision, A applied, B not: recovery replays B and both converge', async () => {
  const w = world(); await w.cross('x0');
  await assert.rejects(w.cross('x1', { inject: crashAt('before-return', 1) }), /simulated crash/);
  const A = w.quads[0]; const B = w.restore('B'); // process died; B restored from its own journal
  const rec = await X.recoverCrossing({ id: 'x1', log: w.log, quads: [A, B], authority: w.authority });
  assert.equal(rec.recovery, 'replayed');
  assert.equal(B.lineage.head.cycle, 2);
  assert.equal(w.channel.all().filter(p => p.crossing === 'x1').length, 2, 'idempotent: no duplicate publishes');
  assert.ok(w.log.entries('x1').some(e => e.state === 'done' && e.recovered));
});

test('crash before any decision: recovery aborts and nothing has crossed', async () => {
  const w = world(); await w.cross('x0');
  const heads = w.quads.map(q => q.lineage.head);
  await assert.rejects(w.cross('x1', { inject: crashAt('prepared', -1) }), /simulated crash/);
  const rec = await X.recoverCrossing({ id: 'x1', log: w.log, quads: [w.restore('A'), w.restore('B')], authority: w.authority });
  assert.equal(rec.recovery, 'aborted');
  assert.equal(w.channel.all().filter(p => p.crossing === 'x1').length, 0);
  assert.deepEqual(['A', 'B'].map(n => digest(w.lineages[n].head)), heads.map(h => digest(h)));
});

test('crash inside B\'s Return (intent journaled, no commit): needs review; the engine refuses to resume B', async () => {
  const w = world(); await w.cross('x0');
  // A process death between B's journaled intent and its commit leaves exactly this persisted state:
  await assert.rejects(w.cross('x1', { inject: crashAt('before-return', 1) }), /simulated crash/);
  w.journals.B.push({ kind: 'intent', root: w.lineages.B.root, cycle: 2, face: 'inner', effects: [{ kind: 'publish', irreversible: false }] });
  assert.throws(() => w.restore('B'), /interrupted during Return/, 'FR-02 refusal holds across crossings');
  const rec = await X.recoverCrossing({ id: 'x1', log: w.log, quads: [w.quads[0], { ...w.quads[1], interruptedInReturn: true }], authority: w.authority });
  assert.equal(rec.recovery, 'needs-review');
  assert.match(rec.reasons[0], /crashed inside Return/);
});

test('replay that diverges from what was prepared is refused, not invented', async () => {
  const w = world({ nondeterministicB: true }); await w.cross('x0');
  await assert.rejects(w.cross('x1', { inject: crashAt('before-return', 1) }), /simulated crash/);
  const rec = await X.recoverCrossing({ id: 'x1', log: w.log, quads: [w.quads[0], w.restore('B')], authority: w.authority });
  assert.equal(rec.recovery, 'needs-review');
  assert.match(rec.reasons[0], /diverged/);
});

test('revocation after the decision is fenced at the effect; no unauthorized commit; stale epochs cannot cross again', async () => {
  const w = world(); await w.cross('x0');
  const r = await w.cross('x1', { inject: (p, i) => { if (p === 'before-return' && i === 1) w.authority.revoke('B'); } });
  assert.equal(r.outcome, 'split');
  assert.equal(r.results[1].status, 'failed-after-commit');
  assert.ok(!w.channel.all().some(p => p.crossing === 'x1' && p.participant === 'B'), 'B published nothing after revocation');
  const again = await w.cross('x2');
  assert.equal(again.decision, 'abort');
  assert.match(again.reasons[0], /quad-1-authority-invalid/);
});

test('delayed messages: a stalled quad is cut off by the watchdog and the crossing aborts cleanly', async () => {
  const w = world({ delayB: () => new Promise(() => {}) });
  const r = await w.cross('x0');
  assert.equal(r.decision, 'abort');
  assert.match(r.reasons[0], /watchdog/);
  assert.equal(w.quads[0].lineage.head, null, 'A did not commit alone');
});

test('Feather raised before the decision: the kernel vetoes and nothing commits', async () => {
  const w = world();
  const r = await w.cross('x0', { feather: () => true });
  assert.equal(r.decision, 'abort');
  assert.match(r.reasons[0], /feather-stopped/);
});

test('a corrupted checkpoint cannot be restored', async () => {
  const w = world(); await w.cross('x0');
  w.journals.B.filter(e => e.kind === 'commit').at(-1).checkpoint.carry.v = 999;
  assert.throws(() => w.restore('B'), /does not match its digest/);
});

test('restart on a fresh runtime process continues the same chains', async () => {
  const w = world(); await w.cross('x0');
  const dir = mkdtempSync(join(tmpdir(), 'gestalt-'));
  const state = join(dir, 'state.json');
  writeFileSync(state, JSON.stringify({ A: w.lineages.A.head, B: w.lineages.B.head }));
  const child = `
    const M = require(${JSON.stringify(require.resolve('../lib/wayglass-mobius.cjs'))});
    const s = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
    const out = {};
    (async () => {
      for (const n of ['A', 'B']) {
        const L = M.createLineage({ system: 'crossing-test/' + n, participant: n, seeds: { v: 0, round: 0 }, previous: s[n] });
        const r = await L.cycle({ perceive: async () => ({}), compress: async () => ({}), release: async () => [], verify: async () => [{ ok: true }],
          integrate: async () => ({}), choose: async () => ({}), transcend: async c => ({ v: c.carried.v, round: c.carried.round + 1 }) });
        out[n] = r.checkpoint;
      }
      require('fs').writeFileSync(process.argv[1] + '.out', JSON.stringify({ pid: process.pid, out }));
    })();`;
  const r = spawnSync(process.execPath, ['-e', child, state], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const { pid, out } = JSON.parse(readFileSync(state + '.out', 'utf8'));
  assert.notEqual(pid, process.pid, 'a different process');
  for (const n of ['A', 'B']) {
    assert.equal(out[n].prev, digest(w.lineages[n].head));
    assert.ok(M.verifyChain(w.lineages[n].root, [w.lineages[n].head, out[n]].filter(Boolean).length === 2 ? [w.journals[n].find(e => e.kind === 'commit').checkpoint, out[n]] : []).ok);
  }
});

test('the kernel governs, never thinks: inspection sees packets and authority, never phases or private state', () => {
  const w = world();
  const trap = new Proxy({}, { get: () => { throw new Error('kernel touched a phase'); } });
  const verdict = X.inspectCrossing({ id: 'x0', quads: w.quads.map(q => ({ ...q, phases: trap, priv: trap })), packets: [], authority: w.authority });
  assert.equal(verdict.allowed, true);
});
