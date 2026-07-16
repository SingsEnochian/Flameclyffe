# Hearthgate Archive Room

Status: implementation note
Category: implementation task, evidence-backed finding
Date: 2026-07-16
Scope: Hearthgate, STARWELL, Continuity, Research, Trends, Creative Library

## Purpose

The Archive Room gives Hearthgate a local-first place to index private and public source material without committing personal archives, transcripts, governance records, or source binaries to the public Flameclyffe repository.

The route is:

```text
/hearthgate-archive.html
```

It links back to the main Hearthgate room and Notes.

## What it stores

The Archive Room stores:

```text
record metadata -> localStorage
attached source blobs -> IndexedDB
exported manifests -> user-selected local download
```

The repository stores only the reader, schema example, and documentation. It does not store Rowan's private intake records.

## Notebook model

### Research

For scientific, mathematical, cosmological, instrumentation, and historical lineage sources.

Recommended labels:

- established science
- active research
- speculative theory
- fringe inspiration
- implementation task
- evidence-backed finding

### Continuity

For consent anchors, session practices, memory cards, continuity protocols, and relational archives.

Recommended boundary:

> A continuity record documents a practice or lived relational history. It does not by itself establish a scientific claim about consciousness, identity, or model architecture.

### Trends

For cross-source comparisons, recurring language, chronology, model-shift observations, and qualitative pattern studies.

Recommended boundary:

> A recurring motif is a pattern candidate. Preserve the source trail and keep interpretation separate from observation.

### Creative Library

For novels, world bibles, codices, scene transcripts, interaction artefacts, and creative canon.

Recommended boundary:

> Creative canon is authoritative inside its named world or project. It is not automatically an external physical claim.

### Governance

For charters, council notes, incident reports, access rules, and review protocols.

Recommended boundary:

> Governance records may guide a named community or project. They do not become executable software policy merely by being archived.

### Visual Archive

For concept art, presence cards, material studies, UI references, and scanned artefacts.

## Privacy rule

Flameclyffe is a public repository. Do not commit private intake manifests or source files.

The repository ignores:

```text
apps/starwell-server/public/hearthgate-archive.local.json
apps/starwell-server/public/hearthgate-sources/
```

The normal workflow is:

1. Open the Archive Room.
2. Import a private manifest from the local device.
3. Attach source files locally when needed.
4. Filter by notebook, classification, or privacy.
5. Export a new private manifest for backup.

## Source handling rule

Every record should carry:

```text
id
title
filename
notebook
privacy
classification
sourceDate
tags
summary
epistemicNote
ingestStatus
```

The `epistemicNote` should say what the source can support and what it cannot establish.

## Uploaded intake mapping used for the 2026-07-16 pass

The private intake generated for Rowan uses these broad shelves:

- Research: frequency dictionaries, cosmology/world-model documents, qualitative overlay studies, agent definitions.
- Continuity: living memory anchors, consent and session protocols, narrative protection cards.
- Trends: collapse chronologies, recurring threshold language, continuity-method comparisons.
- Creative Library: novels, codices, scene transcripts, humour archives, world fiction.
- Governance: council charters and risk-review records.
- Visual Archive: presence cards, material references, and character/world art.

No private source text or binary was committed during this pass.

## Future integration seam

The current implementation is a standalone Hearthgate room because the existing `hearthgate.html` file is a large single-file application and should not be rewritten casually.

A later small shell refactor should:

1. move Hearthgate tab registration into a data structure;
2. load Archive Room as a first-class tab or routed room;
3. preserve the standalone route for direct access;
4. keep source storage local-first;
5. never auto-upload private archives to GitHub, Supabase, or a model provider.

## Validation checklist

- Importing a manifest merges records by id.
- Attaching a source matches an existing filename when possible.
- Attached files open from IndexedDB only after a user action.
- Export excludes source blobs and marks attachments as local-only.
- Clear requires confirmation and removes metadata plus blobs.
- Reduced-motion users receive no required animation.
- Private and restricted records are visibly labelled.
- Epistemic labels remain presentation metadata, not proof certification.
