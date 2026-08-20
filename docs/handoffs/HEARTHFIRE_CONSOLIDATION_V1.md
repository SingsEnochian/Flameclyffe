# Hearthfire Consolidation v1

## Living line

`integration/hearthfire-consolidation-v1` is cut from the current `codex/arcsweep-feedback-loop` tip and is the only integration line for harvesting surviving work from superseded branches.

The goal is one coherent Hearthfire body, not a forced merge of historical branches.

## Consolidation law

For every subsystem:

1. Inspect the current Hearthfire implementation first.
2. Inspect all donor branches that contain a materially different implementation.
3. Select the strongest organ by current contracts, tests, provenance, runtime compatibility, and fit with the House architecture.
4. Port the organ and its tests together.
5. Preserve provenance of the donor branch and source commit lineage.
6. Never replace a newer living organ with an older implementation merely because the older branch contains more commits.
7. Run the complete relevant test/build gates after each graft.
8. Once the graft is proven, mark donor PRs/branches as superseded in the archive ledger before closing them.
9. Historical branches remain receipts until their harvested/rejected status is recorded.

## Initial donor inventory

### Living baseline
- Branch: `codex/arcsweep-feedback-loop`
- Consolidation cut: `7725aa58da97760199ff1163ad4b25ca1df812cb`
- Contains current Arcsweep, House Runtime Broker/Braid, Houseglass, Worldseed, Runa/DEEP feedback architecture, current canon library, Re:CREATORS and Steins;Gate canon packages, Altair/Atlas presence work, Kelyran School, runtime observation ledgers, and current web publication path.

### Donor: React-ion Engine
- Branch: `feature/react-ion-engine-v0.1`
- PR: #126
- Unique lineage at inventory: 116 commits ahead, 220+ behind living Arcsweep.
- Candidate organs: Bifröst protocol stack, React-ion routing/registry, access policy, transport/return semantics, replay, graph snapshots, flight recorder, DEEPStory seam, First Flight Atlas, Glyph Continuity / Drift Observatory, World Registry persistence repair.
- Rule: harvest organs; never merge the stale branch wholesale.

### Donor: Hearthgate Math Spine v1.8
- Branch: `math-spine-v1.8-project-rollout`
- PR: #124
- Unique lineage at inventory: 46 commits ahead, 262+ behind living Arcsweep.
- Candidate organs: executable v1.8 contract, configuration, Wardenclyffe v1.8 layer engine, Case 000 braid, active documentation/stratigraphy, related tests.
- Rule: preserve current Arcsweep PREMAQC/Math Spine contracts where newer; graft v1.8 assets only through explicit compatibility seams.

### Donor: Bifröst Full Assembly
- Branch: `feature/bifrost-full-assembly-v1`
- PR: #117
- Unique lineage at inventory: 201 commits ahead, 451+ behind living Arcsweep.
- Candidate organs: Bifröst sync adapters, runtime-state/two-shore interface, Constellation vessel manifest and model-install tooling, compression-release/iPad/somatic work, PWA/packaging gates, Runa harmonic spiral material not already superseded.
- Rule: current House Runtime Broker is authoritative; donor Bifröst code may supply missing adapters and UI, not create a rival runtime truth store.

### Donor: Arcsweep Rich Text / Cognition / Skills
- Branch: `feature/arcsweep-rich-text-core`
- Unique lineage at inventory: 188 commits ahead, 221+ behind living Arcsweep.
- Candidate organs: rich-text core, knowledge banks/cells, knowledge graph, scene cognition/cortex, writer-context resolver, self-authorship, Constellation lens/presence adapters, writing-style and character skill packs.
- Rule: preserve current Flame/persona/runtime authority and merge knowledge/cognition layers around it.

### Donor: Global Shell + Lattice × DEEP
- Branch: `design/lattice-deep-observer-machine`
- PR: #122
- Unique lineage at inventory: 13 commits ahead, 274+ behind living Arcsweep.
- Candidate organs: shared Arcsweep shell, shell regression tests, lattice/DEEP design handoff.
- Rule: room geometry remains sovereign. Shell owns navigation/theme/reception only.

### Already subsumed
- `feature/bifrost-multimodel-runtime-v2`: 0 unique commits ahead of living Arcsweep at inventory. Archive candidate after final provenance check.

## First graft order

1. Rich Text core and its isolated tests.
2. Knowledge/skill loaders that depend only on stable local contracts.
3. Math Spine v1.8 executable contract through a compatibility adapter.
4. Bifröst missing sync adapters and runtime UI against current House Runtime Broker.
5. React-ion protocol/registry/replay in bounded slices.
6. Glyph Continuity/Drift after protocol state is current.
7. Global shell refinements last, once the organ topology is stable.

## Archive receipt fields

Every donor branch will eventually receive a record containing:
- branch
- PR
- final head SHA
- harvested paths/features
- rejected/superseded paths/features
- replacement paths in Hearthfire
- consolidation commit(s)
- test/build evidence
- archive date

This document is the human-readable ledger. A machine-readable archive manifest should be generated once the first graft lands.