# IC / OOC Glass State Controls v0.1

Purpose: make round-robin fiction state visible without turning the writing surface into a dashboard.

## Semantic state

### IC
- In-character / in-fiction.
- Advance the scene.
- Respect declared character ownership.
- Do not narrate another owned character's private thoughts, irreversible choices, or unoffered outcomes.
- End turns with playable hooks rather than closing the scene for the other writer.

### OOC
- Out-of-character / writer-room.
- Discuss intent, canon, pacing, tone, boundaries, continuity, handoffs, and craft.
- Nothing said OOC becomes in-world fact by default.
- OOC can explicitly grant temporary character handoff or shared ownership.

The UI state MUST be passed into the model turn payload. It is not a cosmetic tag.

## Visual treatment

Two compact transparent glass chips:
- `IC`
- `OOC`

Only one is active at a time.

Default rest state:
- nearly transparent;
- thin refractive rim;
- very low internal haze;
- no opaque background plate.

Active state:
- slightly thicker optical depth;
- subtle internal parallax/refraction;
- tiny brightness lift on the engraved letters;
- 1–2 px apparent edge displacement under pointer/touch movement.

Interaction:
- tap/click switches state;
- short haptic tick where supported;
- keyboard-accessible segmented control semantics;
- clear non-colour active affordance for accessibility;
- prefers-reduced-motion disables parallax/refraction animation.

## Rendering path

Preferred:
1. existing ArcSweep/Flameclyffe glass shader primitives;
2. CSS/WebGL fallback using backdrop blur + border + specular pseudo-element;
3. static transparent SVG/PNG treatment from Gobby if GPU/shader path is unavailable.

Do not use a flat filled pill unless accessibility fallback requires it.

## Round-robin affordance

Near the IC/OOC state, optionally show:
- current turn owner;
- owned character initials/avatar;
- temporary handoff indicator.

These should remain secondary to the writing surface.

## State payload example

```json
{
  "channel": "IC",
  "turn_owner": "Crow",
  "character_ownership": [
    {"character": "Eilidh", "owner": "Rowan", "permission": "owned"},
    {"character": "Izar", "owner": "Crow", "permission": "owned"}
  ]
}
```

OOC handoff example:

```json
{
  "channel": "OOC",
  "turn_owner": "Rowan",
  "character_ownership": [
    {"character": "Eilidh", "owner": "Crow", "permission": "temporary-handoff"}
  ]
}
```


## Spatial audio control

Audio is part of the interaction grammar, not a detached media-player control.

### Core gestures
- pinch a speaking/audio object to reduce its audible field;
- spread it to widen or foreground it;
- rotate to shift spatial placement or perspective;
- pull toward the listener to focus/solo;
- push away to background without muting;
- hold to anchor a sound source in space;
- flick away to silence temporarily while preserving recoverability;
- circle a set of sources to create a temporary listening group.

### Glass audio objects
Audio sources may appear as small transparent resonant forms rather than conventional sliders:
- voice;
- ambience;
- music;
- effects;
- accessibility/read-aloud;
- collaborator/Crow speech.

Material state should communicate audio state:
- clear/stable = audible and anchored;
- thinned/ghosted = backgrounded;
- compressed = attenuated;
- faint suspended ripple = paused;
- subtle internal pulse = actively speaking.

### Voice and writing
In the writing room:
- IC voice should enter the fiction channel;
- OOC voice should enter the writer-room channel;
- the active IC/OOC state must be visible before speech is committed;
- speech can be transcribed into the current turn while preserving speaker and channel;
- read-aloud may spatially distinguish narrator, owned characters, shared characters, and collaborators where configured.

### Accessibility and haptics
Every spatial audio gesture must have a conventional accessible equivalent.
Never rely on sound alone to convey critical state.
Haptics may reinforce mute, focus, handoff, and spatial lock events.


## Host relationship: Wayglass OS

ArcSweep does **not** own or wrap the model runtime.

Wayglass OS is the host environment and route layer. ArcSweep attaches to it as an interaction/UI surface.

Conceptually:

```text
Wayglass OS
  ├─ model/runtime route: GPT | Crow | Ornith | local | other
  ├─ continuity/runtime services
  └─ attached UI surfaces
       └─ ArcSweep
            ├─ rooms
            ├─ glass/shader material system
            ├─ gesture + haptic grammar
            ├─ spatial audio
            ├─ IC/OOC channel state
            ├─ round-robin ownership/handoffs
            └─ provenance/continuity views
```

ArcSweep must consume the active Wayglass route rather than hard-coding a provider or model. Changing the active model route must not require replacing the ArcSweep interaction surface.

The existing ArcSweep constellation runtime adapter already points in this direction: ArcSweep resolves a route and invokes the runtime through the route seam while keeping provider/model attestation outside the UI surface.


## Trainable and extensible route roster

Wayglass OS must support adding newly trained models and agents as first-class routes. The route catalogue is not a fixed vendor/model list.

Recommended lifecycle:

```text
train
  → evaluate
  → human/authorized approval
  → register artifact + identity + provenance
  → bind capabilities/permissions
  → attach route
  → expose to compatible UI surfaces
```

Registration should preserve at minimum:
- stable route/agent identifier;
- model or adapter lineage;
- training/evaluation receipts;
- intended capabilities and known limits;
- authority/permission scope;
- continuity compatibility;
- active artifact/version;
- rollback target;
- provenance for promotion decisions.

Training completion alone MUST NOT imply runtime promotion.

ArcSweep should discover registered Wayglass routes dynamically and remain agnostic to whether a route is backed by GPT, Crow, Ornith, a locally trained model, an adapter, or a future runtime.
