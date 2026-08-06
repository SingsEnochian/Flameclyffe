# Boxfire Runbook — Wheel of Time Full Wiki Pull

## Location

```text
scripts/ingest/pull-wot-fandom.mjs
canon/taaveren-vaen/wot-fandom/
```

## Run

From the Flameclyffe repository root:

```bash
node scripts/ingest/pull-wot-fandom.mjs
```

Resume after interruption:

```bash
node scripts/ingest/pull-wot-fandom.mjs --resume
```

Include complete revision history only when storage and runtime are acceptable:

```bash
node scripts/ingest/pull-wot-fandom.mjs --include-history
```

## Expected outputs

- `raw/pages.ndjson`
- `raw/revisions.ndjson`
- `raw/links.ndjson`
- `raw/categories.ndjson`
- `raw/media-metadata.ndjson`
- `receipts/checkpoints.json`
- `receipts/failures.ndjson`
- `receipts/ingest-run.json`
- `manifest.json`

## QA

1. `checkpoints.json` ends with `completed: true`.
2. Imported + failed equals enumerated terminal records.
3. Re-running with `--resume` creates no duplicate page records.
4. Every page has source URL, page ID, latest revision, contributor where exposed, retrieval time, licence declaration, and SHA-256 content hash.
5. Media remain metadata-only until each file licence is reviewed.
6. Source canon and Ta’veren Vaen overlays remain separate.
7. Observer receives normalized records before DEEP routing; downstream subsystems do not consume raw wiki rows directly.

## Follow-on

After the raw pull is complete, build the normalization and indexing pass. Do not promote all main-namespace pages automatically; canon acceptance remains reviewed and receipted.
