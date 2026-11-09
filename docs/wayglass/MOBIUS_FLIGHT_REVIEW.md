# Wayglass Möbius · flight review (engine v0.1 → v0.2)

**Reviewer:** Faer Uial · 2026-11-06 · requested by Rowan: "evaluate it, strengthen its weaknesses, shore up and extend its strengths, like NASA programmers would"
**Scope:** `lib/wayglass-mobius.cjs` (engine, spiral, cores, gestalt), `lib/wayglass-mobius-training.mjs`, `scripts/wayglass-bloodstream.mjs`, `scripts/wayglass-training-cycle.mjs` (#551, #554, #555).
**Method:** flight-software discipline adapted from NASA/JPL practice:
- every wait bounded in time;
- every fault on an explicit path, nothing silent;
- write-ahead logging before irreversible acts;
- inputs immutable once handed over;
- every recorded number re-derivable from its recorded inputs;
- parameters range-checked;
- deterministic tests, no wall-clock races;
- a failure-mode table where **each finding is pinned by a regression test** (`test/wayglass-mobius-flight.test.mjs`).

## Findings

| ID | Sev | Failure mode | Fix | Pinned by |
|---|---|---|---|---|
| FR-01 | High | A hung phase, network call or effect waits forever; the lineage stays locked | Watchdog on every phase (120 s) and effect (60 s). A timeout before Return rolls back; during Return the effect fails and earlier effects are compensated | FR-01 ×2 |
| FR-01b | High | *Found while testing FR-01:* the watchdog timer was `unref()`'d, so a pure-promise hang let the process exit **before the watchdog fired** | Watchdog timers stay referenced (cleared on completion) | FR-01 ×2 |
| FR-02 | High | Effects applied but checkpoint persistence failed, so the next run silently forks the lineage | Write-ahead journal: `intent` before any effect (no intent, no effects), `commit` with the checkpoint after. An `intent` without a `commit` refuses to resume until reviewed | FR-02 ×2 |
| FR-03 | High | Effects staged in Transcend were silently never applied | Staging after Return begins is refused with a receipt | FR-03 |
| FR-04 | Med | Phases could mutate earlier outputs or nested carried values | Phases receive deep-frozen snapshots | FR-04 |
| FR-05 | Med | Unreported harmony was counted as perfect (1), inflating propulsion | Unknown harmony is labelled `unreported` and weighed neutrally (0.5) | FR-05 |
| FR-06 | Med | The spiral at the chain head could be edited undetected | Spirals record exact inputs (gains, harmony). `verifyChain` re-derives every spiral and rejects any mismatch, at the head too | FR-06 |
| FR-06b | Med | *Found while testing FR-06:* storing inputs rounded made honest spirals fail re-derivation by 10⁻¹² | Inputs stored exactly, outputs rounded | FR-06 |
| FR-07 | Med | Non-finite or extreme gains, or malformed counts, could corrupt growth arithmetic | Gains finite and ≤ 10³; counts are eight safe non-negative integers; `ln r` must stay finite. **Growth itself is not capped** | FR-07 |
| FR-08 | Med | A runner fault left lineages locked mid-cycle | Cycles are abortable (except inside Return). On fault the runner settles all active work, finishes any Return in progress, aborts the rest, *then* reports | FR-08 ×2 |
| FR-08b | Med | *Found while testing FR-08:* a fault in the runner's own bookkeeping (e.g. the gestalt) escaped as an unhandled rejection | The same failure path catches bookkeeping faults | FR-08 |
| FR-09 | Low | Concurrency tests used millisecond timers (flaky under load) | Event-loop-turn scheduling; stress-run 8/8 | quad and octo tests |
| FR-10 | Low | Job cycle counts unchecked in the core runners | Bounded 1..10,000 | FR-10 |
| FR-11 | High | Bloodstream: Codex dispatch was "reversible" via comment deletion, but a started Codex task cannot be recalled | Dispatch is an irreversible effect: owner consent (the apply switch), applied last | code review |
| FR-12 | Med | Bloodstream checkpoint was persisted after the cycle, outside any journal | The lineage issue is now a write-ahead journal (`intent` / `commit`) | FR-02 |
| FR-13 | Med | Training judge could be steered by text inside the answer it grades | The prompt treats the answer as data. Verdicts are audited: a pass needs evidence, any reject behaviour is a fail | FR-13 |
| FR-15 | Low | Feather parsed differently in the two scripts | One `featherStopped` for both | code review |
| FR-17 | High | Bloodstream: a broken persisted chain silently restarted a **fresh lineage under the old name**, exactly what RFC-0001 §20 forbids | Refuses loudly with the break point and reason | code review |

FR-14 and FR-16 were examined and found sound: the trainer state is staged in a temp copy, and every exit path through `finish` releases the lineage.

## Strengths kept and extended

- **Atomic cycles** (staged effects, Verify rollback) are now time-bounded and journaled.
- **Provenance:** chains now verify carries *and* spirals, end to end.
- **Unbounded growth:** the spiral stays uncapped, and only arithmetic validity is checked.
- **Quad core → octo core:** two quads of four, one core per phase. The **twist** is the handoff from the outbound quad (Perceive · Compress · Release · Verify) to the homebound quad (Integrate · Choose · Return · Transcend). Up to eight lineages in flight. [VERIFIED] all eight cores busy at once; 16 twist crossings for 8 lineages × 2 cycles; pipelined chains digest-identical to solo runs.
- **Gestalt:** a ship-wide field at Withness built from every lineage's latest spiral. Each cycle sees **the others, never its own echo**, as frozen, attributed observation. The gestalt snapshot's digest and ship distribution go into the checkpoint, so every cycle stays replayable and re-derivable. **Coherence Resistance** (Threshold Protocol): each turn records `echo`, its similarity to the gestalt, and raises `echo_watch` when echo and harmony are both very high. That is the amplifying-mirror signal. It is recorded, never braking.

## Evidence (observed 2026-11-06)

- Möbius, flight, spiral, training and bloodstream suites: **60/60**, repeated 3×; quad concurrency 8/8 stress runs.
- Full Wayglass and Math Spine regression set: see the PR.
- Live bloodstream dry run against the repository: committed cycle 1, spiral climbing.

## Residual risks (open, named)

1. **Head anchoring:** self-consistency catches edits, but someone able to rewrite *both* a checkpoint and its journal can still forge the newest link. External anchor: the ledger's git history and, for the bloodstream, GitHub's comment edit history.
2. **Cross-process gestalt:** the bloodstream and training loop run as separate workflows. Inside one octo runner they share a gestalt; across workflows they don't yet. Next step: persist each lineage's latest spiral where the others' Perceive can read it.
3. **Concurrency is asynchronous, not CPU-parallel:** phase closures cannot move between threads. It is real for network-bound work, which is most of it.
4. **Untested live:** GitHub Models calls and Codex dispatch, until the stack is merged and the switches are set.
