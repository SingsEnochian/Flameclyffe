# Hearthfire Somatic Engine Architecture

Status: architecture definition
Gate: `targeted_receipt_allowed`

## Product sentence

Hearthfire is a somatic engine for information.

It takes information and data, normalises it into felt state, and routes that state into consentful visual, auditory, haptic, spatial, and temporal outputs with receipts.

## Correction to the earlier frame

Hearthfire is not primarily a component kit.

A component kit can display things. Hearthfire must make data feel alive without lying about what it is.

The missing thing is the engine that converts:

```txt
data -> state -> sensation -> interaction -> changed state -> receipt
```

That conversion is the core product.

## Why a somatic engine is required

Information does not automatically become understandable just because it is visible.

Data becomes embodied when it has:

- rhythm
- intensity
- direction
- texture
- pressure
- tempo
- response
- quieting
- memory of interaction
- a receipt explaining cause

A chart can show values. A somatic engine lets a person feel how a value is behaving, what changed, what touched it, and what the surface is allowed to do in response.

## Core law

**Every output channel must be driven by declared state. Every felt response must have a receipt.**

Light, motion, sound, vibration, stillness, and silence are all output channels.

None of them are decorative by default.

## Engine pipeline

```txt
Source Event
  -> Signal Adapter
  -> State Normaliser
  -> Somatic Mapper
  -> Consent and Accessibility Gate
  -> Output Drivers
  -> Receipt Bus
  -> Surface Feedback
```

### 1. Source Event

Anything that enters the engine:

- DEEP packet
- bridge pulse
- local browser packet
- user touch
- pointer drag
- keyboard activation
- sound consent
- haptic consent
- quiet mode
- reduced-motion preference
- surface lifecycle event
- error or fallback

### 2. Signal Adapter

Turns source-specific input into a stable format.

Examples:

- `DeepSignalAdapter`
- `BridgePulseAdapter`
- `LocalPacketAdapter`
- `PointerActionAdapter`
- `ConsentActionAdapter`
- `AccessibilityAdapter`

Each adapter must declare:

- source name
- timestamp
- confidence
- raw input path
- normalised values
- whether the event is live, cached, simulated, fallback, or user-generated

### 3. State Normaliser

Combines events into a single current state without hiding provenance.

A normalised somatic state should include:

```json
{
  "surface_id": "string",
  "gate": "targeted_receipt_allowed",
  "source": "bridge | local | fallback | user | mixed",
  "confidence": "verified | observed | cached | simulated | placeholder | unknown",
  "values": {},
  "interaction": {},
  "consent": {},
  "accessibility": {},
  "timestamp": "ISO-8601"
}
```

### 4. Somatic Mapper

Maps normalised state into sensation instructions.

The mapper does not draw, play, vibrate, or persist by itself. It emits plans.

Example output:

```json
{
  "visual": [
    { "effect": "pulse_path", "source": "DEEP.R", "intensity": 0.72, "duration_ms": 1800 }
  ],
  "audio": [
    { "effect": "soft_tone", "source": "DEEP.H", "frequency_hz": 214, "duration_ms": 650 }
  ],
  "haptic": [
    { "effect": "exchange_pattern", "source": "user.touch", "pattern_ms": [15, 35, 15] }
  ],
  "spatial": [
    { "effect": "return_to_centre", "source": "settle" }
  ]
}
```

### 5. Consent and Accessibility Gate

Filters the plan before anything reaches the body.

Rules:

- Sound is off until explicitly enabled.
- Haptics are off until explicitly enabled.
- Reduced-motion mode replaces travel with static or slow-state cues.
- Low-stim mode dampens brightness, density, amplitude, duration, and frequency.
- Quiet mode preserves meaning while lowering sensory force.
- Export/persistence is off until explicitly requested.

### 6. Output Drivers

Drivers execute allowed plans:

- `VisualDriver`
- `AudioDriver`
- `HapticDriver`
- `SpatialDriver`
- `ReceiptDriver`

Drivers are replaceable. Canvas, DOM, Web Audio, CSS animation, and native haptics should all be implementation details behind the engine contract.

### 7. Receipt Bus

Every emitted effect becomes receipt data.

Receipts must name:

- effect id
- source event
- mapped variable
- output channel
- consent state
- accessibility state
- confidence
- whether the response was live, fallback, simulated, or user-generated
- whether anything was persisted or exported
- plain-language meaning
- boundary statement

## Information-to-sensation mapping

Hearthfire needs a shared mapping vocabulary.

| Data quality | Somatic expression | Boundary |
| --- | --- | --- |
| Presence | density, warmth, occupied space | does not prove agency |
| Coherence | line clarity, route stability, tone purity | does not prove correctness |
| Resonance | vibration, pulse repetition, harmonic sound | does not prove agreement |
| Entropy | fuzz, scatter, jitter, turbulent edge | does not imply danger by itself |
| Alignment | symmetry, centring, convergence | does not imply obedience |
| Motion | tempo, travel speed, shimmer rate | does not imply urgency |
| Horizon | threshold glow, edge readability | does not imply prophecy |
| Charge | brightness, haptic strength, centre bloom | does not imply personal diagnosis |
| Source confidence | opacity, badge, receipt language | does not imply authority |
| User action | local perturbation, trail, response | does not rewrite source data |
| Quieting | damping, slower rhythm, softened light | does not mean dead or broken |

## Engine event types

Initial event vocabulary:

```txt
signal:received
signal:stale
signal:fallback
user:pointer_down
user:pointer_drag
user:keyboard_activate
consent:sound_enabled
consent:sound_disabled
consent:haptics_enabled
consent:haptics_disabled
accessibility:quiet_enabled
accessibility:quiet_disabled
accessibility:reduced_motion_detected
surface:mounted
surface:settled
receipt:emitted
error:adapter_failed
```

## Minimal v0.1 implementation shape

```txt
hearthfire/lib/somatic-engine.js
hearthfire/lib/deep-signal-adapter.js
hearthfire/lib/receipt-bus.js
hearthfire/lib/consent-gates.js
hearthfire/workbench.html
```

### `somatic-engine.js`

Owns the pipeline:

```txt
ingest(event)
normalise()
map()
gate()
emit()
receipt()
```

### `deep-signal-adapter.js`

Reads bridge/local/fallback DEEP values and produces normalised `signal:received` events.

### `receipt-bus.js`

Stores in-memory receipts and optionally exposes them to the surface.

No persistence in v0.1 unless explicitly requested.

### `consent-gates.js`

Centralises sound, haptic, quiet, reduced-motion, low-stim, and export permissions.

### `workbench.html`

Tests engine behaviour without rewriting DEEP Observer or other surfaces.

## v0.1 acceptance criteria

Hearthfire Somatic Engine v0.1 is not complete until it can:

- ingest a DEEP-like packet
- ingest user touch or keyboard activation
- produce a normalised current state
- map state to visual/audio/haptic plans
- block sound and haptics until enabled
- honour reduced-motion and quiet mode
- emit receipts for every output effect
- distinguish signal state from user perturbation
- expose receipts in plain language
- run in a standalone workbench without database writes

## Non-authorizations

This architecture does not authorize:

- rewriting DEEP Observer
- replacing existing Flameclyffe surfaces
- enabling autoplay sound
- enabling default haptics
- persisting interaction traces by default
- claiming metaphysical proof, fate, diagnosis, or hidden authority
- broad UI overhaul
- database migration

## Closing definition

A somatic engine is the part of Hearthfire that makes information touchable.

It lets data become pulse, pressure, tone, glow, rhythm, stillness, and return.

The field answers because the engine translates state into sensation, and the receipt says what happened.
