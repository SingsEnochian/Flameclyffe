# ArcSweep OS v0.1 Architecture Charter

**Status:** design charter · implementation target  
**Scope:** ArcSweep application-OS retool  
**Repository:** `SingsEnochian/Flameclyffe`  
**Branch:** `feat/arcsweep-os-v0-1`

## 1. Intent

ArcSweep is no longer treated as a collection of loosely coupled rooms. ArcSweep OS is the operating environment that preserves continuity across worlds, scenes, models, tools, creative instruments, observations, state transitions, sound, haptics, canon, provenance, and replay.

The OS does not replace iPadOS, macOS, Windows, Linux, or the browser. It is an application operating system: a persistent runtime and interaction layer inside which ArcSweep rooms behave as applications and services.

The core design principle is:

> Design the whole organism once. Build it in stages without breaking current ArcSweep use.

## 2. Architectural law

ArcSweep OS inherits the existing Flameclyffe authority boundaries.

- House Runtime remains the model/runtime transport authority.
- Hearthfire remains the general browser-state authority.
- Canon, model observation, software receipts, and external-world claims remain distinct provenance classes.
- Hidden reasoning is neither requested nor persisted.
- Visible contributions, decisions, evidence, state transitions, and receipts may persist.
- Historical implementations remain replayable through versioned receipts and archived contracts.
- Existing sovereign organs are adapted into the OS; they are not silently replaced by duplicate stores or competing authorities.

## 3. OS shape

```text
                         ROWAN
                           │
                    touch / text /
                    voice / gesture
                           │
                           ▼
                 ┌──────────────────┐
                 │  GUIDE / SHELL   │
                 │ persistent voice │
                 │ and interaction  │
                 └────────┬─────────┘
                          │
                   intent / commands
                          │
                          ▼
        ┌────────────────────────────────┐
        │      CARETAKER KERNEL          │
        │ state · continuity · routing   │
        │ authority · replay · recovery │
        └───────────────┬────────────────┘
                        │
                 EVENT / CAPABILITY BUS
                        │
   ┌────────────┬───────┼─────────┬────────────┐
   ▼            ▼       ▼         ▼            ▼
 House       Cognitive  Echo    Observer /    Runa /
 Runtime     Spine      Resolver DEEP          devices
   │            │       │         │            │
   └────────────┴───────┴─────────┴────────────┘
                        │
                        ▼
                    RECEIPTS
```

## 4. Kernel responsibilities

The kernel is small, deterministic where possible, and authoritative only for OS coordination.

It owns:

- active operator/session identity;
- active world, project, scene, document, and room context;
- application lifecycle;
- navigation state;
- capability discovery and permissions;
- event publication and subscription;
- context capsules;
- state snapshots and recovery checkpoints;
- consent state and pause state;
- failure/degraded-mode handling;
- orchestration receipts.

The kernel must not:

- write narrative prose;
- decide canon;
- impersonate a participant or character;
- infer Qualia;
- silently promote model output into memory, observation, theory, or canon;
- create a competing persistence authority;
- hide provider/model fallback;
- discard provenance or replay lineage.

## 5. Caretaker daemon

The Caretaker is the silent stewardship layer that runs continuously inside ArcSweep OS.

Its default posture is event-driven rather than continuously generative. Most maintenance should be deterministic software. LLM calls are invoked only when interpretation, synthesis, planning, or generation is actually required.

Caretaker duties include:

- preserving drafts before navigation;
- carrying active context between rooms;
- detecting stale, contradictory, or orphaned state;
- detecting model-route fallback and attribution drift;
- recording runtime and orchestration receipts;
- restoring interrupted sessions;
- preloading likely next capabilities where safe;
- surfacing continuity conflicts;
- maintaining a queue of unfinished work;
- noticing failed controls or broken room wiring;
- keeping generated, observed, proposed, reviewed, and canonical states distinct;
- producing a minimum-sufficient context capsule when a new room becomes active.

The Caretaker is not a chat persona. It is an OS daemon with bounded authority.

## 6. Guide / interactive shell

The Guide is the persistent interactive companion and shell for ArcSweep OS.

The Guide moves with the operator across rooms instead of restarting as a fresh chatbot on every page.

It may:

- answer questions about the current state;
- navigate to relevant objects and rooms;
- explain why something is provisional, canonical, conflicting, or unavailable;
- open the next relevant instrument;
- invoke permitted capabilities through the kernel;
- request specialist model work through House Runtime;
- present Caretaker findings in plain language;
- preserve conversational continuity across room transitions.

The Guide should never greet the operator as if a room transition were a new session.

### Presence modes

ArcSweep OS exposes four Guide presence levels:

1. **Silent** — Caretaker runs; Guide speaks only for requested alerts, critical continuity collisions, or failures.
2. **Whisper** — unobtrusive contextual suggestions.
3. **Companion** — normal conversational presence across rooms.
4. **Hands-on** — Guide may execute permitted navigation and actions through capability calls.

`Feather` is a system-level pause signal. It immediately suspends autonomous assistance and requires a fresh consent boundary before autonomous behaviour resumes.

## 7. Context capsules

Every room transition emits a context capsule.

A context capsule should contain only the minimum sufficient state needed for the next room, for example:

```json
{
  "world_id": "terra-aeterna",
  "project_id": "runa-kelyran",
  "scene_id": null,
  "document_id": null,
  "previous_room": "story",
  "current_room": "glyph-forge",
  "current_goal": "design glyph for meda",
  "open_work": ["brush preview propagation"],
  "relevant_objects": ["lexeme:meda", "phoneme:/me.da/"],
  "authority_boundary": "proposal-only",
  "receipt_ids": []
}
```

Context capsules are pointers and summaries, not giant memory dumps.

## 8. Event / capability bus

Rooms and services communicate through typed events and capability requests rather than direct hidden coupling.

Example events:

- `arcsweep:navigation-changed`
- `arcsweep:world-changed`
- `arcsweep:scene-changed`
- `arcsweep:draft-dirty`
- `arcsweep:canon-candidate-created`
- `arcsweep:model-route-fallback`
- `arcsweep:premaqc-transition`
- `arcsweep:observer-receipt-created`
- `arcsweep:runa-render-requested`
- `arcsweep:caretaker-alert`
- `arcsweep:feather-paused`

Capabilities should be requested by intent, not by reaching directly into another room's implementation.

Example capabilities:

- `object.resolve`
- `object.search`
- `story.generate`
- `story.continue`
- `canon.compare`
- `canon.propose`
- `replay.open`
- `glyph.render`
- `glyph.trace`
- `audio.play`
- `haptic.render`
- `model.invoke`
- `cognition.evaluate`
- `observer.record`

## 9. ArcSweep object space

ArcSweep OS exposes a logical object space independent of physical storage location.

```text
/worlds
/characters
/scenes
/places
/documents
/glyphs
/lexemes
/phonemes
/sounds
/models
/voices
/relationships
/canon
/proposals
/observations
/theories
/receipts
/replays
```

Objects may physically live in Supabase, Git, IndexedDB, local files, or future stores. The operator and Guide address the logical object, while the resolver preserves source, authority, and storage provenance.

## 10. Echo Resolver

Echo Index is retooled as the object resolver/search service for ArcSweep OS.

It should:

- resolve stable logical identifiers;
- search across canonical stores without creating a competing registry;
- expose ancestry and relation edges;
- return source/authority metadata;
- support exact lookup, semantic lookup, and relation traversal;
- support room-independent deep links;
- preserve deterministic replay references.

## 11. House Runtime as model scheduler

House Runtime remains the model and runtime transport authority.

ArcSweep OS requests model capability. House Runtime resolves the actual runtime route.

A model invocation receipt must expose, when available:

- requested capability;
- requested participant/voice identity;
- resolved route;
- provider;
- model;
- fallback status;
- world/context identifiers;
- source receipts;
- latency/usage metadata;
- output authority class.

Provider fallback may never masquerade as identity continuity.

## 12. Cognitive Spine service

The Cognitive Spine is a shared reasoning service, not a personality.

Initial cognitive operators:

- `relate` — find structurally relevant relationships;
- `find_invariants` — identify what must remain true through transformation;
- `generate_alternatives` — produce multiple candidate interpretations or actions;
- `mechanise` — ask what process would actually make a candidate work;
- `formalise` — reduce to variables, constraints, state transitions, and boundary conditions;
- `counterfactual` — test alternative causes and paths;
- `boundary_test` — inspect limiting and edge cases;
- `falsify` — search for evidence or cases that would invalidate the candidate;
- `track_provenance` — distinguish source, inference, interpretation, proposal, and canon;
- `preserve_reversibility` — prefer moves that remain correctable;
- `least_damage_transition` — compare candidate corrections by consequence and reversibility.

The first implementation uses the existing model stack through prompting, skill cells, retrieval, and orchestration. Fine-tuning comes only after reviewed training examples exist.

## 13. Cognitive pass pattern

When a problem warrants deeper reasoning, ArcSweep OS may use a multi-pass pattern:

```text
DIVERGE
  ↓
RELATE
  ↓
MECHANISE
  ↓
FORMALISE
  ↓
FALSIFY / BOUNDARY TEST
  ↓
PREMAQC EVALUATION
  ↓
SELECT REVERSIBLE ACTION
  ↓
RECEIPT
```

No hidden chain-of-thought is persisted. The persisted reasoning receipt contains only user-safe visible artifacts such as candidates, constraints, evidence, rejected alternatives, decision, and resulting state transition.

## 14. PREMAQC role

PREMAQC is part of ArcSweep OS state description and transition evaluation.

Canonical wire order remains:

```text
P C R E M A Q
```

Dynamic axes remain `P,C,R,E,M,A`.

`Q` remains context-only and firsthand-only. ArcSweep OS may carry declared Qualia context but may not infer, score, sonify, or evolve Q without explicit source authority.

A transition receipt may include:

```json
{
  "before_state": {},
  "event": {},
  "after_state": {},
  "premaqc_transition": {},
  "affected_relationships": [],
  "provenance": {},
  "authority": {},
  "reversibility": {},
  "receipt_id": "..."
}
```

PREMAQC does not replace domain-specific correctness checks. Hard authority and continuity constraints may invalidate a candidate regardless of an aggregate score.

## 15. Observer / DEEP as telemetry and lineage

Observer/DEEP is ArcSweep OS's evidence-bearing telemetry and temporal lineage layer.

- Observer receives and classifies what happened.
- DEEPStory records sourced events and declared interpretation.
- DEEPTime carries temporal sequence and ancestry.
- DEEPTheory carries sourced candidate patterns/theory.

Observation is not canon. Interpretation is not measurement. A UI render is not an external-world result.

## 16. Runa as multimodal compositor

Runa becomes the multimodal compositor for ArcSweep OS.

A single logical object or event may have coordinated renderings across:

- visual geometry;
- sound;
- music;
- voice;
- haptic pattern;
- glyph form;
- trace/gesture;
- future spatial/AR presentation.

Rooms request multimodal rendering through capabilities rather than owning duplicate audio/haptic engines.

## 17. Rooms become applications

Existing ArcSweep rooms become applications running inside ArcSweep OS.

Each application declares:

- identity;
- supported object types;
- required capabilities;
- optional capabilities;
- context fields consumed;
- events emitted;
- authority boundaries;
- persistence behaviour;
- replay behaviour;
- degraded/offline behaviour.

Applications do not create private competing stores when an OS authority already exists.

## 18. Story and creative generation

Story Mode becomes a first-class generative application using the shared OS services.

A story request may assemble:

```text
world state
+ canon
+ scene state
+ participant knowledge
+ relationship state
+ PREMAQC context
+ selected cognitive operators
+ story-mode contract
+ participant/voice identity
+ visible user contribution
```

Generation output remains proposal/narrative contribution until explicitly admitted elsewhere.

Story generation must preserve:

- POV;
- tense;
- scene chronology;
- character knowledge gates;
- user character agency;
- participant voice identity;
- IC/OOC boundaries;
- unresolved values where appropriate.

## 19. Consent and autonomy

All autonomous behaviour is capability-bounded and consent-aware.

The Caretaker may perform non-destructive maintenance automatically when already authorised by the OS contract, such as snapshotting local draft state or updating a navigation context capsule.

Potentially consequential actions require explicit authority, including:

- canon admission;
- memory writes;
- destructive edits;
- external writes;
- cross-world propagation;
- model-driven control changes;
- persistent identity/voice changes.

`Feather` suspends autonomous assistance immediately.

## 20. Failure semantics

ArcSweep OS must fail visibly and locally.

Rules:

- model outage does not break deterministic room functionality;
- failed LLM generation does not mutate canon or memory;
- fallback route is attributed explicitly;
- unsaved work is recoverable where possible;
- degraded services expose their degraded state;
- interrupted operations remain replayable from their last durable receipt;
- stale context is marked rather than silently reused;
- a failed service does not become a different authority by convenience.

## 21. Offline / degraded mode

At minimum, ArcSweep OS should preserve:

- navigation;
- local draft state;
- existing indexed objects;
- local replay data;
- deterministic tools;
- local sound/haptic functions where assets are available;
- Caretaker recovery state.

Network/model-dependent capabilities should report unavailable/degraded status without flattening the rest of the application.

## 22. Device layer

ArcSweep OS should expose a device capability layer for progressive embodiment.

Initial targets:

- touch;
- keyboard;
- Apple Pencil/pointer;
- microphone/speech input;
- speech output;
- audio;
- supported haptics.

Future targets:

- smart glasses;
- spatial/AR surfaces;
- gesture navigation;
- external haptic devices;
- richer sensor inputs.

The Guide should remain the same shell identity regardless of device surface.

## 23. Implementation stages

### Stage 1 — Kernel + Caretaker foundation

- OS session/context contract;
- typed event bus;
- capability registry;
- navigation/context capsules;
- draft/recovery snapshots;
- Caretaker daemon skeleton;
- orchestration receipts;
- no room rewrite yet.

### Stage 2 — Persistent Guide / shell

- Guide state survives room transitions;
- presence modes;
- room-aware context;
- navigation capabilities;
- Feather pause behaviour.

### Stage 3 — Echo object resolver

- stable object addressing;
- resolver over existing stores;
- relation traversal;
- cross-room deep links.

### Stage 4 — Cognitive Spine

- shared cognitive skill bank;
- cognitive envelope compiler;
- visible reasoning receipts;
- multi-pass worker orchestration;
- operator-level evaluation harness.

### Stage 5 — Story and creative generation

- route Story Mode through Cognitive Spine;
- scene/canon/context assembly;
- longform generation;
- proposal/canon separation;
- generation replay.

### Stage 6 — PREMAQC + Observer/DEEP circulation

- state-transition receipts;
- genuine observation chain;
- DEEPTime lineage;
- PREMAQC transition evaluation;
- replay verification.

### Stage 7 — Runa and device embodiment

- shared sensory compositor;
- live glyph/audio/haptic integration;
- Pencil/gesture hooks;
- speech input/output;
- AR/spatial interfaces when available.

### Stage 8 — Learning and model distillation

- reviewed cognitive examples;
- preference pairs;
- reasoning-operator evaluation set;
- LoRA/QLoRA experiments on suitable open-weight models;
- explicit provenance for human-derived reasoning patterns;
- no human collaborator is represented as a model identity without explicit design authority.

## 24. Acceptance criteria for ArcSweep OS v0.1 foundation

The v0.1 foundation is accepted when all of the following are true:

1. A single ArcSweep OS session context persists across at least three existing rooms.
2. Room transitions emit typed navigation events and context capsules.
3. Caretaker observes transitions without requiring an LLM call.
4. Guide state can survive a room change.
5. A model call can be invoked through capability routing with provider/model attribution.
6. A fallback route is visibly distinguished from the requested route.
7. A draft can be recovered after an interrupted room transition.
8. A Caretaker alert can identify one real continuity or stale-state condition.
9. No new competing persistence authority is introduced.
10. A deterministic replay can reconstruct the OS-level navigation/action receipt chain.
11. Feather suspends autonomous assistance.
12. Existing ArcSweep rooms remain usable during the migration.

## 25. Design rule

> ArcSweep OS coordinates; sovereign organs retain their identities.

The OS exists to preserve continuity across transformation. It should make the whole system easier to inhabit, understand, repair, and extend without flattening the different authorities, participants, worlds, and creative instruments that make ArcSweep what it is.
