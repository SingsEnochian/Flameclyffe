# ArcSweep Ancestral Corpus

This directory is the public-safe registry for creator-owned historical source roots and their conceptual correspondences.

It is intentionally **not** a manuscript dump.

The repository is public. Source prose, private Drive links, local manuscript paths, and private chunk indexes stay outside this tree unless the Steward explicitly promotes material for publication.

## Current roots

The v0.1 manifest recognises two original-fiction roots for later private binding:

- `ancestral:amalthi-transition`
- `ancestral:kalladia-cycle`

Only compact fingerprints and reviewed correspondences are committed here.

## Private binding

A private/local adapter should resolve each `root_id` to an authorised source locator and produce provenance-rich chunk records compatible with the Longform Wave Registry.

Recommended private binding shape:

```json
{
  "root_id": "ancestral:example",
  "source_ref": "private://authorised-source-id",
  "content_hash": "...",
  "bound_at": "...",
  "chunk_index_ref": "private://...",
  "authorisation": "steward_explicit"
}
```

Do not commit that binding file when it contains unpublished source locations or text.

## Correspondence is not canon merge

The corpus may say that two works share a structural idea. It must not infer that the worlds, characters, timelines, cosmologies, or events are therefore canonically connected.

Use the vocabulary in `apps/arcsweep/contracts/ANCESTRAL_RELATIONAL_FIELD_V1.md` to distinguish recurrence, analogy, adaptation, and actual source identity.

## Relational Field connection

The corpus supplies historical ancestry. The Relational Field supplies runtime relationship state.

A source may demonstrate a recurring pattern such as bonded identity, harmonic regulation, or distributed awareness. ArcSweep can use that pattern as design evidence without importing the source world's canon.
