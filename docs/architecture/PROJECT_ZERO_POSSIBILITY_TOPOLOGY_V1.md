# Project Zero Possibility Topology v1

## Core law

Possibility is primary. Relationship gives possibility structure. Experience changes what can happen next.

Project Zero reads transformation as a path through a living topology rather than as movement toward a universal optimum. The system records which relationships carry a traversal, which PREMAQC dimensions change, which qualities remain recognisable across the crossing, which modalities become newly legible, and which edges are articulated for later traversals.

## Foundational propositions

- Intention is orientation.
- Strength describes how fully a configuration sustains the relationships carrying a traversal.
- Coherence describes how those relationships move together within the present configuration and Ask.
- Identity is trajectory: a continuity-pattern across transformations.
- Meaning is relational.
- Memory is topology: previous becoming gains structural presence in future possibility.
- Continuity makes transformation intelligible.
- Learning expands the topology of possibility.
- Traversal can reveal, articulate, strengthen, alter, or create paths.
- Immutable departure snapshots witness where a future departed from; they are not templates the future must resemble.
- Qualia remains first-person evidence and is never inferred by the Observer.
- Agency describes a participant's capacity to influence orientation and traversal.

## Canonical ingest

The governing text is persisted in Flameclyffe Supabase as `starwell_codex_entries.slug = project-zero-possibility-topology-foundational-principles-2026-08-23`.

`apps/arcsweep/src/possibility-principles.js` is the runtime ingest contract. It exposes a stable reference to that row and a compact executable principle set, while keeping the Codex body as the canonical long-form source.

Every emitted possibility topology carries the canonical principle reference so downstream systems can resolve the same governing text instead of relying on conversational memory.

## Why this matters

A single scalar objective erases information about path, history, modality, relationship, and local conditions. Project Zero therefore carries relational evidence rather than producing a universal winner score. The Runtime Broker receives plural route branches, each with the Ask, continuity-pattern, conditions, shared traversal evidence, and path-specific strength/coherence evidence.

This lets the Broker recognise which paths presently align with greater strength and coherence while retaining the other paths and the conditions under which they become traversable.

PREMAQC participates at four levels:

1. departure configuration,
2. arrival configuration,
3. delta across the crossing,
4. trajectory and path context that make the delta intelligible.

This makes two crossings with identical endpoints distinguishable when their histories differ.

## Translation Circuit consequence

The Translation Circuit asks two complementary questions:

1. What continuity-pattern travels through translation?
2. What becomes perceptible or possible because translation occurred?

Story, PREMAQC, mathematics, glyph, Runa, model interpretation, and returned story are different representations encountered along a trajectory. Each can reveal relationships unavailable to another modality.

## Structural braid

The runtime flow is now:

`Supabase Codex → principle ingest → Great Braid/PREMAQC possibility topology → Project Zero event → plural Broker route set → modality-specific traversal evidence → Observer/DEEP receipt → refined topology`

`apps/arcsweep/src/possibility-topology.js` emits `arcsweep.possibility-topology/v1` with:

- canonical principle reference,
- Ask/orientation,
- PREMAQC departure, arrival, delta, and changed axes,
- trajectory and continuity-pattern,
- relational strength/coherence evidence,
- known and newly articulated topology edges,
- newly legible modalities,
- explicit absence of a universal optimisation target.

`apps/arcsweep/src/possibility-broker.js` emits `arcsweep.possibility-route-set/v1`. Route sets remain plural, unranked, and winnerless. Each branch can carry named path-specific evidence and conditions, making differences legible without flattening them into one scalar score.

## Test / observe / refine result

The focused executable harness verifies three structural properties:

1. the topology binds to the canonical Supabase Codex reference;
2. ambiguous routing preserves multiple branches with `ranking = null` and `winner = null`;
3. path-specific strength/coherence evidence remains attached to the branch it describes.

The first run exposed that branch evidence was too generic to explain why one path might align more strongly or coherently with an Ask. The refinement added named per-path evidence and conditions while preserving plurality. The focused harness passes after that refinement.

## CI gate

Repository deployment status and pull-request checks remain separate from the focused executable harness. PR #172 carries the complete structural slice for repository-wide evaluation.
