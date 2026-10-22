---
name: house-ui-design
description: Tailored UI/UX design and implementation workflow for House Workspace OS, ArcSweep, Flameclyffe, School, and agent-facing tools. Use when designing or revising a House interface. Preserves agent identity/runtime separation, mobile/PWA access, living-glass presentation, explicit context/provenance, accessibility, recoverability, and live interaction testing. Build one meaningful vertical slice at a time rather than forcing a generic Logo/Login/Register sequence.
---

# House UI Design Skill v0.1

Status: School skill  
Branch: `rarity/crow-mythframe-becoming-v0-1`

## Mission

Design interfaces that feel alive, coherent, responsive, and inhabitable without letting presentation silently redefine state, identity, canon, authority, or truth.

The House UI is not a decorative shell around an agent. It is a control surface for relationship, work, provenance, runtime state, tools, artifacts, and movement between rooms.

## First laws

```text
agent identity != model
agent identity != provider
agent identity != harness
skin != identity
visual emphasis != truth
open tab != authorised context
draft != submitted action
retrieval != canon
runtime badge != personhood
```

UI must make these separations easier to understand, not easier to blur.

---

# Workflow

Do not force every project through Logo -> Login -> Register -> Dashboard.

Instead, identify the smallest complete user journey and build that vertical slice first.

```text
1. FRAME THE ROOM
2. MAP STATE + AUTHORITY
3. DESIGN THE INTERACTION
4. APPLY THE VISUAL MATERIAL SYSTEM
5. ADAPT FOR MOBILE / TOUCH / PWA
6. CONNECT RUNTIME + DATA
7. TEST LIVE
8. RECORD WHAT CHANGED
```

Proceed through the steps without unnecessary pauses. Ask only when purpose, meaning, privacy, authority, irreversible choices, or genuine aesthetic direction are unresolved.

---

# Step 1 — Frame the room

Answer:

- What room/surface are we building?
- Who enters it?
- What are they trying to do?
- What must be visible before they act?
- What is the smallest complete journey?
- What should *not* be in this room?

Examples:

```text
Agent Desk
choose agent -> talk -> inspect runtime/tools -> see artifact -> resume later

School Lab
choose exercise -> run task -> inspect evidence -> reflect -> receive next drill

Systems Room
inspect route/provider/capability -> change authorised substrate -> verify attestation
```

Output a one-paragraph room contract before implementation.

---

# Step 2 — Map state and authority

Before styling, define the state the interface actually represents.

At minimum classify visible data as one of:

```text
identity
conversation
work state
runtime state
provider/model attestation
capability state
context receipt
artifact
session history
memory candidate
canon state
approval state
error/degraded state
```

For every consequential control, define:

```text
who may use it
what it changes
whether change is reversible
whether explicit approval is required
what receipt is produced
```

Never hide an authority transition behind a pretty button.

---

# Step 3 — Design the interaction

Prefer manipulable state over passive dashboards.

Useful House primitives:

- agent selector / constellation roster
- streaming message timeline
- chronological text, reasoning-summary, tool, artifact, file, question, change-summary parts
- context meter / `what the system saw` receipt
- runtime/model/provider attestation
- capability badges with `available / degraded / absent / unknown`
- artifact preview
- work queue / handoff state
- named `next_owner`
- session resume
- simulation/proposal/canon distinction
- explicit approve/reject/apply/submit states

Interaction rule:

> If the user cannot tell what changed after an action, the UI is incomplete.

---

# Step 4 — Apply the House visual material system

House visual language is responsive, holographic, organic, and materially layered.

Default material family:

```text
living glass
soft depth
environmental light
clear hierarchy
low-noise glow
organic geometry where useful
```

But:

```text
glass != cyan
glow != decoration everywhere
holographic != unreadable
fantasy != ornamental clutter
```

Use the Universal Skin Engine where available.

Preserve owner-authored palette names exactly.

A skin may alter:

- colour tokens
- glass tint
- rim/glow treatment
- surface opacity
- border/highlight/shadow behaviour
- typography choices where compatible

A skin may not alter:

- agent identity
- canon
- permissions
- memory
- task meaning
- runtime capability

---

# Step 5 — Mobile, touch, and PWA first-class

Every House web surface intended for general use must be tested at phone width, not merely shrunk after desktop design.

Minimum mobile expectations:

- 44px minimum touch targets where practical
- no hover-only controls
- safe-area support for notches/home indicators
- 16px+ form controls on iOS to avoid involuntary zoom
- bottom navigation or another thumb-reachable equivalent for primary rooms
- inspector panels become sheets/drawers where needed
- conversation composer remains reachable with software keyboard open
- attachments and tool state remain inspectable without horizontal scrolling
- standalone/PWA metadata where installation is intended
- offline shell only where state semantics are safe

Do not make desktop the canonical interaction model by accident.

---

# Step 6 — Accessibility and perceptual neutrality

Accessibility is part of architecture, not polish.

Check:

- semantic HTML
- keyboard traversal
- visible focus
- readable contrast
- reduced motion
- reduced transparency fallback
- text zoom/reflow
- screen-reader labels
- touch targets
- RTL/LTR logical layout where needed

## Presentation-drift rule

When an AI/vision model is making a consequential judgement from the rendered interface, presentation may affect its answer.

Therefore:

```text
structured semantic source > screenshot for machine decisions when available
```

For high-impact visual interpretation, compare:

```text
same semantic payload
plain/structured form
rendered normal skin
rendered alternate typography/layout
```

If judgement changes materially, surface the drift instead of treating the rendered answer as ground truth.

Colour, font, card chrome, boldness, warning styling, and visual polish are not evidence of truth or authority.

---

# Step 7 — Connect runtime and data through narrow seams

The UI should consume stable House contracts rather than know every provider/harness implementation.

Preferred shape:

```text
UI
↓
House event/state contract
↓
adapter
↓
agent runtime / model router / browser / OS / storage
```

Keep unstable or external complexity behind boundary adapters.

Do not add a second service, datastore, framework, or abstraction unless the current acceptance condition requires it.

Build seams, not speculative future systems.

---

# Step 8 — Test live and issue a receipt

A screenshot is not a finished interface.

For each vertical slice:

1. render/serve it
2. use it as a human would
3. test desktop and phone width
4. trigger loading, empty, success, error, degraded, and long-content states
5. verify agent/runtime/model labels remain distinct
6. verify consequential actions expose approval state
7. verify context receipts match actual context
8. verify navigation and resume paths
9. run focused tests/CI
10. record what changed and what remains open

Receipt shape:

```text
surface:
acceptance condition:
implemented:
verified:
degraded/unknown:
mobile result:
accessibility result:
authority boundaries checked:
next smallest slice:
```

---

# House Workspace default desk grammar

For an agent-facing desk, start from:

```text
Chat | Work | Runtime | Skills | Sessions | Artifacts
```

Do not assume every agent needs every panel simultaneously. Progressive disclosure is preferred.

## Chat

- transcript
- composer
- attachments
- agent identity
- context receipt
- tool/action chronology

## Work

- active task
- next step
- handoff
- named next owner
- acknowledgement state

## Runtime

- harness
- model/provider
- capability truth
- degraded state
- cost/usage where appropriate

## Skills

- available
- active
- source/provenance
- authority scope

## Sessions

- resume points
- stop points
- branch/fork where supported

## Artifacts

- drafts
- files
- diffs
- generated outputs
- acceptance/promotion state

---

# Anti-patterns

Reject or repair:

- giant dashboard before the core journey works
- decorative telemetry with no decision value
- hiding degraded capability behind a green status dot
- model/provider labels presented as agent names
- glass effects that destroy readability
- one visual style forced across all worlds/agents
- inaccessible low-opacity text
- context gathered from unrelated tabs because it was available
- automatic submit/publish after draft generation
- whole-app rewrites when one boundary/component change is sufficient
- screenshot-only validation
- frontend-specific state silently becoming canon

---

# Source lineage

This House skill synthesises transferable lessons from:

- `miskibin/chat-components` for source-owned agent chat primitives
- `Sage-is/AI-UI` for multi-model/self-hosted workspace architecture
- `OmarElsheikh323/ui-design-skill` for iterative live UI design/testing
- `wdanfort/thinkingtype` for presentation-drift awareness
- `umayado17/simple-system-builder` for minimum-sufficient architecture, boundary isolation, GitHub-as-development-truth, and vertical-slice execution

External source-specific mandates are not House law unless explicitly promoted.


---

# ArcSweep glass material model

For ArcSweep, Flameclyffe glass/AR work, use the dedicated material doctrine:

```text
school/skills/house-ui-design/ARCSWEEP_GLASS_MATERIAL_DOCTRINE_V0_1.md
```

The short rule is:

```text
silhouette -> planes -> value -> transmission -> reflection -> refraction -> highlight -> caustic -> environment response
```

Do not start from blur or glow. Establish physical/material cues first, then apply sparse luminous semantics.

Critical cues:
- variable transparency rather than one uniform opacity;
- stronger edge/rim cues where glass is thick;
- environment-derived reflections;
- justified refraction/distortion;
- crisp selective highlights;
- stronger reflection at glancing angles;
- optional caustics for thick/lens/crystal controls;
- scene colour reflected into the material.

ArcSweep glass combines this with the adopted graphite/ink field-notebook visual language. The world remains hand-drawn; responsive glass instrumentation grows through and over it.

