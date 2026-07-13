# STARWELL Spatial Portal · Mobile AR v0.1

Issue: #56

## Purpose

Use iPhone, iPad, and Android AR as the proving ground for the STARWELL portal before the Maverick glasses arrive.

This is not a disposable demo. The portal scene contract and state machine are renderer-neutral. Mobile AR supplies 6DoF room placement and touchscreen input. Maverick later supplies LOS placement, head-aim, and touchpad input.

## Architecture

```text
Portal scene manifest
        |
Portal state machine
        |
+----------------------+----------------------+
|                                             |
Mobile AR adapter                              Maverick adapter
AR Foundation                                  LOS Kit
ARKit / ARCore                                 head direction
screen raycast + touch                         touchpad gestures
6DoF local anchor                              LOS/world-direction anchor
```

## Slice 01 contract

### Placement

1. Start an AR session.
2. Detect vertical and horizontal planes.
3. The user taps a tracked surface.
4. Create one local anchor at the hit pose.
5. Parent the complete portal root to that anchor.
6. Keep the frame, interior scene, labels, and touchpoints under that one root.

One anchor is deliberate. Nearby elements should not drift independently and tear the portal into spatial confetti.

### Interaction

- Tap a rim touchpoint to select a destination.
- The selected touchpoint gains a visible focus state.
- The portal interior changes without restarting the AR session.
- A Re-place control removes the current anchor and returns to placement mode.

### Initial destinations

- `observatory`
- `dreaming-grove`
- `quiet-night`

The first pass uses procedural colours, particles, and geometry. Finished STARWELL textures and sound belong to later slices.

## Renderer-neutral scene manifest

Each scene supplies:

- stable id
- display name
- glyph
- palette tokens
- motion profile
- optional asset keys
- accessibility copy
- capability flags

The manifest must not contain Unity object references or Maverick-specific class names.

## Privacy and consent boundary

- Camera access exists only to operate the AR session.
- No camera frames, room maps, anchors, or meshes are uploaded.
- Slice 01 does not persist anchors between sessions.
- No network connection is required after the app is installed.
- Re-place and Exit are always visible user actions.

## Mobile test matrix

### iPhone

- portrait and landscape
- place on wall and floor
- approach and retreat from portal
- test all rim touchpoints with one hand

### iPad

- landscape-first
- test larger viewing distance
- test seated use and tabletop placement
- verify touchpoint reach without hand gymnastics

### Android

- confirm ARCore support on the chosen device
- repeat wall/floor placement tests
- verify portal stability and touch hitboxes

## Maverick seam

The Maverick adapter will consume the same active scene id and manifest. Input translation will be:

| Intent | Mobile | Maverick |
| --- | --- | --- |
| Aim | screen-space ray | head direction |
| Activate | touchscreen tap | touchpad tap |
| Previous/next | optional UI arrows | backward/forward swipe |
| Home/dismiss | visible button | long tap |
| Place | AR hit-test | chosen LOS direction / later calibration |

Maverick implementation is held until the SDK project and hardware path can be verified. The mobile build must not pretend to exercise glasses-only behaviour.

## Acceptance evidence

A slice is not complete until there is evidence for:

- Unity project opens without package errors.
- Android build succeeds.
- iOS Xcode export succeeds.
- portal placement works on at least one physical device.
- all three scenes switch from touchpoints.
- re-place removes the previous portal root.
- no network request occurs during use.

## Held

- cross-session anchor persistence
- cloud/shared anchors
- depth occlusion polish
- room mesh storage
- hand tracking
- finished audio and haptics
- Maverick LOS renderer
