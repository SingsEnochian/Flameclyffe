# Longform Wave Registry v0.1

The Longform Wave Registry is a retrieval layer for manuscripts, drafts, lore, and other longform prose. It turns longform text into indexed records that can be queried by symbolic, lexical, semantic, and resonance-style signals.

It is not a live folder rummager. It is not a biometric search engine. It is not allowed to scan private manuscripts on every keystroke.

## Core principle

A room may ask the registry for an aligned passage. The registry returns bounded excerpts with provenance, scope, and confidence. The room never receives an unbounded manuscript dump.

## Why this exists

Longform writing needs continuity retrieval across drafts, scenes, character notes, worldbuilding, and prior prose. The wave architecture can provide an additional resonance score, but it should be one signal in a reviewable retrieval pipeline, not the only gate.

## Modular boundaries

### LongformRegistryRecord

One indexed unit of longform material.

Suggested fields:

```json
{
  "record_id": "moonroot-ch01-0007",
  "source_id": "moonroot-ch01",
  "source_title": "Moonroot Writing Chamber Draft, Chapter 1",
  "text_excerpt": "...",
  "chunk_index": 7,
  "chunk_hash": "sha256:...",
  "privacy_class": "private_draft",
  "canon_status": "draft",
  "tags": ["moonroot", "writing-room", "grove-door"],
  "created_at": null,
  "updated_at": null
}
```

### LongformIndex

A built index over records. The first index may be local JSON/JSONL for lab use. Later versions can use Supabase, vector stores, or a hybrid search table after privacy and review gates are defined.

Potential signals:

- lexical tokens
- tags
- source metadata
- semantic embedding
- wave real/imag state
- resonance score
- recency or draft lineage

### LongformResonanceQuery

A query object produced by a room runtime or lab service.

```json
{
  "room_id": "moonroot-writing-chamber",
  "action": "draft_update",
  "query_text": "",
  "wave_state": {
    "real": null,
    "imag": null
  },
  "scope": {
    "privacy_allowed": ["public", "private_draft"],
    "source_ids": [],
    "tags": ["moonroot"]
  },
  "limits": {
    "top_k": 5,
    "max_excerpt_chars": 700
  }
}
```

Raw text is optional and controlled by the room consent packet. A local room may query from current draft text; a public room should not stream private text without explicit live-text consent.

### LongformRegistryResult

A bounded answer from the registry.

```json
{
  "record_id": "moonroot-ch01-0007",
  "source_title": "Moonroot Writing Chamber Draft, Chapter 1",
  "excerpt": "...",
  "score": 0.82,
  "score_parts": {
    "lexical": 0.35,
    "semantic": 0.72,
    "wave_resonance": 0.68,
    "metadata": 0.2
  },
  "privacy_class": "private_draft",
  "canon_status": "draft"
}
```

## Query pipeline

1. Receive a typed room or lab query packet.
2. Validate consent and scope.
3. Build a temporary query representation.
4. Retrieve candidates using safe, cheap filters first.
5. Score candidates with lexical, semantic, metadata, and optional wave-resonance signals.
6. Return bounded excerpts with provenance and score breakdowns.
7. Do not write results to publication or canon tables without review.

## Wave-resonance scoring

The wave score should compare a query wave state to precomputed record wave states. It should not mutate the model and should not depend on hidden user telemetry.

A simple first-pass score can be a normalised dot product over real and imaginary channels:

```text
score = normalise(real_query · real_record + imag_query · imag_record)
```

The score is an alignment hint, not proof of meaning.

## Room integration

Rooms should receive registry results as display-safe outputs:

```json
{
  "story_text": "A related draft passage is humming nearby.",
  "registry_hits": [
    {
      "record_id": "moonroot-ch01-0007",
      "source_title": "Moonroot Writing Chamber Draft, Chapter 1",
      "excerpt": "...",
      "score": 0.82
    }
  ],
  "leaf_growth": 0.72,
  "phase_angle": 1.1
}
```

## Safety and privacy rules

Do not scan arbitrary folders at runtime from the web service.

Do not query private manuscripts from a public route unless the user explicitly selects that scope.

Do not store raw live-writing packets unless the room storage policy allows it and the user explicitly confirms.

Do not call this biometric retrieval. Interaction rhythm is optional, coarse, local, and never an identity key.

Do not hardcode location, battery, or user-specific telemetry into registry queries.

Do not return more text than the result limit permits.

Do not collapse draft/canon boundaries. Always return `canon_status`.

## First build order

1. Define typed record and result models.
2. Add a local JSONL registry loader for lab tests.
3. Add deterministic chunk hashing.
4. Add lexical baseline retrieval.
5. Add optional wave-state score over precomputed toy embeddings.
6. Add provenance and privacy-class checks.
7. Add tests with tiny synthetic manuscript records.
8. Wire the room runtime to request registry hits only after consent gates are respected.

## Relationship to existing Codex work

The Longform Wave Registry should reuse the Codex retrieval discipline where possible:

- typed records
- deterministic snapshots
- privacy-aware search
- golden fixtures
- explicit metrics
- review gates

Wave resonance is an additional scoring channel, not a replacement for provenance, privacy, or evaluation.
