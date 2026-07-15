# Wardenclyffe × Möbius Patch Contract v0.2

Status: implementation contract

## Decision

The coupled engine uses a hybrid transport model.

1. Shared `AudioContext` is the native coupled transport.
2. `MediaStream` is an optional ingress and egress bridge.
3. Named patch declarations are the authority shared by both engines.

This is not an either-or choice. The shared context provides direct zero-copy AudioNode routing when both engines occupy one page. The MediaStream seam preserves Möbius as an independent processor for microphone input, imported/live audio, another engine, or a separately loaded tool.

## Engine roles

```text
Wardenclyffe = signal forge
Möbius       = topology forge
Patch Bay    = declared routing authority
Field State  = optional interpretive modulation source
```

Wardenclyffe and Möbius remain separately usable. Coupled mode does not erase either standalone path.

## Patch authority

Every patch declares at minimum:

```text
name
routingMode
binauralIntegrity
continuityMode
transport
loopQuantumSeconds
stems[]
mobius
claimLabel
```

Each stem declares:

```text
kind
frequency or leftFrequency/rightFrequency
gain
route
send: dry | mobius | both
sendLevel
protected
enabled
claimLabel
```

## Binaural integrity

### Protected

- Left and right carrier oscillators remain isolated.
- Protected carrier stems bypass Möbius send even when a saved patch requests `both`.
- Harmonic-chamber and other eligible stems may still enter Möbius.
- MediaStream export may contain the complete stereo field without routing the carriers through the twist.

### Unlocked

- Carrier stems may enter Möbius intentionally.
- Cross-coupling, summing, return folding, and other transformations are experimental and explicitly declared.

### None

- The patch does not claim binaural architecture.

## Continuity modes

### Exact loop

The patch declares a loop quantum. Every periodic frequency is checked for integer cycle closure at that duration. Continuous Web Audio oscillators remain phase-continuous during live playback.

### Sealed loop

The live graph preserves delay, filter, and feedback state inside the shared context. An offline tail-seal renderer remains a separate implementation task. The UI must not claim a finite downloadable loop is sealed until that renderer exists and is witnessed.

### Infinite field

Oscillators and the Möbius network run continuously until Feather Stop. No repeating buffer is required.

## Möbius state preservation

The coupled graph creates one persistent delay/filter/feedback network and changes parameters without rebuilding it. This preserves live return state across patch changes inside the same AudioContext. Feather fades the output and stops Wardenclyffe sources while keeping the transport honest about what has and has not been rendered.

## Concurrent Field ingress

The sound engines consume one Starwell Concurrent Field Snapshot rather than separate private DEEP mappings.

Concurrent sources may include:

- DEEP vector: P/C/R/E/M/A and dp/dt
- Barbault cyclic index, compression, phase, and configuration
- sacred geometry form, density, symmetry, movement, and sound map
- somatic capacity, activation, fatigue, tinnitus, body says yes/no/wait, and audio safety mode
- Terra Aeterna application output
- agency choices
- archive and provenance metadata

No theory output starts audio. The user selects and starts a patch. The somatic layer can veto or soften materialization. Every materialized patch carries epistemic declarations.

## Current implementation boundary

Built in v0.2:

- shared AudioContext registry
- MediaStream ingress and bridge-output seam
- per-stem dry / Möbius / both routing
- protected and unlocked binaural modes
- named patch import, export, and local save
- Dream-Signal 3.4 preset
- experimental patch scaffold
- exact-loop cycle report
- persistent live Möbius state
- Concurrent Field snapshot adapter and somatic veto

Not yet claimed complete:

- offline sealed-loop tail renderer
- cross-tab MediaStream signalling protocol
- sample-accurate WAV export from the coupled graph
- haptic derivative renderer
- historical calibration of theory-to-audio mappings

## Safety and truth rules

- No autoplay.
- Feather remains immediately available.
- Protected carriers are not silently folded.
- Somatic no/mute prevents start.
- Interpretation is declared and optional.
- A green build is not evidence that a sound field is perceptually good.
- Audio QA requires channel witness, rendered-state inspection, and human listening notes.
