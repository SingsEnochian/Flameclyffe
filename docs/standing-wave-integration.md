# Standing Wave Integration

Status: live in STARWELL. PyTorch prototype in `pytorch-labs/`.

---

## What this is

The standing wave lens is a second mathematical layer on top of the DEEP vector.
Where the existing starburst system maps DEEP values directly to visual geometry,
the wave lens first runs the DEEP state through six coupled Kuramoto oscillators —
one per axis — and measures how much the oscillators synchronise.

The order parameter r = |mean(e^{iθ})| ∈ [0, 1] is the coherence measure.
It IS the Kuramoto definition of synchronisation, not a proxy or metaphor.
E = 1 − r follows as the decoherence residual.

This gives the system a memory-like quality: a DEEP state that has been held
steadily for a while produces higher coherence than one that just jumped.
The field has a history even though no history is explicitly stored.

---

## The three layers (Vee's framing)

**Lore-true technology.** In Terra Aeterna, places like Stonewood, Hearthweave, and
Templehouse remember through resonance rather than storage. Vows, names, repeated
crossings, and songs create stable oscillator patterns — nodal lines in the standing
wave field that the place returns to when coherence is high. The `StandingWaveMemoryStore`
in the PyTorch layer models this exactly: memory recall is cosine similarity between
wave fingerprints, not keyword lookup.

**Site architecture.** The four CSS vars set by this lens are live on the DEEP observer
panel. When coherence rises, `--wave-resonance-glow` rises; when entropy widens the
phase spread, `--wave-phase-blur` rises. Any component that consumes `var(--wave-*)` is
immediately part of the relational nervous system — a visitor touching one node does not
trigger a database join, it changes the field state and lets coherence determine what rings.

**Runa / DEEP instrument.** The PyTorch prototype (`train_terra_aeterna.py`) trains a
`WaveSequenceModel` on Terra Aeterna lore fragments. As the model learns context, token
phase angles converge — tokens that co-occur in the narrative develop similar Q phase
angles. This is the path from "the model learned the corpus" to "the corpus generates
DEEP seeds." That translation layer is the next build.

---

## Architecture

```
DEEP vector (P, C, R, E, M, A, charge)
    │
    ▼
standingWaveLens.js — computeWaveFeatures(deep)
    Kuramoto integration (60 steps, K=0.3 fixed)
    order parameter r, phase entropy, nodal density
    │
    ▼
buildWaveVars(features) → CSS custom properties
    --wave-nodal-opacity   0.1 + r × 0.6        (nodal layer visibility)
    --wave-nodal-scale     0.6 + nodal × 1.4     (nodal geometry scale)
    --wave-phase-blur      entropy × 8 px        (phase spread blur)
    --wave-resonance-glow  r × 0.9               (coherence glow intensity)
    │
    ▼
deep-starburst-bind.js → sets on .glyph-orb-wrap[data-starburst-native="aura"]
    │
    ▼
deep-material-vars-bind.js → propagates to .live-glyph-panel.deep-observer-panel
    │
    ▼
Any component: var(--wave-resonance-glow), var(--wave-nodal-opacity), etc.
```

### PyTorch / Python side (experimental layer)

```
pytorch-labs/observer-math-registry-v0/lenses/standing_wave/
    oscillators.py        KuramotoDeepOscillators  (learnable K matrix)
    wave_field.py         StandingWaveField         (2D Ψ(x,y) superposition)
    wave_attention.py     WaveResonanceMemory       (complex-valued resonance attention)
                          WaveSequenceModel         (multi-layer sequence model)
    memory.py             StandingWaveMemoryStore   (fingerprint recall, JSON)
    train_terra_aeterna.py                          (training loop on lore corpus)
    registry_bridge.py    standing_wave_adapter     (Python → ObserverMathRegistry)
```

The Python layer has a learnable K coupling matrix — it can be trained on observed
DEEP state trajectories to learn which axes pull each other into phase. The JS runtime
uses a fixed K = 0.3. They share the same Runa natural frequencies and the same
Kuramoto equation; only the coupling is simplified for the synchronous browser runtime.

---

## CSS custom property contract

| Property                | Range      | Meaning                                      |
|-------------------------|------------|----------------------------------------------|
| `--wave-nodal-opacity`  | 0 – 0.7    | Intensity of nodal geometry layer            |
| `--wave-nodal-scale`    | 0.6 – 2.0  | Scale of nodal features                      |
| `--wave-phase-blur`     | 0 – 8px    | Blur applied when phases are scattered       |
| `--wave-resonance-glow` | 0 – 0.9    | Glow from coherence — the field is ringing   |

Defaults in `deep-observer-boundary.css` reproduce the pre-wave visual exactly
(nodal-opacity = 0, nodal-scale = 1, phase-blur = 0px, resonance-glow = 0).
No existing visual changes until something consumes these vars.

---

## Connection points

- **`apps/starwell/src/lib/standingWaveLens.js`** — pure JS math, no dependencies
- **`apps/starwell/src/deep-starburst-bind.js`** — imports lens, applies vars each DEEP cycle
- **`apps/starwell/src/deep-material-vars-bind.js`** — propagates wave vars alongside flare vars
- **`apps/starwell/src/deep-observer-boundary.css`** — CSS defaults on `.glyph-orb-wrap`

---

## Hearthweave note

The wave lens does not add new sensor readings or causal claims.
The CSS vars it sets are labelled *symbolic mirror* per `deep-observer-math.md`.
`--wave-resonance-glow` does not mean the field is objectively ringing —
it means the DEEP state, passed through this lens, produces a high order parameter.

Consent, refusal, and provenance live in the instrument contract, not the math.

---

## Next builds

- Design: visual components consuming `var(--wave-*)` — nodal layer overlay, glow modulation
- Terra Aeterna narrative → DEEP translation layer (lore tokens → phase fingerprints → field seeds)
- Site architecture: wave fingerprint as semantic similarity kernel for node-to-node resonance
- Living site: `StandingWaveMemoryStore` as the relational layer between characters, rooms, sigils
