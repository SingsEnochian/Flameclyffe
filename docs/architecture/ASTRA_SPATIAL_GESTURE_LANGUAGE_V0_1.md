# Astra Spatial Gesture Language v0.1

**Date:** 2026-09-30  
**Status:** architecture contract / pre-runtime design  
**Owner:** ArcSweep / Astra interaction layer  
**Depends on:** Presence Fabric, SensoryAdapter, OutputAdapter, capability gate, Three.js projection surfaces

## Purpose

Define one gesture language that can survive different input technologies while preserving the same user intent.

The system must not equate hand motion with authority. Gesture input is observation. A gesture becomes an intent event only after recognition and context. Intent becomes action only after capability and target checks.

```text
motion != gesture
gesture != intent
intent != authority
targeting != selection
selection != execution
tracking confidence != user consent
```

## Contract

Every gesture-capable adapter projects into the same normalized event shape:

```text
GestureInputEvent
  schema
  event_id
  source
  hand
  phase
  gesture
  confidence
  target_id
  position
  orientation
  velocity
  started_at
  occurred_at
  metadata
```

`source` may include:

```text
camera-mediapipe
webxr-hand
webxr-transient-pointer
touch
pointer
controller
accessibility-adapter
```

## Phases

```text
observe
approach
target
arm
begin
update
commit
release
cancel
lost
```

Continuous manipulation must emit `begin`, zero or more `update`, then exactly one terminal `release` or `cancel`.

## Core gestures

### `approach`
Non-authoritative proximity signal. May wake local affordances.

### `point`
Targets a distant object or semantic region. Does not select by itself.

### `pinch`
Primary small-object select/grab gesture.

### `grab`
Primary large-object direct-manipulation gesture.

### `translate`
Moves a captured object.

### `scrub`
Moves continuously along a semantic axis such as time, history, or evidence sequence.

### `scale`
Two-hand relative-distance manipulation.

### `rotate`
One- or two-hand rotation while target capture is already active.

### `release`
Ends capture and allows commit/drop semantics to resolve.

## Capture law

Once an object is captured, target ownership remains with that interaction until release, cancellation, explicit transfer, or tracking failure.

Crossing another target does not silently retarget the gesture.

## Hysteresis law

Recognition thresholds must have distinct entry and exit bands where noise could otherwise cause state chatter.

Gesture state changes must be based on filtered signals, not single-frame threshold crossings.

## Confidence law

Low or falling tracking confidence reduces commitment.

It must never be interpreted as stronger intent.

If confidence falls below the interaction's minimum while an object is captured, the preferred sequence is:

```text
freeze manipulation briefly
→ attempt reacquisition
→ cancel cleanly if recovery fails
→ settle object to last valid state or safe origin
```

## Near / far law

Near and far interaction should preserve the same conceptual verbs.

```text
near grab == far capture
near move == far drag
near release == far release
```

Different targeting technology must not require a wholly different mental model.

## Gesture-to-capability boundary

A gesture can request an action but cannot grant permission for it.

```text
GestureInputEvent
→ InteractionIntent
→ target validation
→ ArcSweep capability gate
→ action / denial
→ receipt
```

A dramatic gesture carries no more authority than a quiet one.

## Aesthetic response states

Every interactive artefact may project these visible states:

```text
quiet
aware
targeted
armed
captured
moving
committing
settling
unavailable
tracking-lost
```

Rules:

- `aware` is subtle acknowledgement, not activation.
- `targeted` improves legibility and reveals affordance.
- `armed` indicates the system is waiting for commit.
- `captured` must be visually unmistakable.
- `moving` carries bounded inertia/damping.
- `settling` ends rather than looping forever.
- `unavailable` explains denial without pretending the gesture failed.
- `tracking-lost` must visibly differ from user cancellation.

## Organic motion grammar

Motion must have cause, mass, and rest.

Preferred tools:

- critically or near-critically damped springs
- cubic/quintic easing for bounded transitions
- velocity-aware interpolation
- short local afterimages only when they clarify trajectory
- parallax tied to actual attention/position

Avoid:

- permanent scanlines
- constant orbiting particles
- global motion from local actions
- elastic overshoot on precision tasks
- random Z motion
- continuous bloom escalation

## PreCrime-inspired semantic interactions

These are interaction metaphors, not cinematic decoration:

### Evidence fan
Spread a bundle into inspectable related artefacts.

### Time ribbon
Scrub history with one hand; widen/narrow temporal scope with two.

### Bring-to-front
Pull an artefact closer to reveal more semantic detail and controls.

### Gather for comparison
Temporarily align multiple artefacts around a comparison focus without merging source records.

### Return / settle
Release secondary material back into its context while preserving the active focal object.

## Comfort law

The interface must not require theatrical arm movement for routine work.

- default gestures fit relaxed hand positions
- large gestures are rare and meaningful
- prolonged hand-attached menus are forbidden as a default
- world-lock complex surfaces after invocation
- one-handed paths exist for ordinary navigation
- pointer/touch/keyboard/voice fallback remains available
- reduced-motion affects projection, not input semantics

## Privacy law

Camera or persistent hand tracking requires explicit user initiation.

By default:

- raw frames are not retained
- semantic gesture events may be logged only when needed for receipts/debugging
- the UI visibly indicates active tracking
- tracking can be disabled immediately
- gesture telemetry must not become an identity biometric store

## First implementation slice

Build only:

```text
MediaPipe camera adapter
→ filtered landmarks
→ approach
→ pinch begin/hold/release
→ target capture
→ drag
→ settle
→ synthetic Three.js artefact
→ local receipt
```

Do not add a large symbolic vocabulary yet.

Proof required:

- no false target switching during capture
- tracking jitter does not visibly shake the artefact
- short tracking loss recovers or cancels predictably
- action is reachable by pointer/touch fallback
- reduced-motion mode remains functional
- gesture path grants no additional capability authority

## Next slices

1. two-hand scale + rotate
2. semantic time ribbon
3. Universal Codex artefact manipulation
4. Epra Atlas spatial manipulation
5. WebXR hand adapter
6. House Commons spatial presence controls
7. optional temporal ML recognizer for complex gestures

## Design sentence

> **Astra should feel less like issuing commands to software and more like handling responsive information in a room.**
