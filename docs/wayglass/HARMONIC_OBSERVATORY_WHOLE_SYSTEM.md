# Harmonic Observatory | Wayglass whole-system design and verification

**Status:** implemented local ArcSweep audio laboratory on PR #474; not a deployed Wayglass host or calibrated Osia profile.
**Authority:** Hearthgate Braided Spine v1.8 governs, with `docs/observer/OBSERVER_AUDIO_MATHEMATICS.md` and `docs/mathematics/MULTIVERSAL_OPERATIONAL_TRUTH_CONTRACT.md` as companion contracts.
**Source:** Thought Vibration AI v2 (2026-10-16) with independently verified offline reference and Atlas-inspired acoustic telemetry review. v2's *quantum-model.mjs* remains a separate optional quantum proving-chamber module, not a source of acoustic quantum effects.
**Design law:** `apps/arcsweep/contracts/WHOLE_SYSTEM_DESIGN_LAW_V0.1.md`. The instrument is specified end-to-end before decomposing; its coherent subsystem boundary is `apps/arcsweep/src/harmonic-observatory/`.

## Purpose and whole-system boundary

A local-first Mythiences acoustic laboratory in which distinct voices can be designed, auditioned, visualised, translated to mono and rendered into a replayable PCM specimen with receipts. The work should help investigate phase, harmonic interaction, perceptual differences, and independent/collective voice composition. It must not launder sensory or narrative interpretation into objective measurement, overwrite Hearthgate laws, or silently access third-party streams.

### Actor journeys

1. **Compose:** user selects layered-voices, stereo-difference or mono-AM, calibrates bounded recipe, edits each voice's semitone, gain, pan and overtone count; session validated before execution.
2. **Audition:** direct user gesture opens/resumes Web Audio; constrained sources use independent gains and explicit panning, or LFO/gain modulation for mono-AM; direct Feather Stop disconnects and mutes all sources.
3. **Observe:** pure local renderer synthesises quantised PCM, computes sample peak, RMS, DC, stereo correlation and mid-window Hann-FFT spectral entropy; worker handles CPU work without freezing controls.
4. **Export:** user separately downloads WAV, JSON receipt, and JSON recipe; hash receipt binds source recipe to rendered WAV; unknown metrics remain null.
5. **Leave/return:** stop-point, next-owner and unresolved Wonder questions travel with exported session and receipt. No private memory, world canon or cloud state changed automatically. User can import validated exported session to return.

### Ownership and interfaces

| Layer | Owner/module | Contract | Effect |
|---|---|---|---|
| Hearthgate kernel | Braided Spine v1.8 | `math_spine: hearthgate.math-spine/v1.8` | Governing source; not rewritten |
| Runa, composition | `core.js` | `wayglass.harmonic-observatory.session/v1` | 3 distinct voice stem definitions, mythic 3·6·9 phase |
| Wardenclyffe, cue compile | `core.js/compileArrangement` | `wayglass.harmonic-observatory.arrangement/v1` | Strict oscillator/pan/modulation/channel manifest |
| Möbius offline | `renderer.js` | PCM16 WAV @ 48000 Hz | Deterministic output and SHA-256 hashes |
| Möbius live | `live-engine.js` | Browser AudioContext, explicit audition | Browser's default output, Feather stop; no persistent device effects |
| Galdr Observatory | `fft.js` + `cinematic-audio-metrics.js` | measured FFT, peak, RMS, DC, correlation | Device-independent analysis of actual offline PCM |
| Worker isolation | `render-worker.js` | request id + structured clone | Moves bounded render to worker, returns bytes + waveform + receipt |
| UI shell | `harmonic-observatory/index.html`, `ui.js`, `ui.css` | Accessible local lab, no cross-origin transport | Controls, status, draw, file export and import |
| KGN + Return marker | `renderer.js` receipt | `wayglass.harmonic-observatory.receipt/v1` | Fingerprints and continuity, not immutable server persistence |
| Host/crew identity | Future Wayglass adapter | Authenticated host commit + review | **NOT IMPLEMENTED**; current receipt is local and unsigned |

Signal/control path:

```
Authored recipe → validateSession → compileArrangement
           ├── audition → AudioContext / independent stems / mono AM → browser device → Feather
           └── Worker → deterministic PCM → WAV / spectrum / measurements
                                         → SHA-256 receipt → explicit downloads
Continuity metadata ────────────────────────────────────────┘
```

## Domain and mathematics

- In the governing PREMAQC braid, `E` is **not** quantum entanglement, nor is sound frequency a measurement of consciousness. All symbolic world, phase and interpretation fields are authorial, labelled `SYMBOLIC`.
- Real signals are ordinary acoustic wave mathematics. In `stereo-difference`, two separate-ear carriers use `root_hz` and `root_hz + difference_hz`; binaural interpretation applies only with distinct stereo channels and relevant playback. In a mono reference render both carriers physically mix and no binaural claim is made.
- In `mono-am`, one carrier is multiplied by `(1+d sin(2πft))/(1+d)`. This creates actual amplitude modulation in the waveform, distinct from separate-ear difference presentation.
- Stereo panning is equal-power; mono output is a one-channel signal, not a stereo fake. Fades are deterministic. Overtone partial strengths decay by powers of two and are normalised per stem.
- Bounds: 48 kHz processing, 35–1400 Hz root, 0.1–20 Hz difference/modulation, max 30 s session, 0.35 master gain, per-stem max 0.5, sum-gain limit 0.35. This is a conservative reference headroom budget, *not* certified hearing aid gain, medical treatment, true-peak limiting or LUFS compliance.
- FFT uses 2048 mid-frame samples, Hann window and a radix-2 transform. Spectral entropy uses normalised linear-power probabilities, not mean magnitudes. Dominant FFT-bin frequency is not necessarily pitch or fundamental.
- Osia preview means a mono reference **file** compatible with evaluating playback through a separate supported device route; there is no proprietary processor control, calibration or guarantee of bass response.

## Authority, security and persistence

- No API keys, database, authorised world-tone publishing, network requests, OAuth claims, browser mic capture, Spotify capture, or third-party recording.
- User-click audition only, no on-load playback. Feather stop disarms existing oscillators, mutes gain immediately and disconnects nodes; page leave closes context. Browser Web Audio's dynamics compressor is a rehearsal dynamics guard, **not** a mastering limiter.
- User-click exports only; user-select imports only; validation rejects out-of-range values. Receipts are unsigned local evidence, not verified external observations or production-tone approvals.
- `OBSERVATION-TRUE` means only the generated PCM and its measured properties within that local run. *No* loudness, true-peak, psychoacoustic roughness, therapy, consciousness or physical quantum effects asserted.
- The applet is registered in ArcSweep's sound-organ catalogue and built as a distinct Vite HTML entry, not a competing sound bus. An eventual Wayglass host adapter must bind authenticated owner/crew identity, receipt persistence, revocation, stop/next-owner, and deterministic return replay before promotion to deployed continuity.

## Tests and acceptance

`node --test apps/arcsweep/test/harmonic-observatory.test.js` tests stems, stereo separation, mono lowering, actual modulation, WAV headers, reproducibility, waveform change fingerprint, continuity, invalid input rejection, FFT behaviour, no automatic audio-context opening, and Feather cleanup. Existing `cinematic-audio-metrics.test.js` remains complementary.

**Local proof:** Node v22 unit/functional tests run in a separate checkout-like workspace with an exact local copy of the existing `cinematic-audio-metrics.js` exports. This is not a successful ArcSweep Vite build claim or browser/hardware listening signoff. **Pending:** Vite build, Chrome/Firefox and mobile layout, runtime CSP, worker build output, Windows/Osia listening, LUFS/true-peak metering, device-specific calibration, host authentication and durable Return Engine integration.

## Migrations and future scope

Existing Möbius bus remains as-is. This laboratory is an explicit sound instrument that can later invoke/reuse the canonical bus only through a versioned adapter once its stereo/mono graph equivalence is tested. The standalone Thought Vibration AI v2 package retains quantum simulation independent of audio. Future cinematic mastering adds calibrated listening/reference profiles, loudness targets, HRTF/IR and stems with no reinterpretation of current receipt schema; require version bump for any changed definition. The Wayglass math registry remains central authority navigation, not an audio data store.

## SF2 instrument-rack extension · 2026-10-17

**State:** implemented local runtime adapter on PR #474, pending a real-bank/browser soundcheck; bank files themselves are not distributed or stored in the repository. The user selects local SF2/SF3/SFOGG/DLS files explicitly.

### Authority, modules and ownership

- **Bank I/O and SoundFont synthesis:** `apps/arcsweep/src/story-soundscape.js`, and its existing bundled-worklet repair, `apps/arcsweep/src/soundfont-runtime-repair.js`. SpessaSynth owns sound-bank decoding, sample playback and MIDI voices. The Observatory does *not* implement a second SoundFont synthesizer.
- **SF2 experiment contract:** `apps/arcsweep/src/harmonic-observatory/soundfont-contract.js` validates file type and bounded size, maps the three independently authored voice stems to MIDI programmes, notes, pan, expression and velocity, and produces a distinct local SF2 take receipt. Nearest MIDI semitone is explicitly stated; detune is not falsely reported as continuous pitch bend.
- **SoundFont adapter:** `apps/arcsweep/src/harmonic-observatory/soundfont-rack.js` loads the existing StorySoundscape lazily only after the user selects a bank, chooses one bank at a time to avoid silent identity collisions at identical MIDI bank/programme numbers, supplies bounded mixer gains, routes three voices to separate MIDI channels, times note-offs, and performs Feather teardown. Files are held as File objects only for the current browser session and never automatically uploaded.
- **Wayglass glass UI:** `apps/arcsweep/harmonic-observatory/index.html`, `ui.js`, `ui.css`. The rack is another sound organ within the Observatory layout, not a competing app. Preset names are inserted via text nodes, never raw HTML. The existing live oscillator engine remains available on a separate audition path.
- **Transport:** independent browser-default-output AudioContexts for ArcSweep sample instruments and the Observatory reference tone engine. `Blend` schedules both after explicit user action; `Feather all` stops both. These are bounded local reference transports, not an Osia 3 firmware API, browser microphone capture, or a Spotify stream interceptor.

### Historical bank catalogue, without claiming mounted samples

A previous manual catalogue counted: `VocalsPapel.sf2` (4 presets), `Ancient Instruments Of The World.sf2.sf2` (24), `lord of the rings snes.sf2` (28), `Dystopian Terra.sf2` (11), and `Bradbury.sf2` (12). These counts are *historical reference labels*, not a claim that current bank files have been located or parsed. The UI obtains current presets only from the bank actually selected and decoded by SpessaSynth. Source/licensing metadata must travel with each user-owned SF2; the application does not redistribute banks.

### Accepted performance and provenance receipt

The SF2 take receipt binds the exact bank filename, byte length and SHA-256 to three MIDI channel assignments, bank/programme numbers, velocity, expression, pan, MIDI note, chosen profile, duration and the current Continuity return marker. It does **not** contain sample PCM, prove device audibility, make calibrated loudness claims or masquerade as an offline oscillator WAV receipt. A loaded bank must pass the existing SoundBankLoader parsing before it may be auditioned. Restart requires reselecting the local file, since file bytes and browser permissions are not persisted.

### Required end-to-end acceptance

1. On the development branch, launch `npm run arcsweep:dev` and navigate to `http://127.0.0.1:5184/harmonic-observatory/`.
2. Click **Select local SoundFont files**, choose an actual bank, **Load chosen bank**, then verify its parsed presets and SHA-256 status.
3. Assign separate presets to voices A, B and C. Audition: verify distinct sampled timbres and per-voice channel/programme routing on the selected Windows output. Then select **Blend SF2 + harmonics** and confirm both sources play only on a user gesture.
4. During a held chord, click **Feather all**, then verify prompt silence and no delayed replay. Switch to another bank with a conflicting bank/programme number; the previous synth must have been closed.
5. Render the oscillator WAV separately and inspect its receipt. Download the SF2 take JSON and verify it says it is a MIDI performance without captured PCM, using a checked filename, size and SHA-256.
6. Verify keyboard access, mobile sizing, Chromium/Edge and real Osia 3 routing. Device-specific output, browser worklet stability, and listening results are *not yet witnessed*.

### Verification

Local `node --test apps/arcsweep/test/harmonic-observatory*.test.js` exercises the whole Observatory and SF2 adapter/contract using synthetic soundscape doubles. It does not count as a test with the actual user-owned five SF2 files. The CI production Vite build is required to confirm that dynamic imports of the existing SpessaSynth code and bundled AudioWorklet remain valid. Do not merge before those gates and the required owner-controlled listening signoff.