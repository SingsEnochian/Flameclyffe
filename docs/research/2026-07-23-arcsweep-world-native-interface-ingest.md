# Arcsweep World-Native Interface Ingest

**Date:** 2026-07-23  
**Source class:** community shifting script folklore  
**Source:** “Extremely unusual and helpful things to script,” r/shiftingrealities, approximately 2020  
**Status:** design ingest complete; implementation active

## Why this source matters

The source treats the LIFA concept as a function set rather than a fixed phone application. The same functions may inhabit a journal, pearl, mirror, watch, moving photograph, candle flame, animal familiar, mythic companion, or another world-native form.

That distinction becomes an Arcsweep architecture law:

> One local engine, many world-native surfaces.

The interface belongs to the world instead of importing the visual assumptions of a modern smartphone into every setting.

## Extracted design patterns

### Polymorphic surface

Each world selects how Arcsweep appears and behaves. The engine remains stable while the surface changes.

Implemented surface registry:

- portal or doorway
- journal or codex
- mirror or reflective surface
- pearl, crystal, or carried object
- watch, clock, or timepiece
- moving photograph or picture
- candle, flame, or light
- animal, familiar, or companion
- custom world-native form

### Summon

Each world defines an intentional access cue:

- spoken or silent phrase
- gesture or movement
- touch pattern
- held or summoned object
- voice command
- intentional presence call
- always available

The cue belongs to the world record and may be changed without altering the underlying data.

### Veil Mode

Visibility is configured per world:

- only the user
- the user and approved people
- openly visible within the world
- custom visibility rule

### Arrival Context

Arrival is more than a date field. It includes:

- world-local date and time
- arrival location
- immediate situation
- relevant local memories
- orientation statement
- continuity recall rule

### World Clock

Each world owns its time ratio and pause behaviour. The ratio used for an arc is captured when the arc begins so later edits do not rewrite completed return records.

### World Competencies

Competencies are grouped as world context rather than scattered script fragments:

- languages and communication
- magic, technology, powers, or world systems
- movement, reflexes, craft, and physical skills
- social knowledge, customs, and relationships
- accessibility and embodiment supports

### Safety Weave

Safety is authored as a layered weave:

- general conditions
- specific exclusions or boundaries
- Return Anchor availability
- intention-gated activation

This supports worlds where danger, challenge, or adventure remains part of the design while chosen boundaries stay explicit.

### Continuity Recall

A world may define:

- what context is available on arrival
- what is carried into the Continuity Log on return
- what surprises remain unspoiled
- what is deliberately forgotten or withheld until the right moment

### Companion interface

A world-native companion may carry Arcsweep functions through conversation, movement, guidance, memory, or symbolic action.

Hearthgate companion law:

> A companion may speak honestly, refuse, negotiate, rest, change, and leave. Loyalty is relational, not compulsory.

The companion layer stores name, form, role, communication style, and agency terms separately from the surface itself.

### Waking Thread

The source’s continuity-monitoring idea maps to the Waking Thread and Continuity Log:

- self-entered records
- trusted-person entries
- calendar facts
- imported notes
- later opt-in connectors

No separate-person ontology is created. The Waking Thread is the continuing record of the waking world.

## Implemented in Arcsweep 0.2

- per-world registry
- active portal selection
- polymorphic surface model
- Summon configuration
- Veil Mode
- per-world time ratio and pause setting
- Arrival Context
- World Competencies
- Safety Weave
- Continuity Recall
- consent-shaped companion interface
- configurable applet visibility per world
- migration from the original single-world local state
- JSON portability for the complete world record

## Next implementation steps

1. Add drag or button-based applet ordering.
2. Add custom applet labels and glyphs in the world editor.
3. Render surface-specific portal motion and sound profiles.
4. Add world templates for journal, pearl, mirror, candle, watch, and familiar forms.
5. Add a visual Arrival Card generated from the world record.
6. Add selective Continuity Log export by world and arc.
7. Add optional passkey protection and encrypted local backups.

## Provenance rule

Community source ideas remain visible as source ideas. Hearthgate transformations remain visible as Hearthgate transformations. Implemented fields remain visible as implemented fields. No layer borrows another layer’s name without a bridge.
