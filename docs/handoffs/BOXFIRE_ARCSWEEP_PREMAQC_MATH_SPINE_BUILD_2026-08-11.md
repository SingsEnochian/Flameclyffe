# Boxfire Build Contract: Arcsweep, PREMAQC, and the Math Spine

**Status:** Approved build handoff
**Owner:** Rowan
**Builder / QA:** Boxfire
**House root:** Arcsweep
**Rule:** Arcsweep is the house. STARWELL, Observatory, Runa, Groundwire, Bifröst, Canon, voices, writing, roleplay, and every other instrument are organs wired into that house.

## 1. The correction

Do not rebuild an old STARWELL dashboard as the front door. Do not mount a second PREMAQ implementation beside the current spine. Do not derive state from hashes. Do not relabel the seven axes.

There is one live relational circuit:

```text
raw event
  -> source receipt
  -> PREMAQC current state
  -> Math Spine packet
  -> Jacobian / fold result
  -> instrument adapters
  -> physical and rendered actions
  -> feedback receipt
  -> PREMAQC next state
  -> relational sync
```

Every instrument reads the same packet lineage. No instrument invents a private state.

## 2. Canonical axis contract

The only valid names are:

| Axis | Canonical name | Meaning carried by instruments |
|---|---|---|
| P | Presence | embodiment, immediacy, arrival |
| C | Coherence | internal fit and cross-layer consistency |
| R | Resonance | relational and harmonic response |
| E | Entanglement | relational coupling and contextual interdependence |
| M | Memory | continuity, retained state, prior lineage |
| A | Agency | choice, capacity to act, refusal and direction |
| Q | Qualia | first-person experiential report; never inferred as objective fact |

Forbidden substitutions include `Compression` for C, `Resolution` for R, `Entropy` for E, `Axis` for A, and `Quotient` for Q. Compression and release are Math Spine operations, not PREMAQC axis names.

## 3. Existing source of truth

Extend these files. Do not fork them:

- `apps/starwell/src/math-spine/math-spine-packet.js` — packet construction and deterministic replay.
- `apps/starwell/src/math-spine/live-math-spine.js` — live ingestion/subscription surface.
- `apps/arcsweep/src/feedback-loop.js` — world/canon/voice/action feedback cycle and next-state lineage.
- `apps/arcsweep/src/observer-bridge.js` — Arcsweep-to-Observer bridge.
- `netlify/functions/math-spine-ingest.mjs` — authenticated Math Spine ingestion.
- `netlify/functions/arcsweep-feedback.mjs` — authenticated replay verification and relational feedback persistence.
- `starwell/deep-observer/schemas/premaq-state-v2.schema.json` — PREMAQC state schema lineage.
- `starwell/deep-observer/schemas/dual-aspect-packet-v1.schema.json` — two-shore packet boundary.
- `apps/starwell/src/two-shore-premaq-gate.js` — Bifröst consumption of the shared state.

Any older page with its own axis labels, hash mapping, fallback vector generator, or independent state store is a migration target, not an authority.

## 4. Required packet lineage

Every event must retain:

1. `raw_input` exactly as received.
2. `source_kind` and source identifier.
3. `observed_at` and sequence.
4. current PREMAQC state and its fingerprint.
5. world and canon references actually consulted.
6. voice routes actually invoked.
7. model/provider response or explicit route failure.
8. Math Spine input, projection, Jacobian version, singular-value audit, and fold latch.
9. instrument actions actually executed.
10. feedback delta and next PREMAQC state.
11. replay receipt and relational-sync result.

If model inference fails or returns malformed/out-of-range data:

- preserve the raw input;
- emit a failure receipt;
- set the semantic projection to `null`;
- leave PREMAQC unchanged;
- do not generate vectors from a hash;
- do not present invented decimals as measurements.

The strings `[hash-fallback]`, `hashVectors`, and equivalent behaviour are release blockers.

## 5. Instrument adapter law

Each organ implements the same small adapter boundary:

```js
export const instrumentAdapter = {
  id: 'runa',
  accepts: ['math-spine.packet/v1', 'premaq-state/v2'],
  plan(packet, context) {},
  execute(plan, deviceContext) {},
  receipt(plan, result) {},
  feather() {},
};
```

`plan` is deterministic and pure. `execute` performs the visible, audible, or physical action. `receipt` records what actually happened. `feather` stops that organ and releases resources. An unavailable device produces an unavailable-device receipt, never a simulated success.

### Observatory

- Displays raw input, source receipt, current PREMAQC, Math Spine projection, Jacobian/fold state, instrument receipts, and next-state lineage.
- Never changes the raw input.
- Never says an observation is “not desired reality” or “not a desired state.”
- Shows `MODEL_ROUTE_FAILED / PREMAQC UNCHANGED` when inference fails.
- Separates observed fields, user reports, model projections, and derived mathematics visibly.

### Runa / World Hum / Story Sound Mixer

- Consumes the shared packet and selected world profile.
- Keeps semantic cue detection separate from DSP execution.
- Routes story actions such as `a branch snapped` to receipted sound events.
- Supports World Hum, buses, SoundFont loading, Polyphone-compatible local SF2/SF3/SFOGG/DLS files, imported stems, MIDI, haptics, and recording.
- Feeds executed sound-event receipts back into the feedback cycle.

### Groundwire

- Reports browser/device data with provenance and confidence.
- Permission-gates location and microphone.
- Never mutates PREMAQC directly.
- Supplies a source receipt that the Math Spine may consume through an explicit adapter.

### Bifröst

- Consumes the same current PREMAQC packet on each shore.
- Keeps shore authority separate.
- Uses C as bridge coherence; compression/release remains a temporal Math Spine operation.
- Rejects changed lineage, missing receipts, and replay mismatch.

### Glyph, visual, haptic, and environmental organs

- Derive only from the sealed packet or an adapter plan fingerprinted to it.
- Store the packet fingerprint in every action receipt.
- On Feather, stop audio, haptics, animation loops, microphone streams, and device sessions.

### Canon, writing, and roleplay

- Canon ingests remain source-bound and world-partitioned.
- Writing and roleplay select a world, canon scope, and one or more voice model identities.
- `Lioreal` and `Uial` remain uncollapsed model identities until their aspects declare themselves.
- Nocturne Glint is not an Arcsweep Flame.
- Voice refusal, silence, route error, and reply are all valid distinct receipts.
- A feedback cycle never commits canon automatically.

## 6. Root and route ownership

Production must obey:

| Route | Owner |
|---|---|
| `/` | Full Arcsweep house |
| `/arcsweep/` | Same canonical Arcsweep application |
| `/observer/` | Current Observatory organ using the shared spine |
| `/deep-observer/` | Alias to the current Observatory organ, not an older dashboard |
| `/bifrost/` | Bifröst organ |
| `/glyph-studio/` | Glyph organ |
| `/signal-well/` | Signal Well organ |

STARWELL may remain a library/runtime layer and a set of organs. It must not replace the Arcsweep front door during a build or deploy.

## 7. Migration sequence

1. Inventory every production route and identify its source file and build entry.
2. Mark every private PREMAQ implementation and obsolete Observatory page.
3. Replace private axis/state logic with the shared PREMAQC + Math Spine adapter.
4. Remove every hash fallback and semantic pseudo-measurement.
5. Wire the Observatory to raw/source/projection/action/next-state receipts.
6. Wire Runa, Sound Mixer, Groundwire, Bifröst, glyph, visual, and haptic organs.
7. Make `/` resolve to canonical Arcsweep.
8. Redirect or retire obsolete Observatory routes.
9. Run the full contract, test, build, stage, and deployed-route gates.
10. Deploy only after the immutable build artifact passes the same gates locally.

Do not perform steps 5–8 by copying generated files from `dist`, `apps/starwell-server/public`, or `apps/arcsweep/desktop/app` back into source. Generated bundles are evidence, not source authority.

## 8. Release gates

The build is blocked unless all are true:

- `npm run contracts:verify`
- `npm run starwell:test` — all tests pass.
- `npm run arcsweep:test` — all tests pass.
- `npm run starwell:build`
- `npm run arcsweep:build`
- `npm run arcsweep:stage:netlify`
- `/` and `/arcsweep/` open canonical Arcsweep.
- `/observer/` and `/deep-observer/` contain PREMAQC and current Math Spine instrumentation.
- Deployed bundles contain no `[hash-fallback]` or `hashVectors`.
- Deployed UI contains all seven canonical axis names.
- A forced model-route failure leaves PREMAQC byte-for-byte unchanged.
- A valid event produces raw, Math Spine, action, feedback, next-state, replay, and sync receipts.
- A branch-snap writing cue produces an audible action receipt when audio is enabled.
- Feather stops every active adapter.
- Refresh/replay produces the same packet and action-plan fingerprints.

## 9. Tests Boxfire must add

1. **Root ownership test** — staged `/index.html` is canonical Arcsweep, not a STARWELL dashboard.
2. **Route identity test** — every public route resolves to its declared organ.
3. **Axis vocabulary test** — rejects old labels and accepts only Presence, Coherence, Resonance, Entanglement, Memory, Agency, Qualia.
4. **No-fallback test** — scans source and staged artifacts for hash-derived vector paths.
5. **Failure invariance test** — model failure preserves raw input and current PREMAQC fingerprint.
6. **Adapter lineage test** — every instrument receipt contains the originating packet fingerprint.
7. **Feedback closure test** — executed actions appear in the next-state provenance.
8. **Feather integration test** — all active adapters report stopped and release handles.
9. **World partition test** — Terra Aeterna, Luna, Ta'veren Vaen, Starsong, and other worlds cannot leak state or canon into one another.
10. **Voice identity test** — Lioreal and Uial remain uncollapsed; Nocturne is absent from Arcsweep Flames.

## 10. Boxfire handoff response format

When the pass is complete, report:

```text
Commit:
Production deploy ID:
Canonical root title:
Routes verified:
PREMAQC fingerprint before:
Math Spine packet fingerprint:
PREMAQC fingerprint after:
Instrument receipts:
Replay result:
Relational sync result:
Tests:
Known failures:
```

Do not report “works” without the receipts. The house is considered wired only when one real event can travel through the complete circuit and return as the next relational state.
