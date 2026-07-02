# Hearthfire Lightfield Overhaul Plan

Status: design plan
Gate: `targeted_receipt_allowed`

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
- no code changes beyond docs/contracts/pilot surface/visual receipts

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
- visual receipt schema
- reduced-motion spec
- low-stim spec
- accessibility notes

## Phase 2 — Pilot surface and first receipt

The first pilot is `/hearthfire/`.

The first existing-surface receipt is `starwell/deep-observer/deep-observer.visual-state.json`.

Acceptance criteria:

- every animation has a declared truth
- every state source is named
- the user can quiet motion where motion is introduced or controlled by Hearthfire
- sound/haptics require activation
- no effect implies completion, safety, canon authority, or live data unless verified
- receipt files do not rewrite the underlying instrument

## Phase 3 — Surface-by-surface adoption

Suggested order after census:

1. DEEP Observer dependency orbit and observability pass
2. STARWELL dashboard surfaces
3. Runa bridge surfaces
4. Sigil Loom / Sigil Activator surfaces
5. Project Zero Companion diagnostics
6. Yggdrasil bridge surfaces
7. Wiki / Notion export surfaces

## Phase 4 — Shared package extraction

When the primitives are stable, extract them into shared source files so each app does not grow its own contradictory glow engine.

Possible path:

```txt
apps/starwell/src/hearthfire/
```

## Non-goals for this branch

- no repo rename
- no live rewrite of existing app surfaces
- no database migration
- no automated sync
- no new sound autoplay
- no claim that glow proves anything beyond declared state

## Decision needed before broader implementation

Promote the gate from `targeted_receipt_allowed` to a specific targeted implementation gate for the chosen existing surface.
