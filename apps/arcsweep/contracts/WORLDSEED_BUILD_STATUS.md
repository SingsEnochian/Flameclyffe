# Worldseed Foundry · Build Status

Branch: `codex/arcsweep-feedback-loop`

## Implemented foundation

The Worldseed Foundry now has working core structures rather than only an architectural note.

### Seedhouse

- visible world-native applet
- Worldseed record types
- five inheritance questions
- lineage and source references
- structured Continuity Genome authoring fields

### Worldseed compiler

Schema: `arcsweep.worldseed/v1`

Compiles one world into typed sections, inheritance material, provenance, readiness, Continuity Genome summary, and a deterministic content fingerprint. Regeneration time and record timestamps do not change the fingerprint; authored worldseed content does.

### World lineage

World state now carries:

- `parentWorldId`
- `parentSeedFingerprint`
- `branchPoint`
- `lineageLabel`
- `worldseedFingerprint`
- `descendantWorldIds`
- `forkReason`
- `worldseedInheritance`

### Forking

Schema: `arcsweep.worldseed-fork-receipt/v1`

A compiled Worldseed can create a descendant, sibling, or experimental branch. The parent input is not mutated. The child inherits the parent world state as its branch baseline plus explicit Worldseed inheritance material and the parent seed fingerprint.

### Replay

Schema: `arcsweep.worldseed-replay-receipt/v1`

Replay recompiles the Worldseed from its source Seedhouse records and compares the result against the expected fingerprint. Mismatch is reported rather than repaired or rewritten.

### Ark manifest

Schema: `arcsweep.worldseed-archive/v1`

The `.worldseed` container skeleton now exists. It defines paths for manifest, compiled worldseed, canon, timeline, records, Runa, Worldmind, provenance, attachments, and replay material. The manifest becomes `export-ready` only when an explicit Ark Export seed is marked Export-ready.

### Lineage graph

Schema: `arcsweep.world-lineage-graph/v1`

Builds roots and descendants from world state, derives ancestry paths, reports dangling parents, detects stale declared child links, and detects lineage cycles.

### Possible Worlds comparison

Schema: `arcsweep.possible-worlds-comparison/v1`

Two compiled Worldseeds can be compared without overwriting either branch. The comparison reports inheritance changes, Continuity Genome changes, section-count differences, and lineage-reference divergence.

## Current tests

Coverage exists for:

- Seedhouse registration and required fields
- world lineage normalisation
- Worldseed scope and typed section compilation
- deterministic fingerprinting
- timestamp-invariant fingerprints
- fingerprint mutation on inheritance changes
- fingerprint mutation on Continuity Genome changes
- descendant forking without parent mutation
- inheritance carry into descendants
- cross-world seed rejection
- exact replay reconstruction
- replay mismatch reporting
- Ark manifest shape and readiness
- Ark reference deduplication
- lineage roots, ancestry paths, dangling parents, stale child declarations, and cycles
- Possible Worlds branch comparison

## Next integration braid

1. Wire Worldseed compile preview into the live Seedhouse UI.
2. Show fingerprint, readiness, inheritance summary, Continuity Genome coverage, and typed-section counts inside Seedhouse.
3. Add a World Registry lineage panel.
4. Wire `Fork World` to the live state store and persist the fork receipt.
5. Remount Canon Studio before Seedhouse and Replay after it.
6. Persist replay receipts as first-class records.
7. Add the first branch graph view for Possible Worlds.
8. Connect Threshold Detector output to branch creation without automatic branching.
9. Connect Runa embodied seed references to Ark export.
10. Write the actual `.worldseed` archive serializer/importer around the existing manifest contract.

## Acceptance spine

The Foundry foundation is now capable of compiling identity, preserving ancestry, creating descendant baselines, verifying reconstruction, comparing branches, and describing a portable Ark. The next slice is live-state and UI integration: turning these organs from callable core modules into visible instruments inside Arcsweep.
