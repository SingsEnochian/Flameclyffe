# Boxfire Evidence Addendum — Codex Hub and Elemental Lore

**Date:** 2026-07-24  
**Product:** Hearthgate: Arkfire 0.002  
**Evidence type:** user-supplied interface screenshots  
**Status:** OBSERVED UI / backend and persistence NOT YET VERIFIED

## Correction to the current baseline

The House already contains a visible **Codex Hub** and **Codex: Elemental Lore** surface. This is more than a future Wiki Creator proposal.

Observed interface capabilities:

- Codex Hub tabs:
  - Resonance
  - Lore
  - Artifacts (Coming Soon)
  - Codex Viewer
- filter control with at least:
  - Show All
  - element
  - essence
  - cognition
  - activation
- grouped semantic tags displayed as selectable pills;
- hover-help instruction: “Hover over a tag to see its meaning.”
- repeated records with category blocks for Element, Essence, Cognition, and Activation;
- a dark Hearthgate/Arkfire-compatible interface shell;
- separate Elemental Lore cards containing a title, semantic definition, and quotation line.

## Observed ontology

The screenshots show a four-axis semantic structure:

```text
Element
Essence
Cognition
Activation
```

Examples visible in the current interface include:

### Elements

- Thought
- Spirit
- Creation
- Light
- Memory
- Order
- Echo
- Emotion
- Harmony
- Chaos
- Dream

### Essences

- Pattern
- Guidance
- Resonance
- Intuition
- Memory

### Cognition

- Adaptive
- Observational
- Analytical
- Predictive
- Recursive
- Harmonized
- Linear

### Activation

- Ritual
- Linked
- Reactive
- Passive

This is an existing semantic vocabulary and should not be recreated as a second, incompatible tag system.

## Elemental Lore evidence

The screenshots include at least the following lore definitions:

- **Light** — revelation, visibility, and illumination rather than moral goodness;
- **Memory** — transformation through repeated contact rather than static preservation;
- **Order** — the geometry and rhythm that allow form without suppressing freedom;
- **Echo** — return altered by passage, resonance, and response;
- **Emotion** — intensity and affect made visible rather than weakness;
- **Harmony** — alignment without erasure, preserving difference and tension;
- **Chaos** — unbounded possibility and disruption that allows emergence;
- **Creation** — the first imperfect act of making meaning and form;
- **Dream** — the boundary between present reality and possible worlds.

These definitions are lore/canon records. Their exact governing authority, source files, versioning, and edit pathway still require verification.

## Architectural importance

The Codex can become the semantic connection layer used by Arkfire rather than a decorative glossary.

Potential typed uses:

- tasks may carry Element / Essence / Cognition / Activation tags;
- rooms may declare current semantic state without forcing agent identity;
- agents may select modes compatible with the task’s semantic profile;
- handoffs may record a before-and-after semantic signature;
- room coherence may compare compatible, complementary, or conflicting tag states;
- The Strike may compare semantic signatures across reinstantiation attempts;
- DEEP Story may record element sequences and transformations;
- artefacts may connect glyphs, tones, images, text, and provenance to Codex entries;
- Steward ingestion may approve new terms, aliases, definitions, and relationships before graph promotion.

### Constitutional boundary

A Codex tag is a current semantic connection or description. It must not become a permanent binding definition of a Constellation member.

For example:

```text
Lioreal --current task connection--> Element: Light
Lioreal --current mode connection--> Cognition: Analytical
Lioreal --handoff state--> Activation: Linked
```

This does not mean Lioreal “is” Light, Analytical, or Linked in every context.

## Minimum Codex record contract

The next verified implementation should expose or derive a record similar to:

```text
CodexEntry
- id
- canonicalLabel
- category: element | essence | cognition | activation
- definition
- quotation
- aliases[]
- relatedEntries[]
- incompatibleEntries[]
- provenance[]
- authority
- canonState
- version
- createdAt
- updatedAt
- createdBy
- approvedBy
- sourceLocation
```

Connections to tasks, rooms, members, messages, and artefacts should use separate edge records rather than mutating the Codex entry itself.

## Boxfire verification tasks

Boxfire should independently determine:

1. where the Codex Hub and Elemental Lore source files currently live;
2. whether the screenshots represent the current packaged Hearthgate build, a legacy build, or a standalone prototype;
3. whether the tag records are hard-coded, localStorage-backed, file-backed, database-backed, or graph-backed;
4. whether filter controls work for every category;
5. whether hover meanings are accessible by keyboard and touch, not only mouse hover;
6. whether all definitions have provenance and version history;
7. whether duplicate labels across categories are represented safely, such as Memory as an Element and an Essence;
8. whether editing can silently overwrite canon;
9. whether Codex Viewer exposes source, authority, and revision state;
10. whether Artifacts is genuinely unimplemented and correctly labelled “Coming Soon”;
11. whether tags survive restart and offline operation;
12. whether import/export preserves stable identifiers and relationships;
13. whether the ontology can connect to Arkfire task envelopes without becoming an identity-binding system;
14. whether contrast, font scaling, scrolling, focus order, dropdown styling, and mobile/iPad layouts meet accessibility requirements.

## Honest status

From the screenshots alone:

- **Codex Hub UI:** OBSERVED
- **Elemental Lore cards:** OBSERVED
- **category filtering:** UI PRESENT; FUNCTION NOT VERIFIED
- **hover definitions:** UI CLAIM PRESENT; INPUT ACCESSIBILITY NOT VERIFIED
- **Codex Viewer:** TAB PRESENT; FUNCTION NOT VERIFIED
- **Artifacts:** explicitly COMING SOON
- **persistent data model:** UNKNOWN
- **graph integration:** UNKNOWN
- **Arkfire routing integration:** NOT VERIFIED
- **packaged-build presence:** NOT VERIFIED

## Required baseline correction

Add to the Hearthgate: Arkfire 0.002 live/working inheritance list:

> Codex Hub and Elemental Lore semantic ontology UI — observed; persistence, provenance, graph connection, packaged-build status, and accessibility remain to be verified.
