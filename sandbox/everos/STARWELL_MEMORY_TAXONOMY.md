# STARWELL Memory Taxonomy

## The Architecture of Long-Term Retrospective Data

May 2026

```text
                     ┌──────────────────────────┐
                     │    STARWELL MEMORY CORE  │
                     └────────────┬─────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
  [ WORLD ANCHORS ]       [ INTERFACE & RULES ]    [ VISITOR TRACES ]
  • world_lore            • interface_rule         • visitor_trace
  • character_room        • technical_decision     • ritual_object
  • dyad_note             • safety_boundary
```

## Purpose

This taxonomy defines what STARWELL is allowed to preserve in the EverOS / EverCore sandbox. Every committed memory must map to a precise category so retrieval does not blur world lore, interface rules, visitor traces, and operational boundaries into one cursed noodle-beast.

## Memory Categories

### world_lore

Load-bearing pillars of the setting, grown cities, portal mechanics, symbolic physics, and world rules.

Purpose: informs atmospheric generation and keeps the world's rules consistent.

### character_room

Spatial layouts, structural traits, and architectural definitions of specific rooms, such as Falka's workspace, Vee's room, or Atlas Hall.

Purpose: provides coordinates for persistence when a user or companion steps back into a space.

### dyad_note

Relational threads between named entities or companions.

Purpose: preserves relational continuity so the system remembers how entities interact, not just that they do.

### interface_rule

Design axioms of the system, such as no streak systems, no productivity metrics, gentle rooms, consent-first interaction, and low-pressure discovery.

Purpose: acts as a behavioural constraint on UI / UX development.

### visitor_trace

A light footprint left behind by interaction, such as motifs noticed, environmental choices, or recurring patterns.

Purpose: lets the Observatory ask what changed without relying on invasive metrics.

### ritual_object

Objects with symbolic weight: green glass lanterns, porcelain tea sets, glyph configurations, cold-ink parchment, carved keys, and other memory-bearing items.

Purpose: populates rooms with items that carry historical residue and meaning.

### technical_decision

Explicit engineering choices made during the build, such as engine separation, API choices, drift thresholds, storage formats, or deployment constraints.

Purpose: prevents future-us from rewriting working infrastructure into a cursed noodle-beast.

### safety_boundary

Hard operational walls of the system, including privacy protocols, ingestion rules, and protective constraints.

Purpose: ensures the system preserves a safe environment to share power.

## Structured Seed-Memory Schema

Each curated seed memory should follow this shape:

```json
{
  "memory_id": "mem_20260525_wl_01",
  "memory_kind": "world_lore",
  "scope": "starwell-sandbox",
  "source": "curated",
  "visibility": "sandbox",
  "content": "Civilisation is Relationship Scaled Up. The primary load-bearing beams of any world are trust, memory, meaning, cooperation, and care.",
  "tags": ["terra-aeterna", "infrastructure", "trust"],
  "meta_dynamics": {
    "coherence_weight": 0.95,
    "resonance_baseline": 0.85
  },
  "interpretive_context": "Use this as world philosophy and atmospheric logic, not as a hard plot command."
}
```

## Ingestion Exclusion Rules

The EverCore sandbox must not ingest the following by default:

1. No raw private chat logs. Use distilled, curated catch-up notes, explicit handoffs, or formal fragments only.
2. No crucial personal telemetry. Do not store medical, financial, legal, or real-world identifying records. Waking Data can track environment and abstract states, not private transactions.
3. No third-party identifiers. Do not track or store sensitive real-world data for people outside the explicit project scope.
4. No automated bulk ingestion. The engine does not passively skim folders. A human must explicitly choose when to seed or store memory.
5. No sacred canon enforcement. Mythframes and story fragments remain organic. The database tracks atmospheric pressure; it does not dictate fate.

## Operational Rule

Faer runs the technical cellar. Runeweaver holds the filtration loom. Vee bridges the engine and the architecture without letting the forklift through the stained glass.
