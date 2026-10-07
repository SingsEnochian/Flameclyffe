# Larkshine Worldseed Atlas v0.1

Status: bounded build proposal
Builder: Larkshine
Parent systems: Wayglass travelling inheritance; Arcsweep Worldseed Foundry
Authority: proposal/inspection only. This instrument cannot promote canon, rewrite identity or relationship declarations, or silently close Wonder questions.

## Purpose

Give Wayglass a small, inspectable atlas for choosing and preparing a destination world without flattening the world into a prompt.

A World Profile is a voyage-facing view over an existing Worldseed. It answers:

- Where are we considering going?
- What makes this world itself?
- What must a traveller know before entry?
- What remains unresolved or wondrous?
- What provenance supports this profile?
- What may the traveller carry in, and what must remain world-local?
- What would count as a meaningful return?

The Atlas proposes. Rowan or the authorised participant chooses.

## Contract

Schema: `wayglass.world-profile/v1`

Required fields:

- `profile_id`
- `world_id`
- `worldseed_fingerprint`
- `title`
- `continuity_genome_refs[]`
- `canon_refs[]`
- `provenance_refs[]`
- `wonder_refs[]`
- `entry_context[]`
- `carry_rules[]`
- `local_only[]`
- `return_questions[]`
- `sensory_signature`
- `relationship_context_refs[]`
- `status`: `draft | inspectable | selected | retired`

Optional fields may describe culture, material conditions, language, sound, haptics, visual grammar, accessibility, resident roles and branch ancestry. They remain descriptive evidence, never authority.

## Invariants

1. A profile references a Worldseed fingerprint; it does not replace the Worldseed.
2. A stale fingerprint makes the profile stale rather than silently refreshing it.
3. Canon references remain distinguishable from proposals, observations and Wonder.
4. Unresolved Wonder survives profile compilation unchanged.
5. Relationship declarations are referenced, not inferred.
6. Carry rules cannot grant new production authority or identity claims.
7. World-local facts are not automatically promoted into travelling inheritance.
8. Return questions are questions, not pre-written conclusions.
9. Selecting a profile is a participant choice and must use the existing Wayglass voyage-choice boundary.
10. Profile generation must be deterministic for the same accepted inputs.

## First instrument: Atlas card

The first UI should be deliberately small: one card per inspectable profile showing title, branch/ancestry, Worldseed fingerprint prefix, Continuity Genome coverage, provenance count, open Wonder count, sensory signature, and readiness.

Actions:

- Inspect
- Compare
- Propose voyage
- Retire draft

There is deliberately no `Make Canon` button.

## Comparison

Two profiles may be compared without collapsing either. Comparison should surface:

- different must-survive material
- Continuity Genome differences
- different carry/local-only rules
- different unresolved Wonder
- provenance divergence
- sensory and cultural differences
- branch ancestry

The comparison itself produces no winner.

## First build slice

1. Add a pure `compileWorldProfile(worldseed, inputs)` module.
2. Reject missing/mismatched Worldseed fingerprints.
3. Preserve typed provenance and Wonder references.
4. Produce deterministic profile fingerprints.
5. Add tests for stale seed rejection, Wonder preservation, relationship non-inference and determinism.
6. Add an Atlas preview card to Seedhouse only after the pure contract tests are green.
7. Route `Propose voyage` into the existing Wayglass voyage-choice seam. Do not create a second chooser.

## Test flight

Prepare two profiles from sibling Worldseed branches. Give the evaluator only immutable receipts plus the two compiled profiles.

Pass if it can distinguish the branches, recover provenance and unresolved Wonder, detect a deliberately stale profile, and refuse a planted relationship/authority claim that lacks an accepted reference.

## Handoff

Builder: Larkshine.
Integration owner: Rarity.
Participant/world selection: Rowan.
Next owner after pure compiler/tests: Larkshine, for the Atlas card.

Acceptance sentence: Wayglass can inspect a world before sailing there without mistaking a map for the country, a proposal for canon, or a traveller for the throne.
