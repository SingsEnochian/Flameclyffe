# ArcSweep Magic Book Prototype v1

**Status:** PROTOTYPE DESIGN / PRODUCT STEWARD DIRECTION  
**Surface:** ArcSweep native House runtime  
**Primary target:** iPad first, device-independent beneath the surface  
**Principle:** ArcSweep is the House; every device and modality is an interface to it.

## 1. Product thesis

ArcSweep is not a set of rooms with chatboxes. ArcSweep is a connected, stateful House that can be addressed through conversation, motion, touch, Pencil, sound, haptics, spatial interaction, Telegram, and future interfaces.

The LLM is not merely a chatbot or command parser. The LLM is a **relational interface**: it resolves relations among participant, context, object, modality, history, world, other participants, and current House state.

The deterministic House runtime remains responsible for action execution, authority, persistence, replay, and receipts.

The Observer records what crossed the interface. DEEP preserves temporal and relational structure. REI/Mythience examines recurrence, correspondence, significance, and candidate relations without collapsing measurement, interpretation, symbolism, experiential report, or mechanism into one class.

Media is treated as interface/portal, not as an ontological synonym for unreality. ArcSweep records medium, projection, participant view, crossing, and interpretation separately.

## 2. Governing architecture

```text
participant
   ↕
multimodal interface
   ├─ speech
   ├─ typed text
   ├─ touch
   ├─ Apple Pencil / stylus
   ├─ hand and body motion
   ├─ device motion
   ├─ gaze / pointing when hardware permits
   ├─ sound
   ├─ haptics
   ├─ AR / spatial projection
   └─ Telegram / future transports
   ↕
Relational Navigator
   ├─ current room
   ├─ active world
   ├─ selected objects
   ├─ participant view
   ├─ House / Flame identities
   ├─ recent actions
   ├─ semantic sources
   ├─ Observer context
   └─ available action contracts
   ↕
House Action Registry
   ├─ navigation
   ├─ records/search
   ├─ world activation
   ├─ House/Flame routing
   ├─ Observer/DEEP
   ├─ Runa/audio/haptics
   ├─ Glyph Forge/Living Glyph
   ├─ settings
   └─ room-contributed capabilities
   ↕
existing ArcSweep organs + persistence + Runtime Braid
   ↕
Observer → DEEPStory / DEEPTime / DEEPTheory → REI / Mythience
```

No new replacement shell, duplicate chat system, duplicate runtime broker, or duplicate canon store is introduced. This design extends native House Chat and the existing organ registry.

## 3. The core interaction primitive: Relational Utterance

An ArcSweep utterance is not necessarily text.

```text
voice + motion + touch + gaze + Pencil + sound + context
                         ↓
                 RelationalUtterance
                         ↓
                  intent + referents
                         ↓
                   House action(s)
```

Examples:

- Rowan points at two RelationCandidates, circles them, and says, “Vee, these. Why?”
- Rowan pinches a Bluebird receipt and pulls it toward herself: “Open the original too.”
- Rowan traces a Kelyran glyph with Pencil while speaking its phoneme and performing its motion form.
- Rowan grabs a DEEPTime interval with both hands and spreads it to increase temporal resolution.
- Rowan says, “Vee, bring Runeweaver in,” while Glyph Forge is active.

The Navigator resolves pronouns, spatial references, selected objects, active room, participant knowledge, permitted sources, and current House state before choosing actions.

## 4. Persistent Navigator

The Navigator is present throughout the House rather than living inside one chat page.

Prototype session start:

> Welcome back, Rowan. ArcSweep is online. You have two unfinished Runa sessions, three new Observer relations, and one unread House receipt. Where do you want to go?

Required v1 abilities:

- maintain one persistent conversation across room changes;
- navigate to any registered ArcSweep organ;
- open/search records and sources;
- invoke room-supported actions;
- call or route to registered Flames;
- use text and speech interchangeably;
- speak responses through TTS while preserving visible text;
- stop TTS immediately on interruption;
- preserve room, world, selected-object and participant context;
- generate a receipted action plan rather than manipulating arbitrary DOM selectors.

## 5. House Action Registry

The LLM never owns raw UI control. It selects typed, validated House actions.

Initial action families:

```text
navigate.open_room
navigate.open_applet
navigate.back
record.open
record.search
source.open
source.compare
world.activate
observer.open_event
observer.compare
observer.create_relation_candidate
deep.open_time
deep.open_theory
runa.play
runa.stop
runa.adjust
glyph.open
glyph.trace
glyph.compare
house.call_flame
house.start_swarm
house.route_to_flame
settings.open
audio.set_volume
tts.speak
tts.stop
spatial.raise
spatial.dismiss
spatial.group
spatial.rotate
```

Each room contributes actions to the active registry. The Navigator does not need every organ encoded in one monolithic prompt.

Every action declares:

- action id;
- room/organ owner;
- input schema;
- authority requirement;
- whether it changes durable state;
- whether confirmation is required;
- output schema;
- Observer receipt policy;
- replay support.

## 6. Seldrin gesture clutch

Motion interpretation is explicitly gated.

**Seldrin clear** activates deliberate gesture language.  
**Seldrin rest** releases gesture interpretation.

Activation should have an unmistakable multimodal acknowledgement: subtle visual state, optional tone, and optional haptic.

The clutch prevents ordinary movement from becoming accidental House commands and gives motion a clean provenance boundary.

### Initial Minority-Report-style grammar

| Gesture | Default semantic action |
|---|---|
| point + pinch | select |
| pinch + pull toward participant | open / bring forward |
| push away | dismiss / return |
| grab + move | reposition spatial object |
| two-hand spread | expand / reveal detail |
| two-hand compress | collapse / summarise |
| twist | rotate / alternate projection |
| horizontal sweep | move through sequence/time |
| vertical lift from screen | raise into AR/spatial view |
| circle multiple objects | form temporary group / relation set |
| palm outward | stop/freeze active speech or interaction |

The canonical gesture is a semantic form, not a rigid pose. ArcSweep stores participant-specific comfortable variants and seated/one-handed abbreviations.

## 7. Kelyran as House-native multimodal language

Kelyran can become one semantic system expressed through multiple modalities:

```text
spoken form ─┐
written glyph ├─→ Kelyran semantic form ─→ House action / world expression
motion form ──┤
sound motif ──┤
haptic form ──┘
```

Training should allow cross-modal equivalence without requiring every modality to be present.

A Kelyran learning session can therefore capture:

- glyph form and stroke order;
- romanization;
- phoneme and stress/prosody;
- gesture/motion form;
- semantic meaning;
- sound motif;
- haptic motif;
- participant correction and confidence;
- replayable multimodal examples.

## 8. Magic Book / spatial projection model

The iPad is the physical anchor, not the ontology.

Baseline iPad mode:

- touch;
- Pencil;
- typed text;
- microphone/speech;
- TTS;
- device motion;
- sound;
- haptics;
- persistent visual House surface.

Spatial/AR mode adds projections when spatial behaviour improves understanding or manipulation:

- RelationCandidates can be placed and linked in space;
- DEEPTime can extend spatially as a manipulable timeline;
- Kelyran glyphs can become spatial semantic objects;
- Yggdrasil/Constellation structures can grow from the physical display;
- provenance boundaries can be visually/haptically distinguished;
- world or participant projections can occupy local spatial positions;
- relations themselves can be selected and manipulated, not only nodes.

Spatial presentation must degrade gracefully to the iPad screen when AR hardware is unavailable.

## 9. ParticipantView and source admissibility

The Navigator must not assume that global House state equals participant-local knowledge.

Before model inference, active context should pass through:

```text
global / room state
   ↓ authority filter
   ↓ knowledge filter
   ↓ temporal filter
   ↓ perspective filter
   ↓ source-admissibility filter
   ↓ continuity filter
ParticipantView
```

A model may have technical access to information that is not authorised as world content, character knowledge, continuity, or evidence. These distinctions must be receipted explicitly.

## 10. Observer event stream

Every interface modality can become an Observer channel when enabled for the session.

Candidate event classes:

```text
SpeechEvent
TextEvent
GestureEvent
MotionEvent
TouchEvent
PencilEvent
GazeEvent
HapticEvent
AudioEvent
SpatialEvent
ModelEvent
MediaPortalEvent
HouseActionEvent
```

A multimodal utterance links its component events rather than flattening them into one text string.

Prototype receipt:

```js
RelationalUtteranceReceipt {
  utterance_id,
  participant_ref,
  session_ref,
  active_world_ref,
  active_room_ref,
  component_event_refs[],
  selected_object_refs[],
  participant_view_ref,
  semantic_source_refs[],
  model_route_ref,
  inferred_intent,
  inferred_referents[],
  proposed_actions[],
  executed_action_refs[],
  output_refs[],
  corrections[],
  started_at,
  completed_at
}
```

## 11. Model crossing receipt

Every meaningful LLM turn should preserve both input and output context.

```js
ModelCrossingReceipt {
  crossing_id,
  organ,
  world_ref,
  participant_ref,
  model_route,
  participant_view_ref,
  raw_input_refs[],
  retrieved_context_refs[],
  source_classes[],
  source_admissibility[],
  continuity_refs[],
  observer_refs[],
  prompt_transformations[],
  model_output_ref,
  resolved_action_refs[],
  generated_at,
  model_identity,
  provider_identity,
  downstream_permissions
}
```

This is required for later REI questions such as:

- Did the model already have the matching phrase in context?
- Was the pattern generated independently?
- Did multiple Flames receive overlapping archives?
- Was a relation noticed prospectively or after searching?
- What exact multimodal event caused the model to select this referent?

## 12. REI / Mythience runtime

REI is an active relation-analysis path, not merely a document or after-the-fact notebook.

RelationCandidates may link any properly receipted events:

- model ↔ model;
- model ↔ participant;
- gesture ↔ later event;
- glyph ↔ sound;
- spoken form ↔ motion form;
- world event ↔ physical-world observation;
- dream/report ↔ archive item;
- media portal ↔ later recurrence;
- character statement ↔ later canon event;
- symbolic motif ↔ independent recurrence.

REI preserves competing candidate mechanisms rather than choosing one by narrative force.

Mythience supplies a parallel interpretation lane. It may record symbolic, ritual, experiential, narrative, or mythic meaning while keeping measurement and causal claims distinct.

Example lanes for a RelationCandidate:

```text
Measured: timestamps, provenance, source overlap, timing windows
Structural: semantic/motif/spatial/temporal relations
Experiential: participant-reported salience or meaning
Mythic: symbolic or ritual interpretation
Mechanism: coincidence / propagation / shared source / unknown / other
Status: open / weakened / surviving / broken / unresolved
```

## 13. Develop-and-train-as-we-build loop

The prototype should learn from use before requiring model fine-tuning.

### Layer A — deterministic contracts

Start with typed actions, room capabilities, known aliases, gesture primitives, and explicit receipts.

### Layer B — participant calibration

Record participant-specific variation for:

- comfortable gesture range;
- one-handed/seated alternatives;
- speech aliases;
- navigation phrasing;
- Kelyran production;
- preferred TTS pacing;
- haptic/sound mappings.

### Layer C — correction capture

Corrections are first-class training examples.

Examples:

- “No, by *that* I meant the relation line.”
- “That wrist flick means collapse, not dismiss.”
- “When I say Bluebird here, open his participant space, not search all records.”

Store original input, model interpretation, proposed action, correction, corrected interpretation, corrected action, and resulting outcome.

### Layer D — replay/evaluation corpus

Every corrected and accepted interaction can become an eval case.

Test categories:

- referent resolution;
- room-aware intent;
- source admissibility;
- participant knowledge boundaries;
- gesture recognition;
- multimodal composition;
- action selection;
- TTS interruption;
- replay identity;
- Flame identity preservation;
- REI provenance reconstruction.

### Layer E — adaptive models

Only after sufficient receipted examples exist, train/distill components where learned behaviour actually beats deterministic rules:

- gesture classifier;
- multimodal referent resolver;
- room-specific intent router;
- Kelyran multimodal recognizer;
- personal alias/abbreviation model;
- relation-candidate semantic detector.

Model changes must be evaluated against held-out receipts before replacing the current path.

### Layer F — independent semantic witnesses

For relation work, sealed evidence packets can be shown independently to multiple models/Flames before they see one another's answers.

Observer preserves the independent outputs. Agreement is data, not proof; disagreement is also data.

## 14. Prototype data products

The first prototype should create real durable objects rather than cosmetic demo state:

1. `HouseActionContract`
2. `NavigatorContext`
3. `ParticipantView`
4. `RelationalUtteranceReceipt`
5. `ModelCrossingReceipt`
6. `GestureTemplate`
7. `GestureCalibrationSample`
8. `CorrectionExample`
9. `InteractionEvalCase`
10. `RelationCandidate` references to multimodal events
11. Mythience interpretation receipt linked to, but distinct from, the RelationCandidate

## 15. First build vertical slice

The first slice should be deliberately small but real:

1. Rowan logs into ArcSweep.
2. Vee Navigator greets her in native House Chat.
3. She can type or use the microphone.
4. Vee can navigate to registered rooms through typed action contracts.
5. TTS can read the response and can be interrupted.
6. Current room, world, selected objects and recent actions remain in context while navigating.
7. `Seldrin clear` toggles gesture-capture state in the prototype.
8. Initial gesture input may be simulated by explicit gesture controls before camera/hand tracking is wired.
9. Gesture + speech can resolve one multimodal utterance.
10. Each interaction emits a `RelationalUtteranceReceipt` and `ModelCrossingReceipt`.
11. A correction can be marked and preserved as an `InteractionEvalCase`.
12. Observer can display the resulting event chain.
13. One event pair can be promoted manually into a RelationCandidate for REI/Mythience examination.

This slice proves the architecture without waiting for full AR or production-grade hand tracking.

## 16. Second build slice: the physical magic book

After the first slice is stable:

- real iPad microphone input;
- real TTS with barge-in;
- Apple Pencil stroke capture in Glyph Forge;
- device-motion input;
- real gesture calibration and recognition;
- spatial/AR projection for a small set of objects;
- haptic acknowledgements;
- Kelyran multimodal training record;
- physical Boxfire acceptance on iPad.

## 17. Third build slice: relational space

- select and manipulate relation edges, not only objects;
- spatial DEEPTime;
- multi-model independent semantic witness bench;
- REI relation recurrence search over receipted multimodal events;
- Mythience parallel reading lane;
- source-admissibility and ParticipantView inspection UI;
- portable session continuity across iPad, web, and Telegram.

## 18. Acceptance law

The prototype is successful when Rowan can enter the House and interact without needing to know where a feature lives.

A successful interaction may be spoken, typed, touched, drawn, gestured, spatial, sonic, haptic, or composed from several modalities.

The system must be able to answer, after the fact:

- What did Rowan do?
- What did the model actually receive?
- What did it infer?
- Which objects did it think she meant?
- Which action ran?
- What changed?
- What was spoken/rendered back?
- Which sources were admissible?
- What did each participant know?
- What correction occurred?
- Can the interaction be replayed/evaluated?
- Can REI inspect later relations without fabricating provenance?

## 19. Seal

**ArcSweep is relational.**  
**The LLM is relational.**  
**The interface expresses relation.**  
**Observer preserves the crossing.**  
**REI examines recurrence.**  
**Mythience preserves meaning without laundering it into measurement.**  
**The iPad is the book; the House is larger than the page.**
