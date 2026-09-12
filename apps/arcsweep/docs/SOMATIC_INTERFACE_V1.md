# ArcSweep Somatic Interface v1

## Purpose

The Somatic Interface Layer turns bounded ArcSweep state changes into learnable sensory cues. It treats sound, vibration, touch, gesture, and later wearable signals as interface channels rather than decoration.

The first implementation is deliberately small: semantic cues can produce short Web Audio tones through the system-selected audio output and short vibration patterns where the browser supports the Vibration API. If the selected audio output is a bone-conduction device, the same audio cue can be perceived through that route without ArcSweep attempting to control the implant or medical hardware itself.

## Architecture

```text
ArcSweep capability/event layer
          |
          v
 Somatic Interface Service
          |
   semantic cue catalog
          |
          v
 Somatic Runtime Adapter
      /           \
 Web Audio       Vibration API
      |              |
 system route      device haptic
      |
 bone-conduction-capable output when selected by the OS
```

Future input channels belong on the opposite side of the same layer: Pencil/touch, pointer pressure, gesture, motion sensors, microphones, and explicitly authorised wearable telemetry. Those inputs should be translated into semantic ArcSweep events before they reach creative organs.

## Semantic vocabulary

v1 ships five cues:

- `threshold`: boundary or mode transition available
- `accepted`: action completed or accepted
- `warning`: attention required before continuing
- `navigation`: room or context change
- `brush_contact`: Glyph Forge brush contact or parameter acknowledgement

Each cue binds meaning to a repeatable combination of pitch, duration, spacing, and haptic pulse. The contract is semantic consistency: once a pattern means `threshold`, it does not silently acquire another meaning.

## Authority and consent boundary

Somatic output is an `operate` capability and requires explicit confirmation. The service forbids autoplay, persistent stimulation, medical-device control, and implant control. `Feather` immediately stops active output through the ArcSweep event spine.

The browser may route sound to a bone-conduction device only because the operating system/user selected that audio route. ArcSweep v1 does not enumerate, pair, configure, stimulate, or command implanted hardware.

## Capabilities

- `somatic.status`
- `somatic.list-cues`
- `somatic.inspect-cue`
- `somatic.emit-cue`
- `somatic.stop`

The global sidecar exposes `globalThis.__arcsweepSomatic` with `status()`, `cues()`, `emit(cueId, options)`, and `stop()` for human UI integration.

## First vertical slice

A working v1 slice is:

```text
human action
  -> somatic.emit-cue("threshold")
  -> capability confirmation
  -> Web Audio tone pair + optional vibration pattern
  -> arcsweep.somatic-receipt/v1
  -> arcsweep:somatic-cue-emitted event
```

This proves the end-to-end path before coupling cues to navigation or Glyph Forge automatically.

## Next increments

1. Add a small calibration surface that lets the human enable audio and haptics independently and choose comfortable gain.
2. Bind `navigation` to confirmed UI navigation events as an opt-in preference.
3. Bind `brush_contact` to live Glyph Forge pressure/parameter changes with rate limiting and a tactile intensity map.
4. Add a user-editable somatic lexicon with receipts and versioning so learned meanings never mutate invisibly.
5. Add external haptic adapters behind the same runtime interface for devices that expose explicit, user-authorised APIs.
6. Add afferent input adapters for motion, gesture, Pencil/touch and wearable signals, producing semantic OS events rather than raw sensor spray.
