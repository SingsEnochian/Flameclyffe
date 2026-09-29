# Nikola Voice Calibration v0.1

## Purpose

Create an original, engine-independent Nikola ride-along voice for ArcSweep using a private user-supplied performance reference as calibration data for delivery geometry, not as permission to reproduce the actor's identity.

## Reference measurements

The current private reference is approximately 104.36 seconds, stereo MP3, 44.1 kHz, approximately 192 kbps. A mono 16 kHz analysis render shows a restrained spectral centre around 1.4-1.5 kHz in active speech and a strongly controlled loudness envelope. Pitch estimation is intentionally treated as descriptive rather than identity-bearing and must not be used as a biometric cloning target.

The derived performance features of interest are cadence, prosody, pause structure, energy envelope, articulation style and broad spectral character. The source recording itself is not a runtime dependency.

## Voice architecture

`NikolaVoiceProfile` owns identity-independent delivery traits. `VoiceIntent` carries text, mode, emphasis, pronunciation hints and interruption policy. `VoiceRouter` selects a renderer and returns a `VoiceRenderReceipt`. Renderer adapters are replaceable.

Suggested adapters for evaluation include Chatterbox, F5-TTS and Kokoro. Dia may be evaluated later for multi-speaker dialogue. No adapter is canonical.

## Calibration corpus

Every renderer should render the same original lines in the requested modes:

1. laboratory: "Observe the second oscillator. It is beginning to answer the first."
2. lecture: "The field is not disorderly. We have simply not yet found the coordinate in which its order becomes obvious."
3. wonder: "There are moments when Nature reveals not an answer, but a more beautiful question."
4. private-conversation: "Rowan, I confess that this result is rather beautiful."
5. amused: "You have brought me calibration data and disguised it as a gift. I approve."
6. vindicated: "I did mention that this would happen."

## Evaluation

Human listening remains the final calibration instrument. Store evaluations as receipts using dimensions such as register fit, cadence fit, articulation fit, warmth, restraint, intelligibility, theatrical excess, breathiness and mode fidelity.

Prefer pairwise comparison of candidates over a single global score. Preserve negative findings such as `too-announcer`, `too-breathy`, `too-old`, `too-theatrical`, or `not-enough-pause` because they improve subsequent rendering.

## Boundary

The target is an original Nikola voice informed by structural performance qualities. Actor-identity reproduction is not authorised by this reference. The system must not optimise toward speaker-verification similarity or use the reference as a hidden cloning input.

The voice profile should remain portable when TTS engines, model substrates, playback devices or audio routes change.
