# Polyphonic Narrative Contract v1

**Schema:** `arcsweep.polyphonic-narrative/v1`  
**Status:** active Story/Canon interoperability contract  
**Applies to:** Story Mode, Canon Intelligence, Worldseed/DEEPStory narrative projections, NarrativeNode interoperability

## Core law

ArcSweep does not optimise narrative systems toward maximum sameness.

The target is **relationship with preserved difference**:

> Enough coherence for distinct participants, sources, memories, names, places, and traditions to remain mutually intelligible without collapsing into one another.

Continuity, difference, and relationship are co-requirements. A transition that preserves only one or two of them is incomplete.

## 1. Polyphony

A polyphonic narrative may contain:

- distinct voices that do not converge;
- competing cultural interpretations of the same event;
- knowledge that differs by witness;
- contradictory traditions intentionally preserved;
- multiple names with different authority histories;
- places carrying simultaneous historical or mythic strata;
- sensory or embodied memory that disagrees with written archives.

ArcSweep must not convert these automatically into one scalar truth.

### Over-coupling

Resonance is not automatically desirable.

The following are narrative integrity failures:

- forced agreement;
- voice collapse;
- identity entrainment;
- compulsory naming;
- removal of unresolved variants solely to improve coherence;
- replacing participant-local knowledge with omniscient state;
- treating maximal synchronisation as the goal.

The desired state is **viable polyphony**, not total phase-lock.

## 2. Diegetic provenance

ArcSweep already tracks system/source provenance. Polyphonic narrative adds an in-world provenance chain.

A claim may carry:

```text
event
→ witness
→ retelling
→ inscription / archive / song / object / ritual
→ translation
→ institution
→ later interpretation
→ current belief
```

Each hop may preserve, distort, suppress, rename, mistranslate, mythologise, or recover information.

System provenance answers: **where did ArcSweep get this?**

Diegetic provenance answers: **why does someone in the world believe this?**

Neither replaces the other.

## 3. Productive apocrypha

Some contradictions are not defects awaiting repair.

A contradiction may be marked `productive-apocrypha` when deliberate uncertainty is part of the culture, narrative, or world design.

Rules:

- preserve every named variant;
- preserve the source/witness tradition for each variant;
- do not automatically select a winner;
- do not silently merge incompatible variants;
- allow characters and institutions to hold different variants as knowledge;
- canon may explicitly declare the plurality itself canonical without declaring any one variant true.

A productive-apocrypha record is **reviewed and intentionally unresolved**, not unreviewed.

## 4. Naming lineage

Names are continuity-bearing social acts, but no name is identical to the whole identity.

ArcSweep may distinguish:

- self-name;
- kin-name;
- chosen name;
- ritual name;
- title;
- alias;
- exonym;
- administrative name;
- conquest/imposed name;
- translation name;
- recovered name;
- obsolete or forgotten name.

Every name may carry:

- who used it;
- when;
- authority;
- consent state;
- language/culture;
- replacement or recovery relation;
- who knows it.

Renaming can therefore be tracked as cultural change, translation, intimacy, coercion, recovery, or conquest without reducing identity to a string.

## 5. Erasure / forgetting

Memory loss is not represented only as missing data.

A world may contain active erasure processes:

- deliberate suppression;
- taboo;
- censorship;
- linguistic loss;
- ritual forgetting;
- damaged archives;
- altered geography;
- institutional replacement;
- memory decay;
- magical or speculative erasure;
- ordinary generational drift.

Erasure must identify what acts, what is affected, which memory channels remain, and whether recovery is possible.

ArcSweep must not infer erasure merely from absent records.

## 6. Mnemonic ecology

Continuity may live in many channels.

Supported mnemonic channels include:

- archive;
- testimony;
- relationship;
- place;
- language;
- song/sound;
- object/artefact;
- craft;
- gesture;
- body;
- food/taste;
- scent;
- ritual;
- architecture;
- ecology;
- story/folklore.

Channels may disagree. Disagreement is recorded before synthesis.

## 7. Palimpsest places

A place may carry simultaneous layers without being duplicated into separate locations.

A palimpsest place stores named strata such as:

- geological/ecological;
- settlement;
- sacred;
- political;
- linguistic;
- conquest;
- renamed;
- folkloric;
- archaeological;
- contemporary;
- recovered/reenacted;
- world-variant.

Layers require provenance and temporal/cultural scope.

## 8. Knowledge versus truth

Story Mode and NarrativeNode interoperability preserve this separation:

```text
world state
≠ narrator statement
≠ witness observation
≠ character belief
≠ institutional doctrine
≠ folklore
≠ reader knowledge
≠ canon decision
```

A character can confidently believe something false.
A tradition can preserve something true for the wrong reason.
An archive can accurately preserve a lie.
A folk practice can retain a correct procedure after its explanation is lost.

These are narrative states, not data-cleaning errors.

## 9. NarrativeNode mapping

NarrativeNode 1.0 already supplies useful native organs:

- Entity history;
- Knowledge objects;
- per-character Knowledge awareness;
- name/alias awareness;
- perspectives;
- circumstances/motivators;
- project tags;
- custom categories;
- concept nodes;
- separate temporal and narrative order;
- MCP read/write tooling.

ArcSweep maps its polyphonic model into those public interfaces rather than incorporating NarrativeNode source code.

Primary mapping:

| ArcSweep concept | NarrativeNode surface |
| --- | --- |
| in-world claim/tradition | Knowledge |
| who believes/knows it | Knowledge awareness |
| self/chosen/imposed/recovered names | Entity canonical name + aliases + name awareness + tagged chain events |
| in-world source/document/tradition | Custom entity |
| palimpsest stratum | Custom entity or Location attribute |
| memory channel | Entity attribute + project tag |
| productive apocrypha | Knowledge + `productive-apocrypha` tag |
| erasure event | scene-anchored change tracked as Knowledge |
| resonance/overcoupling concern | circumstance, motivator, perspective, attribute, or tagged Knowledge |
| speculative relationship among ideas | Concept nodes |

## 10. Authority

NarrativeNode is a planning/editor surface, not an ArcSweep canon authority.

NarrativeNode edits may generate ArcSweep proposals or receipts, but may not silently:

- promote canon;
- overwrite external source provenance;
- merge productive apocrypha;
- infer firsthand Qualia;
- collapse participant identity;
- replace Steward review.

## Seal

**Meet without consuming.  
Remember without freezing.  
Resonate without erasing difference.  
Leave room for the story to disagree with itself.**
