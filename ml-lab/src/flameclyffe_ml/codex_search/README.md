# Codex Search Baseline

This package defines the first review-safe search layer for STARWELL and the Terra
Aeterna wiki.

It is deliberately not a neural model. The baseline provides:

- typed source-document contracts;
- deterministic text normalisation;
- stable chunk IDs;
- privacy-aware public and internal filtering;
- a lexical ranking baseline;
- reviewable snippets and matched terms.

## Boundary

The baseline may rank records for review. It may not publish records, alter canon,
change privacy state, or infer hidden relationships.

Public search includes only documents where:

- `public = true`
- `privacy_class = PUBLIC`

Internal search may include `PUBLIC` and `INTERNAL` material. `PRIVATE` and
`RESTRICTED` material are excluded from baseline search unless a later explicit
private-local retrieval mode is built and reviewed.

## Next steps

1. Add a Notion or Supabase snapshot adapter that emits `CanonDocument` records.
2. Add a fixture set using approved public Terra Aeterna wiki records.
3. Store lexical baseline metrics before adding sentence embeddings.
4. Add vector embeddings only after privacy and source provenance are proven.
