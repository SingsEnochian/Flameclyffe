// GESTALT-01 D3 · POST-HOC crossing trace (not pre-registered; no decision rule).
// D3's registered results stay sealed; this aims D4, it does not rewrite D3.
//
// Rarity's question: can two quads each hold evidence sufficient to correct the other's
// mistaken belief, yet be unable to correct, because the protocol never exposes that
// evidence in an actionable form?
//
// 1. Fidelity. An exact replica of the mobius quad logic is compared with the real
//    apparatus at EVERY round on: candidate set (digest), emitted mask, packet received,
//    correction decision, and the lineage's carried state (checkpoint carry). The first
//    mismatch, if any, is preserved as its own result and nothing else is reported.
// 2. Counter check: does errors_caught === 2 mean both quads dropped their false constraint?
// 3. The evidence chain, per receiving quad R with false constraint f, per crossing r ≥ 1
//    (peer P's emission at r − 1):
//      L0 latent    — P's TRUE constraints (oracle), with R's carried mask, rule f out
//      L1 believed  — P's actual candidate set at r − 1, with R's carried mask, rules f out
//      L2 encoded   — P's emitted pairwise mask, with R's carried mask, rules f out
//      L3 received  — R's inbox holds exactly P's emitted packet
//      L4 recognised— R's correction rule dropped f
//    For each quad, the first link that fails at its best crossing is its failure mechanism.
// 4. Identifiability: worlds consistent with BOTH quads' pooled private information under
//    the task's rule (exactly one false each). Oracle interventions exceed this ceiling by
//    design and are reported against it, never as achievable targets.
// 5. Interventions (replica only): oracle-correct A; B; both before the first crossing;
//    correct on encoded evidence (L2) even if the rule would decline; correct on latent
//    evidence (L0). These separate information insufficiency, verification deadlock,
//    and correction timing/recognition.
import { writeFileSync } from 'node:fs';
import { makeTask, stratum, runTrial } from '../lib/gestalt-01.mjs';
import { replica, pooledWorlds, key, NAMES, ROUNDS, spec } from './gestalt-01-d3-replica.mjs';

const firstBroken = links => (['L0', 'L1', 'L2', 'L3', 'L4'].find(l => !links[l]) ?? 'none');
const MECH = { L0: 'insufficient: not even the peer\'s truths rule it out', L1: 'shielded: the peer\'s own uncorrected belief hides the evidence',
  L2: 'lost in encoding: the peer\'s belief rules it out but its pairwise mask does not', L3: 'not received', L4: 'not recognised: evidence arrived, the rule declined', none: 'corrected' };

const INTERVENTIONS = { baseline: {}, oracle_A: { oracle: ['A'] }, oracle_B: { oracle: ['B'] }, oracle_both: { oracle: ['A', 'B'] },
  on_encoded_evidence: { policy: 'on-encoded' }, on_latent_evidence: { policy: 'on-latent' } };
const blank = () => ({ tasks: 0, mechanism: {}, deadlock_pairs: 0, solved: Object.fromEntries(Object.keys(INTERVENTIONS).map(k => [k, 0])),
  other_self_corrects: { oracle_A: 0, oracle_B: 0 }, fixed_point: {},
  identifiable: 0, identifiable_solved: { baseline: 0, oracle_A: 0, oracle_B: 0, oracle_both: 0, on_encoded_evidence: 0, on_latent_evidence: 0 }, identifiable_unsolved: [] });
const out = { fidelity: { tasks: 0, rounds: 0, rounds_matched: 0, first_mismatch: null }, counter: { checked: 0, agrees: 0, max_drops_per_quad: 0 }, strata: { S: blank(), notS: blank() } };
const examples = [];
const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };

for (let s = 6001; s <= 6400; s++) {
  const t = makeTask(s, spec); if (!t) continue;
  const st = stratum(t).S ? 'S' : 'notS';
  const rep = replica(t);
  // 1. Fidelity, field by field, every round.
  const real = await runTrial(t, 'mobius', { rounds: ROUNDS, trialId: `trace-${s}`, instrument: true });
  out.fidelity.tasks += 1;
  for (let r = 0; r < ROUNDS; r++) for (const qi of [0, 1]) {
    out.fidelity.rounds += 1;
    const a = real.instrument.rounds.find(x => x.round === r && x.quad === NAMES[qi]); const b = rep.rounds[r][qi];
    const carryA = real.instrument.carries[qi][r];
    const fields = {
      candidate_set: [a?.cands, b.candsDigest],
      emitted_mask: [key(a?.mask ?? []), key(b.mask)],
      received: [key(a?.inbox.map(p => key(p.body.mask)) ?? []), key(b.inboxMask ? [key(b.inboxMask)] : [])],
      correction: [key(a?.dropped ?? []), key(b.dropped)],
      lineage_carry: [JSON.stringify(carryA), JSON.stringify({ mask: b.mask, dropped: b.dropped, round: r + 1 })],
      carried_in: [JSON.stringify(a?.carried_in), JSON.stringify(b.carried_in)],
    };
    // L3 on the apparatus side: the packet received is exactly the peer's emission, attributed to the peer.
    if (r > 0) { const peer = real.instrument.rounds.find(x => x.round === r - 1 && x.quad === NAMES[1 - qi]);
      fields.received_is_peer_emission = [key(peer.mask), key(a?.inbox[0]?.body.mask ?? [])];
      fields.received_from_peer = [real.instrument.roots[1 - qi], a?.inbox[0]?.from]; }
    const bad = Object.entries(fields).find(([, [x, y]]) => x !== y);
    if (!bad) out.fidelity.rounds_matched += 1;
    else if (!out.fidelity.first_mismatch) out.fidelity.first_mismatch = { seed: s, round: r, quad: NAMES[qi], field: bad[0], apparatus: bad[1][0], replica: bad[1][1] };
  }
  // 2. Counter semantics.
  const realDrops = NAMES.map(n => real.history.filter(h => h.quad === n).at(-1).dropped);
  const both = realDrops[0].length === 1 && realDrops[0][0] === t.A.falseIndex && realDrops[1].length === 1 && realDrops[1][0] === t.B.falseIndex;
  out.counter.checked += 1; if ((real.errors_caught === 2) === both) out.counter.agrees += 1;
  out.counter.max_drops_per_quad = Math.max(out.counter.max_drops_per_quad, ...realDrops.map(d => d.length));
  // 3. Mechanism per quad: the first broken link at its best crossing (deepest chain).
  const S = out.strata[st]; S.tasks += 1;
  const mech = [0, 1].map(qi => {
    const chains = rep.rounds.slice(1).map(r => r[qi].links).filter(Boolean);
    if (!chains.length) return 'none'; // corrected before any later crossing was evaluated
    const order = ['L0', 'L1', 'L2', 'L3', 'L4', 'none'];
    return chains.map(firstBroken).sort((x, y) => order.indexOf(y) - order.indexOf(x))[0];
  });
  mech.forEach(m => inc(S.mechanism, MECH[m]));
  if (mech.every(m => m === 'L1')) S.deadlock_pairs += 1; // each side's evidence shielded by the other's error
  const fp = rep.rounds.findIndex((r, i) => i > 0 && r.every((x, qi) => key(x.mask) === key(rep.rounds[i - 1][qi].mask)));
  inc(S.fixed_point, fp < 0 ? 'none by round 3' : `round ${fp}`);
  // 4. Interventions, and the ceiling that needs no oracle: is the task identifiable at all?
  const identifiable = pooledWorlds(t).length === 1;
  if (identifiable) S.identifiable += 1;
  if (identifiable && !rep.solved) S.identifiable_unsolved.push(s);
  for (const [name, opt] of Object.entries(INTERVENTIONS)) {
    const cf = name === 'baseline' ? rep : replica(t, opt);
    if (cf.solved) S.solved[name] += 1;
    if (name === 'oracle_A' && cf.drops[1][0] === cf.falseIndex[1]) S.other_self_corrects.oracle_A += 1;
    if (name === 'oracle_B' && cf.drops[0][0] === cf.falseIndex[0]) S.other_self_corrects.oracle_B += 1;
    if (identifiable && cf.solved) S.identifiable_solved[name] += 1;
  }
  if (st === 'S' && examples.length < 2) examples.push({ seed: s, mechanism: mech.map(m => MECH[m]),
    rounds: rep.rounds.map(r => r.map(x => ({ quad: x.quad, round: x.round, candidates: x.cands.length, impossible: x.impossible, links: x.links, dropped: x.dropped }))) });
}
out.fidelity.ok = out.fidelity.rounds_matched === out.fidelity.rounds;
const doc = { schema: 'wayglass.gestalt-01.diagnostic/v1', status: 'post hoc, exploratory, no decision rule; D3 registered results unchanged',
  set: 'held_out', seeds: [6001, 6400], k: 7, rounds: ROUNDS, links: MECH, ...(out.fidelity.ok ? out : { fidelity: out.fidelity, note: 'replica did not match the apparatus; nothing else is reported' }), examples: out.fidelity.ok ? examples : [] };
writeFileSync(new URL('../docs/wayglass/gestalt-01/DIAGNOSTIC-D3-crossings-posthoc.json', import.meta.url), JSON.stringify(doc, null, 2) + '\n');
console.log(JSON.stringify({ fidelity: out.fidelity, counter: out.counter }, null, 1));
if (out.fidelity.ok) for (const [st, x] of Object.entries(out.strata)) console.log(`\n${st}\n` + JSON.stringify(x, null, 1));
