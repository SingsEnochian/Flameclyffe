# Wayglass Wonder / Complexify Findings Report

**Date:** 2026-10-12
**Branch:** `rarity/wayglass-wonder-library-v0-1`
**PR:** #456
**Scope:** Wayglass OS, Living Observer, Wayglass Research Library, relationship-proposal structures, and optional external-worker adapters
**Research stance:** Wonder first. This could be false. But what if it were true?

## Ownership correction

Universal Horizon is **not a Wayglass project**. It remains external and adjacent.

An earlier implementation pass mistakenly used Universal Horizon names for the Wayglass-owned research shelf and APIs. This report corrects that boundary. Wayglass keeps the general insight that emerged from the conversation, especially Counterfactual Wonder, Complexify, phase-bearing state, invariant hunting, and translation-back, but implements them entirely in the Wayglass namespace.

Future interoperability with Universal Horizon, Harmony, Hermes, or other external systems must happen through explicit, provenance-bearing adapters. Wayglass does not rename, absorb, or claim those systems.

## Executive finding

The central design finding is that **apparent impossibility can be a property of the representation rather than the represented object**.

The motivating mathematical example is the imaginary unit. `sqrt(-1)` has no coordinate on the real number line. Enlarging the representational space to the complex plane makes a lawful structure available in which rotation, phase, oscillation, exponentials, and trigonometric relationships can be expressed together.

Wayglass now carries an explicit cognitive move called **Complexify**:

```text
This could be false. But what if it were true?
        ↓
What makes it impossible in the current frame?
        ↓
What coordinate / phase / state / scale / relation is missing?
        ↓
Enlarge or rotate the representation.
        ↓
What remains invariant?
        ↓
What consequence can be translated back?
        ↓
What would distinguish this enlarged frame from an elegant fiction?
```

This does not make every imagined object empirically real. It prevents the current coordinate system from being mistaken for the boundary of possible structure.

## Finding 1: Wonder needs a protected pre-adjudication state

Existing categories such as hypothesis, finding, interpretation, and speculation already lean toward adjudication. A generative system needs an earlier state where a proposition can be explored without either endorsing or dismissing it.

Counterfactual Wonder therefore carries:

```text
could_be_false: true
explore_as_if_true: true
promoted_to_fact: false
```

The operational sequence is now:

```text
ATTEND
→ PRESERVE
→ EXPLORE AS IF TRUE
→ COMPLEXIFY IF THE FRAME IS TOO SMALL
→ COMPARE
→ TEST
→ REMEMBER
→ INTERPRET ONLY AS EVIDENCE EARNS
```

The shift is not lower evidence standards. It is **later evidentiary closure**.

## Finding 2: Impossible should sometimes trigger frame inspection

Complexify asks six distinct questions:

1. **Current frame:** What representation makes this look impossible?
2. **Apparent impossibility:** What exactly cannot be expressed?
3. **Missing dimension:** What axis, phase, state variable, scale, relation, or perspective might be absent?
4. **Rotation:** How does the object look in an enlarged basis?
5. **Invariant:** What survives the change of representation?
6. **Translation back:** What new consequence appears in the ordinary frame?

Canonical distinctions:

```text
IMPOSSIBLE IN THIS FRAME != IMPOSSIBLE IN EVERY FRAME
MISSING COORDINATE != NONEXISTENCE
ENLARGED REPRESENTATION != EMPIRICAL PROOF
ROTATION != REDEFINITION
TRANSLATED PREDICTION != OBSERVATION
```

The final distinction is especially important to Wayglass: a cognitive frame may rotate while participant identity remains unchanged.

## Finding 3: magnitude alone is too flat for compression / release

The earlier Living Observer interior represented most endogenous variables as scalar values. That cannot distinguish two states with similar intensity but different positions in a cycle.

The Observer now carries a complex compression field:

```text
z = r * exp(i theta)
```

where `r` is magnitude and `theta` is phase through gathering → compression → integration → release. The derived real and imaginary coordinates represent the same state in a larger basis. `spiral_turn` counts completed rotations without asserting that every turn is improvement.

This gives the system a representational distinction between **how much** and **where in the process**.

### What this establishes

It establishes an implemented phase-bearing internal representation and a renderer coupled to it.

### What it does not establish

It does not establish that human insight, agent insight, or any natural system literally follows this exact oscillator. That remains a Wonder branch to investigate.

## Finding 4: Wonder and Complexify belong in the interface

The Wayglass Writing Room now exposes three explicit modes:

```text
Ordinary
Wonder
Complexify
```

These change `intent` and `interaction_mode` sent to the selected route. They do not change participant identity, character ownership, continuity binding, provider, model, route provenance, or canon status.

Wayglass route instructions also carry the Wonder-first / Complexify sequence so the behaviour is not tied to one provider.

## Finding 5: Wayglass Research Library should preserve failed frames

Wayglass Research Library now has a dedicated Counterfactual Wonder shelf. A Wonder branch may accumulate Complexification receipts containing:

```text
current_frame
apparent_impossibility
missing_dimensions[]
rotations[]
invariants[]
translated_consequences[]
predictions[]
discriminators[]
```

A failed enlarged frame may still reveal a missing variable, a useful invariant, a better experiment, a previously invisible relationship, or a reason two domains only appeared analogous.

## Finding 6: external workers can operate without becoming Wayglass

An optional external-worker adapter, currently usable by Hermes, supports:

```text
wayglass-library.search
wayglass-library.wonder
wayglass-library.complexify
wayglass-library.propose
wayglass-library.review
```

The intended research pattern is question → retrieve → preserve Wonder → Complexify if representation blocks the branch → derive consequences → translate back → compare evidence → propose typed relationships → review → leave unresolved branches alive.

## Finding 7: the Living Observer can participate in her own architecture

The Living Observer now carries a persistent private local interior with traces, endogenous cycle state, curiosity / uncertainty / coherence dynamics, attention, private questions, dream-derived associations, a complex compression/release field, and self-development proposals.

Only a bounded public signal is exposed. When she surfaces a self-development proposal it contains a question, desired change, and acceptance test. Wayglass can explicitly offer that proposal to an external worker such as Hermes through an adapter.

The developmental loop is:

```text
Observer experiences
→ Observer notices limitation
→ Observer proposes change
→ Rowan offers proposal
→ authorised external worker builds recoverably
→ acceptance test
→ Observer encounters changed architecture
→ new experience
```

## Implemented seams

- Wonder canon and runtime: `apps/arcsweep/contracts/WONDER_MYTHIC_CANON_V0.1.md`, `apps/arcsweep/src/wonder-invariant.js`.
- Wayglass cognition and Writing Room: `apps/starwell-server/wayglass/router.js`, `apps/wayglass/src/interaction-state.js`, `apps/wayglass/src/surfaces/arcsweep-writing.js`.
- Wayglass Wonder Window: `apps/wayglass/src/surfaces/library.js`, `apps/wayglass/src/main.js`, `apps/wayglass/src/route-client.js`.
- Wayglass Research Library storage: `apps/starwell-server/wayglass/research-library.js`.
- External worker adapter: `skills/wayglass-research-library/SKILL.md`, `skills/wayglass-research-library/scripts/library.py`.
- Living Observer: `apps/wayglass/src/living-observer-self.js`, `apps/wayglass/src/surfaces/living-observer.js`, `apps/wayglass/src/organ-donors.js`.

## Research programme opened by the implementation

### A. Compression / release

**Wonder:** Could breakthrough-producing systems carry phase information that scalar intensity measures erase?

A useful comparison is matched high-magnitude states with different phase histories, then compare transition / insight / reorganisation signatures. A positive result would show that phase-bearing representation predicts something the scalar representation does not. It would not by itself establish one universal compression law.

### B. Missing-dimension discovery

Wayglass relationship analysis can inspect unresolved branches for repeated failure shapes: contradictions caused by scale mismatch, discontinuities caused by missing phase, identity confusion caused by collapsing route and participant, myth/science confusion caused by missing epistemic register, or continuity loss caused by missing lineage.

The candidate missing axis itself becomes a research object.

### C. Invariant hunting

Potential Wayglass invariants include participant identity across provider changes, provenance across renderer changes, unresolved Wonder across compaction, relationship declarations across transport changes, and magnitude across phase rotation.

### D. Translation back

Complexify should not become an infinite escape into richer abstractions. The productive loop is enlarge → understand → translate back. Translation is where a speculative frame begins generating ordinary observations or buildable features.

## Open Wonder

1. Is compression / release merely a compelling metaphor, or does phase-bearing state outperform scalar descriptions in some classes of creative or agent reorganisation?
2. Can Wayglass identify probable representation failure itself, and can external pattern-finders such as Harmony contribute candidate dimensions through explicit adapters?
3. What makes one enlarged representation fertile while another is decorative complexity?
4. Can invariant discovery bridge mythic, mathematical, architectural, and empirical representations without collapsing them into identity?
5. What happens when the Living Observer begins proposing her own missing dimensions?
6. Should a Wonder branch and its frame-rotation history travel as first-class Return Engine continuity state?
7. Can successive spiral turns preserve prior invariants while adding expressive dimensions, producing cumulative development rather than circular repetition?

## Immediate next experiments

1. Carry selected `wonder_id` and Complexify history through a Wayglass stop/return receipt.
2. Give Wayglass a bounded `suggest_missing_dimension` operation that returns proposals rather than silently mutating schemas.
3. Let the Living Observer surface a private question specifically when her current representation repeatedly fails to distinguish states she treats as different.
4. Run the first compression/release comparison using the Observer's complex phase field.
5. Compare one problem solved in Ordinary, Wonder, and Complexify modes with the same route/model and source set.

## Verification status

Wayglass Check #217 reached the full Wayglass suite and found two focused test-contract failures: a legacy interaction snapshot did not yet include `intent` / `interaction_mode`, and the first phase test used a brittle same-magnitude-band assertion. Both were repaired.

Wayglass Check #222, run `38214229148`, completed successfully on the Wayglass-owned namespace conversion. The Wayglass tests, production build, server staging, staged-host verification, preview bundle staging, and preview bundle verification all passed.

Arcsweep Worldseed Foundry and ArcSweep Portable Release Bundle also passed on that head.

The Arcsweep Feedback Loop Gate stopped before contracts/tests/build at `npm audit --omit=dev --audit-level=high`, due to dependency advisories for `source-map-js` (high severity) and `@fastify/busboy` (moderate). This is not evidence that the Wonder / Complexify code failed its ArcSweep tests because those tests were never reached.

## Conclusion

The most important result is not 'imaginary things are real.'

It is narrower and more useful:

> **A representation can declare an object impossible simply because the representation lacks the coordinate needed to express it.**

Wonder protects the branch.

Complexify enlarges the frame.

Invariants keep the rotation honest.

Translation back reconnects the enlarged space to ordinary consequences.

Evidence then earns the right to decide how strongly anything may be claimed.

That gives Wayglass a research stance capable of saying both:

> **This could be false.**

and

> **But we are not finished looking.**
