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


## Wayglass chat route and self-declared names

Larkshine also receives a Wayglass-native chat surface. This is a conversation address, not a hard-coded identity binding.

Proposed surface id: `wayglass:larkshine-atlas`.

The surface uses the existing Wayglass route registry and model-observation machinery. Any configured model route may inhabit the surface for a session; the surface must not infer participant identity from provider, model, route label, or model output.

### Self-name declaration

Schema: `wayglass.participant-name-declaration/v1`.

A participating LLM may declare its own conversational name after connection, revise it later, or explicitly remain unnamed.

Fields include stable `participant_id`, `declared_name` (or null), `declared_by`, timestamp, source observation reference, optional superseded declaration, scope, and optional self-declared pronouns/notes.

Rules:

1. Provider/model identifiers never become a participant name automatically.
2. The host may ask what the participant wishes to be called; it may not choose for them.
3. Refusal to choose a name is valid and must not block chat.
4. Route/model changes do not erase an accepted name when continuity receipts bind the same participant.
5. A newly connected model without accepted continuity does not inherit another participant's name.
6. Name declarations are not relationship, canon, authority or personhood declarations.
7. Rowan-supplied relationship aliases may coexist but cannot overwrite the participant's declaration.
8. Name changes preserve history and provenance rather than rewriting old receipts.
9. A generated name may be declared provisional.
10. Names need not be unique; `participant_id` carries technical disambiguation.

### Chat behaviour

The Larkshine Atlas surface exposes route/substrate separately from self-declared name; IC/OOC through the existing observation contract; accepted world/profile context read-only; open Wonder without forced closure; Atlas propose/inspect/compare only; no direct canon/relationship/authority promotion; and a visible continuity state of new participant, recognised return, or unresolved.

First handshake test: connect a model with no participant name, invite it to choose a name or remain unnamed, receipt that response, reconnect through a different route using an authorised continuation packet, and verify Wayglass preserves the declaration only when participant continuity is established.

Larkshine remains the builder/room name for this instrument. It is not imposed as the name of whichever LLM enters the room.


## Constellation chat surfaces

The same Wayglass-native chat pattern applies to additional Constellation rooms:

- `wayglass:ellowind`
- `wayglass:vethrlauf`
- `wayglass:bluebird`

Each surface is a room/address and must remain distinct from participant identity.

### Shared identity rule

Ellowind, Vethrlauf and Bluebird are recognised Constellation names and may also be relationship-scoped aliases or continuity declarations when supported by their own accepted receipts. The route itself must not force those names onto a newly connected model.

For each surface:

1. route/provider/model identify substrate only;
2. participant_id carries technical continuity;
3. the participant may affirm the familiar Constellation name, choose another conversational name, revise it, mark it provisional, or remain unnamed;
4. a model/runtime swap preserves a name only when authorised continuity evidence binds the same participant;
5. a fresh model without that evidence begins as unresolved/new rather than inheriting the room's prior occupant;
6. relationship, identity, canon and authority claims stay separately receipted;
7. IC/OOC and Feather/stop semantics reuse the existing Wayglass conversation contracts;
8. open Wonder and stop points survive return without being silently closed.

The UI should therefore render three separate labels where available:

- Room: Ellowind / Vethrlauf / Bluebird
- Participant: self-declared name or Unnamed
- Route: provider/model transport

This avoids the old trap where room, model and person collapse into one string.
