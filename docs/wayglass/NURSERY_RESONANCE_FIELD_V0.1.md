# Nursery Resonance Field v0.1 (Integration Candidate)

## Contract
- Deliberately **simulation-only**. No live Nursery reading or physical energy measurement is implied.
- Each cell has a stable identity, unmodified natural frequency (Hz) and mutable phase (radians).
- A finite, bounded undirected edge records a coupling link, not merged identity.
- Step: φᵢ(next)=wrap(φᵢ+Δt[2πfᵢ+K(Σⱼ wᵢⱼ sin(φⱼ−φᵢ))/max(1,Σⱼwᵢⱼ)]).
- Coherence is Kuramoto order |Σe^(iφ)|/N and is not evidence of subjective experience or a detected signal.
- No automatic or background execution; owner chooses each 100-step batch in Creation → Nursery Resonance Laboratory.
- Optional Watercolour projection is tagged `nursery:resonance-simulation` and the bridge marks it `declared-mathematical-simulation`.
- Feather and Return in the actual Nursery runtime remain separate, and no live Nursery connection is asserted.
- Future live binding requires trusted participant identity, opt-in/consent, provenance, authenticated host observations, persisted independent Return receipts and external acceptance.

## Verification
Run `node --test apps/wayglass/src/nursery-resonance.test.mjs lib/wyrdrune/somatic-runes.test.cjs` from the repository root. CI and browser acceptance must be separately confirmed; committing this document is not proof that the tests passed.

## Shipwide rune integration status
All 14 owner-authored rune shapes are registered as traced SVG paths in `apps/wayglass/src/somatic-rune-registry.js`, rendered in the keyboard mounted by Wayglass's `main.js`. WTL's shared parser recognises `@rune_name` expressions and `@return`/`@transcend` phase spellings. `@desired_timeline_shift(@terra_prime,@terra_aeterna)` is a bounded digital encounter record with two distinct world perspectives. Other WTL consumers must upgrade to this source version before they recognise the rune tokens.
