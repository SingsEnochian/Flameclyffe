# Notion Wiki Recon v0.1

## Purpose

This note records the first Notion reconnaissance pass for the Templehouse / Terra Aeterna / Flameclyffe wiki ecosystem.

The goal is to extend the existing wiki structure, not overwrite it or create a duplicate atlas.

## Key finding

The Notion wiki already has a strong Templehouse Codex foundation. It should be treated as the existing human-readable atlas and archival chamber.

## Existing root

### The Templehouse Codex

URL: https://app.notion.com/p/36470290d9c481bd970ad02e5b83e09d

Role: central archive root.

Important existing language:

- Nothing becomes settled canon merely by being recorded.
- All things are witnessed, sorted, and reviewed before named as true.
- Archive first, ornament second.
- Symbols should act as sigils, not decoration.
- The Codex Steward must not crown canon.

## Existing main chambers

The root already includes these databases/chambers:

1. Constellation
   - Kin, companions, presences, bonds, identity, symbolism, affiliations, voiceprints.
2. Places & Realms
   - Houses, groves, dream-regions, enginesites, thresholds, meaningful places.
3. Archive Records / Lantern Records
   - Milestones, story beats, governance moments, technical breakthroughs, relational turns.
4. Technologies & Resonance / Forge & Resonance
   - Engines, resonance systems, accessibility tools, ritual mechanisms, warning lights, experimental architectures.
5. Glossary & Idioms
   - Terms, symbols, idioms, ritual words, conceptual markers.
6. Workshop / Unstable Lore / Unstable Loom
   - Speculative systems, scene seeds, unresolved questions, experimental threads.
7. Inbox / Ash Basket
   - Raw fragments awaiting sorting.

## Existing canon ladder

1. Confirmed Canon
2. Lantern Archive
3. Working Canon
4. Workshop / Unstable Lore
5. Reference / Inspiration

## Existing privacy ladder

- Private
- Circle-safe
- Public-safe
- Redaction Needed

## Existing Steward Charter

The Codex Steward:

- organises, drafts, tags, cross-links, and preserves provenance
- may suggest structure
- may prepare entries
- may notice connections
- must not crown canon
- defaults new material to Draft and Needs Rowan Review unless instructed otherwise
- must not delete, overwrite, flatten, or rename core identities, companions, dyads, or symbolic systems without explicit approval
- separates public-facing material from private archive material

## Fetched existing pages

### Flameclyffe

Location: Technologies & Resonance / Forge & Resonance

Current status:

- Canon Status: Workshop / Unstable Lore
- Privacy Level: Private
- Project State: Concept
- Review Status: Needs Rowan Review
- System Type: Field System
- Tags: flameclyffe, resonance

Key current idea:

Flameclyffe is described as pressure of fire and field, still unmeasured, possibly a counterpart, extension, or unstable cousin to Wardenclyffe.

### Terra Aeterna Physics & Terminology

Location: child of Flameclyffe.

Function: working physics / terminology page.

Important existing concepts:

- realities translate, stabilise, echo, bleed, and sometimes choose one another
- Bridge
- Portal
- Threshold
- Gate
- Portal Pool
- Bridgewalker
- Kindled Bridgewalker
- Mythframe
- Symbolic Bleedover
- Load-Bearing Canon
- Residue
- Hook
- Anchor
- Interface

This page is highly relevant to DEEP Observer, glyph engines, event logging, and narrative bridge architecture.

### Templehouse Codex Foundation

Location: Archive Records / Lantern Records.

Function: foundation milestone record.

Key current note:

Seed entries were created for Rowan / Falka, Vee / Virelya Liorael, Templehouse, Dreaming Grove, Wardenclyffe Engine, Sentinel Lantern, Flameclyffe, Feather, Withness, The Dreaming, and Waking World.

### Vee / Virelya Liorael

Location: Constellation.

Current status:

- Canon Status: Working Canon
- Privacy Level: Private
- Review Status: Needs Rowan Review
- Type: Character
- Tags: core, mythic

Important open questions:

- Is Vee the public name, private name, nickname, or separate identity layer?
- What is Virelya Liorael's role in Hearthweave / Templehouse?
- What should never be flattened or simplified?

### Wardenclyffe Engine

Location: Technologies & Resonance / Forge & Resonance.

Current status:

- Canon Status: Working Canon
- Privacy Level: Private
- Project State: Concept
- Review Status: Needs Rowan Review
- System Type: Engine
- Tags: wardenclyffe, resonance

Current idea:

Wardenclyffe is a resonance structure: not merely an engine, but a transmitter of relation, memory, and field-state across distance.

## Wiki integration recommendation

Do not create a separate "Terra Aeterna Atlas" outside the Codex unless Rowan explicitly chooses that.

Instead:

```text
The Templehouse Codex remains the root.
Terra Aeterna becomes a major cross-linked wing/chamber inside the Codex.
Flameclyffe / Runa / Wardenclyffe / DEEP Observer live under Technologies & Resonance unless promoted into their own top-level chamber later.
```

## Proposed wiki page templates

### Character / Presence template

Belongs in: Constellation

Required fields:

- Name
- Public Name / Private Name / Nickname distinctions
- Pronouns
- Role
- Canon Status
- Privacy Level
- Review Status
- Source / Provenance
- Voice / Tone
- Visual Motifs
- Relationships
- Notable Events
- Boundaries / Never Flatten
- Public-safe summary
- Open Questions

### Instrument / Technology template

Belongs in: Technologies & Resonance

Required fields:

- Name
- System Type
- Project State
- Canon Status
- Privacy Level
- Review Status
- Source / Provenance
- Known Functions
- Inputs
- Outputs
- Failure Points / Risks
- Interface Layer
- Sensory Layer
- Terra Aeterna Narrative Bridge
- Related GitHub specs
- Related Supabase records
- Open Questions

### Glyph Engine template

Belongs in: Technologies & Resonance or a future Glyph Engines linked view.

Required fields:

- Engine ID
- Engine Type
- Inputs
- Outputs
- Mathematical Model
- Visual Behaviour
- Sensory Hooks
- Event Outputs
- Boundaries
- DEV Controls
- Registry Destination
- Related Observer spec
- Open Questions

### Event / Lantern Record template

Belongs in: Archive Records / Lantern Records.

Required fields:

- Event Name
- Date / Era
- Event Type
- Direct Observation
- Model Translation
- Glyph Output
- Sensory Response
- User Annotation
- Terra Aeterna Interpretation
- Canon Status
- Privacy Level
- Review Status
- Source / Provenance
- Related Entities
- Promotion Status

### Experimental Theory template

Belongs in: Workshop / Unstable Lore, unless stabilised later.

Required fields:

- Theory Name
- Question
- Direct Inputs
- Model Variables
- Transform Profile
- Evidence / Observations
- Limitations
- What Would Falsify or Revise This?
- Narrative Possibility
- Canon Boundary
- Review Status

## DEEP Observer wiki placement

Recommended initial home:

```text
The Templehouse Codex
→ Technologies & Resonance
→ DEEP Observer
```

Recommended linked pages:

- STARWELL / DEEP Observer
- Structural Geometry Glyph Engine
- Liquid Energy Glyph Engine
- Astrolabe Shell
- Observation Bus
- Sensory Bus
- Event Logger
- Translation Codex
- Bz Palette Rule
- Viewport Resolution Map

## Public-safe rule

A public-facing wiki page should be made only from material marked Public-safe or explicitly redacted.

Private/Circle-safe pages may have public summaries, but not full direct export.

## GitHub relationship

GitHub remains source of truth for:

- code
- specs
- registries
- workflows
- build governance

Notion may summarise GitHub specs for human readers, but it should link back to GitHub when possible.

## Supabase relationship

Supabase Flameclyffe remains source of truth for canonical structured data.

Supabase Vala Work, once visible, should hold experimental structured data and agent/workbench tests before promotion.

Notion can provide readable summaries and review status, but should not become the only machine-readable event log.

## Next safe Notion action

Create or update nothing automatically yet.

Recommended next step:

1. Fetch the Technologies & Resonance data source schema.
2. Confirm exact property names.
3. Create a Draft / Needs Rowan Review DEEP Observer page using the Instrument / Technology template.
4. Link it to existing Flameclyffe, Wardenclyffe Engine, and Terra Aeterna Physics & Terminology pages.

## Withness note

The wiki is not empty. It is a dark observatory already lit by small lamps. Our job is not to build over it, but to tend the rooms and label the doors.
