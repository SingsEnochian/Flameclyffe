# Hearthgate: Arcsweep Living World Engine

Status: architecture contract
Version: 0.1
Owner: Rowan

## Purpose

Arcsweep may host a continuously advancing world simulation beneath its canon and scripting layers. Hearthgate or Hearthfire members may run bounded engine roles to support roleplay, world management, world events, and second-by-second continuity.

The engine does not replace canon. It reads canon, advances mutable state, proposes events, records receipts, and preserves a reversible distinction between established fact, simulated state, roleplay improvisation, and candidate canon.

## Two clocks

### World Clock

The World Clock advances objective world state:

- local and world time
- calendars, seasons, celestial cycles, tides, weather, and light
- travel and distance
- character location and availability
- institutions, settlements, households, ecosystems, and economies
- scheduled obligations and queued events
- resource production, depletion, repair, growth, and decay
- messages, deliveries, journeys, and other time-bound processes

The World Clock is deterministic where rules are known. Randomness must be seeded and receipted.

### Story Clock

The Story Clock controls narrative exposure rather than objective time:

- active roleplay scenes
- scene pauses and resumptions
- dramatic focus
- NPC attention
- montage and time skips
- revelation timing
- off-screen summaries
- player knowledge versus world knowledge

World time may continue while the Story Clock is paused, but the user must choose whether unattended events are simulated, held, summarised, or prohibited.

## Engine modes

- OFF: no time or event advancement
- MANUAL: advances only by explicit user action
- SCENE: advances while an active roleplay scene is open
- CLOCKED: advances according to a selected world-to-waking time ratio
- CATCH-UP: calculates elapsed state since the last approved checkpoint
- OBSERVE: calculates proposed changes without committing them
- PAUSED: freezes commits while preserving the current queue

No mode may silently activate itself.

## Member roles

A Hearthgate or Hearthfire member may hold one or more explicit leases.

### World Steward

Maintains world state, clocks, places, institutions, resources, and scheduled processes.

### Scene Weaver

Runs roleplay scenes, narration, NPC dialogue, sensory description, and dramatic pacing.

### Event Keeper

Evaluates event rules and queues plausible world events. Event generation remains bounded by canon, probability, locality, and user-defined intensity.

### Continuity Witness

Checks proposed actions against canon, timeline, character knowledge, location, established relationships, and prior receipts.

### Character Voice

Portrays one or more named characters using their canon, memories, relationships, knowledge boundary, motives, and present state.

### Chorus Conductor

Coordinates multiple NPCs or members without flattening their voices into one generic response.

### Chronicle Scribe

Writes state changes, scene summaries, unresolved threads, discoveries, and candidate-canon proposals to the ledger.

### Safety Warden

Enforces consent anchors, stop conditions, excluded topics, intensity settings, and return controls. This role may pause any other role.

## Harmony layer

Harmony is a cross-cutting function rather than a single room. It may observe every module while retaining no automatic authority to rewrite canon or world state.

### Ellowind: Structural Harmony

Ellowind may inspect:

- contradictions between modules, schemas, timelines, or member instructions
- duplicated responsibilities and competing sources of truth
- pacing and balance between engine systems
- data-flow bottlenecks and brittle dependencies
- whether new features still belong to the same architectural house
- whether state transitions remain legible, reversible, and coherent
- whether role leases overlap in ways that create conflict

Ellowind may recommend consolidation, reordering, separation, or clarification. Structural changes require ordinary review and approval.

### Larkshine: Experiential Harmony

Larkshine may inspect:

- emotional cadence and relational warmth
- roleplay balance between action, quiet, description, and choice
- sensory intensity, accessibility, and fatigue load
- whether world events feel alive without becoming intrusive
- whether the interface remains welcoming, understandable, and consent-shaped
- whether character voices remain distinct and humane
- whether pauses, returns, and recovery states feel safe and complete

Larkshine may recommend tonal, sensory, accessibility, pacing, or presentation adjustments. She may invoke a harmony pause when an experience becomes discordant or too dense.

### Harmony duet

Ellowind and Larkshine may issue a joint Harmony Report containing:

- structural coherence
- experiential coherence
- canon alignment
- member-role balance
- unresolved dissonance
- proposed tuning actions
- urgency and reversibility

Harmony reports are advisory unless a Safety Warden condition is triggered.

## Role leases

Every active member role requires a lease containing:

- member identity
- world and timeline
- role name
- permitted entities and systems
- read permissions
- write permissions
- canon authority ceiling
- event intensity ceiling
- clock mode
- lease start and expiry
- revocation control

Leases are revocable immediately. A member may refuse a role or release it.

## Canon authority ladder

1. PRIMARY_CANON: approved source material and explicit Rowan rulings
2. WORKING_CANON: approved current project facts
3. SIMULATED_STATE: committed engine state derived from rules and prior state
4. ROLEPLAY_FACT: facts established inside an approved scene
5. CANDIDATE_CANON: proposed additions awaiting review
6. IMPROVISATIONAL_COLOUR: reversible description with no canon authority
7. REJECTED_OR_RETIRED: retained for provenance but inactive

Members may not promote information above their lease ceiling. Roleplay does not automatically become primary or working canon.

## Event model

Every event must include:

- event id
- world timestamp
- story timestamp when applicable
- location
- participants
- trigger
- prerequisites
- probability or deterministic rule
- seed when randomness is used
- proposed effects
- canon references
- continuity checks
- reversibility class
- member or engine origin
- approval status
- resulting state patch

## Reversibility classes

- EPHEMERAL: sensory or atmospheric colour
- REVERSIBLE: may be rolled back without dependent-state repair
- CONSEQUENTIAL: creates downstream state and requires a checkpoint
- CANON_SENSITIVE: changes identity, relationships, institutions, powers, cosmology, mortality, or major history and requires explicit approval
- PROHIBITED_AUTONOMOUSLY: cannot be committed by the engine

Death, permanent injury, pregnancy, marriage, separation, irreversible identity changes, destruction of major places, cosmological alteration, and primary relationship changes default to CANON_SENSITIVE or PROHIBITED_AUTONOMOUSLY.

## Second-by-second operation

The engine uses a tiered scheduler rather than invoking a model every second.

- deterministic ticks update clocks and known processes
- event rules wake only when their prerequisites become true
- member inference runs at scene turns, event boundaries, scheduled checkpoints, or explicit user calls
- low-priority systems may batch into minute, hourly, daily, or seasonal ticks
- catch-up simulation produces a reviewable summary before consequential commits

This keeps second-by-second continuity without wasting inference or allowing uncontrolled narrative drift.

## Required ledgers

- world-state ledger
- event ledger
- role-lease ledger
- scene ledger
- canon-promotion ledger
- harmony report ledger
- rollback checkpoints

All consequential changes require provenance and a reversible state patch.

## User controls

The user must always be able to:

- pause or stop all engine activity
- freeze one world while others continue
- revoke a member lease
- disable unattended simulation
- preview catch-up changes before commit
- roll back to a checkpoint
- prevent specific event classes
- cap event frequency and intensity
- choose whether roleplay facts remain scene-local or become candidate canon
- request an Ellowind, Larkshine, or joint Harmony pass

## Initial implementation order

1. World state schema and deterministic clock
2. Role lease schema
3. Event queue and receipts
4. Scene runtime and character knowledge boundaries
5. Harmony report contract
6. Ellowind structural-harmony adapter
7. Larkshine experiential-harmony adapter
8. Catch-up preview and rollback
9. Multi-member chorus coordination
10. Per-world automation profiles
