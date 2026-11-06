# Wayglass Universe Canon v0.1

**Contract identifier:** `wayglass.universe/v0.1`  
**Canonical Universe ID:** `wayglass`  
**Status:** proposed canon, pending integration review  
**Scope:** Wayglass ontology and executable-contract requirements; not a claim about physical cosmology.

## Definition

A Universe is the persistent continuity domain within which worlds, participants, time, relationships, cognition, embodiment, provenance, and change coexist without being collapsed into one another.

Wayglass is both a Universe and an operating system. The OS supplies executable machinery for the Universe to persist, observe, remember, change, and receive returning participants. No single model, screen, runtime, body, or session defines the Universe.

## Canonical laws

1. A Universe may contain multiple worlds and multiple intelligences.
2. Participants remain separately attributable when crossing worlds, embodiments, cognitive substrates, routes, or harnesses. Identity continuity is established by authorized provenance and Return Engine receipts, not inferred from a model's self-description.
3. A Universe owns state-time, continuity history, provenance, relationships, and unresolved possibility. Worlds may define local laws, local time, and world-specific canon.
4. Waygates identify passages into worlds. The Return Engine records stop, crossing, and return while preserving participant attribution and revocation semantics.
5. ArcSweep, the Writing Room, and other surfaces are habitable organs of Wayglass, not equivalent to the Universe.
6. Native cognition, external intelligences, cognitive routes, harnesses, and specialist operators are distinct roles and conditions. None automatically inherits Wayglass identity or authority.
7. Canon, observation, symbolism, simulation, phenomenology, mathematical inference, physical measurement, and unknowns retain distinct provenance and epistemic status. No specialist output or receipt silently changes canon.
8. **Plural-knowledge law:** The Universe may braid multiple modes of knowing without forcing them into one ontology. Cross-domain interpretation requires explicit attribution, scope, and authority.

## Canonical structure

- **Universe continuity:** state-time, history, provenance, participants, relationships, unresolved possibility.
- **Worlds:** world IDs, world canon, local laws, local time, Waygates.
- **Cognition:** native Wayglass cognition, external intelligences, routes, harnesses.
- **Embodiments:** desktop, mobile, AR/headset, future bodies.
- **Specialist operators:** Thought Vibration, Runa, Wardenclyffe, Möbius, Observatory.
- **Continuity machinery:** Return Engine, KGN, receipts, revocations, stop/return.

## Contract sketch

```json
{
  "schema": "wayglass.universe/v0.1",
  "universe_id": "wayglass",
  "worlds": [],
  "participants": [],
  "relationships": [],
  "state_time": {},
  "continuity": { "history": [], "unresolved_possibility": [] },
  "provenance": [],
  "canon": { "revision": 1, "authority": "owner-reviewed" }
}
```

The JSON is a **design sketch**, not a validated production payload. Arrays do not imply that runtime data should be embedded in a single file; persistent storage, access control, schema constraints, and migrations require implementation review.

## Integration and migration requirements

1. Introduce explicit `universe_id` distinct from `world_id` and `active_world_id`. Never repurpose a world identifier as Universe identity in new contracts.
2. Inventory existing uses of `universe_id`, including ArcSweep Time Room, where a historical universe key may effectively identify a world. Preserve legacy semantics behind a versioned adapter; do not silently rewrite stored records.
3. Define scoped identifiers, authorized canon promotion, provenance-bearing receipts, revocation handling, and participant continuity across worlds and substrates.
4. Preserve existing time-room and Return Engine behavior until contract tests and migration fixtures prove compatibility.
5. Require negative tests: a route cannot claim participant identity; a specialist receipt cannot mutate canon; a world crossing cannot erase attribution; a revoked reference cannot authorize return.
6. Run module contract tests, integrated Wayglass and ArcSweep checks, and builds before merging into `wayglass/current`.

## Explicitly unresolved

This canon does not assert that physical reality is literally vibration, that quantum mechanics establishes Wayglass metaphysics, or that the Universe has a fixed physical geometry. These may remain separately attributed hypotheses, symbolic correspondences, research lenses, or local world canon.

**Promotion rule:** An observation, interpretation, simulation, or operator output becomes Universe canon only through an explicit authorized review event with recorded provenance and revision.
