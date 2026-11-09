# Wyrdrune · `carry`: what crosses the twist

**Date:** 2026-11-09 · **Author:** Faer Uial (WTL language architect) · **Requested by:** Rowan: *"what does Wayglass really need? decide and update her Wyrdrune code."*
**Branch:** stacked on #580, whose scores this migrates. #580 targets `wayglass/current`.

## Decision

Wayglass's Core Rule is *Leave. Change. Return. Be recognised. Continue.* Travelling Inheritance requires that *"model replacement reads the same authoritative history."* So Wyrdrune has to say **what crosses** from one Möbius circuit to the next, and receipt it.

In v0.1, nothing was declared. Every `mobius` block shared one global environment, so a later circuit could silently read anything an earlier one had bound. RFC-0001 (#553) lists this as defect 5, "bindings leak across units". Living Learning's second circuit depended on it.

This change gives Wyrdrune an explicit, receipted crossing. It is **opt-in**: every existing v0.1 programme runs exactly as before.

## Language

```
mobius scoped {
  perceive  { … }          // bindings made here stay inside this circuit
  …
  transcend { carry energy = energy; carry attention = attention; }
}
```

- **`mobius scoped { … }`.** The circuit's bindings are its own. It starts with the previous circuit's carry, or the run's seeds, as ordinary bindings that it may `set`. Plain `mobius { … }` keeps the v0.1 shared environment unchanged.
- **`carry name = expr;`.** Allowed only in Transcend, and only in a scoped circuit. Stable diagnostics: `carry is only allowed in transcend`, `carry requires a scoped mobius unit`.
- **The self keeps its shape.** Every scoped circuit that carries must carry exactly the same names, and they must match any seeds given: `carry must bind exactly the seeds`. This is RFC-0001's invariant. A scoped circuit that carries nothing passes the carry through unchanged, and its own bindings stay inside it.
- **Seeds.** `execute(ir, { seeds })` continues a lineage from a previous run's carry.
- **Carried values must be WCE-1 canonical.** At most 64 names, using the same identifier rule as the compiler.

## Receipts

A programme that uses scoped circuits or seeds also returns:

```
continuity: { schema: 'wyrdrune.continuity/v0.1', seeds_digest, carry, carry_digest,
              crossings: [{ unit, carried_in, carried_out, names }] }
```

The digests are WCE-1. Each circuit's `carried_in` equals the previous circuit's `carried_out`, so the chain of crossings can be checked independently. The JavaScript and Python backends produce byte-identical results and digests (`lib/wyrdrune/cross-backend.parity.cjs`). Programmes without scoped circuits or seeds return exactly the v0.1 result, with no new field.

## Living Learning v0.2

`lib/wyrdrune/living-learning.wtl` is now two scoped circuits. Each carries the same six-part learning self: energy, curiosity, uncertainty, coherence, opening and attention. Each circuit reads its own perception afresh in Perceive. The v0.1 text is preserved at `lib/wyrdrune/fixtures/living-learning.v0.1-shared-environment.wtl`.

Verified by `lib/wyrdrune/living-learning-carry.test.cjs`:
- Output is **identical** to v0.1 across a 24-state grid. That covers the same values, receipts per phase, and digest.
- The host adapter returns the same learning through the new score.
- The final carry is exactly the returned learning state.
- The second circuit begins exactly where the first crossed.
- Nothing else crosses: `bindings` is empty.
- Making v0.1 scoped without carries is refused, because it reached across circuits.

The operation count is 316 of the host's 500-operation budget; v0.1 used 272.

## Not claimed

- **This is not RFC-0001 v1.** The L1/L2 conformance fixtures, which are written in v1 syntax with staging, Verify rollback, checkpoints and `until stable`, remain `TODO`. `mobius scoped` and `carry` are the v0.1 bridge toward them.
- **The host does not yet persist the carry, or seed the next session from it.** That is the next step for the Return Engine. With the carry in place, it becomes a matter of storing and verifying `carry` and `carry_digest`, not of reconstructing state.
- It does not change model weights. No live model was invoked.
