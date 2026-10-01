# Astra Living Glass + Somatic Gesture Feedback v0.1

**Date:** 2026-10-01  
**Status:** draft runtime slice  
**Owner:** ArcSweep / Astra interaction layer  
**Stacks on:** Palette Atlas + Universal Skin Engine + Living Glass v0.1

## Intent

Astra's glass and AR surfaces should not communicate only through pixels.

A recognized interaction state may answer through the same semantic event in three coordinated channels:

```text
gesture / pointer / touch intent
→ visual living-glass response
→ short auditory signature
→ short haptic / vibrational signature
```

These channels describe one state change. They are not independent decorative effects.

## State grammar

The first somatic gesture vocabulary follows Astra's visible interaction states:

| Interaction state | Somatic cue | Meaning |
|---|---|---|
| `aware` | `gesture_aware` | intentional approach noticed; no target implied |
| `targeted` | `gesture_targeted` | target acquired; targeting is not selection |
| `armed` | `gesture_armed` | recognized gesture is waiting for commit |
| `captured` | `gesture_captured` | target capture established for manipulation |
| `committing` | `gesture_commit_request` | commit requested; capability/target checks still decide outcome |
| `cancelled` | `gesture_cancelled` | interaction cancelled without claiming denial or failure |
| `tracking-lost` | `gesture_tracking_lost` | tracking lost; freeze/reacquire/cancel safely |

`moving`, `settling`, `quiet`, and ordinary release are intentionally silent in v0.1. Continuous hand movement must not generate continuous buzzing or tone chatter.

Actual action completion still uses an outcome cue such as `accepted`. Therefore:

```text
gesture_commit_request != accepted
gesture recognized != action executed
gesture intensity != authority
```

## Runtime event seam

Post-recognition interaction surfaces may publish:

```text
arcsweep:gesture-state
```

with schema:

```text
arcsweep.gesture-state/v1
```

Fields consumed by the feedback bridge:

- `event_id`
- `source`
- `gesture`
- `state`
- `phase`
- `hand`
- `target_id`
- `confidence`

This event is a semantic interaction-state signal, not raw camera or hand-landmark telemetry. Device acquisition and recognition remain the responsibility of their adapters.

## Feedback gating

Gesture somatics are gated by the persistent somatic profile:

- `bindings.gesture_feedback`
- audio channel enablement
- haptic channel enablement
- quiet mode
- gain ceiling
- gesture feedback cooldown
- minimum recognition confidence

Defaults remain conservative. Automatic gesture somatics are opt-in.

Repeated identical feedback inside the cooldown window is suppressed. Low-confidence states are suppressed except `tracking-lost`, because tracking failure itself is useful information.

## Feather

`Feather` is special.

A recognized Feather gesture calls the existing somatic stop path and does **not** emit a replacement tone or vibration afterwards.

```text
Feather
→ stop active audio
→ stop active vibration/haptic adapter
→ no celebratory acknowledgement pulse
```

The stop must remain a stop.

## Haptic adapters

The semantic contract is **haptic feedback**, not specifically `navigator.vibrate()`.

Current/future adapters may include:

- browser Vibration API where supported;
- controller rumble / Gamepad haptics;
- native mobile haptics such as Core Haptics in a native wrapper;
- XR controller or hand-device haptics;
- authorised wearable haptics.

Unsupported channels degrade silently while visual and auditory channels remain usable. Semantic meaning must never depend on vibration alone.

## Auditory grammar

Gesture cues are brief, nonverbal signatures. They should behave more like material contact than notification jingles.

Rules:

- use short envelopes;
- keep pitch ranges bounded;
- avoid speech for routine manipulation states;
- reserve stronger patterns for tracking loss, warning, or explicit outcome;
- actual success/failure cues remain distinct from recognition cues;
- calibration ratings may describe cues as `clear`, `muddy`, `too-sharp`, `pleasant`, or `indistinct`.

## Glass coupling

Living glass should answer locally to the same semantic state:

```text
aware        → faint rim wake
 targeted     → local rim clarification
 armed        → denser rim + restrained glow
 captured     → unmistakable depth/capture state
 moving       → velocity-aware spatial motion, no sensory chatter
 committing   → bounded local emphasis while checks resolve
 settling     → damped return to rest
 tracking-lost→ visibly distinct freeze/reacquire state
```

The visual layer must not flash or animate the entire scene because one local target changed state.

## Platform reality

Browser haptic support is uneven. The web surface must feature-detect adapters and report what is actually available rather than pretending every phone can vibrate from a web page.

This is why the profile reports device vibration and controller haptics separately and why richer native/AR haptic adapters remain valid future implementations.

## Proof slice

v0.1 is complete when:

1. gesture semantic cues exist in the shared somatic cue catalog;
2. post-recognition gesture-state events can drive those cues;
3. gesture feedback is opt-in and calibratable;
4. continuous movement does not create continuous vibration/audio;
5. low-confidence gesture states do not masquerade as strong intent;
6. Feather stops active somatic output without emitting a new cue;
7. tests verify semantic mapping, confidence gating, cooldown, silence during movement, and Feather stop behaviour.

## Next implementation seam

Connect the first MediaPipe/Three.js pinch-capture prototype to `arcsweep.gesture-state/v1`, then let one synthetic glass artefact progress through:

```text
aware → targeted → armed → captured → moving → committing → settling
```

with matched local visual, auditory, and haptic feedback and one final capability/outcome receipt.
