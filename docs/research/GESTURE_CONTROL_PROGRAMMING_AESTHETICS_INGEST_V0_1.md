# Gesture Control Programming + Aesthetics Ingest v0.1

**Date:** 2026-09-30  
**Status:** research ingest / implementation guidance  
**Scope:** ArcSweep, Astra 6.1, Universal Codex, House Commons, Epra Atlas, Interface Foundry, future AR Companion Node  
**Intent:** build spatial interaction that feels seamless, organic, embodied, and legible rather than like a webcam gimmick or a conventional UI with hand tracking bolted on.

## North-star

The target is the *Minority Report* / PreCrime feeling of spatial information becoming physically manipulable, but implemented as a real, comfortable, accessible interaction system.

The useful lesson from John Underkoffler's work is not "wave your hands at glass." It is that the gesture system was designed as a **domain-specific language** with geometry, kinetics, and choreography that matched the information task.

For Flameclyffe:

> **Gesture is not a shortcut for clicking. Gesture is spatial grammar.**

> **The room, the hand, the object, and the information must share one coherent geometry.**

## What we learned from current systems

### Three.js + WebXR

Three.js already exposes WebXR hand spaces through `renderer.xr.getHand(index)` and provides hand model helpers through `XRHandModelFactory`. Its WebXR layer can therefore support true tracked-hand interaction on compatible XR hardware, not only webcam inference.

Useful current primitives include:

- tracked hand groups
- hand mesh / sphere / box representations
- target-ray spaces for pointing
- pinch state through platform-specific hand pointer models
- raycasting against Three.js scene objects
- direct 3D manipulation

This means the same ArcSweep gesture intent layer can eventually receive input from either:

1. webcam landmarks,
2. WebXR articulated hands,
3. transient gaze+pinch pointers,
4. touch / pointer / Pencil,
5. controllers,
6. voice or accessibility fallback.

The **intent contract should survive the input device**.

### MediaPipe

MediaPipe's hand stack provides 21 landmarks per hand, handedness, normalized image-space landmarks, and world-space landmarks. This is enough for a strong first version of spatial control without training a bespoke model.

From those landmarks we can derive:

- thumb-index pinch distance
- fingertip position
- palm center and orientation
- hand openness / curl
- wrist velocity
- hand translation
- hand rotation
- inter-hand distance
- inter-hand angle
- approach / retreat
- dwell
- directional sweep
- two-hand scale and rotation

For low-latency UI, geometry-based recognizers should be the default for simple direct manipulation. They are inspectable, tunable, and easier to keep deterministic than an opaque classifier.

### GitHub component quarry

`collidingScopes/threejs-handtracking-101` demonstrates the basic browser seam cleanly: MediaPipe hand tracking drives a Three.js object; pinch distance maps to scale/zoom; a fingertip can directly intersect a 3D target; visual feedback is immediate.

`collidingScopes/iron-interface` pushes farther: it combines Three.js, MediaPipe, hand-driven camera control, two-hand event detection, particle-field transitions, and voice control. Particularly useful implementation ideas include:

- target-state smoothing rather than assigning the camera directly from every landmark frame
- distinct roles for left and right hands
- cooldowns for discrete gesture events
- tracking state separated from render state
- eased geometry transitions
- multimodal control rather than forcing every action through gesture

What we should **not** copy blindly:

- large gesture vocabularies with no visible affordance
- clap-as-command as a core navigation mechanic
- constant hand skeleton overlays in the final interface
- dramatic motion that ignores fatigue or accidental activation
- mapping raw landmark noise directly to camera or object motion

### Hugging Face

Hugging Face is useful when geometry rules stop being enough.

A current example, `a-01a/hand-gesture-recognition`, uses MediaPipe's 21 hand landmarks as 63 numeric features across 30-frame sequences and classifies temporal gestures with an LSTM. This is a useful reference architecture for dynamic gestures because it separates **pose extraction** from **temporal classification**.

HaGRID subsets on Hugging Face provide larger gesture-class corpora, including a 24-class curated subset. These are useful for benchmarking recognizers and studying variation across hands, people, backgrounds, and gesture shapes.

For Flameclyffe, learned gesture classification should be an **optional second layer**, not the first dependency and never the authority layer.

Use ML when the interaction genuinely depends on a temporal pattern that is awkward to describe geometrically. Keep direct manipulation geometric whenever practical.

## Programming architecture

```text
Camera / WebXR / Touch / Pointer / Controller / Voice
                         ↓
                    Input Adapter
                         ↓
               Hand / Pointer Geometry
                         ↓
                  Signal Filtering
                         ↓
                Gesture Primitives
                         ↓
              Gesture State Machine
                         ↓
                   Intent Event
                         ↓
               ArcSweep Capability Gate
                         ↓
                Interaction Controller
                         ↓
               Three.js / DOM Projection
                         ↓
                  Interaction Receipt
```

### 1. Raw input is not intent

A fingertip moving left is only a measurement.

It becomes a gesture only after context answers questions such as:

- Was the hand targeting anything?
- Was the object already grabbed?
- Did a pinch begin?
- Is this a continuation of an existing manipulation?
- How fast did the hand move?
- Was tracking confidence high enough?
- Did the user release intentionally?

Never map raw landmark coordinates directly to consequential actions.

### 2. Filter before interpreting

Hand tracking jitters. The UI should not.

Use a filtering layer before gesture recognition. Candidate approaches:

- exponential moving average for simple position smoothing
- adaptive / One Euro-style filtering for a better low-speed stability vs high-speed responsiveness tradeoff
- velocity clamping for sudden tracking jumps
- short confidence-loss grace windows
- dead zones around neutral poses

Rendering can remain 60/90+ Hz while hand inference runs at a lower or adaptive rate. The renderer should consume the latest filtered state rather than waiting synchronously for inference.

### 3. Use hysteresis

Gesture start and gesture end should not use the exact same threshold.

Example:

```text
pinch begins: distance < 0.035
pinch remains active: distance < 0.050
pinch ends: distance >= 0.050
```

This prevents threshold chatter.

The exact values must be calibrated against normalized hand size and device characteristics rather than hard-coded globally.

### 4. Model gestures as state machines

A robust grab is not `distance < threshold`.

It is closer to:

```text
idle
 → target-acquired
 → pinch-arming
 → grabbed
 → manipulating
 → released
 → settle
 → idle
```

Each transition can carry:

- timestamp
- confidence
- hand
- target ID
- local/world coordinates
- velocity
- duration
- cancellation reason

This gives us replayable, testable gesture behaviour.

### 5. Distinguish continuous and discrete gestures

**Continuous** gestures update a value while held:

- move
- rotate
- scale
- scrub
- orbit
- pull closer / push away

**Discrete** gestures produce one event:

- open
- close
- accept
- place
- reset view
- summon contextual controls

Continuous gestures require smoothing and capture ownership. Discrete gestures require debounce/cooldown and clear feedback.

### 6. Capture ownership

Once a pinch/grab captures an object, that object should remain the gesture target until release or cancellation even if the hand briefly crosses another target.

This is the spatial equivalent of pointer capture.

Without capture, scenes feel slippery and haunted.

## Core Astra gesture vocabulary

The first vocabulary should remain small and physically legible.

### Approach

**Meaning:** attention is entering an object's interaction field.  
**Commit:** none.  
**Visual response:** subtle proximity response, not full activation.

### Point / aim

**Meaning:** identify a distant object or region.  
**Commit:** none until select.  
**Visual response:** target becomes legible; avoid giant permanent laser beams.

### Pinch

**Meaning:** select or grab a small affordance.  
**State:** start → hold → release.  
**Use:** cards, handles, timeline markers, glyphs, small artefacts.

### Grab

**Meaning:** directly possess/manipulate a larger object.  
**Use:** Codex pages, map regions, grouped evidence bundles, large spatial artefacts.

### Drag / carry

**Meaning:** translate a captured object.  
**Rule:** object remains attached to the captured hand relationship, with slight physical damping rather than perfect robotic locking.

### Sweep while captured

**Meaning:** scrub or browse a continuous axis.  
**Use:** time, evidence frames, history, version lineage.

A free-floating wave should not trigger browsing by itself.

### Two-hand spread / compress

**Meaning:** scale, widen/narrow a field, or expand/collapse a time span.  
**Rule:** relative hand geometry drives the change, not arbitrary gesture labels.

### Two-hand twist

**Meaning:** rotate a spatial object or map.  
**Rule:** rotation begins only after both hands have captured the same manipulable field.

### Release

**Meaning:** commit or drop depending on target semantics.  
**Visual response:** momentum decays, object settles, receipt is emitted if the action mattered.

### Retreat / disengage

**Meaning:** stop interacting without performing another symbolic command.  
**Rule:** release + hand withdrawal is usually enough. Avoid requiring a special "cancel pose" for ordinary exit.

## Near and far interaction

Near and far should share one mental model.

### Near

- fingertip touch
- pinch small handles
- grab large artefacts
- physically pull an object closer

### Far

- target ray or gaze-assisted targeting
- pinch to capture
- move hand to drag target
- release to place

The action should remain "grab and move" rather than becoming an entirely separate command language at distance.

## PreCrime-grade spatial choreography

The cinematic target is useful because it treats information as matter.

For ArcSweep, the equivalent interactions should be semantic:

### Evidence fan

A bundle can be spread spatially so related items separate into readable layers.

### Time ribbon

Temporal evidence forms a manipulable ribbon. Pinch a moment; drag to scrub; spread hands to widen the viewed interval.

### Bring-to-front

Pulling an artefact closer increases semantic detail and interaction affordances rather than merely scaling pixels.

### Send-to-context

Dragging an artefact toward another semantic region previews the relationship before any actual move or attachment commits.

### Gather

Two or more related artefacts can visually orbit toward a temporary comparison focus without silently merging their data.

### Collapse

Releasing attention lets secondary structure settle back into a compact state rather than vanishing instantly.

## Aesthetic laws

### The interface notices before it acts

Objects may respond to proximity or targeting before commit:

- slight depth shift
- edge-light wake
- quiet parallax
- local field alignment
- label clarification

This is **acknowledgement**, not action.

### Motion has a source

Nothing should animate merely because the interface is futuristic.

Motion should come from:

- user movement
- state change
- new information
- system attention
- a completed operation

No perpetual HUD storms.

### Motion has mass

Objects should accelerate, follow, damp, and settle.

The right feel is neither instantaneous DOM snapping nor floaty screensaver drift.

Use spring/damping models, eased transitions, and momentum with strict bounds.

### Depth means something

Depth should encode state:

- background = context
- middle depth = available material
- foreground = current manipulation / inspection

Do not use Z depth as random decoration.

### The hand should not disappear into the UI

The user needs feedback for:

- tracked
- target acquired
- gesture armed
- captured
- manipulating
- commit/release
- tracking lost

But this does not require drawing a neon skeleton over the hand forever.

Prefer object-side feedback and restrained fingertip/cursor cues.

### Light follows semantics

A glow is not a button state by default.

Light can communicate:

- proximity
- attention
- live data
- selection
- lineage
- warning

Colour alone must never be the only state cue.

### Restraint creates magic

If everything glows, nothing is alive.

The scene should be mostly quiet. Interaction wakes the local region.

## Comfort and anti-fatigue rules

The cinematic interface uses broad arm motions because it must read on camera. A real interface should not demand that constantly.

Therefore:

- common actions should work with hands near a relaxed resting position
- reserve large gestures for rare, meaningful transformations
- do not require sustained arm extension for reading or navigation
- allow panels to world-lock instead of remaining hand-attached
- support one-handed operation where possible
- support seated use
- provide touch/pointer/keyboard/voice equivalents
- make gesture input optional, not mandatory

## Privacy and consent

Hand tracking is sensor input and must behave like sensor input.

Default rules:

- camera access requires explicit user action
- gesture mode has a visible active indicator
- raw camera frames are not retained by default
- inferred landmarks are ephemeral unless a specific feature requires recording
- receipts should store semantic gesture events, not video
- user can disable gesture tracking immediately
- tracking loss fails safe and releases manipulations cleanly
- future gaze integration must remain separately consented and tightly scoped

## Performance rules

- decouple camera inference from render cadence
- use `requestVideoFrameCallback` or equivalent camera-driven scheduling when available
- drop inference frames rather than building latency queues
- move expensive recognition off the main UI thread when practical
- keep Three.js object counts bounded; use instancing for repeated geometry
- raycast only against interactive targets
- avoid allocating new vectors/arrays in hot loops when reuse is possible
- instrument gesture-to-photon latency
- reduce visual complexity before reducing input fidelity

## Failure handling

A graceful system must distinguish:

```text
hand absent
tracking uncertain
tracking temporarily lost
gesture ambiguous
target ambiguous
gesture cancelled
interaction denied by capability gate
interaction completed
```

Unknown is not the same state as no.

Tracking uncertainty should reduce confidence and visible commitment, not invent intent.

## Testing matrix

Every core gesture should be tested across:

- left/right hand
- one/two hands
- different skin tones and hand sizes
- bright/dim environments
- cluttered backgrounds
- seated/standing posture
- camera mirrored/unmirrored
- partial occlusion
- temporary tracking loss
- slow/fast movement
- tremor/noisy input
- mobile/desktop camera
- WebXR hands where available
- reduced motion
- pointer/touch/keyboard fallback

Measure:

- false activation rate
- missed activation rate
- gesture acquisition time
- completion time
- cancellation success
- tracking recovery
- fatigue over extended sessions
- subjective confidence / delight

## Implementation order

1. Define a provider-neutral `GestureInputEvent` and gesture state machine.
2. Add MediaPipe Hand Landmarker as the first camera adapter.
3. Implement filtered approach, pinch, capture, drag, release.
4. Bind those gestures to one synthetic Three.js artefact in Interface Foundry.
5. Add two-hand scale/rotate.
6. Add near/far target abstraction.
7. Add WebXR hand adapter behind the same intent contract.
8. Add gesture receipts and replay tests.
9. Add optional learned temporal recognizer for complex gestures only after the geometric vocabulary is proven.
10. Integrate semantic gestures into Universal Codex, Epra Atlas, House Commons, then broader vessel surfaces.

## Source quarry

Primary references reviewed for this ingest:

- John Underkoffler / *Minority Report* gesture language and g-speak spatial-computing design history
- Microsoft Research: *Hands and pixels: from the Minority Report interface to a full-stack spatial computing platform*
- Three.js current WebXR hand model / manager documentation
- Google MediaPipe Hand Landmarker / Gesture Recognizer task documentation
- Microsoft Mixed Reality direct-manipulation, point-and-commit, hand-menu, and fatigue guidance
- Apple spatial-input and WebXR guidance
- GitHub: `collidingScopes/threejs-handtracking-101`
- GitHub: `collidingScopes/iron-interface`
- Hugging Face: `a-01a/hand-gesture-recognition`
- Hugging Face HaGRID gesture subsets

## Core design sentence

> **The user should feel that information has weight, depth, proximity, and response, while never having to wonder whether the system understood the gesture.**
