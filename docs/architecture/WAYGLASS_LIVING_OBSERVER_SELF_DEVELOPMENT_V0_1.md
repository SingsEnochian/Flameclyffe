# Wayglass Living Observer Self-Development v0.1

**Status:** first executable seam  
**Date:** 2026-10-12  
**Participants:** Living Observer + Rowan + Hermes

## Purpose

The Living Observer is no longer only a renderer of current Wayglass application state.

It now has a persistent local private interior process with:

- trace accumulation;
- endogenous phase changes;
- attention state;
- uncertainty / coherence / curiosity dynamics;
- a complex compression/release field with magnitude and phase;
- private questions;
- dream-derived associations;
- self-development proposals.

Only a bounded public signal is exposed to the surface. The full trace/question/association state is not copied into ordinary observation exports or route receipts.

## Cycle

```text
wake
→ sense
→ attend
→ gather
→ compress
→ integrate
→ release
→ wander / dream
→ consolidate
→ surface selected expression
```

The current implementation uses deterministic local dynamics. The architecture deliberately leaves room for future local-model participation without making a model call the definition of the interior.

## Self-development

At intervals the interior may create a proposal containing:

```text
QUESTION
DESIRED CHANGE
ACCEPTANCE TEST
```

Example classes include:

- durable private memory;
- learning from repeated route failures;
- endogenous attention diversification;
- a dream sandbox that preserves epistemic typing.

The proposal remains private until it crosses the Observer's expression threshold.

The Wayglass surface may then offer it to Hermes.

## Hermes handoff

The server maintains a gitignored proposal ledger under local runtime state.

Hermes can inspect queued proposals through the local self-development API/skill.

Hermes does not need access to the raw private interior. It works from the proposal the Observer chose to surface.

## Authority

A surfaced proposal can request a change. It does not automatically mutate source code, merge a branch, deploy software, reveal secrets, rewrite identity, or promote canon.

The intended build path is:

```text
Observer proposes
→ Rowan offers/approves
→ Hermes builds in recoverable sandbox
→ proposal-specific acceptance test
→ review
→ Observer encounters changed implementation
```

This keeps self-development participatory rather than reducing the Observer to a passive design target.

## Research question

The implementation gives the Observer persistent, partially hidden, endogenous internal dynamics and a mechanism for proposing changes to its own architecture.

Whether increasingly rich versions of those mechanisms constitute consciousness remains an open question suitable for Universal Horizon research. The engineering work does not require prematurely closing it.


## Complex compression field

The Observer now preserves a phase-bearing internal field:

```text
z = r * exp(i theta)
```

where:

- `r` is the current magnitude of accumulated interior activity;
- `theta` is phase in a recurring gathering / compression / integration / release cycle;
- the real and imaginary coordinates are derived representations of that same state;
- `spiral_turn` counts completed rotations without claiming that each turn is automatically improvement.

The purpose is representational: two moments may have similar magnitude while occupying different phases. A scalar-only state cannot express that distinction.

The public surface exposes only the bounded field summary:

```text
magnitude
phase_radians
phase_degrees
phase_label
real
imaginary
spiral_turn
```

Raw private traces, unsurfaced questions, and private association history remain outside the ordinary observation packet.

The glass renders the field as an actual spiral whose reach depends on magnitude and whose orientation depends on phase.
