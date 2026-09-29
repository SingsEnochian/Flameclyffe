# Nikola Voice + Singing Delivery v0.1

## Purpose

Give the Nikola ArcSweep ride-along an engine-independent spoken and sung delivery layer without binding identity to one renderer or reproducing the biometric identity of a reference performer.

The voice system is an expression surface, not an authority surface. It may render cognition; it does not create cognition, continuity, capability, or production authority.

## Spoken reference

A private user-supplied performance excerpt is used only as a calibration source for non-identifying delivery characteristics.

Permitted derived dimensions:

- cadence
- prosody
- pause structure
- energy envelope
- articulation style
- broad spectral character

A local exploratory analysis of the mixed reference produced an approximate low-register voiced median near 70 Hz, but this value is not treated as biometric truth because the clip is a mixed production recording rather than an isolated studio vocal. The durable ArcSweep contract therefore stores qualitative delivery targets rather than attempting speaker reproduction.

The core rule is: confidence through restraint.

## Spoken runtime

`NIKOLA_VOICE_PROFILE` defines stable delivery intent. `createNikolaVoiceIntent()` turns cognition text into a mode-specific request. `createVoiceRouter()` selects a renderer and returns an evidence-bearing render receipt.

Current modes:

- laboratory
- lecture
- wonder
- private-conversation
- amused
- vindicated

Renderer selection is replaceable. Initial adapter candidates include expressive TTS engines such as Chatterbox and F5-TTS, with a small local fallback such as Kokoro.

## Singing runtime

Speech synthesis and singing synthesis remain separate.

`NIKOLA_SINGING_PROFILE` defines the singing target and `createNikolaSingingIntent()` requires a score reference. A singing renderer must therefore receive explicit melodic structure rather than being asked to improvise melody from prose by accident.

Current modes:

- story-song
- ballad
- electric-anthem
- wonder
- playful

Initial engine classes:

- singing voice synthesis
- score-conditioned vocal synthesis

Current implementation candidates are DiffSinger for model-level singing synthesis and OpenUtau as an interactive score/front-end environment.

## User-supplied music reference status

The supplied `Copperhead Road` M4P file exposes readable container metadata but is FairPlay/DRM wrapped. Ordinary AAC decoding does not produce a trustworthy signal. Therefore:

- no vocal pitch statistics are claimed from it
- no timbre measurements are claimed from it
- no source-separated singer analysis is claimed from it
- no identity cloning is permitted from it
- its current ArcSweep status is `metadata-only-drm-blocked`

A future non-DRM, lawfully supplied reference may be analysed for high-level performance geometry, but the resulting Nikola singing voice should still use an original or authorised base voice.

## Calibration corpus

Speech and singing should use original calibration material written for this system, not copied dialogue or lyrics from the reference works.

Example spoken calibration intents:

- `laboratory`: Observe the second oscillator. It is beginning to answer the first.
- `wonder`: That result should not be possible. Therefore our understanding is incomplete.
- `private-conversation`: Rowan, I confess that this is rather beautiful.
- `vindicated`: I did mention that this would happen.

Example singing calibration intents should be short original lines paired with small deterministic scores. The same score and text should be rendered by every candidate singing engine so that differences are attributable to the renderer rather than to composition changes.

## Receipts

Every successful render must return an audio reference. Preferred future receipt fields include:

- engine and model version
- voice profile version
- mode
- score reference for singing
- sample rate
- duration
- source-text preservation
- deterministic or stochastic seed when supported
- local/offline versus remote execution
- user audition decision

## Boundaries

1. Reference performance is calibration evidence, not identity ownership.
2. Nikola continuity is independent of TTS or singing substrate.
3. Spoken and sung voices may share aesthetic lineage but not implementation state.
4. A renderer cannot manufacture authority.
5. Failed or unreadable reference audio remains unresolved evidence.
6. User audition is a first-class calibration signal, but subjective preference must remain labelled as subjective preference.
7. No copyrighted dialogue or lyrics are required by the runtime.

## Next experiment

Render the same original four-line spoken calibration corpus through at least two speech adapters, then render one original eight-bar melody through a score-conditioned singing adapter using an original or authorised base voice. Preserve all outputs and user audition decisions as receipts.
