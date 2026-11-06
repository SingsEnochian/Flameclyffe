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

> **⚠ Corrected by the later post-hoc investigation (below).** The "perfect-correction ceiling" above told each quad, as an oracle, which of its constraints was false. That is more than the quads know between them. Against the honest ceiling (what their *pooled* information identifies), 92 of the 99 S tasks cannot be solved by any protocol that does not guess. On those, keeping the ambiguity was the correct behaviour. The paragraph above is kept as written, because it is what I concluded at the time.

**H6 is supported. Outside S, correction is redundant again.** Möbius did correct both quads in 79.4% of these tasks. But bus_transformed solved the same 79.4% anyway, because the masks pin the answer without the drop. This replicates D2's H2 on fresh seeds.

**Spiral growth is still not success (exploratory).**
- Within a protocol it tracks success: E1 ρ ≈ 0.85 held_out for mobius, bus_transformed and mobius_half.
- The bus still grew more than one-way or solo (1.74) while it **lost the truth in 100% of tasks**.

## Stage D3 established

1. **The return across the twist is real and bandwidth-independent** in this apparatus: H7 and H7b.
2. ~~**Deductive re-verification has a structural blind spot.**~~ *Superseded by the post-hoc investigation below.* Stratum S mostly selected tasks that the pooled information does not identify. Within the identifiable tasks, each failure has a specific, separable cause.
3. Two D2 results replicate on fresh seeds: verification versus the unverified bus (H8), and the redundancy of correction outside S (H6).
4. The power rule worked as registered: H9 is reported as untested, not as a null.

## Post-hoc investigation: where does information fail to become usable?

These are diagnostics run after the fact, at Rarity's request, with no decision rule. **The registered D3 verdicts above are unchanged.**

**1. The replica earned trust first** (`DIAGNOSTIC-D3-crossings-posthoc.json`, `scripts/gestalt-01-d3-replica.mjs`).
- An exact replica of the mobius quad logic matched the apparatus at **3,200 of 3,200** quad-rounds on all 400 held_out tasks.
- It matched on every one of these fields: candidate set (digest), emitted mask, packet received (and that it was exactly the peer's emission, from the peer's root), correction decision, carried state in, and the lineage's checkpoint carry.
- First mismatch: none.
- The apparatus gained a read-only `instrument` option for this. Stage D still reproduces digest-identically with it in place.

**2. The counter means what was assumed.** In 400 of 400 tasks, `errors_caught === 2` held exactly when both quads' actual `dropped` arrays held their own false constraint. No quad ever dropped more than one constraint.

**3. The honest ceiling is identifiability, not an oracle** (`DIAGNOSTIC-D3-identifiability-posthoc.json`). A task is *identifiable* when exactly one world satisfies the task's own rule (each quad holds exactly one false constraint) given both quads' private information pooled.

| | tasks | identifiable | apparatus solved (identifiable) | apparatus solved (unidentifiable) |
|---|---|---|---|---|
| S | 99 | **7** | 0 | 0 |
| not S | 301 | 242 | **239** | 0 |

- Across 151 unidentifiable tasks, the apparatus never claimed a joint answer, never lost the truth and never dropped a true constraint. That is **correct abstention**.
- The apparatus solved **239 of the 249 identifiable tasks (96.0%)**.

**4. The ten identifiable failures dissociate cleanly** (`DIAGNOSTIC-D3-dissociation-posthoc.json`). Each variant changes one thing, and each failure yields to exactly one of them:

| cause | tasks | 8 rounds | lossless channel | task's "exactly one" rule |
|---|---|---|---|---|
| **Discarded premise.** The protocol tolerates *at most one* own violation, but the task states *exactly one*. One quad keeps a world that breaks none of its own constraints, which the stated rule excludes. | 7 (all in S) | no | no | **yes** (0 wrong drops, truth kept) |
| **Convergence time.** The pair masks reach the answer, just after round 4. | 3 (all outside S) | **yes** | **yes** | no |

**5. The mechanism chain** (L0 latent in the peer's truths, then L1 in the peer's belief, L2 encoded in its mask, L3 received, L4 recognised by the rule; in the crossings diagnostic). The "shielded" signature (L0 holds, L1 fails) appears on tasks where one-sided oracle correction breaks the impasse. **But oracle runs exceed the identifiability ceiling by construction**, so they show what an oracle could do, not what the pair was entitled to conclude.

**So, Rarity's question:** *can two quads each hold evidence sufficient to correct the other, yet fail because the protocol never makes it actionable?* In this apparatus, **yes, in exactly 10 of 400 tasks**, and for two separable reasons:
- a premise both quads were given but the protocol never used;
- a round budget slightly too short for the slowest convergences.

Elsewhere the "failure" was the evidence genuinely not deciding the answer, and the quads were right not to pretend it did.

## Next
- **D4 (to pre-register):**
  - Stratify every task family by **identifiability** (task-only, computed before any protocol runs) as well as by S.
  - Test the "exactly one" rule as a registered protocol arm. Test a **round budget of 8** against 4.
  - Make **false joint answers on unidentifiable tasks** a co-primary outcome, so that any rule which "solves" more by guessing is caught.
  - Any *non-deductive* revision rule (proposed across the twist, checked by the peer) must be scored against the identifiability ceiling, never the oracle one.
  - Enlarge shifted so the strata reach the power minimum.
- **Stage M:** model-driven quads on frozen tasks.

## Not claimed
These are deterministic quads, so a positive G here is largely by construction. D3 shows that the apparatus can separate the return from bandwidth under the continuity contract. The post-hoc work shows that it can tell *unidentifiable* tasks apart from *unsolved* ones. It is not evidence of emergent coordination or cognition.
