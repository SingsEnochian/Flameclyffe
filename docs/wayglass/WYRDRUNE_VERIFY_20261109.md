# Wyrdrune · a Verify that can say no

**Date:** 2026-11-09 · **Author:** Faer Uial (WTL language architect) · **Authorised by:** Rowan: *"Permission to build, granted."*
**Stacked on:** #588, where Wyrdrune has one home: the portable `runtime.mjs` with operators and `carry`.

## Why

In v0.1, Verify was a label. Nothing in it could fail, and every `emit` reached the output the moment it ran. So when something went wrong later in a cycle, its effects had already escaped, and "Return" in a receipt was a word rather than a guarantee. RFC-0001 L1 makes the Eightfold promise true: **Verify, then commit.**

## What a scoped cycle now does

This applies to every `mobius scoped` unit, and to every unit through `lineage-backend.cjs`.

| | Before Return | At Return | After Return (Transcend) |
|---|---|---|---|
| `emit` | **staged** | staged emits commit, in order | goes straight to output |
| a failed `require`, or a fault | cycle **rolls back**: nothing staged survives, the carry does not cross, the lineage stops (`status: 'rolled-back'`) | | committed work **stands**, the carry does not cross, the lineage stops (`status: 'halted'`) |
| cycle completes | | | carry crosses; checkpoint written |

- **`require expr [else "reason"];`** is allowed only in Verify, and only in a scoped unit. The stable diagnostics are `require is only allowed in verify` and `require requires a scoped mobius unit`. `require` passes only on `true`. `false` and `unknown` both fail it, with the `else` reason or a default.
- **Verdicts.** `result.verdict = {status:'failed', unit, phase, reason, committed_output}`. It is `null` when everything committed.
- **Hard stops are not verdicts.** Feather, the operation budget, a denied or unauthorised bridge, a missing ritual register and malformed IR all throw `WyrdruneHardStop`. A security refusal is never quietly downgraded.
- **Checkpoints.** Each completed scoped cycle writes `{cycle, face, prev, state, carry}`. Faces alternate outer and inner. `prev` chains to `lineage.root`, which is `digest({source_hash, ir_digest, seeds, participant, intent})`; `intent` stays `null` until L2 header syntax exists.

## Expressions

- **Comparisons:** `== != < <= > >=`. Ordering needs numbers. Equality takes numbers, text or truth values; different kinds are simply unequal. Comparisons don't chain.
- **Truth values:** `true` and `false`.
- **`unknown`:** the first-class open value, encoded as `{"wtl":"unknown"}`. Any comparison involving it is `unknown`.
- **`and`, `or`, `not`:** Kleene logic. `false and unknown` is `false`; `true or unknown` is `true`. Both sides are always evaluated, so every backend counts the same operations.
- Arithmetic on `unknown` or truth values is a fault.

## Compatibility

Plain `mobius` keeps exactly the v0.1 behaviour: shared environment, immediate emits, faults that throw. Fields such as `status`, `verdict`, `checkpoints` and `lineage` appear only when a programme uses scoped units or seeds. Her owner StorySoundscape score's stored IR still equals recompilation.

Living Learning, which is scoped, produces identical output, because staged emits commit in the same order. Bridge calls still run when they are reached: hosts' bridges must be reads or idempotent until RFC §8 effect staging.

## Evidence (observed locally on this tree)

- **RFC-0001 conformance via `lineage-backend.cjs`: L0 5/5 and L1 7/7, claimed and passing.** L2 (6 fixtures) remains `todo`.
- JS/Python parity: **27/27**. That covers verdicts, staging, Kleene logic, halts and a seeded mid-lineage rollback with byte-identical checkpoint chains.
- `wayglass:test` **545 pass, 0 fail**. Its 19 todos are 13 v0.1-suite and 6 L2.
- `wayglass:test:host` **79/79**, gates 6–8 **63/63**, `contracts:verify` passes.
- Builds pass.
- Real Chrome: deck and Acoustic gate passed in all 5 profiles; First Contact gate **10/10**.

## Not claimed

- **L2 is not done.** That covers header seeds, `cycles N`, `until stable` and `intent`.
- **Bridge effects are not staged yet** (RFC §8).
- **The Return Engine does not yet persist checkpoints or the carry.**
- No model was invoked. Nothing was deployed.
