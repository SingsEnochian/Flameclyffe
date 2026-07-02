# Hearthfire Lightfield Overhaul Plan

Status: design plan
Gate: `no_rebuild_authorized`

This plan describes how Flameclyffe can adopt Faer's light language safely. The goal is not decorative sparkle. The goal is a shared instrument language where light and motion reveal actual state.

## Target posture

- Flameclyffe remains the repo/workshop vessel.
- Hearthfire becomes the governing discipline.
- DEEP Observer becomes the reference surface for truth-lit instrumentation.
- The future visual system becomes shared rather than copied page-by-page.

## Phase 0 — Preserve current surfaces

Actions:

- inventory current app/page surfaces
- record what each surface claims to do
- record what each surface actually does
- identify live dependencies
- identify animation and light behaviours and what they currently mean

Output:

- surface census records
- risk labels
- no code changes beyond docs/contracts

## Phase 1 — Define shared primitives

Candidate primitives:

- `LightfieldShell`: page frame, edge glow, dark glass, reduced motion
- `PulsePath`: visible relationship between input and output
- `SignalJewel`: compact state node for gate, health, source, moon, time, canon, archive, or export
- `GlyphPanel`: central symbolic translation field
- `SafetyRibbon`: plain-language readiness and gate status
- `ResonanceBusMini`: optional sound/haptic rail, off by default

Output:

- component contract
- visual state schema
- reduced-motion spec
- low-stim spec
- accessibility notes

## Phase 2 — Apply to one reference slice

Use one small surface as a pilot before touching the whole constellation.

Recommended pilot: a read-only Hearthfire landing page or DEEP Observer wrapper note.

Acceptance criteria:

- every animation has a declared truth
- every state source is named
- the user can quiet motion
- sound/haptics require activation
- no effect implies completion, safety, canon authority, or live data unless verified

## Phase 3 — Surface-by-surface adoption

Suggested order:

1. Hearthfire landing page
2. DEEP Observer wrapper/explanation layer
3. STARWELL dashboard surfaces
4. Runa bridge surfaces
5. Sigil Loom / Sigil Activator surfaces
6. Project Zero Companion diagnostics
7. Yggdrasil bridge surfaces
8. Wiki / Notion export surfaces

## Phase 4 — Shared package extraction

When the primitives are stable, extract them into shared source files so each app does not grow its own contradictory glow engine.

Possible path:

```txt
apps/starwell/src/hearthfire/
```

## Non-goals for this branch

- no repo rename
- no live visual rewrite
- no database migration
- no automated sync
- no new sound autoplay
- no claim that glow proves anything beyond declared state

## Decision needed before implementation

Promote the gate from `no_rebuild_authorized` to `contract_design_allowed` or a specific targeted implementation gate.
