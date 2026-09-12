# ArcSweep Somatic Interface v1

## Purpose

The Somatic Interface Layer turns bounded ArcSweep state changes into learnable sensory cues. It treats sound, vibration, touch, gesture, and later wearable signals as interface channels rather than decoration.

The first implementation is deliberately bounded: semantic cues can produce short Web Audio tones through the system-selected audio output and short vibration patterns where the browser supports the Vibration API. If the selected audio output is a bone-conduction device, the same audio cue can be perceived through that route without ArcSweep attempting to control the implant or medical hardware itself.

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

The input side now begins in Glyph Forge. Pencil/pointer samples remain owned by GlyphCanvas and the ordinary stroke renderer. A parallel transient telemetry membrane emits bounded `arcsweep.glyph-brush-sample/v1` events for the somatic bridge. It does not replace, rewrite, or canonise drawing state.

## Semantic vocabulary

v1 ships five cues:

- `threshold`: boundary or mode transition available
- `accepted`: action completed or accepted
- `warning`: attention required before continuing
- `navigation`: room or context change
- `brush_contact`: Glyph Forge brush contact or parameter acknowledgement

Each cue binds meaning to a repeatable combination of pitch, duration, spacing, and haptic pulse. The contract is semantic consistency: modulation may express intensity or motion, but a `brush_contact` pattern remains recognisably `brush_contact`.

## Glyph Forge expressive bridge

GlyphCanvas already receives pressure, tilt, twist, timestamps, and coalesced Pencil/pointer events. ArcSweep now derives bounded somatic telemetry from that existing stream:

```text
Pencil / pointer
  -> GlyphCanvas normal stroke pipeline
  -> transient glyph-brush-sample event
  -> Somatic Event Bridge
  -> profile + binding + pressure + cooldown gates
  -> brush_contact cue
  -> bounded expressive modulation
  -> somatic receipt
```

The telemetry contract includes stroke/brush identity, pointer type, phase (`start`, `move`, `end`), pressure, velocity, tilt, and twist. Raw x/y coordinates are available to the local transient event but are not forwarded into the somatic receipt allowlist.

Current expressive mapping:

- **Pressure → strength.** Pressure scales cue gain and haptic strength within hard limits.
- **Velocity → pitch.** Stroke speed nudges `brush_contact` pitch over a narrow range rather than changing semantic identity.
- **Tilt → duration.** Stylus tilt magnitude slightly stretches or compresses cue duration.
- **Twist → evidence only in v1.** Twist is captured in bounded context for later experiments but does not yet alter output.

Runtime hard clamps are `frequency_scale 0.85–1.15`, `duration_scale 0.65–1.35`, `haptic_scale 0.5–1.5`, and gain `0.001–0.08`. The current bridge uses a smaller subset of those ranges for normal Glyph Forge expression.

## Profile, calibration, and rate limiting

The persistent somatic profile stores channel choices, gain, quiet mode, semantic cue feedback, binding switches, and cooldowns. Automatic bindings remain **off by default**.

The Calibration Chamber exposes:

- audio and haptic enablement;
- quiet mode;
- global gain;
- navigation cue enablement;
- brush-contact enablement;
- continuous brush-expression enablement;
- navigation, contact, and expression cooldowns;
- minimum accepted brush pressure;
- velocity reference used to normalise expressive pitch;
- per-cue ratings (`clear`, `muddy`, `too-sharp`, `pleasant`, `indistinct`).

Default brush limits are a 180 ms contact cooldown, 120 ms expression cooldown, 900 px/s velocity reference, and 0.05 minimum pressure. The bridge also suppresses output while another cue is in flight.

## Authority and consent boundary

Somatic output is an `operate` capability and requires explicit confirmation at the capability boundary. Automatic bindings are user opt-in preferences operating through the already-authorised somatic sidecar. The service forbids autoplay, persistent stimulation, medical-device control, and implant control. `Feather` immediately stops active output through the ArcSweep event spine.

The browser may route sound to a bone-conduction device only because the operating system/user selected that audio route. ArcSweep v1 does not enumerate, pair, configure, stimulate, or command implanted hardware.

## Capabilities

- `somatic.status`
- `somatic.list-cues`
- `somatic.inspect-cue`
- `somatic.emit-cue`
- `somatic.stop`

The global sidecar exposes `globalThis.__arcsweepSomatic` with status/catalog/output/profile helpers plus opt-in navigation, brush-contact, and brush-expression controls.

## Working vertical slices

### Explicit cue

```text
human action
  -> somatic.emit-cue("threshold")
  -> capability confirmation
  -> Web Audio tone pair + optional vibration pattern
  -> arcsweep.somatic-receipt/v1
  -> arcsweep:somatic-cue-emitted event
```

### Navigation

```text
navigation event
  -> opt-in binding
  -> quiet/cooldown gate
  -> navigation cue
  -> receipt
```

### Glyph Forge contact + expression

```text
Pencil down
  -> glyph-brush-sample(start)
  -> opt-in + min-pressure + contact cooldown gate
  -> brush_contact
  -> pressure/velocity/tilt modulation
  -> receipt

Pencil move
  -> glyph-brush-sample(move)
  -> optional brush-expression binding
  -> expression cooldown + cue-in-flight gate
  -> same brush_contact semantic cue with bounded modulation
  -> receipt
```

## Next increments

1. Build the Afferent Bus that normalises Pencil/touch, gesture, motion, microphone, and explicitly authorised wearable inputs into one event contract.
2. Add an initial three-command gesture vocabulary: accept, back, Feather.
3. Link somatic receipts and explicit calibration feedback into Observer/DEEP evidence paths.
4. Add adaptive recommendations that can suggest, but never silently apply, changes to confusing or indistinct cues.
5. Complete the replayable Glyph Forge loop: navigation -> brush contact/expression -> glyph completion -> accepted cue -> evidence receipt -> replay.
6. Add external haptic adapters only behind explicit, user-authorised device APIs.
