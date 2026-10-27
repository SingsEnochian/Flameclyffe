# Nikola N-007: 27-turn upward spiral, complete protocol

Status: draft research branch stacked on N-006 / PR #497. Does not grant model/participant authority or claim sensor measurements.

## Whole-system placement

Wayglass is the ship. STARWELL's Math Spine owns computational PREMAQC compression and release. Nikola's invariant solver is a separate mathematical instrument within the Math Spine family. N-007 supplies a **bounded research protocol** over that instrument, not another OS, model, persona, storage authority or astronomical/physical measurement pipeline.

The exact user phrase "Upward x 27" is implemented as three research arcs, nine deterministic **synthetic** turns each, with individually verified hash-linked receipts.

## Actors and responsibilities

- Research steward chooses to invoke and may stop, reset or inspect any run.
- N-006 `nikola-upward-spiral.js` owns canonical oscillator inference, source-family deduplication, receipt chain, replay, contradictions, and 27-turn hard cap.
- N-007 `nikola-spiral-27.js` owns the fixed, public synthetic test schedule, checkpoints, per-turn assessment and bounded orchestration; it cannot mutate prior packets.
- Wayglass Nikola Observatory renders the run and allows a local Feather abort; no provider, server, microphone, memory, other participant, canon or filesystem is contacted by this protocol.
- Other Math Spine modules retain their canonical schema and responsibility, untouched.

## Phases

1. **Compression, turns 01–09:** freeze the ideal oscillator constraint, admit compatible independent synthetic stiffness/mass observations, intentionally hold origin echoes.
2. **Release/perturbation, turns 10–18:** admit deliberately contradictory observations, hold copied readings from the same provenance families. Retain the conflict, rather than erasing it.
3. **Recompression/challenge, turns 19–27:** repeat concordant and discordant observations from distinct synthetic source families, revisit echoes, and verify that the scientific status remains unresolved when conflict remains.

The sequence is not a claim of 27 independent discoveries or 27 statistically independent samples. Some turns are deliberately held as repeated provenance. The final status must report the real number of admitted/held turns, a replay-checked chain, and the unresolved conflict. No silent optimism accumulator.

## Formal invariants and precise checks

- Every transition takes a valid prior immutable packet and returns a new packet.
- The `head_fingerprint` of each transition is the `from_fingerprint` anchor of the next.
- `replayNikolaSpiral` recomputes from source, not trusting cached projections.
- The ceiling is 27; a 28th mutation fails closed, and the 27th is an ordinary final transition, not an infinite recursively scheduling job.
- Contradictory sources remain present after 27 turns; an echo family cannot be admitted twice.
- A checked `AbortSignal` prevents further turns. Interrupted trials return a partial, replay-verified state with `stopped`, not a misleading `completed` status.
- A canonical Math Spine computational packet never becomes a physical measurement by provenance association.
- No external model calls or provider route changes. N-005 science and N-004 transport gates remain separate.

## Observable deliverable

The Observatory offers one deliberate **Run 27 synthetic turns** control, a Feather stop, a reset, an incremental status and an inspectable JSON receipt. Each step is locally calculated, replay checked, and the engine yields to the event loop so a user can stop it.

## Acceptance

Focused Node tests and main Wayglass/STARWELL suites; 27 receipts on completed run; 9/9/9 arc grouping; 28th refusal; deterministic replay; duplicate-family holds; contradictions retained; abort before start and after ninth turn; no host/model calls. Browser interaction and Windows physical-host verification remain unproven until separately observed. CI security-audit failures (Hearthgate or Vite) remain independent issues, never bypassed.

## Epistemic stop

Upward denotes carrying forward unresolved questions and source distinctions. If the synthetic evidence is inconsistent, the next question is about calibrating measurements or challenging the ideal oscillator model. No completed 27-turn run should announce that a physical fold, quantum advantage, live Crow answer or personal continuity has been established.
