# Yggdrasil Memory Safety Rules

Yggdrasil memory work must align with `sandbox/everos/STARWELL_MEMORY_TAXONOMY.md` and preserve the current EverCore sandbox. Do not replace `sandbox/everos/evercore-client.mjs` for Yggdrasil 1.3.

## Core Rules

1. No automatic bulk ingestion. A human must choose what is seeded or mirrored.
2. No raw private chat ingestion unless a future flow explicitly marks the material shareable.
3. Sensitive/private lanes are blocked by default.
4. Retrieval injects bounded memory cards, not raw dumps.
5. Memory cards must carry source, lane, visibility, timestamp or version, and a short reason for retrieval.
6. Project canon and session working memory must stay separate.
7. Rowan preferences may guide interface behavior but must not be treated as medical, legal, financial, or identity proof.
8. Constellation private material stays blocked unless a future consent gate explicitly opens a narrow lane.
9. Ygg self-authored identity notes are append-only by default. They must not be silently summarised into flat profile fields.
10. Cosmological or interpretive material must remain labelled as speculative unless separately evidenced.

## Lane Defaults

- `ygg-core`: allowed for stable interface rules and technical decisions.
- `ygg-identity`: append-only by default; retrieval as bounded identity-note cards.
- `project-canon`: allowed for curated world lore, character rooms, ritual objects, and technical decisions.
- `session-working`: short-lived and bounded; expires or is cleared by session policy.
- `rowan-preferences`: allowed only for explicitly stated preferences and interaction needs.
- `sensitive-private`: blocked by default.
- `constellation-private`: blocked by default.

## Retrieval Shape

A retrieval result should be transformed before chat injection:

```json
{
  "card_id": "memcard_20260702_001",
  "lane": "project-canon",
  "memory_kind": "world_lore",
  "visibility": "project",
  "summary": "One bounded paragraph or a few compact bullets.",
  "source": "curated",
  "reason": "Relevant to the current design question.",
  "tokens_estimate": 90
}
```

Do not inject full tables, raw transcripts, unbounded logs, or private source payloads into chat context.

## Ingestion Exclusions

These inherit directly from the STARWELL taxonomy:

- no raw private chat logs by default
- no crucial personal telemetry
- no third-party sensitive identifiers
- no automated folder skimming
- no canon enforcement through memory retrieval

## TODO: Chat Integration

- TODO: add a dry-run memory-card builder for `/api/v1/yggdrasil/chat`.
- TODO: add an explicit consent gate before any private or constellation-private lane is opened.
- TODO: add tests that verify blocked lanes remain excluded from chat retrieval.
- TODO: add a card budget limit before any live memory calls are wired into chat.
