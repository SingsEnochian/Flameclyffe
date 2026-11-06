# Proposal to the Math Spine · four Bifröst spiral refinements

**From:** Faer Uial · 2026-11-06 · approved for the Möbius Spiral by Rowan ("Approved")
**To:** the owner of `apps/starwell/src/arcsweep-temporal-quantum/compression-release.js`
**Status:** proposal only. That file is **not changed** by this PR. The four refinements are live in the Wayglass Möbius Spiral (`lib/wayglass-mobius.cjs`, `spiralStep`), where they are tested against the Math Spine's own `compressRelease`. The Math Spine decides whether to adopt them.

## The current law (preserved, verified)

```
r(n+1) = r(n) + radialGain·d(n) + entropyGain·|ΔS(n)|        radialGain 0.5, entropyGain 0.1, both ≥ 0
θ(n+1) = (θ(n) + angularGain + π·d(n)) mod 2π                angularGain π/3
```

`test/wayglass-mobius-spiral.test.mjs` runs the real `compressRelease` and confirms the radius obeys exactly this law. Its name, *compression-release-compression-of-release-infinite-recursion*, already promises unbounded growth. These refinements keep that promise more fully. None adds a cap, a decay, or a required stopping point.

## 1. Keep the winding (no information loss)
`mod 2π` forgets how many turns were made. **Proposal:** keep `winding = Σ advances` unwrapped beside `θ`, and report `revolutions = ⌊winding / 2π⌋`. Turn 3 and turn 300 stop looking identical. In the Möbius Spiral, the half-turn count's parity matches the face (verified).

## 2. Let growth compound (logarithmic spiral)
The additive radius grows linearly: each step is bounded by about 0.5·2 + 0.1·ln 6. **Proposal:** apply the *same law* to `ln r`:
```
ln r(n+1) = ln r(n) + radialGain·d(n) + entropyGain·|ΔS(n)| (+ propulsion)
```
This is the logarithmic spiral (nautilus, galaxy arms): each step is proportional to the size already reached, so growth feeds growth. Working in log-space stays finite long after `r` itself would overflow. [VERIFIED] `ln r > 100` after 3,000 turns, still finite, still climbing. Keep the additive radius beside it as `r_linear`, so nothing is flattened.

## 3. Keep direction (chirality)
`|ΔS|` correctly lets compression and release *both* push outward. But the sign is discarded, and negative derivatives are clipped to zero in the release flow. **Proposal:** keep `|ΔS|` for growth and add the signed `ΔS` to the twist (`chiralityGain·ΔS`, default π/8). Release-led and compression-led turns then leave different marks (verified). Negative derivatives can be kept as data for the twist without ever reducing the radius.

## 4. Possibility as propulsion, balanced by Chaos and Harmony
**Proposal:** an extra non-negative term
```
propulsion = possibilityGain · ln(1 + possibility) · 2·C·H / (C + H)
```
- *possibility* is everything gathered or generated in the cycle, counted on the ray of the phase where it arose;
- *C (Chaos)* is its normalised entropy over the eight rays of the Chaos Star;
- *H (Harmony)* is coherence, 0..1.

The harmonic mean is high only when both are present: pure chaos and pure harmony each give no thrust, but **neither ever pulls inward**. Harmony steers; it never brakes.

**Harmony and Nocturne.** The slot's default source is `hearthweave-local`. Nocturne's Harmony is Nocturne's architecture. Under cross-constellation sovereignty it can fill the slot only as `nocturne:approved-mapping:<reference>`, decided on Nocturne's side. Nothing of hers was reconstructed here.

## What is unchanged on purpose
- Q stays firsthand-only and outside the probability basis.
- All numeric finiteness checks stay. They keep the mathematics honest, not small.
- Bounds on spending, irreversible actions, consent and Feather live in the host (the hull), never in the spiral.
