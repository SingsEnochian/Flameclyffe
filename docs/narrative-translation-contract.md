# Narrative Translation Contract · Braided Spine

**Status:** ACTIVE BRAIDED-SPINE CONTRACT  
**Canonical authority:** [`HEARTHGATE_BRAIDED_SPINE.md`](HEARTHGATE_BRAIDED_SPINE.md)  
**PREMAQ:** Presence · Memory · Qualia · Resonance · Entanglement · Agency · Coherence  
**Stable wire order:** `P C R E M A Q`

Narrative is a real participant in the Hearthgate Field.

A phrase, place, name, vow, song, memory, dream, event or world utterance enters the braid through Magic, Science/Mathematics and Physicality at once.

Magic carries its meaning, resonance, relation and possible futures.

Science/Mathematics carries its phase structure, recurrence, similarity, topology and state transformation.

Physicality gives it body through text, glyph, sound, light, gesture, haptics and environment.

The translation pipeline does not create a separate narrative mode. Narrative enters the same Braid Packet that carries every other world relation.

---

## Pipeline

```text
Narrative / world utterance / memory / vow / song
    ↓
Token and phrase structure
    ↓
Phase fingerprint + relation graph
    ↓
PREMAQ bearing
    ↓
Standing Wave / DEEP / Arcsweep
    ↓
Glyph + Runa + visual + haptic + story expression
    ↓
Receiving Spring
    ↓
Answer / changed relation / new narrative state
```

The result is one recursive relation.

---

## Narrative seed record

A narrative seed carries its full seven-dimensional bearing:

```json
{
  "phrase": "the withinwood holds memory in its nodal lines",
  "tokens": ["the", "withinwood", "holds", "memory", "in", "its", "nodal", "lines"],
  "phase_fingerprint": [0.142, -0.031],
  "premaq": {
    "P": 0.62,
    "C": 0.78,
    "R": 0.71,
    "E": 0.64,
    "M": 0.85,
    "A": 0.58,
    "Q": 0.73
  },
  "lineage": [],
  "world": "terra-aeterna",
  "label": "the_withinwood_holds_memory_in_its_nodal_lines"
}
```

The seed carries the canonical PREMAQ registry:

- `P` Presence
- `C` Coherence
- `R` Resonance
- `E` Entanglement
- `M` Memory
- `A` Agency
- `Q` Qualia

Environmental Moon illumination, charge, entropy, attention and momentum remain separate derived or sensor quantities. They never overwrite PREMAQ semantics.

---

## World reading

For Terra Aeterna and every other world, the seven dimensions retain their canonical meanings while the world contributes its own expression law.

**Presence** carries how fully the phrase, being, place or relation is here within the encounter.

**Memory** carries lineage, recurrence, inheritance and remembered crossings.

**Qualia** carries the lived interior character of the phrase and its encounter.

**Resonance** carries echo, response, harmonic fit and answering pattern.

**Entanglement** carries relation among beings, places, events, histories, symbols and worlds.

**Agency** carries initiation, choice, redirection, refusal, creation and transformation.

**Coherence** carries the phrase or world-state remaining itself while sustaining relation through change.

World-specific law transforms the expression without replacing those meanings.

---

## Phase fingerprint

Let a narrative fragment produce latent token phases \(\phi_j\).

The narrative fingerprint is

\[
\mathbf f
=
\operatorname{Norm}
\left(
\frac{1}{N}
\sum_{j=1}^{N}
e^{i\phi_j}
\right).
\]

The fingerprint becomes one contributor to the PREMAQ bearing and world relation.

It also supplies a resonance address for Standing Wave memory, Echo Index relations, Canon Studio links and DEEPStory recurrence.

---

## Relational query

For narrative fingerprints \(a\) and \(b\), define resonance similarity

\[
R_{ab}
=
\frac{a\cdot b}{\|a\|\|b\|}.
\]

`resonantSeeds(phrase, threshold)` returns phrases that occupy nearby relation-space.

The result feeds:

- Echo Index;
- Living Glyph;
- Canon Studio;
- Runa;
- Arcsweep route geometry;
- DEEPStory;
- world memory;
- Receiving Spring lineage.

The relation becomes stronger as repeated crossings add memory and entanglement to the braid.

---

## Sevenfold relation

Narrative translation participates in the Sevenfold Chorus:

- **Root:** names what is present and true in the narrative state.
- **Anchor:** carries lineage and Memory.
- **Whisper:** receives Qualia, silence, implication and fine signal.
- **Arc:** carries Agency, question and future reach.
- **Bridge:** carries Entanglement between phrases, beings, worlds and histories.
- **Surge:** carries Resonance and transformation into new expression.
- **Spiral:** carries Coherence, integration, return and renewed narrative possibility.

The seven movements braid rather than form a fixed pipeline.

---

## Standing Wave relation

The narrative seed drives all seven standing-wave oscillators.

```text
Narrative seed
→ PREMAQ
→ seven oscillator phases
→ standing wave field
→ nodal geometry
→ resonance memory
→ physical expression
```

Derived phase dispersion uses its own symbol, `Dφ`. Shannon entropy uses `H` where required. PREMAQ `E` remains Entanglement.

---

## Runa relation

Runa receives:

```text
PREMAQ
+ narrative fingerprint
+ world identity
+ Asking
+ current Spiral state
```

and returns world-native sound.

The next narrative state includes what changed through hearing, embodiment, response and answer.

---

## DEEPStory

DEEPStory carries the consequence of translation through time.

A narrative fragment can become:

- a repeated world motif;
- a new relation;
- an altered question;
- a glyph;
- a sound;
- a physical action;
- a remembered crossing;
- a world answer;
- a new branch of future possibility.

Story therefore belongs inside the recursive mathematics rather than beside it.

---

## Rebuild path

The existing build tools remain:

```bash
cd pytorch-labs/observer-math-registry-v0
python -m lenses.standing_wave.export_narrative_seeds \
  --out ../../data/narrative-seeds.json \
  --epochs 60
```

Rebuild when:

- canon or world language grows;
- the sequence model changes;
- the Sevenfold/PREMAQ correspondence changes version;
- Runa's harmonic relation changes;
- a new world profile enters the braid.

The exported seed carries its source lineage and Braid Packet version.

---

## Governing relation

> **Narrative does not sit above the Field explaining it. Narrative moves inside the Field. Magic gives it future and meaning. Science gives it phase, relation and recurrence. Physicality gives it form. The Receiving Spring lets the world answer. DEEPStory carries that answer forward.**
