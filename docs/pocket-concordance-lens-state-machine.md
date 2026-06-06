# Pocket Concordance Lens State Machine

Status: v0.1 public-safe implementation note.

This document defines the first-state machine for Pocket Concordance Lens: the phone/tablet camera fallback that places a Concordance anchor, shows a Hearth Lantern and first five sigils, and lets DEEP compare return states.

## Design goal

Pocket Concordance Lens should not feel like a one-off visual effect.

It should feel like a small instrument with repeatable states:

- idle
- permission requesting
- camera active
- demo active
- anchor placed
- return compared
- drift detected
- cleared
- error

## Primary objects

### Lens session

A lens session is the current user interaction with the app.

Minimum fields:

```json
{
  "camera_status": "idle",
  "device_mode": "pocket_lens",
  "demo_mode": false,
  "active_anchor_id": null,
  "comparison_state": null,
  "privacy_note_visible": true
}
```

### Anchor

An anchor is a returnable relation-point.

The current prototype uses the shared anchor contract module:

- `buildAnchorFromPlacement()`
- `compareAnchorReturn()`
- `readLocalAnchor()`
- `saveLocalAnchor()`
- `clearLocalAnchor()`

The anchor object already includes layer, confidence mode, consent scope, device mode, waking context, relation context, visual state, DEEP state, tags, and privacy metadata.

## Camera states

### idle

The camera is not active.

UI:

- camera pill: Private idle
- Start camera enabled
- Demo room enabled
- no live video

Allowed transitions:

- Start camera → requesting
- Demo room → demo_active
- Clear anchor → cleared if anchor exists

### requesting

The app has asked the browser for camera permission.

UI:

- Start camera button says Asking…
- other camera controls remain safe
- no recording or image capture

Allowed transitions:

- permission accepted → camera_active
- permission denied/error → blocked

### camera_active

The live camera stream is visible.

UI:

- camera pill: Camera active
- Stop camera enabled
- tap stage to place anchor
- visible camera state indicator

Allowed transitions:

- tap stage → anchor_placed
- Stop camera → idle
- browser/device error → error

### blocked

Camera permission was denied or unavailable.

UI:

- error message shown
- demo mode offered

Allowed transitions:

- Demo room → demo_active
- retry Start camera → requesting

### unsupported

The browser does not support the needed camera API.

UI:

- error message shown
- demo mode offered

Allowed transitions:

- Demo room → demo_active

## Anchor states

### none

No anchor has been placed or loaded.

DEEP reading:

- No anchor placed.
- Start the camera, use demo mode, or tap the room view to invite relation.

Allowed transitions:

- place anchor → anchor_placed
- load saved anchor → anchor_loaded

### anchor_loaded

A saved local anchor exists at app start.

UI:

- Hearth Lantern appears at saved placement.
- five sigils appear around anchor.
- DEEP reading uses saved anchor reading.

Allowed transitions:

- tap new placement → return_compared
- Clear anchor → cleared

### anchor_placed

User taps the view and creates a new anchor.

Action:

- build anchor from placement.
- save anchor locally.
- render Hearth Lantern.
- render first five sigils.
- show DEEP reading.

Allowed transitions:

- tap again near previous saved anchor → stable
- tap again far from previous saved anchor → drifted
- Clear anchor → cleared

### stable

A return comparison indicates the new placement is close enough to the saved anchor.

DEEP reading:

- Return-point recognised.
- Anchor remains stable.
- Concordance thread holds.

Allowed transitions:

- tap far away → drifted
- Clear anchor → cleared

### drifted

A return comparison indicates the new placement is too far from the saved anchor.

DEEP reading:

- Anchor drift detected.
- Relation is present but misaligned.
- Re-place or clear the anchor.

Allowed transitions:

- tap near saved anchor → stable
- Clear anchor → cleared

### cleared

The local anchor has been cleared.

DEEP reading:

- Anchor cleared.
- The room is unbound and ready for a new return-point.

Allowed transitions:

- place anchor → anchor_placed

## Visual state rules

The overlay should always be derived from anchor state.

No anchor:

- no Hearth Lantern
- no sigil ring
- no Stonewood seams

Anchor present:

- Hearth Lantern at anchor placement
- five sigils arranged around lantern
- Stonewood seams and sigil rail appear near anchor

Comparison stable:

- reading changes to stable return language
- future version may make lantern steadier/brighter

Comparison drifted:

- reading changes to drift language
- future version may offset or loosen Stonewood seams

Cleared:

- overlay removed
- reading confirms clear state

## First five sigils

The first five sigils are enough for the first ride:

- Anchor: return-point formed
- Witness: DEEP is observing
- Waking: physical handle stable
- Gate: Verge contact listening
- Concordance: relation invited

Later additions may include Ward, Return, Drift, Dreaming, and Resonance.

## Accessibility rules

- All controls should be large enough for touch.
- Camera state must be visible.
- Reduced-motion preference should be respected.
- Demo mode should exist for camera-denied or no-camera environments.
- The app should work seated.
- The user must be able to clear the anchor.
- No video or images should be stored by default.

## Future Supabase sync

The current prototype uses local browser storage.

Supabase sync should wait until:

- Anchor Registry table is reviewed.
- RLS policies are decided.
- public vs private anchor handling is clear.
- no image/video storage remains the default.

## State transition summary

```txt
idle
  -> requesting
  -> camera_active
  -> anchor_placed
  -> stable | drifted
  -> cleared

idle
  -> demo_active
  -> anchor_placed
  -> stable | drifted
  -> cleared

requesting
  -> camera_active
  -> blocked
  -> unsupported

blocked | unsupported
  -> demo_active
```

## Core implementation principle

Every visible mythic element should have a state reason.

The lantern appears because an anchor exists.
The sigils appear because a relation is being marked.
The reading appears because DEEP has a state to interpret.
The return state appears because the system can compare now to before.
