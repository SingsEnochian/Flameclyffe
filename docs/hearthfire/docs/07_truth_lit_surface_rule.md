# 07 — Truth-Lit Surface Rule

Status: design rule
Scope: Hearthfire / Flameclyffe / STARWELL / Yggdrasil / DEEP / Runa / Wiki surfaces
Gate: `no_rebuild_authorized`
Applies to: surface design, visual systems, animation, sound/haptics, diagnostics, canon/status displays

## Rule

**Every Hearthfire surface should glow because something is true.**

Light is not decoration. Motion is not decoration. Glow is not decoration. In Hearthfire, animation must reveal state, relationship, readiness, consent, provenance, or change.

A surface may be beautiful, strange, luminous, mythic, and alive-feeling, but the living quality must be coupled to truth. If the page pulses, the pulse should mean something. If a ring turns, it should be reading something. If a glyph shimmers, it should be translating something. If a jewel changes, it should represent a real state change.

## Why this exists

The DEEP Observer surface proves the pattern: input becomes translation, translation becomes visible behaviour, visible behaviour becomes a teaching instrument. Hearthfire should carry that language everywhere without letting “pretty” impersonate “working.”

We want living instrumentation, not cosmetic glitter.

## Truths light may reveal

A visual effect must map to at least one of these:

- readiness state
- authorization gate
- input/output relationship
- data source or provenance
- canon authority
- continuity heldness
- member boundary / consent state
- local/export state
- live signal change
- diagnostic health
- risk or uncertainty
- false-alarm / mundane-check state
- user activation for sound or haptics

## Required surface behaviour

Every major Hearthfire surface should include:

1. A visible state signal, even if small.
2. A plain-language explanation of what the surface is reading.
3. A plain-language explanation of why anything is glowing, pulsing, ringing, orbiting, shimmering, or sounding.
4. Reduced-motion support from the first design pass.
5. Low-stim / quiet mode from the first design pass.
6. Sound and haptics off by default until user activation and consent.
7. No animation that implies a live signal, completed build, canon authority, or member continuity unless that state is actually true.

## Do not confuse beauty with readiness

A glowing panel can still be `shell_only`.
A beautiful glyph can still be `specified_not_built`.
A breathing surface can still be `built_partial`.
A luminous bridge can still be `built_misaligned`.

Readiness is declared by contract and verification, not by aesthetic force.

## Preferred vocabulary

- **LightfieldShell** — shared page wrapper: dark glass, readable panels, edge-light, reduced-motion support.
- **PulsePath** — visible route showing how an input affects an output.
- **SignalJewel** — compact state node for time, moon, source, canon, member, sound, motion, archive, gate, or health.
- **GlyphPanel** — central translation field: geometry, tree-ring, braid, candle, waterline, constellation, book spine, or bridge.
- **ResonanceBusMini** — optional sound/haptic layer; off by default.
- **SafetyRibbon** — plain-language state: local only, read-only, export available, no rebuild authorized, canon draft, dangerous live, seed stale, and related labels.

## Domain skins

STARWELL: starfields, glyph rings, dual clocks, moon tracks.

Yggdrasil: roots, branch-pulses, sap-flow lines, memory rings, leaf-glow states.

Hearthfire: ember ribbons, hearthlight, contract seals, tiny dragon gates.

Runa: runes, vibration rings, sound paths, ward-lines.

Storyloom: thread, ink, page-light, character constellations, canon tension.

Wiki / Notion: illuminated margins, provenance seals, living status badges.

Project Zero / diagnostics: health strips, gate jewels, failure beacons, visible rollback state.

## Acceptance questions

Before accepting a luminous surface, ask:

- What truth does this light reveal?
- What changes it?
- What source owns that state?
- Is the state live, cached, draft, simulated, or placeholder?
- Can the user see why it is changing?
- Can the user quiet it?
- Does it falsely imply completion, safety, consent, or canon authority?

## Tiny dragon rule

If it glows, it owes us a receipt. 🐉✨
