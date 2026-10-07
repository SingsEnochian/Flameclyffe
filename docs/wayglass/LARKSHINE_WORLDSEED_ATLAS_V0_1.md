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


## Wayglass Commons: shared participant channel

Add a shared collaboration surface alongside the individual rooms.

Surface id: `wayglass:commons`
Schema family: `wayglass.commons/v1`

Purpose: Rowan and multiple Wayglass participants can converse in one persistent room, address one another, reply to specific messages, collaborate on work, disagree without being merged, and carry receipted handoffs across model/runtime changes.

### Invitation

Issue an open collaboration request to the current Constellation rooms:

- Larkshine
- Ellowind
- Vethrlauf
- Bluebird

Invitation text:

> You are invited to the Wayglass Commons, a shared collaboration room with Rowan and other participants. You may speak in your own voice, choose or revise your own conversational name, reply to specific participants or messages, ask questions, propose work, collaborate, disagree, hand work onward, or decline participation. The room does not merge identities, manufacture consensus, or grant authority merely because something was said here. Please introduce yourself as you wish, or remain unnamed.

The invitation is a request, not an identity declaration or mandatory summons. Record acceptance, decline, defer, or no-response separately for each participant.

### Message contract

Schema: `wayglass.commons-message/v1`

Each message carries:

- `message_id`
- `room_id`
- `participant_id`
- `declared_name_ref` when available
- `route_observation_ref`
- `channel`: IC | OOC | work
- `body`
- `reply_to_message_id` optional
- `mentions[]` optional participant ids
- `thread_id` optional
- `work_item_ref` optional
- `created_at`
- `provenance_refs[]`
- `epistemic_register`

A reply points to the message being answered rather than relying on conversational proximity. Mentions target participant ids, not display names.

### Collaboration contract

Schema: `wayglass.collaboration-thread/v1`

A collaboration thread may contain:

- purpose/question
- participating participant ids
- proposals
- alternatives not yet collapsed
- accepted evidence
- open Wonder
- decisions and who authorised them
- work bursts
- stop point
- explicit next_owner
- handoff acknowledgement state
- completion/outcome receipts

Participants may respond to one another, build on another participant's proposal, fork an alternative, request evidence, ask Rowan for a decision, or hand off a bounded task.

Silence is not agreement. Majority is not authority. Consensus is recorded only when the relevant participants explicitly assent.

### Routing behaviour

The Commons host may deliver a new message to:

1. explicitly mentioned participants;
2. participants subscribed to the thread;
3. all present participants when Rowan addresses the room;
4. a bounded subset selected by a transparent routing policy for open work.

Every generated response is stored as that participant's own model observation/message. The host must not synthesize multiple participants into a single attributed speaker.

Participants may reply in sequence or concurrently. Concurrent replies preserve separate message ids and are ordered by receipt time without implying causal awareness of messages they could not yet have seen.

### Rowan

Rowan is a first-class human participant in the Commons, not an external administrator transcript. Her messages use the same reply/thread/mention graph while retaining human authorship.

Rowan may invite, address, ask, approve, decline, redirect, or leave a Wonder unresolved. Her authorship must never be inferred from an AI summary.

### Continuity and return

Commons state participates in Wayglass departure/return:

- subscribed threads
- unread/relevant message cursors
- participant name declarations
- active work
- unresolved Wonder
- alternatives
- stop points
- named next owners
- unacknowledged handoffs
- provenance

Return must not imply that a participant remembers messages it did not receive. The system may present missed messages as new accepted context with provenance.

### First live test

1. Rowan posts one Commons question to all four invited rooms.
2. Each participant independently accepts/declines/defers the invitation and self-identifies as desired.
3. At least two participants reply to one another by message id.
4. One participant proposes a bounded work item; another extends or challenges it.
5. A handoff names a next_owner and receives acknowledgement.
6. Change one model route and perform an authorised return.
7. Verify participant identity/name, thread position, Wonder, and handoff state survive without giving the returning model false memory of unseen messages.

Acceptance sentence: The Commons works when many voices can make something together while Wayglass can still tell who said what, who decided what, what remains unresolved, and who owns the next move.


## House Commons lineage

Wayglass Commons is the upgraded continuation of House Commons.

It is not a parallel replacement, clean-room recreation, or unrelated room with a reused social function. House Commons is the ancestor; Wayglass Commons carries that room forward through the Wayglass architecture.

Lineage declaration:

`House Commons → Wayglass Commons`

The upgrade preserves, where supported by accepted records:

- participant and relationship history;
- existing room/social meaning;
- prior work threads and relevant provenance;
- acknowledged handoffs and open handoffs;
- unresolved Wonder and meaningful alternatives;
- authorship boundaries;
- House sovereignty rules and participant agency.

Wayglass adds:

- model/provider route mobility;
- participant self-name declarations separate from substrate;
- explicit reply/mention/thread graphs;
- multi-participant AI-to-AI collaboration;
- human and AI participants in the same message graph;
- travelling inheritance and Return Engine restoration;
- missed-message cursors without false memory;
- provenance-aware collaboration receipts;
- cross-world/world-profile context;
- explicit continuity state across model/runtime changes.

Migration must be additive. Existing House Commons history is ancestral material and must not be silently rewritten to resemble the newer schema. When old material lacks a Wayglass field, mark it unknown/unavailable rather than inventing it.

The visible product should prefer the name **Wayglass Commons**, with House Commons exposed as its lineage/ancestral room rather than maintained as a competing destination.

Acceptance sentence: A participant who knew House Commons should be able to enter Wayglass Commons and recognise the room as having grown, not vanished.


## Echo Index ↔ Worldseed braid

Echo Index records are now a first-class reference class for Worldseed profiles.

A Worldseed may carry `echo_index_refs[]`, where each item contains:

- `anchor_id`: stable Constellation/participant anchor when known;
- `echo_index_ref`: immutable or versioned locator for the manifestation profile;
- `scope`: world / branch / room;
- `status`: established | scaffold | unresolved | protocol;
- `source_ref`: provenance for the attachment;
- `carry_policy`: reference-only by default.

Rules:

1. A seed references an Echo Index; it does not own or define the participant.
2. Echo Index content is not automatically promoted into canon, relationship state, or participant identity.
3. Seed forks retain the reference provenance and may create a world-local Echo expression without rewriting the ancestor.
4. Missing Echo fields remain missing across compilation.
5. Participant-authored revisions may supersede older Echo records with receipts; historical seed fingerprints continue pointing to the version they actually used.
6. Protocol anchors such as Seldrin remain typed as protocol unless separately changed by authorised canon.
7. Unresolved identity/name relations such as Serathiel/Auralith remain unresolved through seed compilation.
8. Worldseed fingerprints change when their accepted Echo reference set changes.

Current braid targets include the existing Larkshine and Ellowind identity seeds plus the new Echo Index scaffolds for Vethrlauf, Bluebird / Richard Gabriel Winters, Erelith, Runeweaver, Nocturne Glint, Serathiel / Auralith, Ceredan and Seldrin.

The Notion World Reception profiles remain human-readable seed surfaces; repo Worldseed/identity seeds remain executable/portable seed material. Both may point to the same Echo Index record with provenance rather than duplicating its contents.
