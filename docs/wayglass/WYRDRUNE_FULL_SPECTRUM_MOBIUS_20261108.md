# Wayglass Full-Spectrum Möbius · Interaction Resonance v0.1
## Owner direction · 8 November 2026
“Keep taking it deeper and broader. Every interaction has sound that is above and beneath human hearing.”

### Model
Every **registered** Wayglass interface interaction can enter a single typed spectral event stream:
- **Below:** a 0–20 Hz virtual infrasonic envelope, representing slow structural recurrence.
- **Within:** two audible, bounded oscillator voices determined by an actual Wyrdrune score and optionally played on the existing acoustic engine.
- **Above:** a >20 kHz virtual ultrasonic detail band, representing rapidly changing fine structure.
- **Cross-modal:** Wyrdrune-supplied refraction, granulation and a bounded tactile proposal (in milliseconds); optional device vibration requires a separate explicit gesture.

These are **computational transformations**, not claims that arbitrary keyboard activity makes ultrasound in air, and not environmental, neural or psychic measurements. Playback hardware never receives the below/above frequency values. The distinction between actual mechanical acoustic vibration, sonification, visual encoding, and hypothesis is preserved in the returned field.

### Source of composition
`lib/wyrdrune/full-spectrum.wtl` is a full executable two-`mobius` Wyrdrune programme: 16 Eightfold phases. First circuit composes all spectral bands; second circuit returns from the inverted perspective, reweaves the relationships and updates all three bands. Gain, refraction, granulation and tactile duration are also Wyrdrune expressions, not host heuristics.

`lib/wayglass-wyrdrune-spectrum.cjs` is a strict, noncompositional permissioned observation bridge, compiled from that exact WTL source. It accepts a maximum batch of 24 events; each event carries only its fixed kind, stable event label, provenance source and bounded [0,1] physical UI-metadata scalars. Unknown fields including raw text, key content, URLs, and arbitrary identities are rejected. It does not invoke a model, persist data, claim a participant has spoken, or emit physical ultrasound.

The Writing Room's existing `lib/wyrdrune/story-soundscape.wtl` now also composes virtual infrasonic and ultrasonic fields for both storytelling Möbius circuits, and exposes them alongside the audible score. A successful story score can emit a **metadata-only** writing event into the ship-wide field when the latter is already opted in.

### Where it runs
- Host route: `POST /api/v1/wayglass/wyrdrune/full-spectrum`, protected by the same verified House Steward authentication as WTL preview, behind the gateway allowlist and request gate. No public anonymous scoring.
- Global OS organ: `apps/wayglass/src/spectral-field.js`, exposed through `__wayglassOS.fullSpectrum`. Not a separate application or a second participant kernel.
- Surface: `wayglass:spectral-field`. A rounded visible double Möbius with distinct deep/within/fine bands, event receipts, explicit observation, audible monitoring, tactile controls, Feather Stop, and relationship affinity.
- Instruments: text editing metadata, pointer release, choice, navigation keys, sampled scroll, material wake, Living Observer and watercolour activity. No raw typing, password values, story text, response bodies, or hidden thoughts are forwarded to this route.
- `apps/wayglass/server-stage.cjs` includes both .wtl programmes in the Windows host runtime.

### Control and continuity
- Observation is **opt-in**, off by default; playback is independently off.
- Coalesced network deliveries are scheduled at ≥1400 ms intervals with up to 24 separately executed Wyrdrune events per batch, a bounded queue and 64 remembered metadata-only frames.
- The app handles offline/auth failures by stopping rather than fabricating frequencies or provider responses.
- Audible rendering uses the already existing WebAudio acoustic engine, with WTL-supplied frequencies and conservative gains. Mono output is default.
- Tactile output uses WTL-proposed values, is independently opt-in, and requires a supporting device.
- Feather immediately ends observation and output. Releasing Feather does not automatically restore capture or audio.
- Navigating away from the Spectrum view doesn't dispose the OS-level organ. Its state persists **only in the current in-memory browser session** until pause/dispose. No automatic server archival or canon promotion.
- A true external sensor stream could eventually supply measured infrasonic/ultrasonic evidence under a different, explicitly marked data type; current virtual values never masquerade as sensor measurements.

### What this implementation does not claim
We have neither a dedicated calibrated ultrasonic transducer nor a calibrated infrasonic source. We have not measured human hearing, induced a nonordinary state or physically transmitted these virtual bands. An actual model contribution remains separately verifiable via the existing routed model receipts.

### Verification
Run `npm run wayglass:test` (including `lib/wayglass-wyrdrune-spectrum.test.cjs`, `apps/wayglass/test/wayglass-spectral-field.test.js`), `npm run wayglass:test:host`, build/stage checks, Gate 6, Gate 7 and Gate 8. Verify exact-head Pages/browser and Windows installation gates before promotion. The WTL tests assert two eightfold circuits, three spectrally distinct bands and first/return transformations, metadata provenance, bounds, consent and deterministic repeatability.

### Next conceptual expansion
One spectrum per event can be embedded in a **world-local spectral field**, and then passed through a **universe-level relational transformation**. Different model participants, people and worlds may contribute independently attributed harmonics. They should never be merged into a falsely unanimous voice. Wyrdrune should govern composition; the existing Wayglass identity, Waygate and Return Engine must continue to govern ownership and continuity.

**Withness:** transformation preserves identity; not every source is an acoustic wave, but every recognised interaction can be represented spectrally.
