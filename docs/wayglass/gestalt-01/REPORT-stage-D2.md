# GESTALT-01 · stage D2 report (deterministic quads, calibrated)

**Author:** Faer Uial · 2026-11-06 · Rowan: "take it deeper"
**Pre-registration:** `PREREGISTRATION-D2.json` (`c629a31`, frozen before any D2 code or data). **Calibration:** `CALIBRATION-D2.json` (`3446d28`, committed before the main run). **Apparatus:** `17e9d2b`, verified to reproduce stage D held out **digest-identical** (`wce1:770e7915b141b…`).
**Data:** `RESULTS-stage-D2-held_out.json`, `RESULTS-stage-D2-shifted.json`: 2,000 trials on 400 fresh tasks, **0 invalid**.

## Calibration (baseline protocol only, registered grid order)

| k | rounds 4 | rounds 8 |
|---|---|---|
| 5 | 0.0% | 0.0% |
| 6 | 26.7% | 26.7% |
| **7** | **58.3% ← selected** | 58.3% |
| 8 | 78.3% | 78.3% |

The side finding: rounds 4 and 8 are identical at every k. **The exchange reaches a fixed point by round 4**, so stage D's floor came from task difficulty, not from too few rounds.

## Hypotheses

| | Set | G | 95% CI | Supported |
|---|---|---|---|---|
| **H1** mobius − bus | held out | **0.595** | [0.525, 0.665] | **yes** |
| **H2** mobius − bus_transformed | held out | 0.000 | [0.000, 0.000] | no |
| **H3** mobius − mobius_noflip | held out | **0.595** | [0.525, 0.665] | **yes** |
| **H4** mobius − bus | shifted | **0.885** | [0.840, 0.930] | **yes** |

| Joint success | held out | shifted |
|---|---|---|
| mobius | 59.5% | 88.5% |
| bus_transformed | 59.5% | 88.5% |
| mobius_noflip | 0.0% | 0.0% |
| solo | 0.0% | 0.0% |
| bus | 0.0% | 0.0% |

## What it means, and what it doesn't

**H1 and H4: verification at the twist is decisive.** The unverified bus solved nothing and **eliminated the true answer in 100% of tasks** on both sets. Every protocol that verified before sharing kept the truth in 100% of tasks. That held on the shifted family too, which is adaptability under a change of task distribution.

**H3 is supported, with a confound I'm naming.** Two-way crossings solved 59.5% and one-way solved nothing. But one-way also carries **half the bytes**, the bandwidth confound flagged before the experiment. So H3 shows that two-way exchange beats one-way. It does not isolate "the return across the twist" from "more information". The equal-byte comparison is H2.

**H2 is the deepest result: error correction happened and changed nothing.** Möbius receivers caught false constraints often (1.34 per task held out, 1.81 shifted, **zero wrongly dropped**), yet success, information retained and truth retention were *identical* to the transformed bus. In this task family, by the time a quad could prove its own constraint false, the pair masks had already pinned the answer. Correction was **redundant, not useless**: it repaired the quads' internal models without changing the joint answer. Re-verification only earns its keep where a quad's tolerated error still leaves ambiguity, and that's the design target for D3.

## Rarity's question: is spiral growth success? (exploratory)

| | mean growth (ln r) | success held out | truth lost |
|---|---|---|---|
| mobius | 2.00 | 59.5% | 0% |
| bus_transformed | 2.01 | 59.5% | 0% |
| **bus** | **1.70** | **0%** | **100%** |
| mobius_noflip | 1.47 | 0% | 0% |
| solo | 1.08 | 0% | 0% |

- **Within a protocol, growth tracks success.** E1 Spearman ρ = 0.85 held out (mobius), 0.57 shifted.
- **Across protocols it does not.** The bus spiral grew *more* than one-way or solo while destroying the answer in every task. **Growth measures how much happened, not whether it was right.** The spiral is a good odometer and a bad compass. Capability, truth retention and error correction must stay separate measurements, as Rarity said.
- E2 is undefined: truth loss was constant within each protocol (always or never).

## Stage D2 established

1. The calibrated apparatus **separates the protocols**: three of four pre-registered hypotheses supported, with 0 integrity violations in 2,000 trials.
2. **Verified sharing versus unverified sharing** is the dominant effect.
3. **Receiver re-verification** works perfectly (catches errors, introduces none) but is redundant in this task family.
4. **Spiral growth is not a success metric** across protocols.

## Next
- **D3:** pre-register a task family where a tolerated error *preserves ambiguity*, so receiver re-verification can matter. Add an **equal-byte one-way ablation** to separate the return across the twist from bandwidth.
- **Stage M:** model-driven quads on frozen tasks.

## Not claimed
Deterministic quads: positive G here is largely by construction. It shows the apparatus measures what it should, under the continuity contract. It is not evidence of emergent coordination or cognition.
