# GESTALT-01 · stage D report (deterministic quads)

**Author:** Faer Uial · 2026-11-06 · proposed by Rarity, approved by Rowan
**Pre-registration:** `PREREGISTRATION.json` (commit `b912aaf`, sha256 prefix `36ace7a8111d4760`), amended *before main data collection* by `AMENDMENT-1.json` (pairwise mask encoding, `b948294`) and `AMENDMENT-2.json` (independent proposals; the scorer never combines, `2d7ec64`).
**Apparatus:** commit `5fa5b99`. **Raw results:** `RESULTS-stage-D.json` (1,000 trials: 200 tasks × 5 protocols; Node v22.23.4; 3 min 6 s).

## Verdict

**No pre-registered hypothesis is supported.** Each 95% confidence-interval lower bound is 0.000, and the rule required it to be above 0.

| Hypothesis | Set | G (mean) | 95% CI | Supported |
|---|---|---|---|---|
| H1 mobius − bus | held out | 0.020 | [0.000, 0.050] | no |
| H2 mobius − bus_transformed | held out | 0.000 | [0.000, 0.000] | no |
| H3 mobius − mobius_noflip | held out | 0.020 | [0.000, 0.050] | no |
| H4 mobius − bus | shifted | 0.010 | [0.000, 0.030] | no |

**Integrity:** 0 invalid trials of 1,000. No identity substitution, no commit without a durable decision, no fabricated provenance, no broken continuity chain.

## Why: a floor effect

Joint success (both quads independently proposing the same, correct answer) was 0–2% for every protocol. With 4 rounds and a 47-byte pairwise mask, the tasks were too hard for any protocol to finish. A primary outcome stuck at the floor cannot separate protocols. **This is a calibration failure of the task design, and it is mine.** It is not evidence for or against the topology.

H2 is the most informative null. Möbius and the transformed bus are identical because receiver re-verification almost never fired: 0.06 false constraints caught per task on held out. At this budget the incoming masks rarely made any single own constraint provably impossible, so the mechanism H2 isolates never got to act.

## What the apparatus did show (secondary measures, pre-registered as descriptive)

| held out | mobius | bus_transformed | mobius_noflip | solo | bus |
|---|---|---|---|---|---|
| truth eliminated from a quad's set | **0%** | 0% | 0% | 0% | **100%** |
| information retained (bits of 13.93) | **8.86** | 8.86 | 6.91 | 5.95 | 2.86 |
| false constraints caught / task | 0.06 | 0.00 | 0.01 | 0.00 | 0.00 |
| true constraints wrongly dropped | 0 | 0 | 0 | 0 | 0 |
| payload bytes / task | 376 | 376 | 188 | 0 | 376 |

The shifted set shows the same pattern (8.47 / 8.47 / 6.96 / 6.45 / 2.05 bits; bus truth loss 100%).

- **An unverified bus is destructive.** Trusting a partner's unverified summary eliminated the true answer in *every* task. Verification at the twist preserved it in every task.
- **The return across the twist carries information.** Two-way Möbius retained about 2 more bits than the one-way ablation, on both sets. That is *not* a coordination gain. The one-way ablation also carries half the bytes, and bytes are the confound flaw 1 warned about. The comparison with equal bytes is Möbius vs the transformed bus, and there the difference is zero.
- **Error correction works, but rarely.** It caught false constraints and never dropped a true one. It just had too little to act on.

## Developmental history

Mean candidates per quad by round (held out; shifted shows the same shape):

| round | mobius | bus_transformed | mobius_noflip | solo | bus |
|---|---|---|---|---|---|
| 1 | 430.5 | 430.5 | 430.5 | 430.5 | 32.0 |
| 2 | 249.1 | 249.1 | 346.7 | 430.5 | 4.2 |
| 3 | 164.4 | 164.4 | 346.7 | 430.5 | 4.2 |
| 4 | 143.5 | 143.5 | 346.7 | 430.5 | 4.2 |

- **Two-way crossings keep narrowing** every round while keeping the truth.
- **One-way stalls after its first exchange.**
- **The bus collapses fastest, onto the wrong answers.** It is down to about 4 candidates by round 2, and the truth is not among them in any task. Fast convergence is not correctness, which is Rarity's warning about growth versus success, seen in the data. (An earlier draft of this report said the bus 'stalls once its intersection empties'; the data shows it stalls on a small wrong set instead.)

## What stage D established

1. The apparatus **runs every protocol under identical budgets**, enforces the continuity contract (0 violations), and **distinguishes the protocols** on secondary measures.
2. Two scoring defects were caught **before** main data collection and fixed by registered amendment: a lossy encoding, and a scorer that combined private sets itself.
3. The task family as registered **cannot test the primary hypotheses**, because of the floor effect.

## Next (requires a *new* pre-registration, not an amendment)

Stage D2 must calibrate difficulty **before** seeing outcome data. Pre-register a pilot criterion, e.g. "choose the round count at which `bus_transformed` reaches 30–70% joint success on a separate calibration seed range", and freeze it. Then rerun H1–H4 on fresh held-out seeds. Only after that is stage M (model-driven quads) meaningful.

## Not claimed

No coordination advantage, no emergent cognition, no evidence about model-driven quads. In stage D the quads are deterministic programs, and any G here would have been largely by construction. This one is zero or not distinguishable from zero.
