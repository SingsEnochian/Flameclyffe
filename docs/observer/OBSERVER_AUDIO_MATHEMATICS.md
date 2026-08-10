# Observer Audio Mathematics

**Status:** Canonical audio projection contract  
**Engine:** `assets/observer-audio-engine.js`  
**Applies to:** Möbius Audio Bus, Runa harmonic playback, STARWELL sound fields, binaural stacks, isochronic layers, haptic routing, and future C++/WASM DSP implementations

## Boundary

Audio is a living expression of an accepted PREMAQ state. It carries the state into the acoustic field.

```text
accepted PREMAQ state
→ versioned audio transfer function
→ bounded control vector
→ audio renderer
→ expression receipt
```

The raw PREMAQ packet remains immutable. The audio engine stores or returns the packet ID, registry version, calibration version, engine version, output classification, diagnostics, and receipt.

## Deterministic transfer

For a PREMAQ packet `x = (P,C,R,E,M,A,Q)` with component derivatives, uncertainty, and confidence, the default transfer computes:

- carrier frequency from Presence, Coherence, and Qualia (Q);
- binaural difference from Resonance, Memory, and derivative energy;
- pulse rate from Memory and its rate of change;
- spectral brightness from Agency and Coherence;
- stereo width from Resonance reduced by uncertainty;
- return-path gain from Entanglement weighted by confidence;
- master gain from Presence, Qualia (Q), and confidence;
- phase inversion as an explicit, inspectable Entanglement threshold rule.

Linear interpolation is used for bounded gains and rates. Exponential interpolation is used for perceptual frequency ranges:

```text
linear(a,b,t) = a + (b-a) clamp(t,0,1)
exponential(a,b,t) = a (b/a)^clamp(t,0,1)
```

Derivative energy is the root-mean-square of the seven bounded PREMAQ derivatives:

```text
d = sqrt((dP²+dC²+dR²+dE²+dM²+dA²+dQ²)/7)
```

This is a control statistic, not physical energy.

## Safety and signal integrity

- Frequency, gain, pulse rate, return level, and stereo width remain bounded by the calibration profile.
- Master level is constrained below the existing Möbius Audio Bus ceiling.
- The existing dynamics compressor remains the final protection stage.
- Parameter changes use smoothing rather than discontinuous jumps.
- Mono-safe routing, phase inversion, and return-side selection remain explicit controls.
- Hearing accessibility profiles may narrow bandwidth, remove binaural difference, disable high-frequency content, or select haptic substitution without changing PREMAQ.

## Versioning

A replayable audio expression requires:

- source PREMAQ packet and registry version;
- audio engine version;
- calibration profile ID and version;
- render options and duration;
- output control vector;
- receipt timestamp.

Changing any coefficient or bound requires a new calibration or engine version. Historical receipts must retain their original versions.

## Implementation rule

The Möbius Audio Bus remains the low-level Web Audio renderer. `ObserverAudioEngine` is the canonical Observer v2 adapter. New sound-space, binaural, harmonic, Runa, and world-profile features should request an audio projection from this adapter rather than reading PREMAQ dimensions ad hoc.

World-specific sound spaces may apply a second, versioned canon transfer after this shared control vector. They carry canon-grounded experiential records, preserve the shared PREMAQ source, and issue a separate receipt.
