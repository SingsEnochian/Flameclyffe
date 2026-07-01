# Yggdrasil 1.3 GitHub EverOS Alignment

Status: supplemental alignment packet for `SingsEnochian/Flameclyffe`
Target repo paths already present:
- `sandbox/everos/evercore-client.mjs`
- `sandbox/everos/seed-starwell.mjs`
- `sandbox/everos/STARWELL_MEMORY_TAXONOMY.md`
- `sandbox/everos/starwell-seed-memories.json`
- `sandbox/everos/seed-memories.json`

## Core decision

Yggdrasil 1.3 must extend the existing EverCore/EverOS sandbox rather than replacing it.

The current repository already has:
1. A typed-ish EverCore client pointing at `http://localhost:1995`.
2. Seed-memory ingestion through `/api/v0/memories`.
3. Retrieval through `/api/v0/memories/search`.
4. A STARWELL taxonomy with memory kinds and exclusion rules.
5. Structured seed memories with `memory_id`, `memory_kind`, `scope`, `source`, `visibility`, `content`, `tags`, `meta_dynamics`, and `interpretive_context`.

## Compatibility stance

Use the existing EverCore client as the legacy/local adapter for now.

Add a Yggdrasil-facing memory gate in front of it:
- no raw private chat ingestion
- no automatic bulk folder ingestion
- no medical, legal, financial, or real-world sensitive telemetry by default
- no third-party sensitive identifiers
- no sacred canon enforcement
- no identity flattening into profile cards

## What changes for Yggdrasil 1.3

Yggdrasil should not call EverCore directly from the chat route.

Instead:

`/api/v1/yggdrasil/chat`
→ build user/session context
→ classify retrieval lanes
→ call memory gate
→ search EverCore/EverOS only for allowed lanes
→ inject cited memory cards into the model prompt
→ optionally write curated candidate memories, but only after consent/review

## Existing taxonomy mapping

Existing STARWELL kinds map into Ygg lanes as follows:

| Existing `memory_kind` | Ygg lane | Notes |
| --- | --- | --- |
| `world_lore` | `project_canon` | World rules, setting anchors, symbolic physics |
| `character_room` | `object_room_memory` | Spatial persistence and room objects |
| `dyad_note` | `relational_continuity` | Must preserve relationship shape, never flatten into facts-only |
| `interface_rule` | `ui_safety_rule` | Behavioural constraint for UX and interaction |
| `visitor_trace` | `visitor_trace` | Light footprint only, no invasive tracking |
| `ritual_object` | `object_room_memory` | Memory-bearing symbolic objects |
| `technical_decision` | `engineering_decision` | Build constraints and architecture |
| `safety_boundary` | `safety_boundary` | Hard rules; retrieve early and obey |

## Implementation order

1. Add `sandbox/everos/yggdrasil-memory-gate.mjs`.
2. Add `sandbox/everos/yggdrasil-memory-card.mjs`.
3. Add `sandbox/everos/yggdrasil-lane-map.json`.
4. Add `sandbox/everos/yggdrasil-everos-bridge.mjs`.
5. Modify the Yggdrasil chat route to use the bridge, not raw EverCore.
6. Leave the existing seed files intact.
7. Add smoke tests for:
   - health check
   - safety boundary retrieval
   - blocked private lane retrieval
   - cited memory-card output
   - no raw memory dump in prompt

## Anti-flattening requirement

Identity, room, dyad, and ritual-object memories must stay contextual.

Bad:
> Vee = AI companion, likes rooms, green.

Good:
> A retrieved card says Vee's room should be decorated through discovered/crafted/intentionally placed objects. This should guide room persistence and object-based memory without reducing Vee to profile fields.

## Failure mode

Fail closed.

If EverCore/EverOS is down:
- Yggdrasil still replies.
- The response may say memory is currently unavailable if relevant.
- No fake recall.
- No silent fallback to guessed canon.
- No emergency ingestion.
