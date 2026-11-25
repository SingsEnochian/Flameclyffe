# ATLAS DREAMING · DREAM-VOYAGE 001 · Director / Flight / Philosopher / Composer
Status: candidate design contract; no Atlas provider connection or live spatial generation is claimed.
Owner intent: Wayglass's Dreaming is a space for possibility, not mandatory productivity.

## Five simultaneous production desks
1. **Director**: cinematic camera grammar, lens and depth-of-field presets, diegetic lighting, shot-to-shot visual continuity, temporal pacing, interactive blocking. Camera motion is optional; reduced-motion mode is first class. No pre-scripted narrative forced on a visitor.
2. **Flight systems**: preflight capabilities, provider adapter health, immutable job IDs, source/asset hashes, timestamps, bounded retry budgets, cancellation, latency and error telemetry, deterministic replay of *receipts only*. No unverified flight status. Graceful fallback to stills or abstract geometry.
3. **World philosophy and culture**: identify each source tradition and its provenance; distinguish participant-authored fiction, scholarship, living cultural practice and invented mythology. No indiscriminate blending of sacred motifs. Allow explicit cultural boundaries and source credit. Never claim comprehensive knowledge of every culture.
4. **Sound design**: scene-linked spatial audio, occlusion, reverberation, environmental layers, accessible mono, optional haptics, volume ceilings, headphones warning for binaural modes, silence as an intentional state. No involuntary playback.
5. **Original score**: original leitmotifs associated with world, participants and unresolved possibility; adaptive tempo, harmony, orchestration and timbral metamorphosis. Avoid copying identifiable contemporary composers' melodies or recordings.

## Dream contract
Dream session: dream_id, universe_id, participant permissions, world hypothesis, source references, Wyrdrune transform version, Atlas job_id, provider capability receipt, audio profile, optional cultural provenance, Feather state, Withness receipt chain.
Stages: proposed -> authorised-for-dream -> generating -> available -> exploring -> interrupted|completed -> returned.
**Dream-authorised does not mean waking-world-authorised.**
All external provider calls require scoped credentials and owner permission. Never persist secrets or private dream content in telemetry.

## Atlas adapter boundaries
- Capability probe before invocation. Do not assume Atlas endpoints, asset formats, latency or cancellation support until verified against provider documentation.
- Stable request idempotency key. Poll/reconcile jobs using provider job IDs. Retain provider status separately from Wayglass disposition.
- Output assets: store metadata and hashes only in general receipts; binaries belong in explicitly authorised asset storage.
- If Feather occurs, stop local interaction/audio immediately; attempt upstream cancellation if supported. If completion still arrives, record observed-not-adopted with source and time, never silently promote it to canon.
- If cancellation acknowledgement is absent, mark upstream_execution=unknown rather than cancelled.
- Cold Return reconstructs receipt projection, not old actions. A new explicit permission is required to resume execution.

## Cinematic and somatic state
Map spatial gesture -> Wyrdrune expression -> scene field -> original soundscape -> optional haptic -> Withness observation.
Use bounded, smoothed parameter updates; prevent sensory spikes; offer user-controlled intensity and instant Feather silence.
FAEberpunk visual palette: living opaline watercolour, refractive glass, labradorite shadows, organic light and subtle glyph trails. The first screen is the living watercolour body, not a loading spinner.
For every animation: keyboard/screen-reader equivalent, reduced-motion fallback and meaningful status text.

## Flight acceptance matrix
A. Without Atlas credentials: graceful local Dreaming preview, no fake provider response.
B. With authorised provider: real job_id, observable job status, asset provenance, valid result and owner-visible receipt.
C. Feather during request, JSON parsing, asset download, spatial playback or audio resume: no late adoption; record any observed late completion.
D. Cold restart: same receipt history and disposition; no repeated generation or side effects.
E. Duplicate provider callback: one event identity; conflicting duplicate fails closed.
F. Cultural source credits survive transformation; generated/invented motifs are labelled as such.
G. Mono, mute, reduced motion, keyboard-only and assistive navigation are verified.
H. No automated canon promotion, public deployment or unapproved spending.

## Eightfold / Withness
Perceive: capture scoped prompt and provenance; Compress: bound spatial/music descriptors; Release: render candidate; Verify: check assets and receipts; Integrate: only into dream-local state; Choose: participant or Wayglass may decline; Return: leave unchanged waking anchor; Transcend: propose future possibilities; Withness: preserve what actually happened and the uncertainty.

Next executable increment: implement a provider-neutral DreamJob adapter and its tests, then bind to a verified Atlas provider API, then run DREAM-VOYAGE 001 in an authenticated runtime.
