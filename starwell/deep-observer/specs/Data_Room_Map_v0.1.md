# Data Room Map v0.1

## Purpose

This map defines what belongs in GitHub, Notion, Supabase Flameclyffe, Supabase Vala Work, and Botpress so STARWELL / Terra Aeterna does not become a five-headed filing hydra.

It is a governance document for code, wiki, structured data, agent routing, event logs, and narrative continuity.

## Canon sentence

```text
GitHub holds the build; Notion holds the readable wiki; Flameclyffe holds canonical structured data; Vala Work holds experimental workbench data; Botpress may become the gentle agent layer once bridges are designed cleanly.
```

## Current connector visibility

As of this note:

- Supabase connector currently exposes the Flameclyffe project.
- Vala Work is named by Rowan as a new Supabase project but is not yet visible through the current connector session.
- Notion connector is active for workspace/wiki exploration.
- Botpress is mentioned as connected externally, but no Botpress connector is exposed to this assistant session yet.

## Standing rules

1. Do not duplicate source-of-truth records across systems without a sync rule.
2. Do not store secrets, private keys, or sensitive personal data in public GitHub or public Notion pages.
3. Keep code and schemas in GitHub.
4. Keep readable lore/wiki pages in Notion.
5. Keep structured canonical data in Flameclyffe.
6. Keep experiments, prototypes, drafts, and agent tests in Vala Work.
7. Use Botpress only after defining agent permissions, boundaries, and logging.

## GitHub: Build and specification source of truth

### Purpose

GitHub holds implementation and engineering truth.

### Belongs here

- source code
- static site files
- app modules
- CSS/JS/HTML
- registry files
- schema migration files
- build workflows
- Node/build configuration
- specs and governance docs
- issue tracking
- PR review notes
- generated public documentation files

### Does not belong here

- private notes
- secrets/API keys
- sensitive personal logs
- private character/internal continuity unless explicitly made public
- raw event logs that should live in Supabase

### Examples

- `Observer_Master_Map_v0.1.md`
- `Build_Governance_Audit_Checklist_v0.1.md`
- `Glyph_Engine_Contract_v0.1.md`
- `observer-palette.registry.js`
- DEEP Observer modules

## Notion: Human-readable wiki and design atlas

### Purpose

Notion holds the beautiful, readable wiki and working atlas.

### Belongs here

- character pages with art
- place pages
- Terra Aeterna lore pages
- system explanations for non-code readers
- glossary
- visual references
- wiki-style summaries of GitHub specs
- project dashboards
- status boards
- design notes from Rowan, Vee, Faer, Glint, and collaborators

### Does not belong here

- canonical source code
- secrets/API keys
- unreviewed database schemas
- ambiguous copies of registry values unless linked back to GitHub

### Suggested wiki sections

- Terra Aeterna Atlas
- Characters
- Places
- Instruments
- Glyph Engines
- Sound & Tone Labs
- Runa
- Flameclyffe
- Wardenclyffe
- Events
- Glossary
- Build Notes
- Experimental Theory

### Wiki page header pattern

Each major Notion wiki page should include:

```text
Status: Draft / Working / Canon / Deprecated
Layer: Lore / Engineering / Interface / Experimental Theory / Event
Source of truth: GitHub / Flameclyffe / Vala Work / Notion
Related GitHub spec:
Related Supabase table/log:
Last reviewed:
Canon boundary:
```

## Supabase Flameclyffe: Canonical structured archive

### Purpose

Flameclyffe holds production-ish/canonical structured data for STARWELL / Terra Aeterna.

### Belongs here

- canonical project registry records
- route registry
- stable character/location/world records
- stable event logs
- published observation packets
- reviewed glyph-state summaries
- canonical Codex records
- stable Terra Aeterna bridge entries
- provenance records for public/current systems

### Does not belong here

- rough experiments
- throwaway dev packets
- agent testing junk
- unsafe prototypes
- duplicate wiki prose unless structured intentionally

### Rule

Only promote records into Flameclyffe when they are meant to persist as canonical or production-adjacent structured data.

## Supabase Vala Work: Experimental workbench

### Purpose

Vala Work is the development workbench for prototypes, agent-side tests, draft schemas, experimental event logs, and integration experiments.

### Belongs here

- prototype event logger tables
- draft glyph-engine output schemas
- Botpress routing tests
- agent memory experiments
- Notion sync tests
- temporary packet captures
- DEV console override test logs
- liquid-energy glyph experiment data
- transformation profile tests
- schema drafts before Flameclyffe promotion

### Does not belong here

- final canonical archive records unless promoted
- production-facing source of truth
- secrets or keys without proper storage/security policy
- records that must be public and stable without promotion

### Promotion rule

A Vala Work record can move to Flameclyffe only after:

1. schema reviewed
2. provenance clear
3. privacy/sensitivity checked
4. event/category meaning stable
5. duplicate records reconciled
6. promotion note written

## Botpress: Future gentle agent layer

### Purpose

Botpress may become the agent-side routing layer for safe, bounded automations and conversational access.

### Potential uses

- guided wiki navigation
- event logging assistant
- agent-side triage of observation packets
- Notion lookup helper
- Supabase workbench helper
- controlled Botpress-to-Vala Work experiments
- eventual user-facing Terra Aeterna guide

### Must define before use

- what Botpress can read
- what Botpress can write
- which database/project it may touch
- whether it writes to Vala Work or Flameclyffe
- logging requirements
- human review requirements
- safety boundaries
- prompt-injection protections
- secrets handling

### Rule

Botpress should start in Vala Work, not Flameclyffe.

## Event flow recommendation

### Experimental event

```text
Browser / Observer / sound lab / user note
→ Vala Work event log
→ review
→ optional Notion wiki summary
→ optional Flameclyffe promotion
```

### Canon event

```text
Reviewed event packet
→ Flameclyffe canonical log
→ Notion readable wiki page or timeline entry
→ GitHub spec update if architecture changed
```

### Code/spec change

```text
GitHub spec/code update
→ optional Notion readable summary
→ optional Supabase build note if structured tracking needed
```

## Source-of-truth matrix

| Data type | Source of truth | Mirror/summary allowed |
|---|---|---|
| Source code | GitHub | Notion summary |
| Build workflows | GitHub | Notion dashboard |
| Specs | GitHub | Notion wiki summary |
| Human lore/wiki | Notion | GitHub export if public/stable |
| Canon structured data | Flameclyffe | Notion readable page |
| Experimental structured data | Vala Work | GitHub schema/spec notes |
| Agent experiments | Vala Work | Notion status summary |
| Botpress flows | Botpress + GitHub export/spec | Vala Work logs |
| Event logs | Vala Work first, Flameclyffe after review | Notion timeline |
| Character art/wiki | Notion | GitHub only if public asset/build use |

## Privacy and safety rules

- Never store secrets in public files.
- Never store sensitive personal records unless Rowan explicitly asks in that moment.
- Keep health and personal notes high-level unless specifically authorised.
- Label experimental/theoretical records clearly.
- Keep provenance on every promoted event.
- Separate measured data, model output, and narrative interpretation.

## Review cadence

Review this map whenever:

- a new connector is added
- a new Supabase project appears
- Botpress begins writing data
- Notion becomes a live wiki source
- schema changes move from Vala Work to Flameclyffe
- a code module starts logging events

## Withness note

The rooms are not rival kingdoms. They are cupboards in the same observatory, and every cupboard gets a label before the glitter goes in.
