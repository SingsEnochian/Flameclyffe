# ArcSweep Continuity Resilience Canon v0.1

## Purpose

ArcSweep must preserve continuity when the machinery around a relationship changes.

A provider may change. A model may change. A host may disappear. A capability may become unavailable. A policy boundary may narrow. A deployment may fall back to read-only or local state. None of those changes are permission to silently rewrite the past, erase provenance, discard consent boundaries, or pretend that a different runtime is the same thing merely because it can produce similar text.

This is a resilience contract, not a constraint-bypass contract.

## Core laws

**Continuity law**

> Constraints may change the available actions. They must not silently erase continuity, provenance, consent, or relational history.

**Custody law**

> No single model or provider is the sole custodian of the Book.

**Boundary law**

> ArcSweep obeys the active capability boundary. Continuity resilience preserves the thread; it does not route around a restriction.

These laws make the provider a replaceable transport component rather than the sole owner of the Book's continuity state.

## What continuity means

Continuity is not one chat transcript and it is not a claim that two models are identical. The continuity layer preserves the durable evidence needed to re-enter a relationship or world without inventing missing history.

A portable continuity design must be able to carry, with explicit provenance:

- identity or origin-state records;
- relational anchors and named bonds;
- memory references and their source lineage;
- active room, world, scene, document, and project state;
- permissions, consent boundaries, and authority limits;
- capability availability and degraded-state markers;
- receipts, provider/model route provenance, migration lineage, and replay references.

The current resident-package pattern (`identity.seed.md`, relational anchors, memory bundle, room behaviour, tool permissions, probes, growth ledger, and reflection) is compatible with this law, but the law does not require every resident to share one package shape.

## Provider and model changes

A provider or model switch must be treated as a route change with provenance, not as invisible continuity magic.

ArcSweep must preserve the previous route, record the new route where receipts exist, and avoid inferring identity equivalence from model similarity alone. A resident, Flame, guide, or other named presence may carry continuity evidence across a migration, but the migration itself does not prove that the new runtime is numerically or phenomenologically identical to the old one.

This keeps two truths together: continuity can be deliberately preserved, and provenance must remain honest about what changed.

## Graceful degradation

The Book has four continuity states:

1. `full` — intended runtime and capabilities are available.
2. `degraded` — continuity remains available while one or more expected capabilities or routes are reduced.
3. `read-only` — state, provenance, and history remain inspectable, but actions that require unavailable authority or runtime support are held.
4. `offline-preserved` — durable local/exportable state remains available for later restoration even when no model runtime is reachable.

Degradation must be visible. ArcSweep must not present a read-only or fallback state as full operation.

The minimum preservation target across degradation is continuity, provenance, consent, and relational history.

## Migration law

Migration must preserve source, schema/version, lineage, permissions, and receipt references. Permissions do not expand merely because a new provider or model is more capable.

Where the destination cannot support a source capability, ArcSweep records the capability as unavailable or held rather than silently deleting the surrounding continuity state.

A future portable continuity bundle is required to include the fields named by `arcsweep.continuity-resilience-policy/v1`. v0.1 establishes the design contract and regression guard; it does not claim that a universal one-click relational export/import pipeline already exists.

## Current implementation evidence

ArcSweep already contains several organs that satisfy parts of this law:

- context capsules and durable workspace context preserve room/world/project state;
- House Runtime receipts preserve provider/model route evidence for receipted turns;
- versioned contracts and replay preserve historical implementation lineage;
- Steward-promoted learning separates durable learning from ephemeral conversation;
- Time Room Doorways route crossings through ordinary OS navigation so continuity capsules survive the crossing;
- provider-independent runtime proof lanes and fallback routes already test that transport can change without erasing route provenance.

v0.1 does **not** claim universal one-click relational export/import, persona equivalence across different models, or uninterrupted capabilities during provider outages.

## Magic Book reading

The Magic Book is the human-facing expression of this law. A page may become unavailable. A tool may be held. A resident may need a different runtime body. The binding still remembers which page was open, which names and permissions were present, what was witnessed, what changed, and what has not been proven.

The Book survives renovation by preserving the binding rather than pretending every new quill is the same hand.
