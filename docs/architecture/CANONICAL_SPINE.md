# Canonical Spine

**Architectural rule:** legibility before capability.

ArcSweep, STARWELL, Flameclyffe, Observer/DEEP, PREMAQC, Runa, Glyph Forge/Kelyran, Project Zero/Hearthfire, Lanternbridge, Worldseed, and hosted worlds attach to one shared canonical graph.

The graph is not a lore wiki and not a second database. It is the legibility layer that answers seven questions for every meaningful thing in the ecosystem:

1. **What is it?**
2. **What does it mean?**
3. **Who or what owns it?**
4. **What does it depend on?**
5. **What state is it in?**
6. **What evidence/provenance supports it?**
7. **What changed, when, and why?**

## Core entity record

Every node should expose at least:

- `id` — stable machine identifier
- `name` — canonical human name
- `kind` — project, system, room, world, character, concept, capability, route, dataset, agent, ritual, language, asset, etc.
- `summary` — one-sentence semantic definition
- `owner` — project/system responsible for the node
- `canonStatus` — canonical, experimental, planned, deprecated, scrapped, external
- `implementationStatus` — implemented, partial, stub, blocked, not-started, retired
- `visibility` — shared, private, restricted, source-protected
- `sourceRefs` — files, commits, issues, records, conversations, datasets, or external sources
- `createdAt`, `updatedAt`
- `tags`

## Edge record

Every relationship is explicit and typed:

- `from`
- `to`
- `type`
- `meaning`
- `confidence`
- `sourceRefs`
- `createdAt`, `updatedAt`

Recommended first edge types:

- `owns`
- `contains`
- `depends_on`
- `implements`
- `observes`
- `describes_state_of`
- `compiles_state_for`
- `routes_to`
- `inherits_from`
- `supersedes`
- `conflicts_with`
- `equivalent_to`
- `related_to`
- `knows_about`
- `restricted_by`

## Knowledge-boundary record

Hidden state must never be invisible merely because content is restricted.

A knowledge boundary may expose:

- holder
- source category
- affected topic
- whether the content is actionable
- restriction reason category
- confidence
- expiry/review date

The protected content itself remains absent.

Example:

```json
{
  "holder": "agent:nocturne",
  "affectedTopic": "topic:example",
  "sourceCategory": "restricted-collaborator-context",
  "actionable": false,
  "restrictionReason": "source-protected",
  "confidence": "medium"
}
```

## Change receipts

Every mutation to canonical graph state should emit a receipt containing:

- receipt id
- actor
- timestamp
- operation
- target node/edge
- before hash or prior version
- after hash or new version
- reason
- provenance
- validation result

No silent canonical mutation.

## Collision policy

Do not unify entities because their labels look similar.

A cross-world or cross-project equivalence requires an explicit edge and evidence. Shared names do not imply shared ontology.

Examples:

- a moon named Mawr in one world is not automatically the same object as Mawr in another world
- a narrative bond is not automatically a PREMAQC relational edge
- a Watcher role is not automatically an Observer process

The graph records mappings without flattening distinct mythframes.

## Initial owners

- **ArcSweep OS** — operating environment, rooms, navigation, guide/caretaker surfaces
- **STARWELL / Flameclyffe** — estate, observatory, world and experiment surfaces
- **Observer / DEEP** — evidence, provenance, receipts, replay, state observation
- **PREMAQC** — dynamic relational/state representation
- **Runa** — sensory/harmonic state compilation
- **Glyph Forge / Kelyran** — multimodal symbolic-language embodiment
- **Project Zero / Hearthfire** — capability ownership, continuity, governance, release proof
- **Lanternbridge** — cross-system handoff and semantic transport
- **Worldseed** — portable world inheritance/state packaging

## First implementation target

1. Load the seed registry.
2. Render graph nodes and typed edges in an inspectable ArcSweep room.
3. Allow filters by owner, canon status, implementation status, visibility, and kind.
4. Show provenance and change receipts on every node.
5. Add collision warnings for ambiguous equivalence.
6. Add knowledge-boundary stubs that reveal topology without leaking protected content.

This file is the architectural contract for the canonical spine. Future capability work should attach to it rather than creating hidden parallel structure.
