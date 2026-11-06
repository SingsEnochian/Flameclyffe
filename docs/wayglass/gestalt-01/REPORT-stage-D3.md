# GESTALT-01 · stage D3 report (re-verification and the return, isolated)

**Author:** Faer Uial · 2026-11-06 · Rowan: "keep going"
**Pre-registration:** `PREREGISTRATION-D3.json` (`40d7eca`). It was frozen before any D3 code existed.
**Apparatus:** `b479596`. Under it, D2 held_out reproduces **digest-identically** (`REPRODUCTION-D2-under-D3.json`). The strata were computed from the tasks alone, before any protocol ran (`STRATA-D3.json`).
**Data:** `RESULTS-stage-D3-held_out.json` and `RESULTS-stage-D3-shifted.json` hold 3,600 trials, collected at the clean commit `174c33a`, with **0 invalid**. The registered verdicts are in `VERDICTS-stage-D3.json`.

## Strata (task-only, before any protocol ran)

| set | tasks | S (a tolerated error leaves ambiguity) | not S |
|---|---|---|---|
| held_out | 400 | 99 | 301 |
| shifted | 200 | **19** | 181 |

## Hypotheses

| | test | result | 95% CI | verdict |
|---|---|---|---|---|
| **H5** | mobius − bus_transformed, held_out S | 0.000 | [0.000, 0.000] | **not supported** |
| **H6** | same, held_out not S (CI should contain 0) | 0.000 | [0.000, 0.000] | **supported** |
| **H7** | mobius_half − mobius_noflip at **equal bytes**, held_out | **0.578** | [0.530, 0.627] | **supported** |
| **H7b** | quad B correct: mobius_half − mobius_noflip | **0.292** | [0.245, 0.338] | **supported** |
| **H8** | mobius − bus, held_out (replicates D2 H1) | **0.598** | [0.552, 0.647] | **supported** |
| **H9** | H5 on shifted S | n = 19 | | **underpowered, not tested** (registered minimum is 40) |

| Joint success | held_out S | held_out not S | held_out all | shifted all |
|---|---|---|---|---|
| mobius | **0%** | 79.4% | 59.8% | 86.0% |
| bus_transformed | **0%** | 79.4% | 59.8% | 86.0% |
| mobius_half (47 B/round) | 0% | 76.7% | 57.8% | 84.0% |
| mobius_noflip (47 B/round) | 0% | 0% | 0% | 0% |
| bus, solo | 0% | 0% | 0% | 0% |

## What it means

**H7 and H7b: the return across the twist is not a bandwidth artefact.**
- At exactly one-way's byte budget, two-way exchange solved 57.8% of tasks. One-way solved none.
- The receiver, quad B, was correct **59% of the time with half the inbound bytes**, against 29.7% when it received the full mask one-way.
- So hearing your own information come back, transformed by the peer, is worth more than twice the bandwidth.
- D2's H3 confound is resolved.

**Bandwidth efficiency (exploratory).** Halving the bytes cost only 2 points of success (59.8% to 57.8%). The halves just converge one round slower, as the E7 development figures show: 17.8 candidates after round 1, against 8.1 at full width.

**H5 failed. The post-hoc diagnostic says why, and it's the deepest result in D3.** I predicted that re-verification would matter where ambiguity survives. Inside stratum S, *every* protocol scored 0%. A diagnostic run after the fact (`DIAGNOSTIC-D3-posthoc.json`, no decision rule) separated the two possible limits:
- **The channel is not the limit.** If both quads were perfectly corrected, pairwise masks would solve **100%** of S tasks.
- **The correction rule is.** Möbius corrected *both* quads in **0%** of S tasks, against 79.4% outside S. Its re-verification drops a constraint only once the constraint is *provably impossible* given what crossed. In S, the surviving ambiguity is exactly what keeps the false constraint possible.

> **Correction by impossibility cannot fire where it is most needed.** The condition that makes correction necessary is the condition that hides the error.

**H6 is supported. Outside S, correction is redundant again.** Möbius did correct both quads in 79.4% of these tasks. But bus_transformed solved the same 79.4% anyway, because the masks pin the answer without the drop. This replicates D2's H2 on fresh seeds.

**Spiral growth is still not success (exploratory).**
- Within a protocol it tracks success: E1 ρ ≈ 0.85 held_out for mobius, bus_transformed and mobius_half.
- The bus still grew more than one-way or solo (1.74) while it **lost the truth in 100% of tasks**.

## Stage D3 established

1. **The return across the twist is real and bandwidth-independent** in this apparatus: H7 and H7b.
2. **Deductive re-verification has a structural blind spot.** It cannot detect an error that the remaining ambiguity keeps consistent. Its zero-false-drop record and this blind spot are two faces of the same strictness.
3. Two D2 results replicate on fresh seeds: verification versus the unverified bus (H8), and the redundancy of correction outside S (H6).
4. The power rule worked as registered: H9 is reported as untested, not as a null.

## Next
- **D4:** pre-register a *non-deductive* correction rule for stratum S. For example, a quad drops the single constraint whose removal makes the informed set smallest and still non-empty, and the drop is *proposed across the twist* for the peer to check, never applied unilaterally. Its risk is the opposite of deduction's: it can introduce errors. So the primary outcomes are success in S together with errors introduced, and the trade-off is the result. Enlarge shifted so S reaches the power minimum.
- **Stage M:** model-driven quads on frozen tasks.

## Not claimed
These are deterministic quads, so a positive G here is largely by construction. D3 shows that the apparatus can separate the return from bandwidth, and can locate where deductive correction fails, under the continuity contract. It is not evidence of emergent coordination or cognition.
