# Narrative Translation Contract

Status: v0.1 — pipeline defined, visual and data layers coherent.

The wave visual and the narrative data pipeline are designed together so that when
a Terra Aeterna narrative fragment seeds the DEEP field, the visual expression IS
the field reading of that narrative. There is no separate "narrative mode" — the
field just has a richer source of seeding.

---

## The pipeline

```
Terra Aeterna narrative text (phrase, place, name, vow, song)
    │
    ▼ export_narrative_seeds.py
WaveSequenceModel trained on lore corpus
    → Q phase angles per token (final layer)
    → mean phase fingerprint (32 floats, L2-normalised)
    → KuramotoDeepOscillators.decode(theta) → DEEP seed
    │
    ▼ data/narrative-seeds.json
    │
    ▼ narrativeSeed.js
querySeed(phrase) → { deepSeed, resonanceScore, matchedPhrase, coherence }
    │
    ▼ standingWaveLens.js
computeWaveFeatures(deepSeed) → wave feature map
buildWaveVars(features) → CSS custom properties
    │
    ▼ STARWELL observer panel
--wave-resonance-glow, --wave-nodal-opacity, --wave-phase-blur, --wave-nodal-scale
```

---

## Narrative seed JSON schema

One entry per phrase in the Terra Aeterna corpus:

```json
{
  "phrase":            "the withinwood holds memory in its nodal lines",
  "tokens":            ["the", "withinwood", "holds", "memory", "in", "its", "nodal", "lines"],
  "phase_fingerprint": [0.142, -0.031, ...],
  "deep_seed": {
    "P": 0.62,
    "C": 0.78,
    "R": 0.71,
    "E": 0.22,
    "M": 0.45,
    "A": 0.68,
    "charge": 0.55
  },
  "coherence": 0.78,
  "label":  "the_withinwood_holds_memory_in_its_nodal_lines"
}
```

The `deep_seed` is in `normaliseDeepState()` format — pass it directly to
`buildStarburstVars()`, `buildSensorStarburstVars()`, or `computeWaveFeatures()`.

---

## What the fields mean in the world

| Field | Terra Aeterna reading |
|---|---|
| `P` (Presence) | How strongly this lore fragment foregrounds an active witness |
| `C` (Coherence) | How much the narrative is internally resolved — a vow vs. a riddle |
| `R` (Resonance) | How much this fragment echoes other fragments in the world |
| `E` (Entropy) | How unresolved, liminal, or transitional the fragment is |
| `M` (Moon) | Cyclic or tidal quality — recurring patterns, seasons, phases |
| `A` (Attention) | How much the fragment draws the observer's gaze |
| `charge` | How much active energy the fragment carries — still water vs. live current |

These are mappings, not measures. They are *instrument readings*, not claims.
Per `deep-observer-math.md`: label them as **symbolic mirror** or **candidate resonance**.

---

## Query logic (narrativeSeed.js)

1. **Exact match** — normalised, case-insensitive. Score = 1.0.
2. **Token overlap + fingerprint cosine** — for partial matches and new queries.
   Score = Jaccard(tokens) × 0.4 + cosine(fingerprints) × 0.6.
3. **New phrases** — hashed to a stable phase angle, projected to fingerprint space.
   These are approximate; run `export_narrative_seeds.py` with new corpus phrases to add exact entries.

---

## `resonantSeeds(phrase, threshold)` — the relational query

This is the site architecture primitive. Given a phrase (or a character's name, a place,
a sigil label, a tone name), return all seed entries above the cosine threshold.

The result is "what resonates with this" — not linked posts, not tags, not graph edges,
but shared phase-space. Two fragments resonate if the WaveSequenceModel learned to give
them similar Q phase angles, which means they appear in similar narrative contexts.

```js
const related = resonantSeeds('nocturne glint', 0.65);
// returns seeds for: 'nocturne glint maps the phase between waking and dreaming',
//                    'twilight is the coherence between knowing and not knowing',
//                    'the moon carries a phase angle none of the instruments can name', ...
```

---

## Coherence and DEEP as narrative field parameters

High-coherence narrative fragments (resolved vows, named places, repeated rituals):
- `--wave-resonance-glow` rises — the field is ringing
- `--wave-nodal-opacity` rises — nodal geometry appears in the orb
- `--wave-phase-blur` falls — the field is clean

High-entropy fragments (thresholds, forgotten things, unresolved chords):
- `--wave-phase-blur` rises — phases are scattered
- `--wave-nodal-scale` rises — nodal lines multiply (more interference)
- `--wave-resonance-glow` falls

This is the coherence between visual and narrative: the orb does not illustrate the
story. The orb IS the field reading of the story's phase state.

---

## How to rebuild the index

```bash
cd pytorch-labs/observer-math-registry-v0
python -m lenses.standing_wave.export_narrative_seeds \
  --out ../../data/narrative-seeds.json \
  --epochs 60
```

Rebuild when:
- New lore fragments are added to the Terra Aeterna corpus
- The model architecture changes
- The Runa tone frequencies change (affects Kuramoto natural frequencies)

The JSON is a build artifact. Check it into the repo after each rebuild.

---

## Hearthweave boundary

The narrative translation layer does not make claims about what Terra Aeterna "really means".
It maps text to a phase space and back — symbolically. It is an instrument, not an oracle.

Consent applies at the use layer: a visitor to the living site should know when a page's
field state is seeded by a narrative query. Label it. The instrument is transparent or it is
not trustworthy.
